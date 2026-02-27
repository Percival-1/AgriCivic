"""
Socket.IO Manager for Real-Time Communication

This module provides Socket.IO server configuration and event handlers for:
- Real-time notifications
- Chat messages
- Connection management
- User authentication via JWT

Requirements: 12.6-12.8, 19.7
"""

import logging
from typing import Dict, Optional
import socketio
from jose import jwt, JWTError

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Create Socket.IO server instance
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",  # Configure properly for production
    logger=True,
    engineio_logger=True,
)

# Store user sessions: {sid: user_id}
user_sessions: Dict[str, str] = {}

# Store user rooms: {user_id: sid}
user_rooms: Dict[str, str] = {}


def get_socketio_app():
    """Get Socket.IO ASGI application."""
    return sio


async def authenticate_socket(token: str) -> Optional[str]:
    """
    Authenticate user from JWT token.

    Args:
        token: JWT token from client

    Returns:
        User ID if authentication successful, None otherwise
    """
    try:
        # Decode JWT token
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        user_id: str = payload.get("sub")

        if user_id is None:
            logger.warning("Token missing 'sub' claim")
            return None

        return user_id

    except JWTError as e:
        logger.error(f"JWT authentication error: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected authentication error: {e}")
        return None


# ============================================================================
# Socket.IO Event Handlers
# ============================================================================


@sio.event
async def connect(sid: str, environ: dict, auth: dict):
    """
    Handle client connection.

    Requirement 12.6: Establish Socket.IO connection on user login
    """
    try:
        # Get token from auth
        token = auth.get("token") if auth else None

        if not token:
            logger.warning(f"Connection attempt without token: {sid}")
            await sio.disconnect(sid)
            return False

        # Authenticate user
        user_id = await authenticate_socket(token)

        if not user_id:
            logger.warning(f"Authentication failed for connection: {sid}")
            await sio.disconnect(sid)
            return False

        # Store session
        user_sessions[sid] = user_id
        user_rooms[user_id] = sid

        # Join user-specific room
        await sio.enter_room(sid, user_id)

        logger.info(f"Client connected: {sid} (user: {user_id})")

        # Send connection confirmation
        await sio.emit(
            "connected",
            {"message": "Connected to server", "user_id": user_id},
            room=sid,
        )

        return True

    except Exception as e:
        logger.error(f"Error handling connection: {e}")
        await sio.disconnect(sid)
        return False


@sio.event
async def disconnect(sid: str):
    """
    Handle client disconnection.

    Requirement 12.7: Disconnect Socket.IO connection on user logout
    """
    try:
        user_id = user_sessions.get(sid)

        if user_id:
            # Leave user room
            await sio.leave_room(sid, user_id)

            # Remove from sessions
            del user_sessions[sid]
            if user_id in user_rooms:
                del user_rooms[user_id]

            logger.info(f"Client disconnected: {sid} (user: {user_id})")
        else:
            logger.info(f"Client disconnected: {sid} (no user session)")

    except Exception as e:
        logger.error(f"Error handling disconnection: {e}")


@sio.event
async def ping(sid: str):
    """Handle ping from client."""
    await sio.emit("pong", room=sid)


@sio.event
async def typing(sid: str, data: dict):
    """
    Handle typing indicator.

    Requirement 12.9: Emit typing indicators via Socket.IO
    """
    try:
        user_id = user_sessions.get(sid)
        if not user_id:
            return

        # Broadcast typing indicator to other users in the same chat
        chat_room = data.get("chat_room")
        if chat_room:
            await sio.emit(
                "typing",
                {
                    "user_id": user_id,
                    "chat_room": chat_room,
                    "is_typing": data.get("is_typing", True),
                },
                room=chat_room,
                skip_sid=sid,
            )

    except Exception as e:
        logger.error(f"Error handling typing event: {e}")


@sio.event
async def join_chat(sid: str, data: dict):
    """
    Handle user joining a chat room.

    Requirement 12.10: Join/leave chat rooms
    """
    try:
        user_id = user_sessions.get(sid)
        if not user_id:
            return

        chat_room = data.get("chat_room")
        if chat_room:
            await sio.enter_room(sid, chat_room)
            logger.info(f"User {user_id} joined chat room: {chat_room}")

            # Notify others in the room
            await sio.emit(
                "user_joined",
                {"user_id": user_id, "chat_room": chat_room},
                room=chat_room,
                skip_sid=sid,
            )

    except Exception as e:
        logger.error(f"Error joining chat room: {e}")


@sio.event
async def leave_chat(sid: str, data: dict):
    """
    Handle user leaving a chat room.

    Requirement 12.10: Join/leave chat rooms
    """
    try:
        user_id = user_sessions.get(sid)
        if not user_id:
            return

        chat_room = data.get("chat_room")
        if chat_room:
            await sio.leave_room(sid, chat_room)
            logger.info(f"User {user_id} left chat room: {chat_room}")

            # Notify others in the room
            await sio.emit(
                "user_left",
                {"user_id": user_id, "chat_room": chat_room},
                room=chat_room,
                skip_sid=sid,
            )

    except Exception as e:
        logger.error(f"Error leaving chat room: {e}")


# ============================================================================
# Helper Functions for Emitting Events
# ============================================================================


async def emit_notification(user_id: str, notification: dict):
    """
    Emit notification to a specific user.

    Requirement 11.5: Support real-time notifications using Socket.IO connection

    Args:
        user_id: Target user ID
        notification: Notification data
    """
    try:
        # Emit to user's room
        await sio.emit("notification", notification, room=user_id)
        logger.info(f"Notification sent to user {user_id}: {notification.get('title')}")

    except Exception as e:
        logger.error(f"Error emitting notification: {e}")


async def emit_chat_message(chat_room: str, message: dict):
    """
    Emit chat message to a chat room.

    Args:
        chat_room: Chat room ID
        message: Message data
    """
    try:
        await sio.emit("chat_message", message, room=chat_room)
        logger.info(f"Chat message sent to room {chat_room}")

    except Exception as e:
        logger.error(f"Error emitting chat message: {e}")


async def emit_to_user(user_id: str, event: str, data: dict):
    """
    Emit custom event to a specific user.

    Args:
        user_id: Target user ID
        event: Event name
        data: Event data
    """
    try:
        await sio.emit(event, data, room=user_id)
        logger.info(f"Event '{event}' sent to user {user_id}")

    except Exception as e:
        logger.error(f"Error emitting event to user: {e}")


def is_user_connected(user_id: str) -> bool:
    """
    Check if user is currently connected.

    Args:
        user_id: User ID to check

    Returns:
        True if user is connected, False otherwise
    """
    return user_id in user_rooms


def get_connected_users() -> list:
    """
    Get list of currently connected user IDs.

    Returns:
        List of user IDs
    """
    return list(user_rooms.keys())
