"""
Celery application configuration for background task processing.

This module configures Celery for handling:
- Scheduled notification delivery
- Background job processing
- Periodic task execution
- Retry logic and error handling
"""

from celery import Celery
from celery.schedules import crontab
from kombu import Exchange, Queue

from app.config import get_settings

settings = get_settings()

# Create Celery application
celery_app = Celery(
    "agri_civic_platform",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

# Celery configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Task execution settings
    task_track_started=True,
    task_time_limit=300,  # 5 minutes hard limit
    task_soft_time_limit=240,  # 4 minutes soft limit
    task_acks_late=True,  # Acknowledge tasks after completion
    task_reject_on_worker_lost=True,
    # Result backend settings
    result_expires=3600,  # Results expire after 1 hour
    result_persistent=True,
    # Worker settings
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    # Retry settings
    task_default_retry_delay=60,  # 1 minute
    task_max_retries=3,
    # Queue configuration
    task_default_queue="default",
    task_default_exchange="default",
    task_default_routing_key="default",
    # Task routes
    task_routes={
        "app.tasks.notifications.*": {"queue": "notifications"},
        "app.tasks.analytics.*": {"queue": "analytics"},
    },
)

# Define queues
celery_app.conf.task_queues = (
    Queue("default", Exchange("default"), routing_key="default"),
    Queue("notifications", Exchange("notifications"), routing_key="notifications"),
    Queue("analytics", Exchange("analytics"), routing_key="analytics"),
)

# Periodic task schedule
celery_app.conf.beat_schedule = {
    # Daily MSP updates - TESTING: every 5 minutes (change back to: crontab(hour=8, minute=0))
    "send-daily-msp-updates": {
        "task": "app.tasks.notifications.send_daily_msp_updates",
        "schedule": crontab(minute="*/5"),  # Every 5 minutes for testing
        "options": {"queue": "notifications"},
    },
    # Weather alerts - TESTING: every 5 minutes (change back to: crontab(minute=0, hour="*/3"))
    "process-weather-alerts": {
        "task": "app.tasks.notifications.process_weather_alerts",
        "schedule": crontab(minute="*/5"),  # Every 5 minutes for testing
        "options": {"queue": "notifications"},
    },
    # Session cleanup every hour
    "cleanup-expired-sessions": {
        "task": "app.tasks.maintenance.cleanup_expired_sessions",
        "schedule": crontab(minute=0),
        "options": {"queue": "default"},
    },
    # Notification retry processing every 15 minutes
    "retry-failed-notifications": {
        "task": "app.tasks.notifications.retry_failed_notifications",
        "schedule": crontab(minute="*/15"),
        "options": {"queue": "notifications"},
    },
    # Notification analytics aggregation daily at midnight
    "aggregate-notification-stats": {
        "task": "app.tasks.analytics.aggregate_notification_stats",
        "schedule": crontab(hour=0, minute=0),
        "options": {"queue": "analytics"},
    },
}

# Import tasks to register them
celery_app.autodiscover_tasks(["app.tasks"])
