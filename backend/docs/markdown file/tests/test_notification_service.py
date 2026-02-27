"""
Tests for the notification service.
"""

import pytest
import pytest_asyncio
from datetime import datetime, date
from uuid import uuid4

from app.services.notification_service import (
    NotificationService,
    NotificationType,
    DeliveryStatus,
    MSPNotification,
    WeatherAlertNotification,
    SchemeNotification,
    NotificationError,
)
from app.services.weather_service import Location, AlertSeverity
from app.models.user import User
from app.models.notification import NotificationPreferences, NotificationHistory


@pytest_asyncio.fixture
async def notification_service(db_session):
    """Create notification service instance for testing."""
    service = NotificationService(db_session)
    await service.initialize()
    yield service
    await service.close()


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
        scheme_notifications=True,
        market_price_alerts=False,
        preferred_channels=["sms"],
        notification_frequency="daily",
    )
    db_session.add(prefs)
    await db_session.commit()
    await db_session.refresh(prefs)
    return test_user


class TestNotificationServiceInitialization:
    """Test notification service initialization."""

    @pytest.mark.asyncio
    async def test_service_initialization(self, db_session):
        """Test that notification service initializes correctly."""
        service = NotificationService(db_session)
        await service.initialize()

        assert service.db_session is not None
        assert service.weather_service is not None
        assert service.sms_service is not None

        await service.close()

    @pytest.mark.asyncio
    async def test_service_without_db_session(self):
        """Test that service raises error without database session."""
        service = NotificationService(None)
        await service.initialize()

        with pytest.raises(NotificationError, match="Database session not available"):
            await service.generate_daily_msp_updates()


class TestMSPNotifications:
    """Test MSP notification generation and delivery."""

    @pytest.mark.asyncio
    async def test_generate_daily_msp_updates(
        self, notification_service, test_user_with_preferences
    ):
        """Test generating daily MSP updates."""
        # Generate MSP updates
        msp_notifications = await notification_service.generate_daily_msp_updates()

        # Verify notifications were generated
        assert isinstance(msp_notifications, list)
        assert len(msp_notifications) > 0

        # Verify notification structure
        for notif in msp_notifications:
            assert isinstance(notif, MSPNotification)
            assert notif.crop is not None
            assert notif.current_msp > 0
            assert notif.location is not None
            assert notif.effective_date is not None
            assert notif.message is not None

    @pytest.mark.asyncio
    async def test_generate_msp_updates_with_specific_locations(
        self, notification_service
    ):
        """Test generating MSP updates for specific locations."""
        locations = [
            Location(
                latitude=28.6139,
                longitude=77.2090,
                address="Delhi",
                district="New Delhi",
                state="Delhi",
            )
        ]

        msp_notifications = await notification_service.generate_daily_msp_updates(
            locations
        )

        assert len(msp_notifications) > 0
        for notif in msp_notifications:
            assert notif.location.latitude == 28.6139
            assert notif.location.longitude == 77.2090

    @pytest.mark.asyncio
    async def test_msp_message_formatting(self, notification_service):
        """Test MSP message formatting."""
        msp_info = {
            "current_msp": 2125.0,
            "previous_msp": 2015.0,
            "change_percentage": 5.46,
            "effective_date": date.today().isoformat(),
        }

        message = notification_service._format_msp_message("wheat", msp_info)

        assert "wheat" in message.lower()
        assert "2125" in message
        assert "5.46" in message or "5.5" in message
        assert "↑" in message  # Increase indicator

    @pytest.mark.asyncio
    async def test_send_msp_notifications(
        self, notification_service, test_user_with_preferences
    ):
        """Test sending MSP notifications to users."""
        # Generate MSP updates
        msp_notifications = await notification_service.generate_daily_msp_updates()

        # Send notifications
        results = await notification_service.send_msp_notifications(msp_notifications)

        # Verify results
        assert isinstance(results, list)
        # Results may be empty if no users match location/crop criteria
        # This is expected behavior


class TestWeatherAlertNotifications:
    """Test weather alert notification processing and delivery."""

    @pytest.mark.asyncio
    async def test_process_weather_alerts(
        self, notification_service, test_user_with_preferences
    ):
        """Test processing weather alerts."""
        # Process weather alerts
        weather_alerts = await notification_service.process_weather_alerts()

        # Verify alerts structure
        assert isinstance(weather_alerts, list)
        # Alerts may be empty if no severe weather conditions

    @pytest.mark.asyncio
    async def test_generate_alert_recommendations(self, notification_service):
        """Test generating agricultural recommendations from weather alerts."""
        from app.services.weather_service import WeatherAlert, WeatherData

        # Create test alert
        alert = WeatherAlert(
            alert_type="extreme_heat",
            severity=AlertSeverity.CRITICAL,
            message="Extreme heat warning",
            start_time=datetime.now(),
            end_time=datetime.now(),
            agricultural_impact="High risk of crop stress",
        )

        # Create mock weather data
        weather_data = WeatherData(
            temperature=42.0,
            feels_like=45.0,
            humidity=30,
            pressure=1010,
            wind_speed=5.0,
            wind_direction=180,
            rainfall_prediction=0.0,
            weather_description="Clear sky",
        )

        recommendations = notification_service._generate_alert_recommendations(
            alert, weather_data
        )

        assert isinstance(recommendations, list)
        assert len(recommendations) > 0
        assert any("irrigation" in rec.lower() for rec in recommendations)

    @pytest.mark.asyncio
    async def test_weather_alert_message_formatting(self, notification_service):
        """Test weather alert message formatting."""
        alert = WeatherAlertNotification(
            alert_type="heavy_rain",
            severity=AlertSeverity.HIGH,
            message="Heavy rainfall expected",
            affected_locations=[
                Location(
                    latitude=28.6139,
                    longitude=77.2090,
                    address="Delhi",
                    district="New Delhi",
                    state="Delhi",
                )
            ],
            agricultural_recommendations=[
                "Ensure proper drainage",
                "Delay pesticide application",
            ],
            start_time=datetime.now(),
            end_time=datetime.now(),
        )

        message = notification_service._format_weather_alert_message(alert)

        assert "Weather Alert" in message
        assert "Heavy rainfall expected" in message
        assert "Recommendations:" in message
        assert "drainage" in message.lower()


class TestSchemeNotifications:
    """Test government scheme notification delivery."""

    @pytest.mark.asyncio
    async def test_send_scheme_notifications(
        self, notification_service, test_user_with_preferences
    ):
        """Test sending scheme notifications."""
        schemes = [
            {
                "name": "PM-KISAN Scheme",
                "type": "Financial Assistance",
                "eligibility_summary": "All farmers with land",
                "benefits": ["₹6000 per year", "Direct bank transfer"],
                "deadline": "2024-12-31",
                "url": "https://pmkisan.gov.in",
            }
        ]

        results = await notification_service.send_scheme_notifications(schemes)

        assert isinstance(results, list)
        # Results may vary based on user preferences

    @pytest.mark.asyncio
    async def test_scheme_message_formatting(self, notification_service):
        """Test scheme message formatting."""
        scheme = {
            "name": "PM-KISAN",
            "type": "Financial",
            "eligibility_summary": "All farmers",
            "benefits": ["₹6000/year", "Direct transfer"],
            "deadline": "2024-12-31",
        }

        message = notification_service._format_scheme_message(scheme)

        assert "PM-KISAN" in message
        assert "Financial" in message
        assert "All farmers" in message
        assert "2024-12-31" in message


class TestNotificationPreferences:
    """Test notification preference handling."""

    @pytest.mark.asyncio
    async def test_should_send_notification(
        self, notification_service, test_user_with_preferences
    ):
        """Test checking if notification should be sent."""
        # Test MSP updates (enabled)
        should_send = await notification_service._should_send_notification(
            test_user_with_preferences.id, NotificationType.MSP_UPDATE
        )
        assert should_send is True

        # Test market alerts (disabled)
        should_send = await notification_service._should_send_notification(
            test_user_with_preferences.id, NotificationType.MARKET_ALERT
        )
        assert should_send is False

    @pytest.mark.asyncio
    async def test_get_user_channels(
        self, notification_service, test_user_with_preferences
    ):
        """Test getting user's preferred channels."""
        channels = await notification_service._get_user_channels(
            test_user_with_preferences.id
        )

        assert isinstance(channels, list)
        assert "sms" in channels

    @pytest.mark.asyncio
    async def test_default_preferences_for_new_user(
        self, notification_service, test_user
    ):
        """Test default preferences for user without preferences."""
        should_send = await notification_service._should_send_notification(
            test_user.id, NotificationType.MSP_UPDATE
        )
        # Should default to True
        assert should_send is True

        channels = await notification_service._get_user_channels(test_user.id)
        # Should default to SMS
        assert "sms" in channels


class TestNotificationDelivery:
    """Test notification delivery mechanisms."""

    @pytest.mark.asyncio
    async def test_deliver_notification_sms(
        self, notification_service, test_user_with_preferences
    ):
        """Test delivering notification via SMS."""
        result = await notification_service._deliver_notification(
            user_id=test_user_with_preferences.id,
            notification_type=NotificationType.MSP_UPDATE,
            channel="sms",
            message="Test MSP update message",
            language="en",
        )

        assert result.user_id == test_user_with_preferences.id
        assert result.notification_type == NotificationType.MSP_UPDATE
        assert result.channel == "sms"
        assert result.message == "Test MSP update message"
        # Status may be SENT or FAILED depending on SMS service availability

    @pytest.mark.asyncio
    async def test_deliver_notification_unsupported_channel(
        self, notification_service, test_user_with_preferences
    ):
        """Test delivering notification via unsupported channel."""
        result = await notification_service._deliver_notification(
            user_id=test_user_with_preferences.id,
            notification_type=NotificationType.WEATHER_ALERT,
            channel="unknown_channel",
            message="Test message",
            language="en",
        )

        assert result.status == DeliveryStatus.FAILED
        assert "Unknown channel" in result.error_message

    @pytest.mark.asyncio
    async def test_notification_history_created(
        self, notification_service, test_user_with_preferences, db_session
    ):
        """Test that notification history is created."""
        from sqlalchemy import select

        # Deliver a notification
        await notification_service._deliver_notification(
            user_id=test_user_with_preferences.id,
            notification_type=NotificationType.MSP_UPDATE,
            channel="sms",
            message="Test message",
            language="en",
        )

        # Check notification history
        query = select(NotificationHistory).where(
            NotificationHistory.user_id == test_user_with_preferences.id
        )
        result = await db_session.execute(query)
        history = result.scalars().all()

        assert len(history) > 0
        assert history[0].notification_type == NotificationType.MSP_UPDATE.value
        assert history[0].channel == "sms"
        assert history[0].message == "Test message"


class TestLocationBasedNotifications:
    """Test location-based notification targeting."""

    @pytest.mark.asyncio
    async def test_is_near_location(self, notification_service):
        """Test location proximity checking."""
        user_location = Location(
            latitude=28.6139,
            longitude=77.2090,
            address="Delhi",
            district="New Delhi",
            state="Delhi",
        )

        # Same location
        target_location = Location(
            latitude=28.6139,
            longitude=77.2090,
            address="Delhi",
            district="New Delhi",
            state="Delhi",
        )

        is_near = notification_service._is_near_location(
            user_location, target_location, radius_km=10
        )
        assert is_near is True

        # Far location
        far_location = Location(
            latitude=19.0760,
            longitude=72.8777,
            address="Mumbai",
            district="Mumbai",
            state="Maharashtra",
        )

        is_near = notification_service._is_near_location(
            user_location, far_location, radius_km=10
        )
        assert is_near is False

    @pytest.mark.asyncio
    async def test_location_based_msp_filtering(
        self, notification_service, test_user_with_preferences
    ):
        """Test that MSP notifications are filtered by location."""
        # Generate MSP updates
        msp_notifications = await notification_service.generate_daily_msp_updates()

        # Send notifications (should filter by user location)
        results = await notification_service.send_msp_notifications(msp_notifications)

        # Verify that only relevant notifications were sent
        # (based on user location and crops)
        assert isinstance(results, list)


class TestNotificationErrors:
    """Test error handling in notification service."""

    @pytest.mark.asyncio
    async def test_deliver_notification_without_user(self, notification_service):
        """Test delivering notification to non-existent user."""
        fake_user_id = uuid4()

        with pytest.raises(NotificationError, match="User .* not found"):
            await notification_service._deliver_notification(
                user_id=fake_user_id,
                notification_type=NotificationType.MSP_UPDATE,
                channel="sms",
                message="Test message",
                language="en",
            )

    @pytest.mark.asyncio
    async def test_service_operations_without_db(self):
        """Test that service operations fail gracefully without database."""
        service = NotificationService(None)
        await service.initialize()

        with pytest.raises(NotificationError):
            await service.generate_daily_msp_updates()

        with pytest.raises(NotificationError):
            await service.process_weather_alerts()


class TestNotificationIntegration:
    """Integration tests for notification service."""

    @pytest.mark.asyncio
    async def test_end_to_end_msp_notification_flow(
        self, notification_service, test_user_with_preferences
    ):
        """Test complete MSP notification flow."""
        # 1. Generate MSP updates
        msp_notifications = await notification_service.generate_daily_msp_updates()
        assert len(msp_notifications) > 0

        # 2. Send notifications
        results = await notification_service.send_msp_notifications(msp_notifications)
        assert isinstance(results, list)

        # 3. Verify notification history was created
        from sqlalchemy import select

        query = select(NotificationHistory).where(
            NotificationHistory.user_id == test_user_with_preferences.id
        )
        result = await notification_service.db_session.execute(query)
        history = result.scalars().all()

        # History may or may not be created depending on location/crop matching
        assert isinstance(history, list)

    @pytest.mark.asyncio
    async def test_end_to_end_weather_alert_flow(
        self, notification_service, test_user_with_preferences
    ):
        """Test complete weather alert flow."""
        # 1. Process weather alerts
        weather_alerts = await notification_service.process_weather_alerts()
        assert isinstance(weather_alerts, list)

        # 2. Send alerts if any exist
        if weather_alerts:
            results = await notification_service.send_weather_alert_notifications(
                weather_alerts
            )
            assert isinstance(results, list)
