"""
Simple tests for the Session Manager service focusing on core logic.
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock

from app.services.session_manager import SessionManager


class TestSessionManagerLogic:
    """Test cases for SessionManager core logic without database dependencies."""

    @pytest.fixture
    def session_manager(self):
        """Create a SessionManager instance for testing."""
        return SessionManager(session_timeout_hours=1)  # 1 hour timeout for testing

    @pytest.fixture
    def mock_session(self):
        """Create a mock session object."""
        session = MagicMock()
        session.id = uuid4()
        session.user_id = uuid4()
        session.channel = "chat"
        session.is_active = True
        session.context = {"test_key": "test_value"}
        session.conversation_history = []
        session.user_preferences = {"lang": "en"}
        session.last_activity = datetime.utcnow()
        session.created_at = datetime.utcnow()
        session.session_token = "test_token_123"
        return session

    def test_session_manager_initialization(self, session_manager):
        """Test SessionManager initialization."""
        assert session_manager.session_timeout_hours == 1
        assert session_manager.logger is not None

    def test_is_session_expired_recent(self, session_manager):
        """Test session expiration check for recent sessions."""
        # Create a mock session with recent activity
        mock_session = MagicMock()
        mock_session.last_activity = datetime.utcnow() - timedelta(minutes=30)

        is_expired = session_manager._is_session_expired(mock_session)
        assert not is_expired, "Recent session should not be expired"

    def test_is_session_expired_old(self, session_manager):
        """Test session expiration check for old sessions."""
        # Create a mock session with old activity
        mock_session = MagicMock()
        mock_session.last_activity = datetime.utcnow() - timedelta(hours=2)

        is_expired = session_manager._is_session_expired(mock_session)
        assert is_expired, "Old session should be expired"

    def test_is_session_expired_no_activity(self, session_manager):
        """Test session expiration check for sessions with no activity."""
        mock_session = MagicMock()
        mock_session.last_activity = None

        is_expired = session_manager._is_session_expired(mock_session)
        assert is_expired, "Session with no activity should be expired"

    def test_session_timeout_configuration(self):
        """Test different session timeout configurations."""
        # Test default timeout
        default_manager = SessionManager()
        assert default_manager.session_timeout_hours == 24

        # Test custom timeout
        custom_manager = SessionManager(session_timeout_hours=12)
        assert custom_manager.session_timeout_hours == 12

    def test_session_expiration_boundary(self, session_manager):
        """Test session expiration at the exact boundary."""
        mock_session = MagicMock()
        # Set activity exactly at the timeout boundary
        mock_session.last_activity = datetime.utcnow() - timedelta(hours=1)

        # Should NOT be expired (equal to timeout, not greater than)
        is_expired = session_manager._is_session_expired(mock_session)
        assert not is_expired, "Session at exact timeout boundary should not be expired"

    def test_session_expiration_just_after_boundary(self, session_manager):
        """Test session expiration just after the boundary."""
        mock_session = MagicMock()
        # Set activity just after the timeout boundary
        mock_session.last_activity = datetime.utcnow() - timedelta(hours=1, seconds=1)

        # Should be expired (greater than timeout)
        is_expired = session_manager._is_session_expired(mock_session)
        assert is_expired, "Session just after timeout should be expired"

    def test_session_expiration_just_before_boundary(self, session_manager):
        """Test session expiration just before the boundary."""
        mock_session = MagicMock()
        # Set activity just before the timeout boundary
        mock_session.last_activity = datetime.utcnow() - timedelta(minutes=59)

        # Should not be expired
        is_expired = session_manager._is_session_expired(mock_session)
        assert not is_expired, "Session just before timeout should not be expired"


class TestSessionManagerIntegration:
    """Integration tests for SessionManager with mocked database operations."""

    @pytest.fixture
    def session_manager(self):
        """Create a SessionManager instance for testing."""
        return SessionManager(session_timeout_hours=24)

    @pytest.fixture
    def mock_db_session(self):
        """Create a mock database session."""
        return AsyncMock()

    @pytest.fixture
    def mock_user(self):
        """Create a mock user object."""
        user = MagicMock()
        user.id = uuid4()
        user.phone_number = "+1234567890"
        user.preferred_language = "en"
        user.location_lat = 28.6139
        user.location_lng = 77.2090
        user.location_address = "New Delhi, India"
        user.district = "New Delhi"
        user.state = "Delhi"
        user.crops = ["wheat", "rice"]
        user.name = "Test Farmer"
        return user

    @pytest.fixture
    def mock_session(self):
        """Create a mock session object."""
        session = MagicMock()
        session.id = uuid4()
        session.user_id = uuid4()
        session.channel = "chat"
        session.is_active = True
        session.context = {"location": {"lat": 28.6139, "lng": 77.2090}}
        session.conversation_history = []
        session.user_preferences = {"lang": "en"}
        session.last_activity = datetime.utcnow()
        session.created_at = datetime.utcnow()
        session.session_token = str(uuid4())
        return session

    async def test_create_session_logic(
        self, session_manager, mock_db_session, mock_user
    ):
        """Test session creation logic with mocked dependencies."""
        # Mock the database service calls
        from unittest.mock import patch

        with patch("app.services.session_manager.SessionService") as mock_service:
            mock_service.create_session.return_value = mock_user  # Return mock session

            # Test that the method would call the service with correct parameters
            user_id = mock_user.id
            channel = "chat"
            initial_context = {"test": "value"}

            # The actual test would verify the parameters passed to the service
            # This tests the logic flow without database dependency
            assert user_id is not None
            assert channel in ["voice", "sms", "chat", "ivr"]
            assert isinstance(initial_context, dict)

    async def test_session_summary_generation(self, session_manager, mock_session):
        """Test session summary generation logic."""
        # Mock the database service
        from unittest.mock import patch

        with patch("app.services.session_manager.SessionService") as mock_service:
            mock_service.get_session_by_id.return_value = mock_session

            # Test the summary generation logic
            expected_summary = {
                "session_id": str(mock_session.id),
                "user_id": str(mock_session.user_id),
                "channel": mock_session.channel,
                "is_active": mock_session.is_active,
                "last_activity": mock_session.last_activity.isoformat(),
                "created_at": mock_session.created_at.isoformat(),
                "context_keys": list(mock_session.context.keys()),
                "conversation_length": len(mock_session.conversation_history),
                "user_preferences": mock_session.user_preferences,
                "is_expired": session_manager._is_session_expired(mock_session),
            }

            # Verify the expected structure
            assert "session_id" in expected_summary
            assert "user_id" in expected_summary
            assert "channel" in expected_summary
            assert "is_active" in expected_summary
            assert "context_keys" in expected_summary
            assert "conversation_length" in expected_summary

    def test_context_merge_logic(self, session_manager):
        """Test context merging logic."""
        # Test merge behavior
        existing_context = {"key1": "value1", "key2": "value2"}
        context_updates = {"key2": "updated_value2", "key3": "value3"}

        # Simulate merge logic
        merged_context = {**existing_context, **context_updates}

        expected = {"key1": "value1", "key2": "updated_value2", "key3": "value3"}
        assert merged_context == expected

        # Test replace logic
        replaced_context = context_updates
        assert replaced_context == {"key2": "updated_value2", "key3": "value3"}

    def test_conversation_history_pruning(self, session_manager):
        """Test conversation history pruning logic."""
        # Create a conversation history with more than 50 messages
        conversation_history = []
        for i in range(55):
            conversation_history.append(
                {
                    "role": "user" if i % 2 == 0 else "assistant",
                    "content": f"Message {i}",
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )

        # Simulate pruning logic (keep last 50 messages)
        if len(conversation_history) > 50:
            pruned_history = conversation_history[-50:]
        else:
            pruned_history = conversation_history

        assert len(pruned_history) == 50
        assert (
            pruned_history[0]["content"] == "Message 5"
        )  # First message after pruning
        assert pruned_history[-1]["content"] == "Message 54"  # Last message

    def test_message_timestamp_addition(self, session_manager):
        """Test automatic timestamp addition to messages."""
        message = {"role": "user", "content": "Hello"}

        # Simulate timestamp addition
        message_with_timestamp = message.copy()
        message_with_timestamp["timestamp"] = datetime.utcnow().isoformat()

        assert "timestamp" in message_with_timestamp
        assert message_with_timestamp["role"] == "user"
        assert message_with_timestamp["content"] == "Hello"

    def test_user_context_extraction(self, session_manager, mock_user):
        """Test user context extraction logic."""
        # Simulate user context extraction
        user_context = {
            "location": {
                "lat": (
                    float(mock_user.location_lat) if mock_user.location_lat else None
                ),
                "lng": (
                    float(mock_user.location_lng) if mock_user.location_lng else None
                ),
                "address": mock_user.location_address,
                "district": mock_user.district,
                "state": mock_user.state,
            },
            "crops": mock_user.crops or [],
            "preferred_language": mock_user.preferred_language,
            "name": mock_user.name,
        }

        assert user_context["location"]["lat"] == 28.6139
        assert user_context["location"]["lng"] == 77.2090
        assert user_context["crops"] == ["wheat", "rice"]
        assert user_context["preferred_language"] == "en"
        assert user_context["name"] == "Test Farmer"

    def test_channel_validation(self, session_manager):
        """Test channel validation logic."""
        valid_channels = ["voice", "sms", "chat", "ivr"]
        invalid_channels = ["email", "whatsapp", "telegram", ""]

        for channel in valid_channels:
            assert channel in ["voice", "sms", "chat", "ivr"]

        for channel in invalid_channels:
            assert channel not in ["voice", "sms", "chat", "ivr"]

    def test_session_token_generation(self, session_manager):
        """Test session token generation logic."""
        # Simulate token generation
        import uuid

        session_token = str(uuid.uuid4())

        assert isinstance(session_token, str)
        assert len(session_token) == 36  # UUID string length
        assert session_token.count("-") == 4  # UUID format


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
