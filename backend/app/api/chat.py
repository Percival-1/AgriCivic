"""
Chat Interface API endpoints.

Provides REST API endpoints for web-based chat interface with real-time
messaging capabilities and file upload functionality for crop images.
"""

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.session_manager import session_manager
from app.services.llm_service import llm_service
from app.services.translation import translation_service
from app.services.vision_service import vision_service
from app.services.rag_engine import rag_engine

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for request/response
class ChatMessageRequest(BaseModel):
    """Request model for sending a chat message."""

    session_id: UUID = Field(..., description="Session ID")
    message: str = Field(..., description="User message content", min_length=1)
    language: Optional[str] = Field(
        "en", description="Message language code (e.g., 'en', 'hi', 'ta')"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None, description="Additional message metadata"
    )


class ChatMessageResponse(BaseModel):
    """Response model for chat messages."""

    message_id: str = Field(..., description="Unique message identifier")
    role: str = Field(..., description="Message role (user or assistant)")
    content: str = Field(..., description="Message content")
    language: str = Field(..., description="Message language")
    timestamp: str = Field(..., description="Message timestamp")
    sources: Optional[List[str]] = Field(
        None, description="Source citations if applicable"
    )
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class ChatHistoryResponse(BaseModel):
    """Response model for chat history."""

    session_id: UUID = Field(..., description="Session ID")
    messages: List[ChatMessageResponse] = Field(..., description="Chat messages")
    total_messages: int = Field(..., description="Total number of messages")


class ImageUploadResponse(BaseModel):
    """Response model for image upload with disease identification."""

    message_id: str = Field(..., description="Unique message identifier")
    disease_info: Dict[str, Any] = Field(
        ..., description="Disease identification results"
    )
    treatment_recommendations: List[str] = Field(
        ..., description="Treatment recommendations"
    )
    sources: List[str] = Field(..., description="Source citations")
    language: str = Field(..., description="Response language")
    timestamp: str = Field(..., description="Response timestamp")


class ChatSessionInitRequest(BaseModel):
    """Request model for initializing a chat session."""

    user_id: UUID = Field(..., description="User ID")
    language: Optional[str] = Field("en", description="Preferred language")
    initial_context: Optional[Dict[str, Any]] = Field(
        None, description="Initial context data"
    )


class ChatSessionInitResponse(BaseModel):
    """Response model for chat session initialization."""

    session_id: UUID = Field(..., description="Session ID")
    user_id: UUID = Field(..., description="User ID")
    language: str = Field(..., description="Session language")
    welcome_message: str = Field(..., description="Welcome message")
    timestamp: str = Field(..., description="Session creation timestamp")


@router.post(
    "/chat/init",
    response_model=ChatSessionInitResponse,
    status_code=status.HTTP_201_CREATED,
)
async def initialize_chat_session(
    request: ChatSessionInitRequest, db: AsyncSession = Depends(get_db)
):
    """
    Initialize a new chat session.

    Creates a new chat session for the user with the specified language preference.
    Returns session information and a welcome message.
    """
    try:
        # Create or get existing chat session
        session = await session_manager.get_or_create_session(
            db=db,
            user_id=request.user_id,
            channel="chat",
            initial_context=request.initial_context or {},
        )

        # Generate welcome message
        welcome_message = (
            "Welcome to the Agri-Civic Intelligence Platform! "
            "I'm here to help you with weather information, crop disease identification, "
            "market prices, and government schemes. How can I assist you today?"
        )

        # Translate welcome message if needed
        if request.language and request.language != "en":
            welcome_message = await translation_service.translate_text(
                text=welcome_message,
                source_lang="en",
                target_lang=request.language,
            )

        return ChatSessionInitResponse(
            session_id=session.id,
            user_id=session.user_id,
            language=request.language or "en",
            welcome_message=welcome_message,
            timestamp=session.created_at.isoformat() if session.created_at else "",
        )

    except ValueError as e:
        logger.error(f"Invalid request for chat session initialization: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to initialize chat session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize chat session",
        )


@router.post("/chat/message", response_model=ChatMessageResponse)
async def send_chat_message(
    request: ChatMessageRequest, db: AsyncSession = Depends(get_db)
):
    """
    Send a chat message and receive a response.

    Processes the user's message, generates an appropriate response using LLM,
    and returns the formatted response with source citations if applicable.
    """
    try:
        # Get session
        session = await session_manager.get_session(db, request.session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or expired",
            )

        # Add user message to conversation history
        import uuid
        from datetime import datetime

        user_message_id = str(uuid.uuid4())
        user_message = {
            "message_id": user_message_id,
            "role": "user",
            "content": request.message,
            "language": request.language or "en",
            "metadata": request.metadata or {},
        }
        await session_manager.add_conversation_message(
            db, request.session_id, user_message
        )

        # Translate message to English if needed
        message_for_processing = request.message
        if request.language and request.language != "en":
            message_for_processing = await translation_service.translate_text(
                text=request.message,
                source_lang=request.language,
                target_lang="en",
            )

        # Process message with LLM and RAG
        # Determine query type and route appropriately
        response_text = ""
        sources = []

        # Use RAG for knowledge-based queries
        rag_response = await rag_engine.search_and_generate(
            query=message_for_processing,
            language=request.language,
        )

        response_text = rag_response.get("response", "")
        sources = rag_response.get("sources", [])

        # Convert source objects to strings for the response model
        # Sources from RAG engine are dicts with 'id', 'content', 'collection'
        source_strings = []
        if sources:
            for source in sources:
                if isinstance(source, dict):
                    # Format: "Source Title (Collection)"
                    source_id = source.get("id", "Unknown")
                    collection = source.get("collection", "")
                    if collection:
                        source_strings.append(f"{source_id} ({collection})")
                    else:
                        source_strings.append(source_id)
                elif isinstance(source, str):
                    source_strings.append(source)

        # Use formatted source strings
        sources = source_strings

        # Translate response back to user's language if needed
        if request.language and request.language != "en":
            response_text = await translation_service.translate_text(
                text=response_text,
                source_lang="en",
                target_lang=request.language,
            )

        # Create assistant message
        assistant_message_id = str(uuid.uuid4())
        assistant_message = {
            "message_id": assistant_message_id,
            "role": "assistant",
            "content": response_text,
            "language": request.language or "en",
            "sources": sources,
            "metadata": {},
        }

        # Add assistant message to conversation history
        await session_manager.add_conversation_message(
            db, request.session_id, assistant_message
        )

        return ChatMessageResponse(
            message_id=assistant_message_id,
            role="assistant",
            content=response_text,
            language=request.language or "en",
            timestamp=datetime.utcnow().isoformat(),
            sources=sources if sources else None,
            metadata={},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process chat message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat message",
        )


@router.post("/chat/upload-image", response_model=ImageUploadResponse)
async def upload_crop_image(
    session_id: UUID = Form(...),
    language: str = Form("en"),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a crop image for disease identification.

    Accepts an image file, performs disease identification using vision-language models,
    retrieves treatment recommendations from the knowledge base, and returns
    formatted results with source citations.
    """
    try:
        # Validate session
        session = await session_manager.get_session(db, session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or expired",
            )

        # Validate file type
        if not image.content_type or not image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Please upload an image file.",
            )

        # Read image data
        image_data = await image.read()

        # Perform disease identification
        disease_result = await vision_service.identify_disease(
            image_data=image_data,
            crop_hint=session.context.get("crop_type") if session.context else None,
            location_context=(
                session.context.get("location") if session.context else None
            ),
        )

        # Get treatment recommendations from RAG
        if disease_result.get("disease_name"):
            treatment_query = (
                f"Treatment recommendations for {disease_result['disease_name']} "
                f"in {session.context.get('crops', ['crops'])[0] if session.context.get('crops') else 'crops'}"
            )

            rag_response = await rag_engine.search_and_generate(
                query=treatment_query,
                language=language,
            )

            treatment_recommendations = [rag_response.get("response", "")]
            sources = rag_response.get("sources", [])

            # Convert source objects to strings for the response model
            source_strings = []
            if sources:
                for source in sources:
                    if isinstance(source, dict):
                        source_id = source.get("id", "Unknown")
                        collection = source.get("collection", "")
                        if collection:
                            source_strings.append(f"{source_id} ({collection})")
                        else:
                            source_strings.append(source_id)
                    elif isinstance(source, str):
                        source_strings.append(source)
            sources = source_strings
        else:
            treatment_recommendations = [
                "Unable to identify disease. Please ensure the image is clear and shows the affected crop area."
            ]
            sources = []

        # Translate results if needed
        if language and language != "en":
            # Translate disease info
            if disease_result.get("disease_name"):
                disease_result["disease_name"] = (
                    await translation_service.translate_text(
                        text=disease_result["disease_name"],
                        source_lang="en",
                        target_lang=language,
                    )
                )

            # Translate treatment recommendations
            translated_recommendations = []
            for rec in treatment_recommendations:
                translated_rec = await translation_service.translate_text(
                    text=rec,
                    source_lang="en",
                    target_lang=language,
                )
                translated_recommendations.append(translated_rec)
            treatment_recommendations = translated_recommendations

        # Create message for conversation history
        import uuid
        from datetime import datetime

        message_id = str(uuid.uuid4())
        image_message = {
            "message_id": message_id,
            "role": "user",
            "content": f"[Image uploaded: {image.filename}]",
            "language": language,
            "metadata": {"type": "image_upload", "filename": image.filename},
        }
        await session_manager.add_conversation_message(db, session_id, image_message)

        # Add assistant response to history
        assistant_message_id = str(uuid.uuid4())
        assistant_message = {
            "message_id": assistant_message_id,
            "role": "assistant",
            "content": f"Disease identified: {disease_result.get('disease_name', 'Unknown')}",
            "language": language,
            "sources": sources,
            "metadata": {
                "type": "disease_identification",
                "disease_info": disease_result,
                "treatment_recommendations": treatment_recommendations,
            },
        }
        await session_manager.add_conversation_message(
            db, session_id, assistant_message
        )

        return ImageUploadResponse(
            message_id=assistant_message_id,
            disease_info=disease_result,
            treatment_recommendations=treatment_recommendations,
            sources=sources,
            language=language,
            timestamp=datetime.utcnow().isoformat(),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process image upload: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process image upload",
        )


@router.get("/chat/{session_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: UUID,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """
    Get chat conversation history.

    Retrieves the conversation history for the specified session with pagination support.
    Returns messages in chronological order.
    """
    try:
        # Get session
        session = await session_manager.get_session(db, session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found or expired",
            )

        # Get conversation history
        conversation_history = session.conversation_history or []
        total_messages = len(conversation_history)

        # Apply pagination
        paginated_messages = conversation_history[offset : offset + limit]

        # Format messages
        formatted_messages = []
        for msg in paginated_messages:
            formatted_messages.append(
                ChatMessageResponse(
                    message_id=msg.get("message_id", ""),
                    role=msg.get("role", "user"),
                    content=msg.get("content", ""),
                    language=msg.get("language", "en"),
                    timestamp=msg.get("timestamp", ""),
                    sources=msg.get("sources"),
                    metadata=msg.get("metadata"),
                )
            )

        return ChatHistoryResponse(
            session_id=session_id,
            messages=formatted_messages,
            total_messages=total_messages,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get chat history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chat history",
        )


@router.delete("/chat/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def end_chat_session(session_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    End a chat session.

    Deactivates the chat session. The conversation history is preserved for audit purposes.
    """
    try:
        result = await session_manager.deactivate_session(db, session_id)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to end chat session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to end chat session",
        )
