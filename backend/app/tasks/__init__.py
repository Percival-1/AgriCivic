"""
Celery tasks package for background job processing.
"""

from app.tasks.notifications import (
    send_daily_msp_updates,
    process_weather_alerts,
    send_scheme_notification,
    retry_failed_notifications,
    update_delivery_status,
    schedule_user_notification,
    send_bulk_notifications,
)
from app.tasks.maintenance import cleanup_expired_sessions
from app.tasks.analytics import (
    aggregate_notification_stats,
    calculate_user_engagement,
    generate_delivery_report,
)

__all__ = [
    "send_daily_msp_updates",
    "process_weather_alerts",
    "send_scheme_notification",
    "retry_failed_notifications",
    "update_delivery_status",
    "schedule_user_notification",
    "send_bulk_notifications",
    "cleanup_expired_sessions",
    "aggregate_notification_stats",
    "calculate_user_engagement",
    "generate_delivery_report",
]
