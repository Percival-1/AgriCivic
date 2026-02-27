"""
Notification API endpoints for the AI-Driven Agri-Civic Intelligence Platform.

This module provides REST API endpoints for notification management including:
- Notification preference management
- Manual notification triggering
- Notification history retrieval
- Subscription management
"""

import logging
from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.notification_service import (
    get_notification_service,
    NotificationService,
    NotificationType,
)
from app.models.notification import NotificationPreferences, NotificationHistory
from app.models.user import User
from sqlalchemy import select

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


# Request/Response Models
class NotificationPreferencesRequest(BaseModel):
    """Request model for updating notification preferences."""

    daily_msp_updates: Optional[bool] = Field(None, description="Enable MSP updates")
    weather_alerts: Optional[bool] = Field(None, description="Enable weather alerts")
    scheme_notifications: Optional[bool] = Field(
        None, description="Enable scheme notifications"
    )
    market_price_alerts: Optional[bool] = Field(
        None, description="Enable market price alerts"
    )
    preferred_channels: Optional[List[str]] = Field(
        None, description="Preferred notification channels"
    )
    preferred_time: Optional[str] = Field(
        None, description="Preferred notification time (HH:MM format)"
    )
    notification_frequency: Optional[str] = Field(
        None, description="Notification frequency (daily, weekly, immediate)"
    )
    notification_language: Optional[str] = Field(
        None, description="Preferred language for notifications"
    )


class NotificationPreferencesResponse(BaseModel):
    """Response model for notification preferences."""

    user_id: UUID
    daily_msp_updates: bool
    weather_alerts: bool
    scheme_notifications: bool
    market_price_alerts: bool
    preferred_channels: List[str]
    preferred_time: Optional[str]
    notification_frequency: str
    notification_language: Optional[str]

    class Config:
        from_attributes = True


class TriggerNotificationRequest(BaseModel):
    """Request model for manually triggering notifications."""

    notification_type: str = Field(
        ..., description="Type of notification (msp_update, weather_alert, etc.)"
    )
    user_ids: Optional[List[UUID]] = Field(
        None, description="Specific user IDs (if None, sends to all eligible users)"
    )
    custom_message: Optional[str] = Field(
        None, description="Custom message to send (overrides default)"
    )


class NotificationHistoryResponse(BaseModel):
    """Response model for notification history."""

    id: UUID
    user_id: UUID
    notification_type: str
    channel: str
    message: str
    delivery_status: str
    created_at: datetime
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationStatsResponse(BaseModel):
    """Response model for notification statistics."""

    total_sent: int
    total_delivered: int
    total_failed: int
    by_type: Dict[str, int]
    by_channel: Dict[str, int]


# API Endpoints
@router.get(
    "/preferences/{user_id}",
    response_model=NotificationPreferencesResponse,
    summary="Get notification preferences",
)
async def get_notification_preferences(
    user_id: UUID, db: AsyncSession = Depends(get_db)
):
    """
    Get notification preferences for a user.

    Args:
        user_id: User ID
        db: Database session

    Returns:
        NotificationPreferencesResponse with user preferences
    """
    try:
        # Check if user exists
        user_query = select(User).where(User.id == user_id)
        user_result = await db.execute(user_query)
        user = user_result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        # Get preferences
        query = select(NotificationPreferences).where(
            NotificationPreferences.user_id == user_id
        )
        result = await db.execute(query)
        prefs = result.scalar_one_or_none()

        if not prefs:
            # Create default preferences
            prefs = NotificationPreferences(
                user_id=user_id,
                daily_msp_updates=True,
                weather_alerts=True,
                scheme_notifications=True,
                market_price_alerts=False,
                preferred_channels=["sms"],
                notification_frequency="daily",
            )
            db.add(prefs)
            await db.commit()
            await db.refresh(prefs)

        return NotificationPreferencesResponse(
            user_id=prefs.user_id,
            daily_msp_updates=prefs.daily_msp_updates,
            weather_alerts=prefs.weather_alerts,
            scheme_notifications=prefs.scheme_notifications,
            market_price_alerts=prefs.market_price_alerts,
            preferred_channels=prefs.preferred_channels or ["sms"],
            preferred_time=(
                prefs.preferred_time.strftime("%H:%M") if prefs.preferred_time else None
            ),
            notification_frequency=prefs.notification_frequency,
            notification_language=prefs.notification_language,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get notification preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve preferences: {str(e)}",
        )


@router.put(
    "/preferences/{user_id}",
    response_model=NotificationPreferencesResponse,
    summary="Update notification preferences",
)
async def update_notification_preferences(
    user_id: UUID,
    preferences: NotificationPreferencesRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Update notification preferences for a user.

    Args:
        user_id: User ID
        preferences: Updated preferences
        db: Database session

    Returns:
        NotificationPreferencesResponse with updated preferences
    """
    try:
        # Check if user exists
        user_query = select(User).where(User.id == user_id)
        user_result = await db.execute(user_query)
        user = user_result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        # Get or create preferences
        query = select(NotificationPreferences).where(
            NotificationPreferences.user_id == user_id
        )
        result = await db.execute(query)
        prefs = result.scalar_one_or_none()

        if not prefs:
            prefs = NotificationPreferences(user_id=user_id)
            db.add(prefs)

        # Update preferences
        if preferences.daily_msp_updates is not None:
            prefs.daily_msp_updates = preferences.daily_msp_updates
        if preferences.weather_alerts is not None:
            prefs.weather_alerts = preferences.weather_alerts
        if preferences.scheme_notifications is not None:
            prefs.scheme_notifications = preferences.scheme_notifications
        if preferences.market_price_alerts is not None:
            prefs.market_price_alerts = preferences.market_price_alerts
        if preferences.preferred_channels is not None:
            prefs.preferred_channels = preferences.preferred_channels
        if preferences.notification_frequency is not None:
            prefs.notification_frequency = preferences.notification_frequency
        if preferences.notification_language is not None:
            prefs.notification_language = preferences.notification_language
        if preferences.preferred_time is not None:
            from datetime import time as dt_time

            try:
                hour, minute = map(int, preferences.preferred_time.split(":"))
                prefs.preferred_time = dt_time(hour, minute)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid time format. Use HH:MM",
                )

        await db.commit()
        await db.refresh(prefs)

        return NotificationPreferencesResponse(
            user_id=prefs.user_id,
            daily_msp_updates=prefs.daily_msp_updates,
            weather_alerts=prefs.weather_alerts,
            scheme_notifications=prefs.scheme_notifications,
            market_price_alerts=prefs.market_price_alerts,
            preferred_channels=prefs.preferred_channels or ["sms"],
            preferred_time=(
                prefs.preferred_time.strftime("%H:%M") if prefs.preferred_time else None
            ),
            notification_frequency=prefs.notification_frequency,
            notification_language=prefs.notification_language,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update notification preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update preferences: {str(e)}",
        )


@router.get(
    "/history/{user_id}",
    response_model=List[NotificationHistoryResponse],
    summary="Get notification history",
)
async def get_notification_history(
    user_id: UUID,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """
    Get notification history for a user.

    Args:
        user_id: User ID
        limit: Maximum number of records to return
        offset: Number of records to skip
        db: Database session

    Returns:
        List of NotificationHistoryResponse objects
    """
    try:
        # Check if user exists
        user_query = select(User).where(User.id == user_id)
        user_result = await db.execute(user_query)
        user = user_result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        # Get notification history
        query = (
            select(NotificationHistory)
            .where(NotificationHistory.user_id == user_id)
            .order_by(NotificationHistory.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(query)
        history = result.scalars().all()

        return [
            NotificationHistoryResponse(
                id=h.id,
                user_id=h.user_id,
                notification_type=h.notification_type,
                channel=h.channel,
                message=h.message,
                delivery_status=h.delivery_status,
                created_at=h.created_at,
                error_message=h.error_message,
            )
            for h in history
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get notification history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve history: {str(e)}",
        )


@router.post(
    "/trigger",
    response_model=Dict[str, Any],
    summary="Manually trigger notifications",
)
async def trigger_notifications(
    request: TriggerNotificationRequest, db: AsyncSession = Depends(get_db)
):
    """
    Manually trigger notifications for testing or administrative purposes.

    Args:
        request: Notification trigger request
        db: Database session

    Returns:
        Dict with notification results
    """
    try:
        notification_service = await get_notification_service(db)

        # Validate notification type
        try:
            notif_type = NotificationType(request.notification_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid notification type: {request.notification_type}",
            )

        results = []

        if notif_type == NotificationType.MSP_UPDATE:
            # Generate and send MSP updates
            msp_notifications = await notification_service.generate_daily_msp_updates()
            results = await notification_service.send_msp_notifications(
                msp_notifications
            )

        elif notif_type == NotificationType.WEATHER_ALERT:
            # Process and send weather alerts
            weather_alerts = await notification_service.process_weather_alerts()
            results = await notification_service.send_weather_alert_notifications(
                weather_alerts
            )

        elif notif_type == NotificationType.SCHEME_NOTIFICATION:
            # Send scheme notifications (requires scheme data)
            if not request.custom_message:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Custom message required for scheme notifications",
                )

            # Placeholder scheme data
            schemes = [
                {
                    "name": "Test Scheme",
                    "type": "Agricultural",
                    "eligibility_summary": "All farmers",
                    "benefits": ["Financial assistance"],
                    "deadline": "2024-12-31",
                }
            ]
            results = await notification_service.send_scheme_notifications(
                schemes, request.user_ids
            )

        return {
            "success": True,
            "notification_type": request.notification_type,
            "total_sent": len(results),
            "results": [
                {
                    "notification_id": str(r.notification_id),
                    "user_id": str(r.user_id),
                    "channel": r.channel,
                    "status": r.status.value,
                }
                for r in results[:10]  # Return first 10 results
            ],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to trigger notifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger notifications: {str(e)}",
        )


@router.get(
    "/stats",
    response_model=NotificationStatsResponse,
    summary="Get notification statistics",
)
async def get_notification_stats(days: int = 7, db: AsyncSession = Depends(get_db)):
    """
    Get notification statistics for the specified time period.

    Args:
        days: Number of days to include in statistics
        db: Database session

    Returns:
        NotificationStatsResponse with statistics
    """
    try:
        from datetime import datetime, timedelta
        from sqlalchemy import func

        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)

        # Get total counts
        total_query = select(func.count(NotificationHistory.id)).where(
            NotificationHistory.created_at >= start_date
        )
        total_result = await db.execute(total_query)
        total_sent = total_result.scalar() or 0

        # Get delivered count
        delivered_query = select(func.count(NotificationHistory.id)).where(
            NotificationHistory.created_at >= start_date,
            NotificationHistory.delivery_status == "delivered",
        )
        delivered_result = await db.execute(delivered_query)
        total_delivered = delivered_result.scalar() or 0

        # Get failed count
        failed_query = select(func.count(NotificationHistory.id)).where(
            NotificationHistory.created_at >= start_date,
            NotificationHistory.delivery_status == "failed",
        )
        failed_result = await db.execute(failed_query)
        total_failed = failed_result.scalar() or 0

        # Get counts by type
        type_query = (
            select(
                NotificationHistory.notification_type,
                func.count(NotificationHistory.id),
            )
            .where(NotificationHistory.created_at >= start_date)
            .group_by(NotificationHistory.notification_type)
        )
        type_result = await db.execute(type_query)
        by_type = {row[0]: row[1] for row in type_result}

        # Get counts by channel
        channel_query = (
            select(NotificationHistory.channel, func.count(NotificationHistory.id))
            .where(NotificationHistory.created_at >= start_date)
            .group_by(NotificationHistory.channel)
        )
        channel_result = await db.execute(channel_query)
        by_channel = {row[0]: row[1] for row in channel_result}

        return NotificationStatsResponse(
            total_sent=total_sent,
            total_delivered=total_delivered,
            total_failed=total_failed,
            by_type=by_type,
            by_channel=by_channel,
        )

    except Exception as e:
        logger.error(f"Failed to get notification stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve statistics: {str(e)}",
        )
