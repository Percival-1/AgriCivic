"""
Tests for the Session Manager service.
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from app.services.session_manager import SessionManager
from app.models import User, Session


class TestSessionManager:
    """Test cases for SessionManager."""

    @pytest.fixture
    def session_manager(self):
        """Create a SessionManager instance for testing."""
        return SessionManager(session_timeout_hours=1)  # 1 hour timeout for testing

    @pytest.fixture
    async def test_user(self, db_session):
        """Create a test user."""
        user_data = {
            "phone_number": "+1234567890",
            "preferred_language": "en",
            "location_lat": 40.7128,
            "location_lng": -74.0060,
            "location_address": "New York, NY",
            "district": "Manhattan",
            "state": "NY",
            "crops": ["wheat", "corn"],
            "name": "Test Farmer",
        }

        user = User(**user_data)
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    async def test_create_session(self, session_manager, db_session, test_user):
        """Test creating a new session."""
        initial_context = {"test_key": "test_value"}
        user_preferences = {"language": "en", "notifications": True}

        session = await session_manager.create_session(
            db=db_session,
            user_id=test_user.id,
            channel="chat",
            initial_context=initial_context,
            user_preferences=user_preferences,
        )

        assert session is not None
        assert session.user_id == test_user.id
        assert session.channel == "chat"
        assert session.context == initial_context
        assert session.user_preferences == user_preferences
        assert session.is_active is True
        assert session.session_token is not None
        assert session.conversation_history == []

    async def test_get_or_create_session_new(
        self, session_manager, db_session, test_user
    ):
        """Test getting or creating a session when none exists."""
        session = await session_manager.get_or_create_session(
            db=db_session, user_id=test_user.id, channel="sms"
        )

        assert session is not None
        assert session.user_id == test_user.id
        assert session.channel == "sms"
        assert session.is_active is True

        # Check that user data is included in context
        assert "location" in session.context
        assert "crops" in session.context
        assert "preferred_language" in session.context
        assert session.context["crops"] == ["wheat", "corn"]
        assert session.context["preferred_language"] == "en"

    async def test_get_or_create_session_existing(
        self, session_manager, db_session, test_user
    ):
        """Test getting an existing session."""
        # Create first session
        session1 = await session_manager.get_or_create_session(
            db=db_session, user_id=test_user.id, channel="voice"
        )

        # Get the same session
        session2 = await session_manager.get_or_create_session(
            db=db_session, user_id=test_user.id, channel="voice"
        )

        assert session1.id == session2.id
        assert session1.session_token == session2.session_token

    async def test_update_session_context(self, session_manager, db_session, test_user):
        """Test updating session context."""
        session = await session_manager.create_session(
            db=db_session,
            user_id=test_user.id,
            channel="chat",
            initial_context={"key1": "value1"},
        )

        # Update context with merge
        updated_session = await session_manager.update_session_context(
            db=db_session,
            session_id=session.id,
            context_updates={"key2": "value2"},
            merge=True,
        )

        assert updated_session is not None
        assert updated_session.context["key1"] == "value1"
        assert updated_session.context["key2"] == "value2"

        # Update context without merge (replace)
        updated_session = await session_manager.update_session_context(
            db=db_session,
            session_id=session.id,
            context_updates={"key3": "value3"},
            merge=False,
        )

        assert updated_session.context == {"key3": "value3"}

    async def test_add_conversation_message(
        self, session_manager, db_session, test_user
    ):
        """Test adding messages to conversation history."""
        session = await session_manager.create_session(
            db=db_session, user_id=test_user.id, channel="chat"
        )

        # Add first message
        message1 = {"role": "user", "content": "Hello"}
        updated_session = await session_manager.add_conversation_message(
            db=db_session, session_id=session.id, message=message1
        )

        assert len(updated_session.conversation_history) == 1
        assert updated_session.conversation_history[0]["role"] == "user"
        assert updated_session.conversation_history[0]["content"] == "Hello"
        assert "timestamp" in updated_session.conversation_history[0]

        # Add second message
        message2 = {"role": "assistant", "content": "Hi there!"}
        updated_session = await session_manager.add_conversation_message(
            db=db_session, session_id=session.id, message=message2
        )

        assert len(updated_session.conversation_history) == 2
        assert updated_session.conversation_history[1]["role"] == "assistant"
        assert updated_session.conversation_history[1]["content"] == "Hi there!"

    async def test_switch_channel(self, session_manager, db_session, test_user):
        """Test cross-channel session continuity."""
        # Create session on SMS channel
        sms_session = await session_manager.create_session(
            db=db_session,
            user_id=test_user.id,
            channel="sms",
            initial_context={"crop_query": "wheat prices"},
        )

        # Switch to voice channel
        voice_session = await session_manager.switch_channel(
            db=db_session,
            user_id=test_user.id,
            from_channel="sms",
            to_channel="voice",
            context_transfer={"voice_preference": "enabled"},
        )

        assert voice_session is not None
        assert voice_session.channel == "voice"
        assert voice_session.user_id == test_user.id
        assert voice_session.id != sms_session.id

        # Check context transfer
        assert "crop_query" in voice_session.context
        assert voice_session.context["crop_query"] == "wheat prices"
        assert voice_session.context["voice_preference"] == "enabled"

    async def test_deactivate_session(self, session_manager, db_session, test_user):
        """Test session deactivation."""
        session = await session_manager.create_session(
            db=db_session, user_id=test_user.id, channel="chat"
        )

        assert session.is_active is True

        # Deactivate session
        result = await session_manager.deactivate_session(db_session, session.id)
        assert result is True

        # Verify session is deactivated
        updated_session = await session_manager.get_session(db_session, session.id)
        assert updated_session is None  # Should return None for inactive sessions

    async def test_session_expiration(self, session_manager, db_session, test_user):
        """Test session expiration logic."""
        # Create session with short timeout
        short_timeout_manager = SessionManager(
            session_timeout_hours=0.001
        )  # Very short timeout

        session = await short_timeout_manager.create_session(
            db=db_session, user_id=test_user.id, channel="chat"
        )

        # Manually set last_activity to past time
        from app.services.database import SessionService

        await SessionService.update_session(
            db_session,
            session.id,
            {"last_activity": datetime.utcnow() - timedelta(hours=1)},
        )

        # Try to get expired session
        retrieved_session = await short_timeout_manager.get_session(
            db_session, session.id
        )
        assert retrieved_session is None  # Should be None due to expiration

    async def test_get_user_sessions(self, session_manager, db_session, test_user):
        """Test getting all sessions for a user."""
        # Create multiple sessions
        session1 = await session_manager.create_session(
            db=db_session, user_id=test_user.id, channel="chat"
        )

        session2 = await session_manager.create_session(
            db=db_session, user_id=test_user.id, channel="sms"
        )

        # Get user sessions
        sessions = await session_manager.get_user_sessions(
            db=db_session, user_id=test_user.id, active_only=True
        )

        assert len(sessions) == 2
        session_ids = [s.id for s in sessions]
        assert session1.id in session_ids
        assert session2.id in session_ids

    async def test_get_session_summary(self, session_manager, db_session, test_user):
        """Test getting session summary."""
        session = await session_manager.create_session(
            db=db_session,
            user_id=test_user.id,
            channel="chat",
            initial_context={"key1": "value1", "key2": "value2"},
        )

        # Add a message
        await session_manager.add_conversation_message(
            db=db_session,
            session_id=session.id,
            message={"role": "user", "content": "Test message"},
        )

        summary = await session_manager.get_session_summary(db_session, session.id)

        assert summary is not None
        assert summary["session_id"] == str(session.id)
        assert summary["user_id"] == str(test_user.id)
        assert summary["channel"] == "chat"
        assert summary["is_active"] is True
        assert summary["context_keys"] == ["key1", "key2"]
        assert summary["conversation_length"] == 1
        assert summary["is_expired"] is False

    async def test_cleanup_expired_sessions(
        self, session_manager, db_session, test_user
    ):
        """Test cleanup of expired sessions."""
        # Create session and manually expire it
        session = await session_manager.create_session(
            db=db_session, user_id=test_user.id, channel="chat"
        )

        # Deactivate and set old timestamp
        await session_manager.deactivate_session(db_session, session.id)

        from app.services.database import SessionService

        await SessionService.update_session(
            db_session,
            session.id,
            {"last_activity": datetime.utcnow() - timedelta(hours=25)},
        )

        # Run cleanup
        cleaned_count = await session_manager.cleanup_expired_sessions(db_session)

        assert cleaned_count >= 1  # At least our test session should be cleaned

    async def test_invalid_user_id(self, session_manager, db_session):
        """Test handling of invalid user ID."""
        invalid_user_id = uuid4()

        with pytest.raises(ValueError, match="User .* not found"):
            await session_manager.get_or_create_session(
                db=db_session, user_id=invalid_user_id, channel="chat"
            )

    async def test_update_session_activity(
        self, session_manager, db_session, test_user
    ):
        """Test updating session activity timestamp."""
        session = await session_manager.create_session(
            db=db_session, user_id=test_user.id, channel="chat"
        )

        original_activity = session.last_activity

        # Wait a moment and update activity
        import asyncio

        await asyncio.sleep(0.1)

        result = await session_manager.update_session_activity(db_session, session.id)
        assert result is True

        # Verify timestamp was updated
        updated_session = await session_manager.get_session(db_session, session.id)
        assert updated_session.last_activity > original_activity
