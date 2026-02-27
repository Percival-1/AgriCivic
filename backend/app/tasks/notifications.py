"""
Celery tasks for notification processing and delivery.

This module contains background tasks for:
- Daily MSP update generation and delivery
- Weather alert processing and distribution
- Government scheme notifications
- Market price alerts
- Notification retry logic
- Delivery confirmation and analytics
"""

import asyncio
import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta

from celery import Task
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.celery_app import celery_app
from app.database import get_db_session
from app.services.notification_service import (
    get_notification_service,
    NotificationService,
    NotificationType,
    DeliveryStatus,
)
from app.models.notification import NotificationHistory, NotificationPreferences
from app.models.user import User

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """Base task class with database session management."""

    _db_session = None

    def after_return(self, *args, **kwargs):
        """Clean up after task execution."""
        if self._db_session:
            asyncio.run(self._close_session())

    async def _close_session(self):
        """Close database session."""
        if self._db_session:
            await self._db_session.close()
            self._db_session = None


def run_async(coro):
    """Helper to run async functions in Celery tasks."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        # No event loop in current thread, create a new one
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    try:
        return loop.run_until_complete(coro)
    finally:
        # Don't close the loop if it was already running
        if not loop.is_running():
            pass  # Keep the loop for reuse


@celery_app.task(
    name="app.tasks.notifications.send_daily_msp_updates",
    bind=True,
    base=DatabaseTask,
    max_retries=3,
    default_retry_delay=300,  # 5 minutes
)
def send_daily_msp_updates(self):
    """
    Celery task to send daily MSP (Minimum Support Price) updates.

    This task:
    1. Generates MSP updates for all user locations
    2. Sends notifications to subscribed users
    3. Records delivery status
    4. Handles failures with retry logic
    """
    try:
        logger.info("Starting daily MSP update task")

        async def _send_updates():
            async with get_db_session() as db_session:
                # Get notification service
                notification_service = await get_notification_service(db_session)

                # Generate MSP notifications
                msp_notifications = (
                    await notification_service.generate_daily_msp_updates()
                )
                logger.info(f"Generated {len(msp_notifications)} MSP notifications")

                # Send notifications
                results = await notification_service.send_msp_notifications(
                    msp_notifications
                )

                # Count successes and failures
                sent = sum(1 for r in results if r.status == DeliveryStatus.SENT)
                failed = sum(1 for r in results if r.status == DeliveryStatus.FAILED)

                logger.info(f"MSP updates: {sent} sent, {failed} failed")

                return {
                    "total": len(results),
                    "sent": sent,
                    "failed": failed,
                    "timestamp": datetime.utcnow().isoformat(),
                }

        result = run_async(_send_updates())
        return result

    except Exception as e:
        logger.error(f"Failed to send daily MSP updates: {e}")
        # Retry the task
        raise self.retry(exc=e)


@celery_app.task(
    name="app.tasks.notifications.process_weather_alerts",
    bind=True,
    base=DatabaseTask,
    max_retries=3,
    default_retry_delay=180,  # 3 minutes
)
def process_weather_alerts(self):
    """
    Celery task to process and send weather alerts.

    This task:
    1. Fetches weather data for all user locations
    2. Identifies weather alerts
    3. Sends notifications to affected users
    4. Records delivery status
    """
    try:
        logger.info("Starting weather alert processing task")

        async def _process_alerts():
            async with get_db_session() as db_session:
                # Get notification service
                notification_service = await get_notification_service(db_session)

                # Process weather alerts
                weather_alerts = await notification_service.process_weather_alerts()
                logger.info(f"Processed {len(weather_alerts)} weather alerts")

                if not weather_alerts:
                    logger.info("No weather alerts to send")
                    return {
                        "total": 0,
                        "sent": 0,
                        "failed": 0,
                        "timestamp": datetime.utcnow().isoformat(),
                    }

                # Send alert notifications
                results = await notification_service.send_weather_alert_notifications(
                    weather_alerts
                )

                # Count successes and failures
                sent = sum(1 for r in results if r.status == DeliveryStatus.SENT)
                failed = sum(1 for r in results if r.status == DeliveryStatus.FAILED)

                logger.info(f"Weather alerts: {sent} sent, {failed} failed")

                return {
                    "total": len(results),
                    "sent": sent,
                    "failed": failed,
                    "alerts_processed": len(weather_alerts),
                    "timestamp": datetime.utcnow().isoformat(),
                }

        result = run_async(_process_alerts())
        return result

    except Exception as e:
        logger.error(f"Failed to process weather alerts: {e}")
        # Retry the task
        raise self.retry(exc=e)


@celery_app.task(
    name="app.tasks.notifications.send_scheme_notification",
    bind=True,
    base=DatabaseTask,
    max_retries=3,
    default_retry_delay=300,  # 5 minutes
)
def send_scheme_notification(
    self, scheme_data: Dict[str, Any], eligible_user_ids: Optional[List[str]] = None
):
    """
    Celery task to send government scheme notifications.

    Args:
        scheme_data: Dictionary containing scheme information
        eligible_user_ids: Optional list of eligible user IDs

    This task:
    1. Sends scheme notifications to eligible users
    2. Records delivery status
    3. Handles failures with retry logic
    """
    try:
        logger.info(
            f"Sending scheme notification: {scheme_data.get('name', 'Unknown')}"
        )

        async def _send_notification():
            async with get_db_session() as db_session:
                # Get notification service
                notification_service = await get_notification_service(db_session)

                # Convert string UUIDs to UUID objects if provided
                user_ids = None
                if eligible_user_ids:
                    user_ids = [UUID(uid) for uid in eligible_user_ids]

                # Send scheme notifications
                results = await notification_service.send_scheme_notifications(
                    new_schemes=[scheme_data], eligible_users=user_ids
                )

                # Count successes and failures
                sent = sum(1 for r in results if r.status == DeliveryStatus.SENT)
                failed = sum(1 for r in results if r.status == DeliveryStatus.FAILED)

                logger.info(f"Scheme notification: {sent} sent, {failed} failed")

                return {
                    "total": len(results),
                    "sent": sent,
                    "failed": failed,
                    "scheme_name": scheme_data.get("name", "Unknown"),
                    "timestamp": datetime.utcnow().isoformat(),
                }

        result = run_async(_send_notification())
        return result

    except Exception as e:
        logger.error(f"Failed to send scheme notification: {e}")
        # Retry the task
        raise self.retry(exc=e)


@celery_app.task(
    name="app.tasks.notifications.retry_failed_notifications",
    bind=True,
    base=DatabaseTask,
    max_retries=2,
)
def retry_failed_notifications(self):
    """
    Celery task to retry failed notification deliveries.

    This task:
    1. Finds failed notifications from the last 24 hours
    2. Retries delivery for each failed notification
    3. Updates delivery status
    4. Limits retry attempts to prevent infinite loops
    """
    try:
        logger.info("Starting failed notification retry task")

        async def _retry_notifications():
            async with get_db_session() as db_session:
                # Find failed notifications from last 24 hours
                cutoff_time = datetime.utcnow() - timedelta(hours=24)

                query = (
                    select(NotificationHistory)
                    .where(
                        and_(
                            NotificationHistory.delivery_status
                            == DeliveryStatus.FAILED.value,
                            NotificationHistory.created_at >= cutoff_time,
                            # Only retry up to 3 times
                            or_(
                                NotificationHistory.additional_metadata[
                                    "retry_count"
                                ].astext.cast(int)
                                < 3,
                                NotificationHistory.additional_metadata[
                                    "retry_count"
                                ].is_(None),
                            ),
                        )
                    )
                    .limit(100)
                )  # Process max 100 at a time

                result = await db_session.execute(query)
                failed_notifications = result.scalars().all()

                logger.info(
                    f"Found {len(failed_notifications)} failed notifications to retry"
                )

                if not failed_notifications:
                    return {
                        "total": 0,
                        "retried": 0,
                        "succeeded": 0,
                        "failed": 0,
                        "timestamp": datetime.utcnow().isoformat(),
                    }

                # Get notification service
                notification_service = await get_notification_service(db_session)

                retried = 0
                succeeded = 0
                failed = 0

                for notification in failed_notifications:
                    try:
                        # Get retry count
                        metadata = notification.additional_metadata or {}
                        retry_count = metadata.get("retry_count", 0)

                        # Retry delivery
                        result = await notification_service._deliver_notification(
                            user_id=notification.user_id,
                            notification_type=NotificationType(
                                notification.notification_type
                            ),
                            channel=notification.channel,
                            message=notification.message,
                            language="en",  # Would get from user preferences
                        )

                        retried += 1

                        if result.status == DeliveryStatus.SENT:
                            succeeded += 1
                            # Update original notification status
                            notification.delivery_status = DeliveryStatus.SENT.value
                            notification.error_message = None
                        else:
                            failed += 1
                            # Increment retry count
                            metadata["retry_count"] = retry_count + 1
                            notification.additional_metadata = metadata

                        await db_session.commit()

                    except Exception as e:
                        logger.error(
                            f"Failed to retry notification {notification.id}: {e}"
                        )
                        failed += 1
                        continue

                logger.info(
                    f"Retry results: {retried} retried, {succeeded} succeeded, {failed} failed"
                )

                return {
                    "total": len(failed_notifications),
                    "retried": retried,
                    "succeeded": succeeded,
                    "failed": failed,
                    "timestamp": datetime.utcnow().isoformat(),
                }

        result = run_async(_retry_notifications())
        return result

    except Exception as e:
        logger.error(f"Failed to retry notifications: {e}")
        raise self.retry(exc=e)


@celery_app.task(
    name="app.tasks.notifications.update_delivery_status",
    bind=True,
    base=DatabaseTask,
)
def update_delivery_status(
    self, notification_id: str, status: str, error_message: Optional[str] = None
):
    """
    Celery task to update notification delivery status.

    Args:
        notification_id: UUID of the notification
        status: New delivery status
        error_message: Optional error message if delivery failed

    This task updates the delivery status of a notification based on
    callbacks from external services (SMS gateway, voice provider, etc.)
    """
    try:
        logger.info(f"Updating delivery status for notification {notification_id}")

        async def _update_status():
            async with get_db_session() as db_session:
                # Find notification
                query = select(NotificationHistory).where(
                    NotificationHistory.id == UUID(notification_id)
                )
                result = await db_session.execute(query)
                notification = result.scalar_one_or_none()

                if not notification:
                    logger.warning(f"Notification {notification_id} not found")
                    return {"success": False, "error": "Notification not found"}

                # Update status
                notification.delivery_status = status
                if error_message:
                    notification.error_message = error_message

                # Update metadata
                metadata = notification.additional_metadata or {}
                metadata["status_updated_at"] = datetime.utcnow().isoformat()
                notification.additional_metadata = metadata

                await db_session.commit()

                logger.info(
                    f"Updated notification {notification_id} status to {status}"
                )

                return {
                    "success": True,
                    "notification_id": notification_id,
                    "status": status,
                    "timestamp": datetime.utcnow().isoformat(),
                }

        result = run_async(_update_status())
        return result

    except Exception as e:
        logger.error(f"Failed to update delivery status: {e}")
        return {"success": False, "error": str(e)}


@celery_app.task(
    name="app.tasks.notifications.schedule_user_notification",
    bind=True,
    base=DatabaseTask,
    max_retries=3,
)
def schedule_user_notification(
    self,
    user_id: str,
    notification_type: str,
    message: str,
    channel: str = "sms",
    scheduled_time: Optional[str] = None,
):
    """
    Celery task to schedule a notification for a specific user.

    Args:
        user_id: UUID of the user
        notification_type: Type of notification
        message: Notification message
        channel: Delivery channel (default: sms)
        scheduled_time: Optional ISO format datetime for scheduled delivery

    This task allows scheduling notifications for specific users at specific times,
    respecting user preferences for notification timing.
    """
    try:
        # If scheduled time is in the future, reschedule the task
        if scheduled_time:
            scheduled_dt = datetime.fromisoformat(scheduled_time)
            if scheduled_dt > datetime.utcnow():
                eta = scheduled_dt
                logger.info(f"Rescheduling notification for {user_id} at {eta}")
                return self.apply_async(
                    args=[user_id, notification_type, message, channel, scheduled_time],
                    eta=eta,
                )

        logger.info(f"Sending scheduled notification to user {user_id}")

        async def _send_notification():
            async with get_db_session() as db_session:
                # Get notification service
                notification_service = await get_notification_service(db_session)

                # Send notification
                result = await notification_service._deliver_notification(
                    user_id=UUID(user_id),
                    notification_type=NotificationType(notification_type),
                    channel=channel,
                    message=message,
                    language="en",  # Would get from user preferences
                )

                logger.info(f"Scheduled notification sent: {result.status}")

                return {
                    "success": result.status == DeliveryStatus.SENT,
                    "notification_id": str(result.notification_id),
                    "status": result.status.value,
                    "timestamp": datetime.utcnow().isoformat(),
                }

        result = run_async(_send_notification())
        return result

    except Exception as e:
        logger.error(f"Failed to send scheduled notification: {e}")
        raise self.retry(exc=e)


@celery_app.task(
    name="app.tasks.notifications.send_bulk_notifications",
    bind=True,
    base=DatabaseTask,
    max_retries=2,
)
def send_bulk_notifications(
    self,
    user_ids: List[str],
    notification_type: str,
    message: str,
    channel: str = "sms",
):
    """
    Celery task to send bulk notifications to multiple users.

    Args:
        user_ids: List of user UUIDs
        notification_type: Type of notification
        message: Notification message
        channel: Delivery channel (default: sms)

    This task efficiently sends the same notification to multiple users,
    useful for broadcast messages and alerts.
    """
    try:
        logger.info(f"Sending bulk notification to {len(user_ids)} users")

        async def _send_bulk():
            async with get_db_session() as db_session:
                # Get notification service
                notification_service = await get_notification_service(db_session)

                results = []
                sent = 0
                failed = 0

                for user_id in user_ids:
                    try:
                        result = await notification_service._deliver_notification(
                            user_id=UUID(user_id),
                            notification_type=NotificationType(notification_type),
                            channel=channel,
                            message=message,
                            language="en",  # Would get from user preferences
                        )

                        if result.status == DeliveryStatus.SENT:
                            sent += 1
                        else:
                            failed += 1

                        results.append(
                            {
                                "user_id": user_id,
                                "status": result.status.value,
                                "notification_id": str(result.notification_id),
                            }
                        )

                    except Exception as e:
                        logger.error(f"Failed to send to user {user_id}: {e}")
                        failed += 1
                        results.append(
                            {
                                "user_id": user_id,
                                "status": "error",
                                "error": str(e),
                            }
                        )

                logger.info(f"Bulk notification: {sent} sent, {failed} failed")

                return {
                    "total": len(user_ids),
                    "sent": sent,
                    "failed": failed,
                    "results": results,
                    "timestamp": datetime.utcnow().isoformat(),
                }

        result = run_async(_send_bulk())
        return result

    except Exception as e:
        logger.error(f"Failed to send bulk notifications: {e}")
        raise self.retry(exc=e)
