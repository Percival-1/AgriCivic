"""
Notification service for the AI-Driven Agri-Civic Intelligence Platform.

This service handles proactive notification generation and delivery including:
- Daily MSP (Minimum Support Price) updates
- Weather alerts and warnings
- Government scheme notifications
- Market price alerts
- Multi-channel delivery (SMS, voice, chat)
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime, date, time, timedelta
from enum import Enum
from uuid import UUID

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.logging import get_logger
from app.models.user import User
from app.models.notification import NotificationPreferences, NotificationHistory
from app.services.weather_service import (
    WeatherService,
    WeatherAlert,
    AlertSeverity,
    Location,
)
from app.services.sms_service import get_sms_service

# Configure logging
logger = get_logger(__name__)


class NotificationType(str, Enum):
    """Types of notifications."""

    MSP_UPDATE = "msp_update"
    WEATHER_ALERT = "weather_alert"
    SCHEME_NOTIFICATION = "scheme_notification"
    MARKET_ALERT = "market_alert"


class DeliveryStatus(str, Enum):
    """Notification delivery status."""

    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"


@dataclass
class MSPNotification:
    """MSP (Minimum Support Price) notification data."""

    crop: str
    current_msp: float
    location: Location
    effective_date: str
    message: str
    previous_msp: Optional[float] = None
    change_percentage: Optional[float] = None


@dataclass
class WeatherAlertNotification:
    """Weather alert notification data."""

    alert_type: str
    severity: AlertSeverity
    message: str
    affected_locations: List[Location]
    agricultural_recommendations: List[str]
    start_time: datetime
    end_time: datetime


@dataclass
class SchemeNotification:
    """Government scheme notification data."""

    scheme_name: str
    scheme_type: str
    eligibility_summary: str
    benefits: List[str]
    application_deadline: Optional[str]
    message: str
    scheme_url: Optional[str] = None


@dataclass
class NotificationResult:
    """Result of notification delivery."""

    notification_id: UUID
    user_id: UUID
    notification_type: NotificationType
    channel: str
    status: DeliveryStatus
    message: str
    error_message: Optional[str] = None
    external_message_id: Optional[str] = None


class NotificationError(Exception):
    """Custom exception for notification errors."""

    pass


class NotificationService:
    """
    Notification service for proactive information delivery.

    Features:
    - Daily MSP update generation and delivery
    - Weather alert processing and distribution
    - Government scheme notifications
    - Market price alerts
    - Multi-channel delivery (SMS, voice, chat)
    - User preference management
    - Delivery tracking and retry logic
    """

    def __init__(self, db_session: Optional[AsyncSession] = None):
        """Initialize notification service."""
        self.settings = get_settings()
        self.db_session = db_session
        self.weather_service: Optional[WeatherService] = None
        self.sms_service = None

    async def initialize(self):
        """Initialize dependent services."""
        try:
            # Initialize weather service
            self.weather_service = WeatherService()
            await self.weather_service.initialize()
            logger.info("Notification service: Weather service initialized")

            # Initialize SMS service
            self.sms_service = get_sms_service()
            logger.info("Notification service: SMS service initialized")

        except Exception as e:
            logger.error(f"Failed to initialize notification service: {e}")
            raise NotificationError(f"Service initialization failed: {str(e)}")

    async def close(self):
        """Close dependent services."""
        if self.weather_service:
            await self.weather_service.close()

    async def generate_daily_msp_updates(
        self, user_locations: Optional[List[Location]] = None
    ) -> List[MSPNotification]:
        """
        Generate daily MSP (Minimum Support Price) updates.

        Args:
            user_locations: Optional list of locations to generate updates for.
                          If None, generates for all active user locations.

        Returns:
            List of MSPNotification objects

        Raises:
            NotificationError: If generation fails
        """
        if not self.db_session:
            raise NotificationError("Database session not available")

        try:
            msp_notifications = []

            # If no locations provided, get all unique user locations
            if user_locations is None:
                query = select(User).where(
                    and_(
                        User.location_lat.isnot(None),
                        User.location_lng.isnot(None),
                    )
                )
                result = await self.db_session.execute(query)
                users = result.scalars().all()

                user_locations = []
                seen_locations = set()
                for user in users:
                    loc_key = f"{float(user.location_lat)},{float(user.location_lng)}"
                    if loc_key not in seen_locations:
                        seen_locations.add(loc_key)
                        user_locations.append(
                            Location(
                                latitude=float(user.location_lat),
                                longitude=float(user.location_lng),
                                address=user.location_address or "",
                                district=user.district or "",
                                state=user.state or "",
                            )
                        )

            # Generate MSP notifications for each location
            # In production, this would fetch actual MSP data from government APIs
            for location in user_locations:
                # Placeholder MSP data - would be fetched from actual sources
                msp_data = self._fetch_msp_data(location)

                for crop, msp_info in msp_data.items():
                    notification = MSPNotification(
                        crop=crop,
                        current_msp=msp_info["current_msp"],
                        location=location,
                        effective_date=msp_info["effective_date"],
                        message=self._format_msp_message(crop, msp_info),
                        previous_msp=msp_info.get("previous_msp"),
                        change_percentage=msp_info.get("change_percentage"),
                    )
                    msp_notifications.append(notification)

            logger.info(f"Generated {len(msp_notifications)} MSP notifications")
            return msp_notifications

        except Exception as e:
            logger.error(f"Failed to generate MSP updates: {e}")
            raise NotificationError(f"MSP update generation failed: {str(e)}")

    def _fetch_msp_data(self, location: Location) -> Dict[str, Dict[str, Any]]:
        """
        Fetch MSP data for a location.

        This is a placeholder implementation. In production, this would:
        - Connect to government MSP APIs
        - Fetch latest MSP notifications
        - Parse and structure the data
        """
        # Placeholder data
        today = date.today()
        return {
            "wheat": {
                "current_msp": 2125.0,
                "previous_msp": 2015.0,
                "change_percentage": 5.46,
                "effective_date": today.isoformat(),
            },
            "rice": {
                "current_msp": 2183.0,
                "previous_msp": 2040.0,
                "change_percentage": 7.01,
                "effective_date": today.isoformat(),
            },
        }

    def _format_msp_message(self, crop: str, msp_info: Dict[str, Any]) -> str:
        """Format MSP notification message."""
        message = f"MSP Update: {crop.title()} - ₹{msp_info['current_msp']}/quintal"

        if msp_info.get("previous_msp"):
            change = msp_info.get("change_percentage", 0)
            if change > 0:
                message += f" (↑{change:.1f}% from previous)"
            elif change < 0:
                message += f" (↓{abs(change):.1f}% from previous)"

        message += f". Effective: {msp_info['effective_date']}"
        return message

    async def process_weather_alerts(
        self, weather_data: Optional[Dict[str, Any]] = None
    ) -> List[WeatherAlertNotification]:
        """
        Process weather alerts and generate notifications.

        Args:
            weather_data: Optional weather data. If None, fetches current data.

        Returns:
            List of WeatherAlertNotification objects

        Raises:
            NotificationError: If processing fails
        """
        if not self.db_session:
            raise NotificationError("Database session not available")

        if not self.weather_service:
            raise NotificationError("Weather service not initialized")

        try:
            alert_notifications = []

            # Get all user locations
            query = select(User).where(
                and_(
                    User.location_lat.isnot(None),
                    User.location_lng.isnot(None),
                )
            )
            result = await self.db_session.execute(query)
            users = result.scalars().all()

            # Group users by location (to avoid duplicate API calls)
            location_users = {}
            for user in users:
                loc_key = f"{float(user.location_lat)},{float(user.location_lng)}"
                if loc_key not in location_users:
                    location_users[loc_key] = {
                        "location": Location(
                            latitude=float(user.location_lat),
                            longitude=float(user.location_lng),
                            address=user.location_address or "",
                            district=user.district or "",
                            state=user.state or "",
                        ),
                        "users": [],
                    }
                location_users[loc_key]["users"].append(user)

            # Fetch weather data for each location
            for loc_key, loc_data in location_users.items():
                location = loc_data["location"]

                try:
                    # Get weather data with alerts
                    weather = await self.weather_service.get_current_weather(location)

                    # Process weather alerts
                    if weather.weather_alerts:
                        for alert in weather.weather_alerts:
                            # Generate agricultural recommendations based on alert
                            recommendations = self._generate_alert_recommendations(
                                alert, weather
                            )

                            alert_notification = WeatherAlertNotification(
                                alert_type=alert.alert_type,
                                severity=alert.severity,
                                message=alert.message,
                                affected_locations=[location],
                                agricultural_recommendations=recommendations,
                                start_time=alert.start_time,
                                end_time=alert.end_time,
                            )
                            alert_notifications.append(alert_notification)

                except Exception as e:
                    logger.warning(
                        f"Failed to fetch weather for location {loc_key}: {e}"
                    )
                    continue

            logger.info(f"Processed {len(alert_notifications)} weather alerts")
            return alert_notifications

        except Exception as e:
            logger.error(f"Failed to process weather alerts: {e}")
            raise NotificationError(f"Weather alert processing failed: {str(e)}")

    def _generate_alert_recommendations(
        self, alert: WeatherAlert, weather_data: Any
    ) -> List[str]:
        """Generate agricultural recommendations based on weather alert."""
        recommendations = []

        if alert.alert_type == "extreme_heat":
            recommendations.extend(
                [
                    "Increase irrigation frequency",
                    "Provide shade for sensitive crops",
                    "Avoid field work during peak heat hours",
                    "Monitor livestock for heat stress",
                ]
            )
        elif alert.alert_type == "frost_warning":
            recommendations.extend(
                [
                    "Cover sensitive plants overnight",
                    "Delay planting of frost-sensitive crops",
                    "Protect young seedlings",
                    "Consider frost protection measures",
                ]
            )
        elif alert.alert_type == "high_wind":
            recommendations.extend(
                [
                    "Secure tall crops and structures",
                    "Delay pesticide spraying",
                    "Protect young plants",
                    "Check irrigation systems",
                ]
            )
        elif alert.alert_type == "heavy_rain":
            recommendations.extend(
                [
                    "Ensure proper drainage",
                    "Delay pesticide application",
                    "Protect harvested crops",
                    "Monitor for waterlogging",
                ]
            )

        # Add general agricultural impact
        if alert.agricultural_impact:
            recommendations.append(alert.agricultural_impact)

        return recommendations

    async def send_scheme_notifications(
        self,
        new_schemes: List[Dict[str, Any]],
        eligible_users: Optional[List[UUID]] = None,
    ) -> List[NotificationResult]:
        """
        Send government scheme notifications to eligible users.

        Args:
            new_schemes: List of new scheme information
            eligible_users: Optional list of user IDs. If None, determines eligibility.

        Returns:
            List of NotificationResult objects

        Raises:
            NotificationError: If sending fails
        """
        if not self.db_session:
            raise NotificationError("Database session not available")

        try:
            notification_results = []

            # Get eligible users if not provided
            if eligible_users is None:
                # Query users who have scheme notifications enabled
                query = (
                    select(User)
                    .join(NotificationPreferences)
                    .where(NotificationPreferences.scheme_notifications == True)
                )
                result = await self.db_session.execute(query)
                users = result.scalars().all()
            else:
                query = select(User).where(User.id.in_(eligible_users))
                result = await self.db_session.execute(query)
                users = result.scalars().all()

            # Send notifications for each scheme
            for scheme in new_schemes:
                scheme_notification = SchemeNotification(
                    scheme_name=scheme.get("name", ""),
                    scheme_type=scheme.get("type", ""),
                    eligibility_summary=scheme.get("eligibility_summary", ""),
                    benefits=scheme.get("benefits", []),
                    application_deadline=scheme.get("deadline"),
                    message=self._format_scheme_message(scheme),
                    scheme_url=scheme.get("url"),
                )

                # Send to each eligible user
                for user in users:
                    # Check user preferences
                    if not await self._should_send_notification(
                        user.id, NotificationType.SCHEME_NOTIFICATION
                    ):
                        continue

                    # Get user's preferred channels
                    channels = await self._get_user_channels(user.id)

                    # Send via each channel
                    for channel in channels:
                        result = await self._deliver_notification(
                            user_id=user.id,
                            notification_type=NotificationType.SCHEME_NOTIFICATION,
                            channel=channel,
                            message=scheme_notification.message,
                            language=user.preferred_language,
                        )
                        notification_results.append(result)

            logger.info(
                f"Sent {len(notification_results)} scheme notifications to {len(users)} users"
            )
            return notification_results

        except Exception as e:
            logger.error(f"Failed to send scheme notifications: {e}")
            raise NotificationError(f"Scheme notification sending failed: {str(e)}")

    def _format_scheme_message(self, scheme: Dict[str, Any]) -> str:
        """Format government scheme notification message."""
        message = f"New Scheme: {scheme.get('name', 'Unknown')}\n"
        message += f"Type: {scheme.get('type', 'General')}\n"

        if scheme.get("eligibility_summary"):
            message += f"Eligibility: {scheme['eligibility_summary']}\n"

        if scheme.get("benefits"):
            benefits = scheme["benefits"][:2]  # First 2 benefits
            message += f"Benefits: {', '.join(benefits)}\n"

        if scheme.get("deadline"):
            message += f"Apply by: {scheme['deadline']}\n"

        return message.strip()

    async def send_msp_notifications(
        self, msp_notifications: List[MSPNotification]
    ) -> List[NotificationResult]:
        """
        Send MSP update notifications to subscribed users.

        Args:
            msp_notifications: List of MSP notifications to send

        Returns:
            List of NotificationResult objects

        Raises:
            NotificationError: If sending fails
        """
        if not self.db_session:
            raise NotificationError("Database session not available")

        try:
            notification_results = []

            # Get users who have MSP updates enabled
            query = (
                select(User)
                .join(NotificationPreferences)
                .where(NotificationPreferences.daily_msp_updates == True)
            )
            result = await self.db_session.execute(query)
            users = result.scalars().all()

            # Group notifications by location for efficient delivery
            for msp_notif in msp_notifications:
                # Find users near this location
                relevant_users = [
                    u
                    for u in users
                    if u.location_lat
                    and u.location_lng
                    and self._is_near_location(
                        Location(
                            latitude=float(u.location_lat),
                            longitude=float(u.location_lng),
                            address=u.location_address or "",
                            district=u.district or "",
                            state=u.state or "",
                        ),
                        msp_notif.location,
                        radius_km=100,
                    )
                ]

                # Send to each relevant user
                for user in relevant_users:
                    # Check if user grows this crop
                    if user.crops and msp_notif.crop not in user.crops:
                        continue

                    # Get user's preferred channels
                    channels = await self._get_user_channels(user.id)

                    # Send via each channel
                    for channel in channels:
                        result = await self._deliver_notification(
                            user_id=user.id,
                            notification_type=NotificationType.MSP_UPDATE,
                            channel=channel,
                            message=msp_notif.message,
                            language=user.preferred_language,
                        )
                        notification_results.append(result)

            logger.info(f"Sent {len(notification_results)} MSP notifications")
            return notification_results

        except Exception as e:
            logger.error(f"Failed to send MSP notifications: {e}")
            raise NotificationError(f"MSP notification sending failed: {str(e)}")

    async def send_weather_alert_notifications(
        self, weather_alerts: List[WeatherAlertNotification]
    ) -> List[NotificationResult]:
        """
        Send weather alert notifications to affected users.

        Args:
            weather_alerts: List of weather alert notifications

        Returns:
            List of NotificationResult objects

        Raises:
            NotificationError: If sending fails
        """
        if not self.db_session:
            raise NotificationError("Database session not available")

        try:
            notification_results = []

            # Get users who have weather alerts enabled
            query = (
                select(User)
                .join(NotificationPreferences)
                .where(NotificationPreferences.weather_alerts == True)
            )
            result = await self.db_session.execute(query)
            users = result.scalars().all()

            # Send alerts to affected users
            for alert in weather_alerts:
                # Format alert message
                alert_message = self._format_weather_alert_message(alert)

                # Find users in affected locations
                for location in alert.affected_locations:
                    relevant_users = [
                        u
                        for u in users
                        if u.location_lat
                        and u.location_lng
                        and self._is_near_location(
                            Location(
                                latitude=float(u.location_lat),
                                longitude=float(u.location_lng),
                                address=u.location_address or "",
                                district=u.district or "",
                                state=u.state or "",
                            ),
                            location,
                            radius_km=50,  # 50km radius for weather alerts
                        )
                    ]

                    # Send to each affected user
                    for user in relevant_users:
                        # Get user's preferred channels
                        channels = await self._get_user_channels(user.id)

                        # Send via each channel
                        for channel in channels:
                            result = await self._deliver_notification(
                                user_id=user.id,
                                notification_type=NotificationType.WEATHER_ALERT,
                                channel=channel,
                                message=alert_message,
                                language=user.preferred_language,
                            )
                            notification_results.append(result)

            logger.info(f"Sent {len(notification_results)} weather alert notifications")
            return notification_results

        except Exception as e:
            logger.error(f"Failed to send weather alert notifications: {e}")
            raise NotificationError(
                f"Weather alert notification sending failed: {str(e)}"
            )

    def _format_weather_alert_message(self, alert: WeatherAlertNotification) -> str:
        """Format weather alert notification message."""
        severity_emoji = {
            AlertSeverity.LOW: "ℹ️",
            AlertSeverity.MEDIUM: "⚠️",
            AlertSeverity.HIGH: "🔴",
            AlertSeverity.CRITICAL: "🚨",
        }

        message = f"{severity_emoji.get(alert.severity, '⚠️')} Weather Alert\n"
        message += f"{alert.message}\n\n"

        if alert.agricultural_recommendations:
            message += "Recommendations:\n"
            for rec in alert.agricultural_recommendations[
                :3
            ]:  # First 3 recommendations
                message += f"• {rec}\n"

        return message.strip()

    def _is_near_location(
        self, user_location: Location, target_location: Location, radius_km: float
    ) -> bool:
        """Check if user location is within radius of target location."""
        from math import radians, sin, cos, sqrt, atan2

        R = 6371.0  # Earth radius in kilometers

        lat1 = radians(user_location.latitude)
        lon1 = radians(user_location.longitude)
        lat2 = radians(target_location.latitude)
        lon2 = radians(target_location.longitude)

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        distance = R * c
        return distance <= radius_km

    async def _should_send_notification(
        self, user_id: UUID, notification_type: NotificationType
    ) -> bool:
        """Check if notification should be sent based on user preferences."""
        if not self.db_session:
            return False

        try:
            query = select(NotificationPreferences).where(
                NotificationPreferences.user_id == user_id
            )
            result = await self.db_session.execute(query)
            prefs = result.scalar_one_or_none()

            if not prefs:
                return True  # Default to sending if no preferences set

            # Check notification type preference
            if notification_type == NotificationType.MSP_UPDATE:
                return prefs.daily_msp_updates
            elif notification_type == NotificationType.WEATHER_ALERT:
                return prefs.weather_alerts
            elif notification_type == NotificationType.SCHEME_NOTIFICATION:
                return prefs.scheme_notifications
            elif notification_type == NotificationType.MARKET_ALERT:
                return prefs.market_price_alerts

            return True

        except Exception as e:
            logger.warning(f"Failed to check notification preferences: {e}")
            return True  # Default to sending on error

    async def _get_user_channels(self, user_id: UUID) -> List[str]:
        """Get user's preferred notification channels."""
        if not self.db_session:
            return ["sms"]  # Default channel

        try:
            query = select(NotificationPreferences).where(
                NotificationPreferences.user_id == user_id
            )
            result = await self.db_session.execute(query)
            prefs = result.scalar_one_or_none()

            if prefs and prefs.preferred_channels:
                return prefs.preferred_channels

            return ["sms"]  # Default to SMS

        except Exception as e:
            logger.warning(f"Failed to get user channels: {e}")
            return ["sms"]

    def _get_notification_title(self, notification_type: NotificationType) -> str:
        """
        Get notification title based on type.

        Args:
            notification_type: Type of notification

        Returns:
            Notification title string
        """
        titles = {
            NotificationType.MSP_UPDATE: "MSP Update",
            NotificationType.WEATHER_ALERT: "Weather Alert",
            NotificationType.SCHEME_NOTIFICATION: "New Scheme Available",
            NotificationType.MARKET_ALERT: "Market Price Alert",
        }
        return titles.get(notification_type, "Notification")

    async def _deliver_notification(
        self,
        user_id: UUID,
        notification_type: NotificationType,
        channel: str,
        message: str,
        language: str = "en",
    ) -> NotificationResult:
        """
        Deliver notification via specified channel.

        Args:
            user_id: User ID
            notification_type: Type of notification
            channel: Delivery channel (sms, voice, chat, ivr)
            message: Notification message
            language: User's preferred language

        Returns:
            NotificationResult object
        """
        if not self.db_session:
            raise NotificationError("Database session not available")

        try:
            # Get user details
            query = select(User).where(User.id == user_id)
            result = await self.db_session.execute(query)
            user = result.scalar_one_or_none()

            if not user:
                raise NotificationError(f"User {user_id} not found")

            # Deliver via channel
            external_message_id = None
            status = DeliveryStatus.PENDING
            error_message = None

            if channel == "sms":
                if self.sms_service and user.phone_number:
                    try:
                        # Send SMS
                        sms_result = self.sms_service.send_sms(
                            to_number=user.phone_number,
                            message=message,
                            metadata={"notification_type": notification_type.value},
                        )
                        if sms_result.get("success"):
                            external_message_id = sms_result.get("message_sid")
                            status = DeliveryStatus.SENT
                        else:
                            status = DeliveryStatus.FAILED
                            error_message = sms_result.get("error", "Unknown error")
                    except Exception as e:
                        logger.error(f"SMS delivery failed: {e}")
                        status = DeliveryStatus.FAILED
                        error_message = str(e)
                else:
                    status = DeliveryStatus.FAILED
                    error_message = "SMS service not available or no phone number"

            elif channel in ["voice", "ivr"]:
                # Voice/IVR delivery would be implemented here
                status = DeliveryStatus.PENDING
                error_message = "Voice delivery not yet implemented"

            elif channel == "chat":
                # Chat delivery would be implemented here
                status = DeliveryStatus.PENDING
                error_message = "Chat delivery not yet implemented"

            else:
                status = DeliveryStatus.FAILED
                error_message = f"Unknown channel: {channel}"

            # Record notification in history
            notification_history = NotificationHistory(
                user_id=user_id,
                notification_type=notification_type.value,
                channel=channel,
                message=message,
                delivery_status=status.value,
                error_message=error_message,
                external_message_id=external_message_id,
            )

            self.db_session.add(notification_history)
            await self.db_session.commit()
            await self.db_session.refresh(notification_history)

            # Emit real-time notification via Socket.IO
            try:
                from app.services.socketio_manager import emit_notification

                notification_data = {
                    "id": str(notification_history.id),
                    "user_id": str(user_id),
                    "type": notification_type.value,
                    "title": self._get_notification_title(notification_type),
                    "message": message,
                    "channel": channel,
                    "delivery_status": status.value,
                    "created_at": notification_history.created_at.isoformat(),
                    "read": False,
                }

                await emit_notification(str(user_id), notification_data)
                logger.info(f"Real-time notification emitted to user {user_id}")

            except Exception as e:
                # Don't fail the notification if Socket.IO emission fails
                logger.warning(f"Failed to emit real-time notification: {e}")

            return NotificationResult(
                notification_id=notification_history.id,
                user_id=user_id,
                notification_type=notification_type,
                channel=channel,
                status=status,
                message=message,
                error_message=error_message,
                external_message_id=external_message_id,
            )

        except Exception as e:
            logger.error(f"Failed to deliver notification: {e}")
            raise NotificationError(f"Notification delivery failed: {str(e)}")


# Global notification service instance
_notification_service: Optional[NotificationService] = None


async def get_notification_service(
    db_session: Optional[AsyncSession] = None,
) -> NotificationService:
    """Get or create notification service instance."""
    global _notification_service

    if _notification_service is None or db_session is not None:
        _notification_service = NotificationService(db_session)
        await _notification_service.initialize()

    return _notification_service


async def close_notification_service():
    """Close notification service and cleanup resources."""
    global _notification_service

    if _notification_service:
        await _notification_service.close()
        _notification_service = None
