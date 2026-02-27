"""
SMS service for the AI-Driven Agri-Civic Intelligence Platform.

This service provides SMS gateway integration using Twilio for sending messages,
managing subscriptions, and optimizing responses for SMS delivery.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from twilio.rest import Client
from twilio.base.exceptions import TwilioException

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class SMSService:
    """Service for handling SMS operations using Twilio."""

    # SMS character limits
    SMS_SINGLE_MESSAGE_LIMIT = 160
    SMS_CONCATENATED_LIMIT = 1600  # 10 segments max

    def __init__(self):
        """Initialize SMS service with Twilio client."""
        self.settings = settings
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize Twilio client."""
        try:
            if settings.twilio_account_sid and settings.twilio_auth_token:
                self.client = Client(
                    settings.twilio_account_sid, settings.twilio_auth_token
                )
                logger.info("Twilio SMS client initialized successfully")
            else:
                logger.warning("Twilio credentials not configured")
        except Exception as e:
            logger.error(f"Failed to initialize Twilio client: {e}")
            raise

    def send_sms(
        self,
        to_number: str,
        message: str,
        from_number: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Send an SMS message to a phone number.

        Args:
            to_number: Recipient phone number (E.164 format)
            message: Message content
            from_number: Sender phone number (defaults to configured Twilio number)
            metadata: Additional metadata for tracking

        Returns:
            Dict containing message SID, status, and metadata
        """
        try:
            if not self.client:
                logger.error("Twilio client not initialized")
                return {
                    "success": False,
                    "error": "SMS service not configured",
                    "message_sid": None,
                }

            # Optimize message for SMS
            optimized_message = self.optimize_for_sms(message)

            # Use configured phone number if not provided
            sender = from_number or settings.twilio_phone_number

            # Send SMS
            message_obj = self.client.messages.create(
                body=optimized_message, to=to_number, from_=sender
            )

            logger.info(
                f"SMS sent successfully - SID: {message_obj.sid}, To: {to_number}"
            )

            return {
                "success": True,
                "message_sid": message_obj.sid,
                "status": message_obj.status,
                "to": to_number,
                "from": sender,
                "segments": message_obj.num_segments,
                "timestamp": datetime.utcnow().isoformat(),
                "metadata": metadata or {},
            }

        except TwilioException as e:
            logger.error(f"Twilio error sending SMS: {e}")
            return {
                "success": False,
                "error": str(e),
                "message_sid": None,
                "to": to_number,
            }
        except Exception as e:
            logger.error(f"Unexpected error sending SMS: {e}")
            return {
                "success": False,
                "error": str(e),
                "message_sid": None,
                "to": to_number,
            }

    def send_bulk_sms(
        self, recipients: List[Dict[str, str]], message: str
    ) -> Dict[str, Any]:
        """
        Send SMS to multiple recipients.

        Args:
            recipients: List of dicts with 'phone_number' and optional 'name'
            message: Message content

        Returns:
            Dict with success count, failed count, and details
        """
        results = {"successful": [], "failed": [], "total": len(recipients)}

        for recipient in recipients:
            phone_number = recipient.get("phone_number")
            if not phone_number:
                results["failed"].append(
                    {"recipient": recipient, "error": "Missing phone number"}
                )
                continue

            # Personalize message if name is provided
            personalized_message = message
            if recipient.get("name"):
                personalized_message = f"Hello {recipient['name']}, {message}"

            result = self.send_sms(
                to_number=phone_number,
                message=personalized_message,
                metadata={"recipient_name": recipient.get("name")},
            )

            if result["success"]:
                results["successful"].append(
                    {"phone_number": phone_number, "message_sid": result["message_sid"]}
                )
            else:
                results["failed"].append(
                    {"phone_number": phone_number, "error": result.get("error")}
                )

        logger.info(
            f"Bulk SMS completed - Successful: {len(results['successful'])}, "
            f"Failed: {len(results['failed'])}, Total: {results['total']}"
        )

        return results

    def optimize_for_sms(self, message: str) -> str:
        """
        Optimize message content for SMS delivery.

        - Truncates to SMS limits
        - Removes excessive whitespace
        - Ensures critical information is preserved

        Args:
            message: Original message content

        Returns:
            Optimized message suitable for SMS
        """
        # Remove excessive whitespace
        optimized = " ".join(message.split())

        # Truncate if necessary
        if len(optimized) > self.SMS_CONCATENATED_LIMIT:
            # Truncate and add ellipsis
            optimized = optimized[: self.SMS_CONCATENATED_LIMIT - 3] + "..."
            logger.warning(
                f"Message truncated from {len(message)} to {len(optimized)} characters"
            )

        return optimized

    def format_weather_alert(self, weather_data: Dict[str, Any]) -> str:
        """
        Format weather data for SMS delivery.

        Args:
            weather_data: Weather information dict

        Returns:
            Formatted SMS message
        """
        location = weather_data.get("location", "your area")
        temp = weather_data.get("temperature")
        condition = weather_data.get("condition", "")
        rainfall = weather_data.get("rainfall_prediction")
        alert = weather_data.get("alert", "")

        message_parts = [f"Weather for {location}:"]

        if temp:
            message_parts.append(f"Temp: {temp}°C")

        if condition:
            message_parts.append(f"Condition: {condition}")

        if rainfall:
            message_parts.append(f"Rainfall: {rainfall}mm expected")

        if alert:
            message_parts.append(f"ALERT: {alert}")

        return " | ".join(message_parts)

    def format_market_price(self, market_data: Dict[str, Any]) -> str:
        """
        Format market price data for SMS delivery.

        Args:
            market_data: Market price information dict

        Returns:
            Formatted SMS message
        """
        crop = market_data.get("crop", "Crop")
        mandi = market_data.get("mandi", "Local mandi")
        price = market_data.get("price")
        date = market_data.get("date", "today")

        message = f"{crop} price at {mandi}: ₹{price}/quintal ({date})"

        # Add comparison if available
        if market_data.get("previous_price"):
            prev_price = market_data["previous_price"]
            change = price - prev_price
            change_pct = (change / prev_price) * 100
            trend = "↑" if change > 0 else "↓"
            message += f" {trend} {abs(change_pct):.1f}%"

        return message

    def format_msp_update(self, msp_data: Dict[str, Any]) -> str:
        """
        Format MSP (Minimum Support Price) update for SMS delivery.

        Args:
            msp_data: MSP information dict

        Returns:
            Formatted SMS message
        """
        crop = msp_data.get("crop", "Crop")
        msp = msp_data.get("msp")
        season = msp_data.get("season", "")
        effective_date = msp_data.get("effective_date", "")

        message = f"MSP Update: {crop} - ₹{msp}/quintal"

        if season:
            message += f" ({season})"

        if effective_date:
            message += f" effective from {effective_date}"

        return message

    def format_scheme_notification(self, scheme_data: Dict[str, Any]) -> str:
        """
        Format government scheme notification for SMS delivery.

        Args:
            scheme_data: Scheme information dict

        Returns:
            Formatted SMS message
        """
        scheme_name = scheme_data.get("scheme_name", "New Scheme")
        benefit = scheme_data.get("benefit", "")
        deadline = scheme_data.get("deadline", "")

        message = f"New Scheme: {scheme_name}"

        if benefit:
            message += f" - {benefit}"

        if deadline:
            message += f". Apply by {deadline}"

        message += ". Reply INFO for details."

        return message

    def get_message_status(self, message_sid: str) -> Dict[str, Any]:
        """
        Get the delivery status of a sent message.

        Args:
            message_sid: Twilio message SID

        Returns:
            Dict containing message status and details
        """
        try:
            if not self.client:
                logger.error("Twilio client not initialized")
                return {"success": False, "error": "SMS service not configured"}

            message = self.client.messages(message_sid).fetch()

            return {
                "success": True,
                "message_sid": message.sid,
                "status": message.status,
                "to": message.to,
                "from": message.from_,
                "date_sent": (
                    message.date_sent.isoformat() if message.date_sent else None
                ),
                "error_code": message.error_code,
                "error_message": message.error_message,
            }

        except TwilioException as e:
            logger.error(f"Twilio error fetching message status: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error fetching message status: {e}")
            return {"success": False, "error": str(e)}

    def process_incoming_sms(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process incoming SMS webhook from Twilio.

        Args:
            request_data: Webhook request data from Twilio

        Returns:
            Dict containing parsed message data
        """
        try:
            return {
                "success": True,
                "message_sid": request_data.get("MessageSid"),
                "from": request_data.get("From"),
                "to": request_data.get("To"),
                "body": request_data.get("Body", "").strip(),
                "num_media": int(request_data.get("NumMedia", 0)),
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            logger.error(f"Error processing incoming SMS: {e}")
            return {"success": False, "error": str(e)}

    def validate_phone_number(self, phone_number: str) -> bool:
        """
        Validate phone number format.

        Args:
            phone_number: Phone number to validate

        Returns:
            True if valid, False otherwise
        """
        # Basic validation - should start with + and contain only digits
        if not phone_number:
            return False

        # Remove spaces and dashes
        cleaned = phone_number.replace(" ", "").replace("-", "")

        # Check E.164 format
        if cleaned.startswith("+") and len(cleaned) >= 10 and cleaned[1:].isdigit():
            return True

        return False


# Singleton instance
_sms_service_instance = None


def get_sms_service() -> SMSService:
    """Get or create SMS service singleton instance."""
    global _sms_service_instance
    if _sms_service_instance is None:
        _sms_service_instance = SMSService()
    return _sms_service_instance
