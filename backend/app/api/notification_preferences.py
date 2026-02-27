"""
API endpoints for notification preferences and subscription management.

This module provides endpoints for:
- Getting user notification preferences
- Updating notification preferences
- Managing notification subscriptions
- Scheduling custom notifications
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import time
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.notification import NotificationPreferences
from app.models.user import User
from app.core.logging import get_logger
from app.tasks.notifications import schedule_user_notification

logger = get_logger(__name__)

router = APIRouter(
    prefix="/notification-preferences", tags=["Notification Preferences"]
)


# Pydantic models for request/response
class NotificationPreferencesRequest(BaseModel):
    """Request model for updating notification preferences."""

    daily_msp_updates: Optional[bool] = Field(
        None, description="Enable daily MSP updates"
    )
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

    id: UUID
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


class ScheduleNotificationRequest(BaseModel):
    """Request model for scheduling a custom notification."""

    user_id: UUID = Field(..., description="User ID to send notification to")
    notification_type: str = Field(..., description="Type of notification")
    message: str = Field(..., description="Notification message")
    channel: str = Field(default="sms", description="Delivery channel")
    scheduled_time: Optional[str] = Field(
        None, description="Scheduled delivery time (ISO format)"
    )


@router.get("/{user_id}", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    user_id: UUID,
    db_session: AsyncSession = Depends(get_db),
):
    """
    Get notification preferences for a user.

    Args:
        user_id: User UUID
        db_session: Database session

    Returns:
        NotificationPreferencesResponse with user's preferences

    Raises:
        HTTPException: If user not found or preferences not found
    """
    try:
        # Check if user exists
        user_query = select(User).where(User.id == user_id)
        user_result = await db_session.execute(user_query)
        user = user_result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User {user_id} not found",
            )

        # Get preferences
        prefs_query = select(NotificationPreferences).where(
            NotificationPreferences.user_id == user_id
        )
        prefs_result = await db_session.execute(prefs_query)
        preferences = prefs_result.scalar_one_or_none()

        if not preferences:
            # Create default preferences
            preferences = NotificationPreferences(
                user_id=user_id,
                daily_msp_updates=True,
                weather_alerts=True,
                scheme_notifications=True,
                market_price_alerts=False,
                preferred_channels=["sms"],
                preferred_time=time(8, 0),
                notification_frequency="daily",
            )
            db_session.add(preferences)
            await db_session.commit()
            await db_session.refresh(preferences)

        # Convert time to string for response
        response_data = {
            "id": preferences.id,
            "user_id": preferences.user_id,
            "daily_msp_updates": preferences.daily_msp_updates,
            "weather_alerts": preferences.weather_alerts,
            "scheme_notifications": preferences.scheme_notifications,
            "market_price_alerts": preferences.market_price_alerts,
            "preferred_channels": preferences.preferred_channels or ["sms"],
            "preferred_time": (
                preferences.preferred_time.strftime("%H:%M")
                if preferences.preferred_time
                else None
            ),
            "notification_frequency": preferences.notification_frequency,
            "notification_language": preferences.notification_language,
        }

        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get notification preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get notification preferences: {str(e)}",
        )


@router.put("/{user_id}", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    user_id: UUID,
    preferences_update: NotificationPreferencesRequest,
    db_session: AsyncSession = Depends(get_db),
):
    """
    Update notification preferences for a user.

    Args:
        user_id: User UUID
        preferences_update: Updated preferences
        db_session: Database session

    Returns:
        NotificationPreferencesResponse with updated preferences

    Raises:
        HTTPException: If user not found or update fails
    """
    try:
        # Check if user exists
        user_query = select(User).where(User.id == user_id)
        user_result = await db_session.execute(user_query)
        user = user_result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User {user_id} not found",
            )

        # Get or create preferences
        prefs_query = select(NotificationPreferences).where(
            NotificationPreferences.user_id == user_id
        )
        prefs_result = await db_session.execute(prefs_query)
        preferences = prefs_result.scalar_one_or_none()

        if not preferences:
            preferences = NotificationPreferences(user_id=user_id)
            db_session.add(preferences)

        # Update preferences
        update_data = preferences_update.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if field == "preferred_time" and value:
                # Parse time string (HH:MM format)
                try:
                    hour, minute = map(int, value.split(":"))
                    setattr(preferences, field, time(hour, minute))
                except ValueError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid time format. Use HH:MM format.",
                    )
            else:
                setattr(preferences, field, value)

        await db_session.commit()
        await db_session.refresh(preferences)

        # Convert time to string for response
        response_data = {
            "id": preferences.id,
            "user_id": preferences.user_id,
            "daily_msp_updates": preferences.daily_msp_updates,
            "weather_alerts": preferences.weather_alerts,
            "scheme_notifications": preferences.scheme_notifications,
            "market_price_alerts": preferences.market_price_alerts,
            "preferred_channels": preferences.preferred_channels or ["sms"],
            "preferred_time": (
                preferences.preferred_time.strftime("%H:%M")
                if preferences.preferred_time
                else None
            ),
            "notification_frequency": preferences.notification_frequency,
            "notification_language": preferences.notification_language,
        }

        logger.info(f"Updated notification preferences for user {user_id}")
        return response_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update notification preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update notification preferences: {str(e)}",
        )


@router.post("/schedule", status_code=status.HTTP_202_ACCEPTED)
async def schedule_notification(
    notification_request: ScheduleNotificationRequest,
    db_session: AsyncSession = Depends(get_db),
):
    """
    Schedule a custom notification for a user.

    Args:
        notification_request: Notification details
        db_session: Database session

    Returns:
        Task ID and status

    Raises:
        HTTPException: If user not found or scheduling fails
    """
    try:
        # Check if user exists
        user_query = select(User).where(User.id == notification_request.user_id)
        user_result = await db_session.execute(user_query)
        user = user_result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User {notification_request.user_id} not found",
            )

        # Schedule notification task
        task = schedule_user_notification.apply_async(
            args=[
                str(notification_request.user_id),
                notification_request.notification_type,
                notification_request.message,
                notification_request.channel,
                notification_request.scheduled_time,
            ]
        )

        logger.info(
            f"Scheduled notification task {task.id} for user {notification_request.user_id}"
        )

        return {
            "task_id": task.id,
            "status": "scheduled",
            "user_id": str(notification_request.user_id),
            "scheduled_time": notification_request.scheduled_time,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to schedule notification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to schedule notification: {str(e)}",
        )


@router.delete("/{user_id}/unsubscribe-all", status_code=status.HTTP_200_OK)
async def unsubscribe_all_notifications(
    user_id: UUID,
    db_session: AsyncSession = Depends(get_db),
):
    """
    Unsubscribe user from all notifications.

    Args:
        user_id: User UUID
        db_session: Database session

    Returns:
        Success message

    Raises:
        HTTPException: If user not found or unsubscribe fails
    """
    try:
        # Check if user exists
        user_query = select(User).where(User.id == user_id)
        user_result = await db_session.execute(user_query)
        user = user_result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User {user_id} not found",
            )

        # Get or create preferences
        prefs_query = select(NotificationPreferences).where(
            NotificationPreferences.user_id == user_id
        )
        prefs_result = await db_session.execute(prefs_query)
        preferences = prefs_result.scalar_one_or_none()

        if not preferences:
            preferences = NotificationPreferences(user_id=user_id)
            db_session.add(preferences)

        # Disable all notifications
        preferences.daily_msp_updates = False
        preferences.weather_alerts = False
        preferences.scheme_notifications = False
        preferences.market_price_alerts = False

        await db_session.commit()

        logger.info(f"Unsubscribed user {user_id} from all notifications")

        return {
            "success": True,
            "message": "Successfully unsubscribed from all notifications",
            "user_id": str(user_id),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to unsubscribe user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unsubscribe: {str(e)}",
        )
