"""
Tests for authentication endpoints and services.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

from app.services.auth_service import auth_service


class TestAuthService:
    """Test authentication service."""

    def test_password_hashing(self):
        """Test password hashing and verification."""
        password = "test_password_123"
        hashed = auth_service.get_password_hash(password)

        # Verify correct password
        assert auth_service.verify_password(password, hashed)

        # Verify incorrect password
        assert not auth_service.verify_password("wrong_password", hashed)

    def test_create_access_token(self):
        """Test JWT token creation."""
        data = {"sub": "user123", "role": "user"}
        token = auth_service.create_access_token(data)

        assert token is not None
        assert isinstance(token, str)

    def test_decode_access_token(self):
        """Test JWT token decoding."""
        data = {"sub": "user123", "role": "user"}
        token = auth_service.create_access_token(data)

        decoded = auth_service.decode_access_token(token)

        assert decoded is not None
        assert decoded["sub"] == "user123"
        assert decoded["role"] == "user"
        assert "exp" in decoded

    def test_decode_invalid_token(self):
        """Test decoding invalid token."""
        invalid_token = "invalid.token.here"
        decoded = auth_service.decode_access_token(invalid_token)

        assert decoded is None

    def test_generate_api_key(self):
        """Test API key generation."""
        key1 = auth_service.generate_api_key()
        key2 = auth_service.generate_api_key()

        assert key1 is not None
        assert key2 is not None
        assert key1 != key2
        assert len(key1) > 32  # Should be reasonably long


@pytest.mark.asyncio
class TestAuthEndpoints:
    """Test authentication endpoints."""

    async def test_register_user(self, async_client):
        """Test user registration."""
        user_data = {
            "phone_number": "+919876543210",
            "password": "test_password_123",
            "preferred_language": "en",
            "name": "Test User",
        }

        response = await async_client.post("/api/v1/auth/register", json=user_data)

        assert response.status_code == 201
        data = response.json()
        assert data["phone_number"] == user_data["phone_number"]
        assert data["preferred_language"] == user_data["preferred_language"]
        assert data["name"] == user_data["name"]
        assert data["role"] == "user"
        assert data["is_active"] is True
        assert "id" in data

    async def test_register_duplicate_user(self, async_client):
        """Test registering duplicate user."""
        user_data = {
            "phone_number": "+919876543211",
            "password": "test_password_123",
            "preferred_language": "en",
        }

        # First registration
        response1 = await async_client.post("/api/v1/auth/register", json=user_data)
        assert response1.status_code == 201

        # Duplicate registration
        response2 = await async_client.post("/api/v1/auth/register", json=user_data)
        assert response2.status_code == 400
        assert "already registered" in response2.json()["detail"].lower()

    async def test_login_success(self, async_client):
        """Test successful login."""
        # Register user first
        user_data = {
            "phone_number": "+919876543212",
            "password": "test_password_123",
            "preferred_language": "en",
        }
        await async_client.post("/api/v1/auth/register", json=user_data)

        # Login
        login_data = {
            "phone_number": user_data["phone_number"],
            "password": user_data["password"],
        }
        response = await async_client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_invalid_credentials(self, async_client):
        """Test login with invalid credentials."""
        login_data = {
            "phone_number": "+919999999999",
            "password": "wrong_password",
        }
        response = await async_client.post("/api/v1/auth/login", json=login_data)

        assert response.status_code == 401

    async def test_get_current_user(self, async_client, auth_headers):
        """Test getting current user info."""
        response = await async_client.get("/api/v1/auth/me", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "phone_number" in data
        assert "role" in data

    async def test_get_current_user_unauthorized(self, async_client):
        """Test getting current user without authentication."""
        response = await async_client.get("/api/v1/auth/me")

        assert response.status_code == 403  # No credentials provided
