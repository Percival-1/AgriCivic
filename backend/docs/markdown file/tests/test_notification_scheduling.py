"""
Tests for notification scheduling system.

This module tests:
- Celery task execution
- Notification preferences management
- Delivery tracking
- Retry logic
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from app.tasks.notifications import (
    send_daily_msp_updates,
    process_weather_alerts,
    send_scheme_notification,
    retry_failed_notifications,
    schedule_user_notification,
    send_bulk_notifications,
)
from app.tasks.analytics import (
    aggregate_notification_stats,
    calculate_user_engagement,
    generate_delivery_report,
)
from app.tasks.maintenance import cleanup_expired_sessions


class TestNotificationTasks:
    """Test notification Celery tasks."""

    def test_send_daily_msp_updates_task_exists(self):
        """Test that send_daily_msp_updates task is registered."""
        assert send_daily_msp_updates is not None
        assert (
            send_daily_msp_updates.name
            == "app.tasks.notifications.send_daily_msp_updates"
        )

    def test_process_weather_alerts_task_exists(self):
        """Test that process_weather_alerts task is registered."""
        assert process_weather_alerts is not None
        assert (
            process_weather_alerts.name
            == "app.tasks.notifications.process_weather_alerts"
        )

    def test_send_scheme_notification_task_exists(self):
        """Test that send_scheme_notification task is registered."""
        assert send_scheme_notification is not None
        assert (
            send_scheme_notification.name
            == "app.tasks.notifications.send_scheme_notification"
        )

    def test_retry_failed_notifications_task_exists(self):
        """Test that retry_failed_notifications task is registered."""
        assert retry_failed_notifications is not None
        assert (
            retry_failed_notifications.name
            == "app.tasks.notifications.retry_failed_notifications"
        )

    def test_schedule_user_notification_task_exists(self):
        """Test that schedule_user_notification task is registered."""
        assert schedule_user_notification is not None
        assert (
            schedule_user_notification.name
            == "app.tasks.notifications.schedule_user_notification"
        )

    def test_send_bulk_notifications_task_exists(self):
        """Test that send_bulk_notifications task is registered."""
        assert send_bulk_notifications is not None
        assert (
            send_bulk_notifications.name
            == "app.tasks.notifications.send_bulk_notifications"
        )


class TestAnalyticsTasks:
    """Test analytics Celery tasks."""

    def test_aggregate_notification_stats_task_exists(self):
        """Test that aggregate_notification_stats task is registered."""
        assert aggregate_notification_stats is not None
        assert (
            aggregate_notification_stats.name
            == "app.tasks.analytics.aggregate_notification_stats"
        )

    def test_calculate_user_engagement_task_exists(self):
        """Test that calculate_user_engagement task is registered."""
        assert calculate_user_engagement is not None
        assert (
            calculate_user_engagement.name
            == "app.tasks.analytics.calculate_user_engagement"
        )

    def test_generate_delivery_report_task_exists(self):
        """Test that generate_delivery_report task is registered."""
        assert generate_delivery_report is not None
        assert (
            generate_delivery_report.name
            == "app.tasks.analytics.generate_delivery_report"
        )


class TestMaintenanceTasks:
    """Test maintenance Celery tasks."""

    def test_cleanup_expired_sessions_task_exists(self):
        """Test that cleanup_expired_sessions task is registered."""
        assert cleanup_expired_sessions is not None
        assert (
            cleanup_expired_sessions.name
            == "app.tasks.maintenance.cleanup_expired_sessions"
        )


class TestTaskConfiguration:
    """Test Celery task configuration."""

    def test_task_retry_configuration(self):
        """Test that tasks have proper retry configuration."""
        # Check send_daily_msp_updates retry config
        assert send_daily_msp_updates.max_retries == 3
        assert send_daily_msp_updates.default_retry_delay == 300

        # Check process_weather_alerts retry config
        assert process_weather_alerts.max_retries == 3
        assert process_weather_alerts.default_retry_delay == 180

    def test_task_names_are_unique(self):
        """Test that all task names are unique."""
        task_names = [
            send_daily_msp_updates.name,
            process_weather_alerts.name,
            send_scheme_notification.name,
            retry_failed_notifications.name,
            schedule_user_notification.name,
            send_bulk_notifications.name,
            aggregate_notification_stats.name,
            calculate_user_engagement.name,
            generate_delivery_report.name,
            cleanup_expired_sessions.name,
        ]

        assert len(task_names) == len(set(task_names)), "Task names must be unique"


class TestNotificationPreferences:
    """Test notification preferences functionality."""

    def test_notification_types(self):
        """Test that all notification types are defined."""
        from app.services.notification_service import NotificationType

        assert NotificationType.MSP_UPDATE == "msp_update"
        assert NotificationType.WEATHER_ALERT == "weather_alert"
        assert NotificationType.SCHEME_NOTIFICATION == "scheme_notification"
        assert NotificationType.MARKET_ALERT == "market_alert"

    def test_delivery_status_types(self):
        """Test that all delivery status types are defined."""
        from app.services.notification_service import DeliveryStatus

        assert DeliveryStatus.PENDING == "pending"
        assert DeliveryStatus.SENT == "sent"
        assert DeliveryStatus.DELIVERED == "delivered"
        assert DeliveryStatus.FAILED == "failed"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
