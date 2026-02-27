"""
Celery tasks for notification analytics and tracking.

This module contains background tasks for:
- Notification delivery analytics aggregation
- Performance metrics calculation
- User engagement tracking
- Delivery success rate monitoring
"""

import asyncio
import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta

from celery import Task
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.celery_app import celery_app
from app.database import get_db_session
from app.models.notification import NotificationHistory
from app.services.notification_service import DeliveryStatus, NotificationType

logger = logging.getLogger(__name__)


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
    name="app.tasks.analytics.aggregate_notification_stats",
    bind=True,
    max_retries=2,
)
def aggregate_notification_stats(self):
    """
    Celery task to aggregate notification statistics.

    This task:
    1. Calculates daily notification metrics
    2. Computes delivery success rates
    3. Tracks channel performance
    4. Identifies trends and patterns
    """
    try:
        logger.info("Starting notification analytics aggregation")

        async def _aggregate_stats():
            async with get_db_session() as db_session:
                # Calculate stats for last 24 hours
                cutoff_time = datetime.utcnow() - timedelta(hours=24)

                # Total notifications by type
                type_query = (
                    select(
                        NotificationHistory.notification_type,
                        func.count(NotificationHistory.id).label("count"),
                    )
                    .where(NotificationHistory.created_at >= cutoff_time)
                    .group_by(NotificationHistory.notification_type)
                )
                type_result = await db_session.execute(type_query)
                notifications_by_type = {row[0]: row[1] for row in type_result}

                # Delivery status breakdown
                status_query = (
                    select(
                        NotificationHistory.delivery_status,
                        func.count(NotificationHistory.id).label("count"),
                    )
                    .where(NotificationHistory.created_at >= cutoff_time)
                    .group_by(NotificationHistory.delivery_status)
                )
                status_result = await db_session.execute(status_query)
                notifications_by_status = {row[0]: row[1] for row in status_result}

                # Channel performance
                channel_query = (
                    select(
                        NotificationHistory.channel,
                        NotificationHistory.delivery_status,
                        func.count(NotificationHistory.id).label("count"),
                    )
                    .where(NotificationHistory.created_at >= cutoff_time)
                    .group_by(
                        NotificationHistory.channel, NotificationHistory.delivery_status
                    )
                )
                channel_result = await db_session.execute(channel_query)
                channel_performance = {}
                for row in channel_result:
                    channel = row[0]
                    status = row[1]
                    count = row[2]
                    if channel not in channel_performance:
                        channel_performance[channel] = {}
                    channel_performance[channel][status] = count

                # Calculate success rates
                total_sent = notifications_by_status.get(DeliveryStatus.SENT.value, 0)
                total_delivered = notifications_by_status.get(
                    DeliveryStatus.DELIVERED.value, 0
                )
                total_failed = notifications_by_status.get(
                    DeliveryStatus.FAILED.value, 0
                )
                total_pending = notifications_by_status.get(
                    DeliveryStatus.PENDING.value, 0
                )

                total_notifications = sum(notifications_by_status.values())
                success_rate = (
                    (total_sent + total_delivered) / total_notifications * 100
                    if total_notifications > 0
                    else 0
                )

                stats = {
                    "period": "last_24_hours",
                    "timestamp": datetime.utcnow().isoformat(),
                    "total_notifications": total_notifications,
                    "by_type": notifications_by_type,
                    "by_status": notifications_by_status,
                    "by_channel": channel_performance,
                    "metrics": {
                        "success_rate": round(success_rate, 2),
                        "total_sent": total_sent,
                        "total_delivered": total_delivered,
                        "total_failed": total_failed,
                        "total_pending": total_pending,
                    },
                }

                logger.info(
                    f"Aggregated stats: {total_notifications} notifications, {success_rate:.2f}% success rate"
                )

                return stats

        result = run_async(_aggregate_stats())
        return result

    except Exception as e:
        logger.error(f"Failed to aggregate notification stats: {e}")
        raise self.retry(exc=e)


@celery_app.task(
    name="app.tasks.analytics.calculate_user_engagement",
    bind=True,
    max_retries=2,
)
def calculate_user_engagement(self, days: int = 7):
    """
    Celery task to calculate user engagement metrics.

    Args:
        days: Number of days to analyze (default: 7)

    This task:
    1. Calculates user engagement with notifications
    2. Identifies active vs inactive users
    3. Tracks notification preferences
    4. Provides insights for optimization
    """
    try:
        logger.info(f"Calculating user engagement for last {days} days")

        async def _calculate_engagement():
            async with get_db_session() as db_session:
                cutoff_time = datetime.utcnow() - timedelta(days=days)

                # Users who received notifications
                user_query = (
                    select(
                        NotificationHistory.user_id,
                        func.count(NotificationHistory.id).label("notification_count"),
                        func.count(
                            func.distinct(NotificationHistory.notification_type)
                        ).label("unique_types"),
                    )
                    .where(NotificationHistory.created_at >= cutoff_time)
                    .group_by(NotificationHistory.user_id)
                )
                user_result = await db_session.execute(user_query)
                user_engagement = [
                    {
                        "user_id": str(row[0]),
                        "notification_count": row[1],
                        "unique_types": row[2],
                    }
                    for row in user_result
                ]

                # Calculate engagement metrics
                total_users = len(user_engagement)
                if total_users > 0:
                    avg_notifications = (
                        sum(u["notification_count"] for u in user_engagement)
                        / total_users
                    )
                    highly_engaged = sum(
                        1
                        for u in user_engagement
                        if u["notification_count"] > avg_notifications
                    )
                else:
                    avg_notifications = 0
                    highly_engaged = 0

                engagement_stats = {
                    "period_days": days,
                    "timestamp": datetime.utcnow().isoformat(),
                    "total_users": total_users,
                    "avg_notifications_per_user": round(avg_notifications, 2),
                    "highly_engaged_users": highly_engaged,
                    "engagement_rate": (
                        round(highly_engaged / total_users * 100, 2)
                        if total_users > 0
                        else 0
                    ),
                }

                logger.info(
                    f"User engagement: {total_users} users, {avg_notifications:.2f} avg notifications"
                )

                return engagement_stats

        result = run_async(_calculate_engagement())
        return result

    except Exception as e:
        logger.error(f"Failed to calculate user engagement: {e}")
        raise self.retry(exc=e)


@celery_app.task(
    name="app.tasks.analytics.generate_delivery_report",
    bind=True,
    max_retries=2,
)
def generate_delivery_report(self, start_date: str, end_date: str):
    """
    Celery task to generate detailed delivery report.

    Args:
        start_date: Start date in ISO format
        end_date: End date in ISO format

    This task generates a comprehensive report of notification deliveries
    for a specific time period, useful for monitoring and optimization.
    """
    try:
        logger.info(f"Generating delivery report from {start_date} to {end_date}")

        async def _generate_report():
            async with get_db_session() as db_session:
                start_dt = datetime.fromisoformat(start_date)
                end_dt = datetime.fromisoformat(end_date)

                # Get all notifications in period
                query = select(NotificationHistory).where(
                    and_(
                        NotificationHistory.created_at >= start_dt,
                        NotificationHistory.created_at <= end_dt,
                    )
                )
                result = await db_session.execute(query)
                notifications = result.scalars().all()

                # Analyze notifications
                report = {
                    "period": {
                        "start": start_date,
                        "end": end_date,
                    },
                    "timestamp": datetime.utcnow().isoformat(),
                    "total_notifications": len(notifications),
                    "by_type": {},
                    "by_channel": {},
                    "by_status": {},
                    "failures": [],
                }

                for notif in notifications:
                    # Count by type
                    notif_type = notif.notification_type
                    report["by_type"][notif_type] = (
                        report["by_type"].get(notif_type, 0) + 1
                    )

                    # Count by channel
                    channel = notif.channel
                    report["by_channel"][channel] = (
                        report["by_channel"].get(channel, 0) + 1
                    )

                    # Count by status
                    status = notif.delivery_status
                    report["by_status"][status] = report["by_status"].get(status, 0) + 1

                    # Track failures
                    if status == DeliveryStatus.FAILED.value:
                        report["failures"].append(
                            {
                                "notification_id": str(notif.id),
                                "user_id": str(notif.user_id),
                                "type": notif_type,
                                "channel": channel,
                                "error": notif.error_message,
                                "timestamp": notif.created_at.isoformat(),
                            }
                        )

                # Calculate success rate
                total = len(notifications)
                sent = report["by_status"].get(DeliveryStatus.SENT.value, 0)
                delivered = report["by_status"].get(DeliveryStatus.DELIVERED.value, 0)
                report["success_rate"] = (
                    round((sent + delivered) / total * 100, 2) if total > 0 else 0
                )

                logger.info(
                    f"Generated report: {total} notifications, {report['success_rate']}% success rate"
                )

                return report

        result = run_async(_generate_report())
        return result

    except Exception as e:
        logger.error(f"Failed to generate delivery report: {e}")
        raise self.retry(exc=e)
