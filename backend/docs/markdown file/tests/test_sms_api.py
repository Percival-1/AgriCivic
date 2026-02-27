"""
Unit tests for SMS API endpoints.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from httpx import AsyncClient

from app.main import app
from app.models.user import User
from app.models.notification import NotificationPreferences


@pytest.fixture
def mock_sms_service():
    """Mock SMS service."""
    with patch("app.api.sms.get_sms_service") as mock:
        service = Mock()
        mock.return_value = service
        yield service


@pytest.mark.asyncio
class TestSMSAPI:
    """Test suite for SMS API endpoints."""

    async def test_send_sms_success(self, mock_sms_service):
        """Test successful SMS sending via API."""
        mock_sms_service.validate_phone_number.return_value = True
        mock_sms_service.send_sms.return_value = {
            "success": True,
            "message_sid": "SM123456",
            "status": "sent",
            "to": "+919876543211",
            "from": "+919876543210",
            "segments": 1,
        }

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/sms/send",
                json={
                    "to_number": "+919876543211",
                    "message": "Test message",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["message_sid"] == "SM123456"

    async def test_send_sms_invalid_phone(self, mock_sms_service):
        """Test SMS sending with invalid phone number."""
        mock_sms_service.validate_phone_number.return_value = False

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/sms/send",
                json={
                    "to_number": "invalid",
                    "message": "Test message",
                },
            )

        assert response.status_code == 422  # Validation error

    async def test_send_bulk_sms(self, mock_sms_service):
        """Test bulk SMS sending."""
        mock_sms_service.send_bulk_sms.return_value = {
            "successful": [
                {"phone_number": "+919876543211", "message_sid": "SM123456"}
            ],
            "failed": [],
            "total": 1,
        }

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/sms/send-bulk",
                json={
                    "recipients": [{"phone_number": "+919876543211", "name": "Test"}],
                    "message": "Bulk test message",
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["successful"] == 1
        assert data["failed"] == 0

    async def test_get_message_status(self, mock_sms_service):
        """Test getting message status."""
        mock_sms_service.get_message_status.return_value = {
            "success": True,
            "message_sid": "SM123456",
            "status": "delivered",
            "to": "+919876543211",
        }

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/v1/sms/status/SM123456")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["status"] == "delivered"

    async def test_manage_subscription_new_user(self, mock_sms_service, db_session):
        """Test managing subscription for new user."""
        # Create test user
        user = User(
            phone_number="+919876543211",
            preferred_language="en",
        )
        db_session.add(user)
        await db_session.commit()

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/sms/subscription",
                json={
                    "phone_number": "+919876543211",
                    "daily_msp_updates": True,
                    "weather_alerts": True,
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["preferences"]["daily_msp_updates"] is True
        assert data["preferences"]["weather_alerts"] is True

    async def test_get_subscription(self, mock_sms_service, db_session):
        """Test getting subscription preferences."""
        # Create test user with preferences
        user = User(
            phone_number="+919876543211",
            preferred_language="en",
        )
        db_session.add(user)
        await db_session.flush()

        preferences = NotificationPreferences(
            user_id=user.id,
            daily_msp_updates=True,
            weather_alerts=True,
            scheme_notifications=False,
            market_price_alerts=True,
        )
        db_session.add(preferences)
        await db_session.commit()

        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(f"/api/v1/sms/subscription/{user.phone_number}")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["preferences"]["daily_msp_updates"] is True
        assert data["preferences"]["weather_alerts"] is True
        assert data["preferences"]["scheme_notifications"] is False

    async def test_get_subscription_user_not_found(self, mock_sms_service):
        """Test getting subscription for non-existent user."""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/v1/sms/subscription/+919999999999")

        assert response.status_code == 404

    async def test_sms_webhook(self, mock_sms_service, db_session):
        """Test SMS webhook endpoint."""
        # Create test user
        user = User(
            phone_number="+919876543211",
            preferred_language="en",
        )
        db_session.add(user)
        await db_session.commit()

        mock_sms_service.process_incoming_sms.return_value = {
            "success": True,
            "message_sid": "SM123456",
            "from": "+919876543211",
            "to": "+919876543210",
            "body": "Test query",
            "num_media": 0,
        }

        mock_sms_service.optimize_for_sms.return_value = "Test response"
        mock_sms_service.send_sms.return_value = {
            "success": True,
            "message_sid": "SM789012",
        }

        # Mock other services
        with (
            patch("app.api.sms.SessionManager") as mock_session_manager,
            patch("app.api.sms.TranslationService") as mock_translation,
            patch("app.api.sms.LLMService") as mock_llm,
        ):

            mock_session = Mock()
            mock_session.id = user.id
            mock_session_manager.return_value.get_or_create_session = AsyncMock(
                return_value=mock_session
            )
            mock_session_manager.return_value.update_context = AsyncMock()

            mock_translation.return_value.translate.return_value = {
                "success": True,
                "translated_text": "Test query",
            }

            mock_llm.return_value.generate_response.return_value = {
                "success": True,
                "response": "Test response",
            }

            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/sms/webhook",
                    data={
                        "MessageSid": "SM123456",
                        "From": "+919876543211",
                        "To": "+919876543210",
                        "Body": "Test query",
                        "NumMedia": "0",
                    },
                )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
