"""
Tests for Chat API endpoints.
"""

import io
import pytest
import pytest_asyncio
from uuid import uuid4
from httpx import AsyncClient
from app.main import app
from app.database import get_db
from app.services.database import UserService


@pytest_asyncio.fixture
async def test_user(db_session):
    """Create a test user."""
    user_data = {
        "phone_number": "+1234567890",
        "preferred_language": "en",
        "location_lat": 28.6139,
        "location_lng": 77.2090,
        "location_address": "Test Address",
        "district": "Test District",
        "state": "Test State",
        "crops": ["wheat", "rice"],
        "name": "Test Farmer",
    }
    user = await UserService.create_user(db_session, user_data)
    return user


@pytest_asyncio.fixture
async def client_with_db(db_session):
    """Create test client with database dependency override."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_initialize_chat_session(test_user, client_with_db):
    """Test chat session initialization."""
    response = await client_with_db.post(
        "/api/v1/chat/init",
        json={
            "user_id": str(test_user.id),
            "language": "en",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert "session_id" in data
    assert data["user_id"] == str(test_user.id)
    assert data["language"] == "en"
    assert "welcome_message" in data
    assert len(data["welcome_message"]) > 0


@pytest.mark.asyncio
async def test_send_chat_message(test_user, client_with_db):
    """Test sending a chat message."""
    # First initialize a session
    init_response = await client_with_db.post(
        "/api/v1/chat/init",
        json={
            "user_id": str(test_user.id),
            "language": "en",
        },
    )
    session_id = init_response.json()["session_id"]

    # Send a message
    message_response = await client_with_db.post(
        "/api/v1/chat/message",
        json={
            "session_id": session_id,
            "message": "What is the weather today?",
            "language": "en",
        },
    )

    assert message_response.status_code == 200
    data = message_response.json()
    assert "message_id" in data
    assert data["role"] == "assistant"
    assert "content" in data
    assert len(data["content"]) > 0
    assert data["language"] == "en"


@pytest.mark.asyncio
async def test_get_chat_history(test_user, client_with_db):
    """Test retrieving chat history."""
    # Initialize session and send messages
    init_response = await client_with_db.post(
        "/api/v1/chat/init",
        json={
            "user_id": str(test_user.id),
            "language": "en",
        },
    )
    session_id = init_response.json()["session_id"]

    # Send a message
    await client_with_db.post(
        "/api/v1/chat/message",
        json={
            "session_id": session_id,
            "message": "Hello",
            "language": "en",
        },
    )

    # Get history
    history_response = await client_with_db.get(
        f"/api/v1/chat/{session_id}/history",
        params={"limit": 50, "offset": 0},
    )

    assert history_response.status_code == 200
    data = history_response.json()
    assert "session_id" in data
    assert "messages" in data
    assert "total_messages" in data
    assert len(data["messages"]) >= 2  # At least user message and assistant response


@pytest.mark.asyncio
async def test_upload_crop_image(test_user, client_with_db):
    """Test uploading a crop image for disease identification."""
    # Initialize session
    init_response = await client_with_db.post(
        "/api/v1/chat/init",
        json={
            "user_id": str(test_user.id),
            "language": "en",
        },
    )
    session_id = init_response.json()["session_id"]

    # Create a fake image file
    fake_image = io.BytesIO(b"fake image data")
    fake_image.name = "test_crop.jpg"

    # Upload image
    upload_response = await client_with_db.post(
        "/api/v1/chat/upload-image",
        data={
            "session_id": session_id,
            "language": "en",
        },
        files={"image": ("test_crop.jpg", fake_image, "image/jpeg")},
    )

    assert upload_response.status_code == 200
    data = upload_response.json()
    assert "message_id" in data
    assert "disease_info" in data
    assert "treatment_recommendations" in data
    assert isinstance(data["treatment_recommendations"], list)


@pytest.mark.asyncio
async def test_end_chat_session(test_user, client_with_db):
    """Test ending a chat session."""
    # Initialize session
    init_response = await client_with_db.post(
        "/api/v1/chat/init",
        json={
            "user_id": str(test_user.id),
            "language": "en",
        },
    )
    session_id = init_response.json()["session_id"]

    # End session
    end_response = await client_with_db.delete(f"/api/v1/chat/{session_id}")

    assert end_response.status_code == 204


@pytest.mark.asyncio
async def test_chat_with_invalid_session(client_with_db):
    """Test sending message with invalid session ID."""
    invalid_session_id = str(uuid4())

    response = await client_with_db.post(
        "/api/v1/chat/message",
        json={
            "session_id": invalid_session_id,
            "message": "Hello",
            "language": "en",
        },
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_chat_message_with_multilingual_support(test_user, client_with_db):
    """Test chat with multilingual message."""
    # Initialize session with Hindi language
    init_response = await client_with_db.post(
        "/api/v1/chat/init",
        json={
            "user_id": str(test_user.id),
            "language": "hi",
        },
    )
    session_id = init_response.json()["session_id"]

    # Send a message in Hindi
    message_response = await client_with_db.post(
        "/api/v1/chat/message",
        json={
            "session_id": session_id,
            "message": "मौसम कैसा है?",  # "What is the weather?"
            "language": "hi",
        },
    )

    assert message_response.status_code == 200
    data = message_response.json()
    assert data["language"] == "hi"
    assert "content" in data


@pytest.mark.asyncio
async def test_chat_history_pagination(test_user, client_with_db):
    """Test chat history pagination."""
    # Initialize session and send multiple messages
    init_response = await client_with_db.post(
        "/api/v1/chat/init",
        json={
            "user_id": str(test_user.id),
            "language": "en",
        },
    )
    session_id = init_response.json()["session_id"]

    # Send multiple messages
    for i in range(5):
        await client_with_db.post(
            "/api/v1/chat/message",
            json={
                "session_id": session_id,
                "message": f"Message {i}",
                "language": "en",
            },
        )

    # Get paginated history
    history_response = await client_with_db.get(
        f"/api/v1/chat/{session_id}/history",
        params={"limit": 3, "offset": 0},
    )

    assert history_response.status_code == 200
    data = history_response.json()
    assert len(data["messages"]) <= 3
    assert data["total_messages"] > 3


@pytest.mark.asyncio
async def test_upload_invalid_file_type(test_user, client_with_db):
    """Test uploading an invalid file type."""
    # Initialize session
    init_response = await client_with_db.post(
        "/api/v1/chat/init",
        json={
            "user_id": str(test_user.id),
            "language": "en",
        },
    )
    session_id = init_response.json()["session_id"]

    # Create a fake text file
    fake_file = io.BytesIO(b"not an image")
    fake_file.name = "test.txt"

    # Upload file
    upload_response = await client_with_db.post(
        "/api/v1/chat/upload-image",
        data={
            "session_id": session_id,
            "language": "en",
        },
        files={"image": ("test.txt", fake_file, "text/plain")},
    )

    assert upload_response.status_code == 400
