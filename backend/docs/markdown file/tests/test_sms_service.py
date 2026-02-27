"""
Unit tests for SMS service.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from app.services.sms_service import SMSService, get_sms_service


@pytest.fixture
def mock_twilio_client():
    """Create a mock Twilio client."""
    with patch("app.services.sms_service.Client") as mock_client:
        mock_instance = MagicMock()
        mock_client.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def sms_service(mock_twilio_client):
    """Create SMS service instance with mocked Twilio client."""
    with patch("app.services.sms_service.settings") as mock_settings:
        mock_settings.twilio_account_sid = "test_sid"
        mock_settings.twilio_auth_token = "test_token"
        mock_settings.twilio_phone_number = "+919876543210"
        service = SMSService()
        return service


class TestSMSService:
    """Test suite for SMS service."""

    def test_initialization(self, mock_twilio_client):
        """Test SMS service initialization."""
        with patch("app.services.sms_service.settings") as mock_settings:
            mock_settings.twilio_account_sid = "test_sid"
            mock_settings.twilio_auth_token = "test_token"

            service = SMSService()
            assert service.client is not None

    def test_send_sms_success(self, sms_service, mock_twilio_client):
        """Test successful SMS sending."""
        # Mock message response
        mock_message = Mock()
        mock_message.sid = "SM123456"
        mock_message.status = "sent"
        mock_message.num_segments = 1

        mock_twilio_client.messages.create.return_value = mock_message

        result = sms_service.send_sms(to_number="+919876543211", message="Test message")

        assert result["success"] is True
        assert result["message_sid"] == "SM123456"
        assert result["status"] == "sent"
        assert result["segments"] == 1

    def test_send_sms_with_metadata(self, sms_service, mock_twilio_client):
        """Test SMS sending with metadata."""
        mock_message = Mock()
        mock_message.sid = "SM123456"
        mock_message.status = "sent"
        mock_message.num_segments = 1

        mock_twilio_client.messages.create.return_value = mock_message

        metadata = {"user_id": "123", "type": "alert"}
        result = sms_service.send_sms(
            to_number="+919876543211", message="Test message", metadata=metadata
        )

        assert result["success"] is True
        assert result["metadata"] == metadata

    def test_send_sms_twilio_error(self, sms_service, mock_twilio_client):
        """Test SMS sending with Twilio error."""
        from twilio.base.exceptions import TwilioException

        mock_twilio_client.messages.create.side_effect = TwilioException(
            "Invalid phone number"
        )

        result = sms_service.send_sms(to_number="+919876543211", message="Test message")

        assert result["success"] is False
        assert "error" in result
        assert result["message_sid"] is None

    def test_optimize_for_sms_short_message(self, sms_service):
        """Test SMS optimization for short messages."""
        message = "This is a short message"
        optimized = sms_service.optimize_for_sms(message)

        assert optimized == message
        assert len(optimized) <= sms_service.SMS_CONCATENATED_LIMIT

    def test_optimize_for_sms_long_message(self, sms_service):
        """Test SMS optimization for long messages."""
        message = "A" * 2000  # Exceeds limit
        optimized = sms_service.optimize_for_sms(message)

        assert len(optimized) <= sms_service.SMS_CONCATENATED_LIMIT
        assert optimized.endswith("...")

    def test_optimize_for_sms_whitespace(self, sms_service):
        """Test SMS optimization removes excessive whitespace."""
        message = "This   has    excessive     whitespace"
        optimized = sms_service.optimize_for_sms(message)

        assert optimized == "This has excessive whitespace"

    def test_format_weather_alert(self, sms_service):
        """Test weather alert formatting."""
        weather_data = {
            "location": "Delhi",
            "temperature": 35,
            "condition": "Sunny",
            "rainfall_prediction": 10,
            "alert": "Heat wave warning",
        }

        formatted = sms_service.format_weather_alert(weather_data)

        assert "Delhi" in formatted
        assert "35°C" in formatted
        assert "Sunny" in formatted
        assert "10mm" in formatted
        assert "Heat wave warning" in formatted

    def test_format_market_price(self, sms_service):
        """Test market price formatting."""
        market_data = {
            "crop": "Wheat",
            "mandi": "Delhi Mandi",
            "price": 2000,
            "date": "2024-01-15",
        }

        formatted = sms_service.format_market_price(market_data)

        assert "Wheat" in formatted
        assert "Delhi Mandi" in formatted
        assert "₹2000" in formatted
        assert "2024-01-15" in formatted

    def test_format_market_price_with_comparison(self, sms_service):
        """Test market price formatting with price comparison."""
        market_data = {
            "crop": "Wheat",
            "mandi": "Delhi Mandi",
            "price": 2100,
            "previous_price": 2000,
            "date": "2024-01-15",
        }

        formatted = sms_service.format_market_price(market_data)

        assert "Wheat" in formatted
        assert "₹2100" in formatted
        assert "↑" in formatted or "5.0%" in formatted

    def test_format_msp_update(self, sms_service):
        """Test MSP update formatting."""
        msp_data = {
            "crop": "Paddy",
            "msp": 1940,
            "season": "Kharif 2024",
            "effective_date": "2024-06-01",
        }

        formatted = sms_service.format_msp_update(msp_data)

        assert "Paddy" in formatted
        assert "₹1940" in formatted
        assert "Kharif 2024" in formatted
        assert "2024-06-01" in formatted

    def test_format_scheme_notification(self, sms_service):
        """Test scheme notification formatting."""
        scheme_data = {
            "scheme_name": "PM-KISAN",
            "benefit": "₹6000 annual support",
            "deadline": "2024-03-31",
        }

        formatted = sms_service.format_scheme_notification(scheme_data)

        assert "PM-KISAN" in formatted
        assert "₹6000 annual support" in formatted
        assert "2024-03-31" in formatted
        assert "Reply INFO" in formatted

    def test_validate_phone_number_valid(self, sms_service):
        """Test phone number validation with valid numbers."""
        valid_numbers = [
            "+919876543210",
            "+911234567890",
            "+14155552671",
        ]

        for number in valid_numbers:
            assert sms_service.validate_phone_number(number) is True

    def test_validate_phone_number_invalid(self, sms_service):
        """Test phone number validation with invalid numbers."""
        invalid_numbers = [
            "9876543210",  # Missing +
            "+91",  # Too short
            "invalid",  # Not a number
            "",  # Empty
            None,  # None
        ]

        for number in invalid_numbers:
            assert sms_service.validate_phone_number(number) is False

    def test_get_message_status_success(self, sms_service, mock_twilio_client):
        """Test getting message status successfully."""
        mock_message = Mock()
        mock_message.sid = "SM123456"
        mock_message.status = "delivered"
        mock_message.to = "+919876543211"
        mock_message.from_ = "+919876543210"
        mock_message.date_sent = datetime(2024, 1, 15, 10, 30)
        mock_message.error_code = None
        mock_message.error_message = None

        mock_twilio_client.messages.return_value.fetch.return_value = mock_message

        result = sms_service.get_message_status("SM123456")

        assert result["success"] is True
        assert result["status"] == "delivered"
        assert result["message_sid"] == "SM123456"

    def test_process_incoming_sms(self, sms_service):
        """Test processing incoming SMS webhook data."""
        request_data = {
            "MessageSid": "SM123456",
            "From": "+919876543211",
            "To": "+919876543210",
            "Body": "What is the weather today?",
            "NumMedia": "0",
        }

        result = sms_service.process_incoming_sms(request_data)

        assert result["success"] is True
        assert result["message_sid"] == "SM123456"
        assert result["from"] == "+919876543211"
        assert result["body"] == "What is the weather today?"
        assert result["num_media"] == 0

    def test_send_bulk_sms(self, sms_service, mock_twilio_client):
        """Test sending bulk SMS."""
        mock_message = Mock()
        mock_message.sid = "SM123456"
        mock_message.status = "sent"
        mock_message.num_segments = 1

        mock_twilio_client.messages.create.return_value = mock_message

        recipients = [
            {"phone_number": "+919876543211", "name": "Farmer1"},
            {"phone_number": "+919876543212", "name": "Farmer2"},
        ]

        result = sms_service.send_bulk_sms(recipients, "Test bulk message")

        assert len(result["successful"]) == 2
        assert len(result["failed"]) == 0
        assert result["total"] == 2

    def test_send_bulk_sms_with_failures(self, sms_service, mock_twilio_client):
        """Test sending bulk SMS with some failures."""
        from twilio.base.exceptions import TwilioException

        # First call succeeds, second fails
        mock_message = Mock()
        mock_message.sid = "SM123456"
        mock_message.status = "sent"
        mock_message.num_segments = 1

        mock_twilio_client.messages.create.side_effect = [
            mock_message,
            TwilioException("Invalid number"),
        ]

        recipients = [
            {"phone_number": "+919876543211", "name": "Farmer1"},
            {"phone_number": "+919876543212", "name": "Farmer2"},
        ]

        result = sms_service.send_bulk_sms(recipients, "Test bulk message")

        assert len(result["successful"]) == 1
        assert len(result["failed"]) == 1
        assert result["total"] == 2

    def test_get_sms_service_singleton(self):
        """Test SMS service singleton pattern."""
        with patch("app.services.sms_service.settings") as mock_settings:
            mock_settings.twilio_account_sid = "test_sid"
            mock_settings.twilio_auth_token = "test_token"

            service1 = get_sms_service()
            service2 = get_sms_service()

            assert service1 is service2
