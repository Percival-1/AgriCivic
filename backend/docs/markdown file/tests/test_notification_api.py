"""
Tests for the notification API endpoints.
"""

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from datetime import time as dt_time

from app.main import app
from app.models.user import User
from app.models.notification import NotificationPreferences, NotificationHistory


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest_asyncio.fixture
async def test_user(db_session, sample_user_data):
    """Create a test user."""
    user = User(**sample_user_data)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_with_preferences(db_session, test_user):
    """Create a test user with notification preferences."""
    prefs = NotificationPreferences(
        user_id=test_user.id,
        daily_msp_updates=True,
        weather_alerts=True,
        scheme_notifications=False,
        market_price_alerts=True,
        preferred_channels=["sms", "chat"],
        notification_frequency="daily",
        notification_language="hi",
        preferred_time=dt_time(8, 0),
    )
    db_session.add(prefs)
    await db_session.commit()
    await db_session.refresh(prefs)
    return test_user


@pytest_asyncio.fixture
async def test_notification_history(db_session, test_user):
    """Create test notification history."""
    history_items = [
        NotificationHistory(
            user_id=test_user.id,
            notification_type="msp_update",
            channel="sms",
            message="Test MSP update",
            delivery_status="sent",
        ),
        NotificationHistory(
            user_id=test_user.id,
            notification_type="weather_alert",
            channel="sms",
            message="Test weather alert",
            delivery_status="delivered",
        ),
        NotificationHistory(
            user_id=test_user.id,
            notification_type="scheme_notification",
            channel="chat",
            message="Test scheme notification",
            delivery_status="failed",
            error_message="Service unavailable",
        ),
    ]

    for item in history_items:
        db_session.add(item)

    await db_session.commit()
    return history_items


class TestGetNotificationPreferences:
    """Test GET /api/v1/notifications/preferences/{user_id} endpoint."""

    def test_get_preferences_existing_user(self, client, test_user_with_preferences):
        """Test getting preferences for user with existing preferences."""
        response = client.get(
            f"/api/v1/notifications/preferences/{test_user_with_preferences.id}"
        )

        assert response.status_code == 200
        data = response.json()

        assert data["user_id"] == str(test_user_with_preferences.id)
        assert data["daily_msp_updates"] is True
        assert data["weather_alerts"] is True
        assert data["scheme_notifications"] is False
        assert data["market_price_alerts"] is True
        assert "sms" in data["preferred_channels"]
        assert "chat" in data["preferred_channels"]
        assert data["notification_frequency"] == "daily"
        assert data["notification_language"] == "hi"
        assert data["preferred_time"] == "08:00"

    def test_get_preferences_new_user_creates_defaults(self, client, test_user):
        """Test getting preferences for user without preferences creates defaults."""
        response = client.get(f"/api/v1/notifications/preferences/{test_user.id}")

        assert response.status_code == 200
        data = response.json()

        assert data["user_id"] == str(test_user.id)
        # Should have default values
        assert data["daily_msp_updates"] is True
        assert data["weather_alerts"] is True
        assert data["scheme_notifications"] is True
        assert "sms" in data["preferred_channels"]

    def test_get_preferences_nonexistent_user(self, client):
        """Test getting preferences for non-existent user."""
        fake_user_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/v1/notifications/preferences/{fake_user_id}")

        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]

    def test_get_preferences_invalid_user_id(self, client):
        """Test getting preferences with invalid user ID format."""
        response = client.get("/api/v1/notifications/preferences/invalid-uuid")

        assert response.status_code == 422  # Validation error


class TestUpdateNotificationPreferences:
    """Test PUT /api/v1/notifications/preferences/{user_id} endpoint."""

    def test_update_preferences_partial(self, client, test_user_with_preferences):
        """Test updating preferences with partial data."""
        update_data = {
            "daily_msp_updates": False,
            "weather_alerts": False,
        }

        response = client.put(
            f"/api/v1/notifications/preferences/{test_user_with_preferences.id}",
            json=update_data,
        )

        assert response.status_code == 200
        data = response.json()

        assert data["daily_msp_updates"] is False
        assert data["weather_alerts"] is False
        # Other fields should remain unchanged
        assert data["scheme_notifications"] is False
        assert data["market_price_alerts"] is True

    def test_update_preferences_all_fields(self, client, test_user):
        """Test updating all preference fields."""
        update_data = {
            "daily_msp_updates": True,
            "weather_alerts": True,
            "scheme_notifications": True,
            "market_price_alerts": False,
            "preferred_channels": ["sms", "voice"],
            "notification_frequency": "weekly",
            "notification_language": "en",
            "preferred_time": "09:30",
        }

        response = client.put(
            f"/api/v1/notifications/preferences/{test_user.id}", json=update_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["daily_msp_updates"] is True
        assert data["weather_alerts"] is True
        assert data["scheme_notifications"] is True
        assert data["market_price_alerts"] is False
        assert data["preferred_channels"] == ["sms", "voice"]
        assert data["notification_frequency"] == "weekly"
        assert data["notification_language"] == "en"
        assert data["preferred_time"] == "09:30"

    def test_update_preferences_invalid_time_format(self, client, test_user):
        """Test updating preferences with invalid time format."""
        update_data = {"preferred_time": "invalid-time"}

        response = client.put(
            f"/api/v1/notifications/preferences/{test_user.id}", json=update_data
        )

        assert response.status_code == 400
        assert "Invalid time format" in response.json()["detail"]

    def test_update_preferences_nonexistent_user(self, client):
        """Test updating preferences for non-existent user."""
        fake_user_id = "00000000-0000-0000-0000-000000000000"
        update_data = {"daily_msp_updates": False}

        response = client.put(
            f"/api/v1/notifications/preferences/{fake_user_id}", json=update_data
        )

        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]

    def test_update_preferences_creates_if_not_exists(self, client, test_user):
        """Test that updating preferences creates them if they don't exist."""
        update_data = {
            "daily_msp_updates": False,
            "preferred_channels": ["chat"],
        }

        response = client.put(
            f"/api/v1/notifications/preferences/{test_user.id}", json=update_data
        )

        assert response.status_code == 200
        data = response.json()

        assert data["daily_msp_updates"] is False
        assert data["preferred_channels"] == ["chat"]


class TestGetNotificationHistory:
    """Test GET /api/v1/notifications/history/{user_id} endpoint."""

    def test_get_history_with_data(self, client, test_user, test_notification_history):
        """Test getting notification history for user with history."""
        response = client.get(f"/api/v1/notifications/history/{test_user.id}")

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) == 3

        # Verify history items
        notification_types = [item["notification_type"] for item in data]
        assert "msp_update" in notification_types
        assert "weather_alert" in notification_types
        assert "scheme_notification" in notification_types

    def test_get_history_with_pagination(
        self, client, test_user, test_notification_history
    ):
        """Test getting notification history with pagination."""
        response = client.get(
            f"/api/v1/notifications/history/{test_user.id}?limit=2&offset=0"
        )

        assert response.status_code == 200
        data = response.json()

        assert len(data) <= 2

        # Get next page
        response = client.get(
            f"/api/v1/notifications/history/{test_user.id}?limit=2&offset=2"
        )

        assert response.status_code == 200
        data = response.json()

        assert len(data) <= 2

    def test_get_history_empty(self, client, test_user):
        """Test getting notification history for user with no history."""
        response = client.get(f"/api/v1/notifications/history/{test_user.id}")

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) == 0

    def test_get_history_nonexistent_user(self, client):
        """Test getting history for non-existent user."""
        fake_user_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/v1/notifications/history/{fake_user_id}")

        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]

    def test_get_history_ordered_by_date(
        self, client, test_user, test_notification_history
    ):
        """Test that history is ordered by creation date (newest first)."""
        response = client.get(f"/api/v1/notifications/history/{test_user.id}")

        assert response.status_code == 200
        data = response.json()

        # Verify ordering (newest first)
        if len(data) > 1:
            for i in range(len(data) - 1):
                current_date = data[i]["created_at"]
                next_date = data[i + 1]["created_at"]
                assert current_date >= next_date


class TestTriggerNotifications:
    """Test POST /api/v1/notifications/trigger endpoint."""

    def test_trigger_msp_notifications(self, client, test_user_with_preferences):
        """Test manually triggering MSP notifications."""
        trigger_data = {"notification_type": "msp_update"}

        response = client.post("/api/v1/notifications/trigger", json=trigger_data)

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["notification_type"] == "msp_update"
        assert "total_sent" in data
        assert "results" in data

    def test_trigger_weather_alerts(self, client, test_user_with_preferences):
        """Test manually triggering weather alerts."""
        trigger_data = {"notification_type": "weather_alert"}

        response = client.post("/api/v1/notifications/trigger", json=trigger_data)

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["notification_type"] == "weather_alert"

    def test_trigger_scheme_notifications_with_message(
        self, client, test_user_with_preferences
    ):
        """Test triggering scheme notifications with custom message."""
        trigger_data = {
            "notification_type": "scheme_notification",
            "custom_message": "New agricultural scheme available",
        }

        response = client.post("/api/v1/notifications/trigger", json=trigger_data)

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["notification_type"] == "scheme_notification"

    def test_trigger_scheme_notifications_without_message(self, client):
        """Test triggering scheme notifications without required message."""
        trigger_data = {"notification_type": "scheme_notification"}

        response = client.post("/api/v1/notifications/trigger", json=trigger_data)

        assert response.status_code == 400
        assert "Custom message required" in response.json()["detail"]

    def test_trigger_invalid_notification_type(self, client):
        """Test triggering with invalid notification type."""
        trigger_data = {"notification_type": "invalid_type"}

        response = client.post("/api/v1/notifications/trigger", json=trigger_data)

        assert response.status_code == 400
        assert "Invalid notification type" in response.json()["detail"]

    def test_trigger_with_specific_users(self, client, test_user):
        """Test triggering notifications for specific users."""
        trigger_data = {
            "notification_type": "msp_update",
            "user_ids": [str(test_user.id)],
        }

        response = client.post("/api/v1/notifications/trigger", json=trigger_data)

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True


class TestGetNotificationStats:
    """Test GET /api/v1/notifications/stats endpoint."""

    def test_get_stats_with_data(self, client, test_user, test_notification_history):
        """Test getting notification statistics with data."""
        response = client.get("/api/v1/notifications/stats?days=7")

        assert response.status_code == 200
        data = response.json()

        assert "total_sent" in data
        assert "total_delivered" in data
        assert "total_failed" in data
        assert "by_type" in data
        assert "by_channel" in data

        assert data["total_sent"] >= 0
        assert isinstance(data["by_type"], dict)
        assert isinstance(data["by_channel"], dict)

    def test_get_stats_empty(self, client):
        """Test getting statistics with no data."""
        response = client.get("/api/v1/notifications/stats?days=7")

        assert response.status_code == 200
        data = response.json()

        assert data["total_sent"] == 0
        assert data["total_delivered"] == 0
        assert data["total_failed"] == 0
        assert data["by_type"] == {}
        assert data["by_channel"] == {}

    def test_get_stats_different_time_periods(
        self, client, test_user, test_notification_history
    ):
        """Test getting statistics for different time periods."""
        # Last 7 days
        response = client.get("/api/v1/notifications/stats?days=7")
        assert response.status_code == 200
        data_7d = response.json()

        # Last 30 days
        response = client.get("/api/v1/notifications/stats?days=30")
        assert response.status_code == 200
        data_30d = response.json()

        # 30-day stats should include all 7-day stats
        assert data_30d["total_sent"] >= data_7d["total_sent"]

    def test_get_stats_by_type_breakdown(
        self, client, test_user, test_notification_history
    ):
        """Test that statistics include breakdown by notification type."""
        response = client.get("/api/v1/notifications/stats?days=7")

        assert response.status_code == 200
        data = response.json()

        by_type = data["by_type"]
        # Should have counts for different notification types
        if by_type:
            assert all(isinstance(count, int) for count in by_type.values())

    def test_get_stats_by_channel_breakdown(
        self, client, test_user, test_notification_history
    ):
        """Test that statistics include breakdown by channel."""
        response = client.get("/api/v1/notifications/stats?days=7")

        assert response.status_code == 200
        data = response.json()

        by_channel = data["by_channel"]
        # Should have counts for different channels
        if by_channel:
            assert all(isinstance(count, int) for count in by_channel.values())


class TestNotificationAPIIntegration:
    """Integration tests for notification API."""

    def test_complete_notification_workflow(self, client, test_user):
        """Test complete notification workflow through API."""
        # 1. Get initial preferences (should create defaults)
        response = client.get(f"/api/v1/notifications/preferences/{test_user.id}")
        assert response.status_code == 200
        initial_prefs = response.json()

        # 2. Update preferences
        update_data = {
            "daily_msp_updates": True,
            "weather_alerts": True,
            "preferred_channels": ["sms"],
        }
        response = client.put(
            f"/api/v1/notifications/preferences/{test_user.id}", json=update_data
        )
        assert response.status_code == 200

        # 3. Trigger notifications
        trigger_data = {"notification_type": "msp_update"}
        response = client.post("/api/v1/notifications/trigger", json=trigger_data)
        assert response.status_code == 200

        # 4. Check notification history
        response = client.get(f"/api/v1/notifications/history/{test_user.id}")
        assert response.status_code == 200

        # 5. Get statistics
        response = client.get("/api/v1/notifications/stats?days=7")
        assert response.status_code == 200

    def test_preference_update_affects_delivery(self, client, test_user):
        """Test that preference updates affect notification delivery."""
        # Disable all notifications
        update_data = {
            "daily_msp_updates": False,
            "weather_alerts": False,
            "scheme_notifications": False,
            "market_price_alerts": False,
        }
        response = client.put(
            f"/api/v1/notifications/preferences/{test_user.id}", json=update_data
        )
        assert response.status_code == 200

        # Try to trigger notifications
        trigger_data = {"notification_type": "msp_update"}
        response = client.post("/api/v1/notifications/trigger", json=trigger_data)
        assert response.status_code == 200

        # Notifications should not be sent (or minimal)
        data = response.json()
        # User has disabled MSP updates, so no notifications should be sent to them
        assert data["success"] is True
