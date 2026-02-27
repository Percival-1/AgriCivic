"""
SMS API endpoints for the AI-Driven Agri-Civic Intelligence Platform.
"""

import logging
from typing import Dict, Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Request, Form
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.sms_service import get_sms_service
from app.services.session_manager import SessionManager
from app.services.translation import TranslationService
from app.services.llm_service import LLMService
from app.models.user import User
from app.models.notification import NotificationPreferences, NotificationHistory
from sqlalchemy import select

router = APIRouter()
logger = logging.getLogger(__name__)


# Request/Response Models
class SMSRequest(BaseModel):
    """Request model for sending SMS."""

    to_number: str = Field(..., description="Recipient phone number in E.164 format")
    message: str = Field(..., description="Message content", max_length=1600)
    from_number: Optional[str] = Field(None, description="Sender phone number")
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Additional metadata"
    )

    @field_validator("to_number")
    @classmethod
    def validate_phone(cls, v):
        """Validate phone number format."""
        sms_service = get_sms_service()
        if not sms_service.validate_phone_number(v):
            raise ValueError(
                "Invalid phone number format. Use E.164 format (e.g., +919876543210)"
            )
        return v


class BulkSMSRequest(BaseModel):
    """Request model for sending bulk SMS."""

    recipients: List[Dict[str, str]] = Field(
        ..., description="List of recipients with phone_number and optional name"
    )
    message: str = Field(..., description="Message content", max_length=1600)


class SMSQueryRequest(BaseModel):
    """Request model for processing SMS queries."""

    from_number: str = Field(..., description="Sender phone number")
    message: str = Field(..., description="Query message")
    language: Optional[str] = Field("en", description="Preferred language code")


class SubscriptionRequest(BaseModel):
    """Request model for managing SMS subscriptions."""

    phone_number: str = Field(..., description="User phone number")
    daily_msp_updates: Optional[bool] = Field(
        None, description="Subscribe to daily MSP updates"
    )
    weather_alerts: Optional[bool] = Field(
        None, description="Subscribe to weather alerts"
    )
    scheme_notifications: Optional[bool] = Field(
        None, description="Subscribe to scheme notifications"
    )
    market_price_alerts: Optional[bool] = Field(
        None, description="Subscribe to market price alerts"
    )
    preferred_time: Optional[str] = Field(
        None, description="Preferred time for notifications (HH:MM)"
    )


class SMSResponse(BaseModel):
    """Response model for SMS operations."""

    success: bool
    message_sid: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# API Endpoints
@router.post("/sms/send", response_model=SMSResponse)
async def send_sms(request: SMSRequest):
    """
    Send an SMS message.

    Args:
        request: SMS request with recipient and message

    Returns:
        SMS response with delivery status
    """
    try:
        sms_service = get_sms_service()
        result = sms_service.send_sms(
            to_number=request.to_number,
            message=request.message,
            from_number=request.from_number,
            metadata=request.metadata,
        )

        return SMSResponse(**result)

    except Exception as e:
        logger.error(f"Error sending SMS: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sms/send-bulk")
async def send_bulk_sms(request: BulkSMSRequest):
    """
    Send SMS to multiple recipients.

    Args:
        request: Bulk SMS request with recipients and message

    Returns:
        Bulk SMS results with success/failure counts
    """
    try:
        sms_service = get_sms_service()
        results = sms_service.send_bulk_sms(
            recipients=request.recipients, message=request.message
        )

        return {
            "success": True,
            "total": results["total"],
            "successful": len(results["successful"]),
            "failed": len(results["failed"]),
            "details": results,
        }

    except Exception as e:
        logger.error(f"Error sending bulk SMS: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sms/query")
async def process_sms_query(
    request: SMSQueryRequest, db: AsyncSession = Depends(get_db)
):
    """
    Process an incoming SMS query and generate a response.

    Args:
        request: SMS query request
        db: Database session

    Returns:
        Generated response optimized for SMS
    """
    try:
        # Initialize services
        sms_service = get_sms_service()
        session_manager = SessionManager()
        translation_service = TranslationService()
        llm_service = LLMService()

        # Find or create user
        result = await db.execute(
            select(User).where(User.phone_number == request.from_number)
        )
        user = result.scalar_one_or_none()

        if not user:
            # Create new user
            user = User(
                phone_number=request.from_number,
                preferred_language=request.language or "en",
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)

        # Get or create session
        session = await session_manager.get_or_create_session(
            db=db, user_id=user.id, channel="sms"
        )

        # Translate query to English if needed
        query_text = request.message
        if request.language and request.language != "en":
            translation_result = translation_service.translate(
                text=query_text, source_lang=request.language, target_lang="en"
            )
            if translation_result["success"]:
                query_text = translation_result["translated_text"]

        # Generate LLM response
        llm_response = llm_service.generate_response(
            prompt=query_text,
            context={
                "user_id": str(user.id),
                "channel": "sms",
                "language": request.language,
                "session_id": str(session.id),
            },
        )

        if not llm_response["success"]:
            raise HTTPException(status_code=500, detail="Failed to generate response")

        response_text = llm_response["response"]

        # Translate response back to user's language
        if request.language and request.language != "en":
            translation_result = translation_service.translate(
                text=response_text, source_lang="en", target_lang=request.language
            )
            if translation_result["success"]:
                response_text = translation_result["translated_text"]

        # Optimize for SMS
        optimized_response = sms_service.optimize_for_sms(response_text)

        # Update session context
        await session_manager.update_context(
            db=db,
            session_id=session.id,
            context_update={
                "last_query": request.message,
                "last_response": optimized_response,
            },
        )

        # Send SMS response
        send_result = sms_service.send_sms(
            to_number=request.from_number,
            message=optimized_response,
            metadata={"query": request.message, "session_id": str(session.id)},
        )

        # Log notification history
        notification = NotificationHistory(
            user_id=user.id,
            notification_type="query_response",
            channel="sms",
            message=optimized_response,
            delivery_status="sent" if send_result["success"] else "failed",
            external_message_id=send_result.get("message_sid"),
        )
        db.add(notification)
        await db.commit()

        return {
            "success": True,
            "response": optimized_response,
            "message_sid": send_result.get("message_sid"),
            "session_id": str(session.id),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing SMS query: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sms/webhook")
async def sms_webhook(
    request: Request,
    MessageSid: str = Form(...),
    From: str = Form(...),
    To: str = Form(...),
    Body: str = Form(...),
    NumMedia: int = Form(0),
    db: AsyncSession = Depends(get_db),
):
    """
    Webhook endpoint for receiving incoming SMS from Twilio.

    Args:
        request: FastAPI request object
        MessageSid: Twilio message SID
        From: Sender phone number
        To: Recipient phone number
        Body: Message body
        NumMedia: Number of media attachments
        db: Database session

    Returns:
        TwiML response
    """
    try:
        logger.info(f"Received SMS webhook - From: {From}, Body: {Body}")

        # Process the incoming SMS
        sms_service = get_sms_service()
        parsed_data = sms_service.process_incoming_sms(
            {
                "MessageSid": MessageSid,
                "From": From,
                "To": To,
                "Body": Body,
                "NumMedia": NumMedia,
            }
        )

        if not parsed_data["success"]:
            logger.error(f"Failed to parse incoming SMS: {parsed_data.get('error')}")
            return {"success": False, "error": "Failed to process message"}

        # Process as query
        query_request = SMSQueryRequest(from_number=From, message=Body, language="en")

        # Process query asynchronously
        response = await process_sms_query(query_request, db)

        return {"success": True, "processed": True, "response": response}

    except Exception as e:
        logger.error(f"Error in SMS webhook: {e}")
        return {"success": False, "error": str(e)}


@router.post("/sms/subscription")
async def manage_subscription(
    request: SubscriptionRequest, db: AsyncSession = Depends(get_db)
):
    """
    Manage SMS subscription preferences for a user.

    Args:
        request: Subscription request
        db: Database session

    Returns:
        Updated subscription preferences
    """
    try:
        # Find user
        result = await db.execute(
            select(User).where(User.phone_number == request.phone_number)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get or create notification preferences
        result = await db.execute(
            select(NotificationPreferences).where(
                NotificationPreferences.user_id == user.id
            )
        )
        preferences = result.scalar_one_or_none()

        if not preferences:
            preferences = NotificationPreferences(user_id=user.id)
            db.add(preferences)

        # Update preferences
        if request.daily_msp_updates is not None:
            preferences.daily_msp_updates = request.daily_msp_updates
        if request.weather_alerts is not None:
            preferences.weather_alerts = request.weather_alerts
        if request.scheme_notifications is not None:
            preferences.scheme_notifications = request.scheme_notifications
        if request.market_price_alerts is not None:
            preferences.market_price_alerts = request.market_price_alerts

        # Ensure SMS is in preferred channels
        if not preferences.preferred_channels:
            preferences.preferred_channels = ["sms"]
        elif "sms" not in preferences.preferred_channels:
            preferences.preferred_channels.append("sms")

        await db.commit()
        await db.refresh(preferences)

        return {
            "success": True,
            "user_id": str(user.id),
            "phone_number": user.phone_number,
            "preferences": {
                "daily_msp_updates": preferences.daily_msp_updates,
                "weather_alerts": preferences.weather_alerts,
                "scheme_notifications": preferences.scheme_notifications,
                "market_price_alerts": preferences.market_price_alerts,
                "preferred_channels": preferences.preferred_channels,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error managing subscription: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sms/subscription/{phone_number}")
async def get_subscription(phone_number: str, db: AsyncSession = Depends(get_db)):
    """
    Get SMS subscription preferences for a user.

    Args:
        phone_number: User phone number
        db: Database session

    Returns:
        Current subscription preferences
    """
    try:
        # Find user
        result = await db.execute(select(User).where(User.phone_number == phone_number))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get notification preferences
        result = await db.execute(
            select(NotificationPreferences).where(
                NotificationPreferences.user_id == user.id
            )
        )
        preferences = result.scalar_one_or_none()

        if not preferences:
            return {
                "success": True,
                "user_id": str(user.id),
                "phone_number": user.phone_number,
                "preferences": {
                    "daily_msp_updates": True,
                    "weather_alerts": True,
                    "scheme_notifications": True,
                    "market_price_alerts": False,
                    "preferred_channels": ["sms"],
                },
            }

        return {
            "success": True,
            "user_id": str(user.id),
            "phone_number": user.phone_number,
            "preferences": {
                "daily_msp_updates": preferences.daily_msp_updates,
                "weather_alerts": preferences.weather_alerts,
                "scheme_notifications": preferences.scheme_notifications,
                "market_price_alerts": preferences.market_price_alerts,
                "preferred_channels": preferences.preferred_channels,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting subscription: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sms/status/{message_sid}")
async def get_message_status(message_sid: str):
    """
    Get the delivery status of a sent SMS message.

    Args:
        message_sid: Twilio message SID

    Returns:
        Message delivery status
    """
    try:
        sms_service = get_sms_service()
        status = sms_service.get_message_status(message_sid)

        if not status["success"]:
            raise HTTPException(status_code=404, detail=status.get("error"))

        return status

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting message status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
