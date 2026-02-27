"""
Test configuration and fixtures.
"""

import asyncio
import os
import pytest
import pytest_asyncio
from urllib.parse import quote_plus
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.base import Base
from app.config import get_settings

# Get password from environment or use default
# The password from .env file is "Shubh@2024" which needs URL encoding
postgres_password = os.getenv("POSTGRES_PASSWORD", "Shubh@2024")
encoded_password = quote_plus(postgres_password)

# Test database URL - using PostgreSQL for testing
TEST_DATABASE_URL = (
    f"postgresql+asyncpg://postgres:{encoded_password}@localhost:5432/postgres"
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session():
    """Create a test database session."""
    # Create test engine
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async_session = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        yield session

    # Clean up - drop all tables after test
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    # Clean up
    await engine.dispose()


@pytest.fixture
def sample_user_data():
    """Sample user data for testing."""
    return {
        "phone_number": "+1234567890",
        "preferred_language": "en",
        "location_lat": 28.6139,
        "location_lng": 77.2090,
        "district": "New Delhi",
        "state": "Delhi",
        "crops": ["wheat", "rice"],
        "name": "Test Farmer",
    }


@pytest.fixture
def sample_session_data():
    """Sample session data for testing."""
    return {
        "channel": "sms",
        "context": {"last_query": "weather"},
        "conversation_history": [
            {"message": "Hello", "timestamp": "2024-01-01T10:00:00"}
        ],
        "session_token": "test_token_123",
        "user_preferences": {"language": "hi"},
    }


@pytest.fixture
def sample_market_price_data():
    """Sample market price data for testing."""
    from datetime import date

    return {
        "mandi_name": "Delhi Mandi",
        "crop_name": "wheat",
        "price_per_quintal": 2500.00,
        "date": date.today(),
        "location_lat": 28.6139,
        "location_lng": 77.2090,
        "district": "New Delhi",
        "state": "Delhi",
        "quality_grade": "A",
        "source": "government_portal",
    }


@pytest_asyncio.fixture
async def async_client():
    """Create an async test client."""
    from httpx import AsyncClient
    from app.main import app

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def auth_headers(async_client):
    """Create authentication headers with a valid token."""
    # Register a test user
    user_data = {
        "phone_number": "+919876543213",
        "password": "test_password_123",
        "preferred_language": "en",
        "name": "Auth Test User",
    }
    await async_client.post("/api/v1/auth/register", json=user_data)

    # Login to get token
    login_data = {
        "phone_number": user_data["phone_number"],
        "password": user_data["password"],
    }
    response = await async_client.post("/api/v1/auth/login", json=login_data)
    token = response.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}
