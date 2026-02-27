"""
Integration tests for LLM API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.services.llm_service import LLMResponse, LLMError
from datetime import datetime


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def sample_llm_response():
    """Create sample LLM response."""
    return LLMResponse(
        content="This is a test response from the LLM.",
        provider="openai",
        model="gpt-3.5-turbo",
        tokens_used=25,
        response_time=1.2,
        timestamp=datetime.now(),
        metadata={"test": True},
    )


class TestLLMAPI:
    """Test LLM API endpoints."""

    @patch("app.services.llm_service.llm_service.generate_response")
    def test_generate_response_success(
        self, mock_generate, client, sample_llm_response
    ):
        """Test successful response generation."""
        mock_generate.return_value = sample_llm_response

        response = client.post(
            "/api/v1/llm/generate",
            json={
                "prompt": "What is the weather like today?",
                "system_message": "You are a helpful assistant.",
                "max_tokens": 100,
                "temperature": 0.7,
            },
        )

        assert response.status_code == 200
        data = response.json()

        assert data["content"] == "This is a test response from the LLM."
        assert data["provider"] == "openai"
        assert data["model"] == "gpt-3.5-turbo"
        assert data["tokens_used"] == 25
        assert data["response_time"] == 1.2
        assert data["metadata"] == {"test": True}

    @patch("app.services.llm_service.llm_service.generate_response")
    def test_generate_response_llm_error(self, mock_generate, client):
        """Test LLM error handling."""
        mock_generate.side_effect = LLMError("LLM service unavailable")

        response = client.post("/api/v1/llm/generate", json={"prompt": "Test prompt"})

        assert response.status_code == 503
        data = response.json()
        # The error format from main.py exception handler
        assert "error" in data
        assert "LLM service error" in data["error"]["message"]

    @patch("app.services.llm_service.llm_service.generate_response")
    def test_generate_response_unexpected_error(self, mock_generate, client):
        """Test unexpected error handling."""
        mock_generate.side_effect = Exception("Unexpected error")

        response = client.post("/api/v1/llm/generate", json={"prompt": "Test prompt"})

        assert response.status_code == 500
        data = response.json()
        # The error format from main.py exception handler
        assert "error" in data
        assert data["error"]["message"] == "Internal server error"

    def test_generate_response_validation_error(self, client):
        """Test request validation error."""
        response = client.post(
            "/api/v1/llm/generate", json={}  # Missing required prompt field
        )

        assert response.status_code == 422

    @patch("app.services.llm_service.llm_service.get_metrics")
    def test_get_metrics_success(self, mock_get_metrics, client):
        """Test successful metrics retrieval."""
        mock_metrics = {
            "total_requests": 100,
            "successful_requests": 95,
            "failed_requests": 5,
            "success_rate": 0.95,
            "total_tokens_used": 5000,
            "average_response_time": 1.5,
            "provider_usage": {"openai": 60, "anthropic": 35},
            "error_counts": {"LLMTimeoutError": 3, "LLMRateLimitError": 2},
            "circuit_breaker_state": {
                "openai": {"failures": 0, "state": "closed"},
                "anthropic": {"failures": 1, "state": "closed"},
            },
            "available_providers": ["openai", "anthropic"],
        }
        mock_get_metrics.return_value = mock_metrics

        response = client.get("/api/v1/llm/metrics")

        assert response.status_code == 200
        data = response.json()

        assert data["total_requests"] == 100
        assert data["successful_requests"] == 95
        assert data["success_rate"] == 0.95
        assert data["provider_usage"] == {"openai": 60, "anthropic": 35}
        assert "openai" in data["available_providers"]
        assert "anthropic" in data["available_providers"]

    @patch("app.services.llm_service.llm_service.get_metrics")
    def test_get_metrics_error(self, mock_get_metrics, client):
        """Test metrics retrieval error."""
        mock_get_metrics.side_effect = Exception("Metrics error")

        response = client.get("/api/v1/llm/metrics")

        assert response.status_code == 500
        data = response.json()
        assert "error" in data
        assert data["error"]["message"] == "Failed to retrieve metrics"

    @patch("app.services.llm_service.llm_service.reset_metrics")
    def test_reset_metrics_success(self, mock_reset_metrics, client):
        """Test successful metrics reset."""
        mock_reset_metrics.return_value = None

        response = client.post("/api/v1/llm/metrics/reset")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Metrics reset successfully"

    @patch("app.services.llm_service.llm_service.reset_metrics")
    def test_reset_metrics_error(self, mock_reset_metrics, client):
        """Test metrics reset error."""
        mock_reset_metrics.side_effect = Exception("Reset error")

        response = client.post("/api/v1/llm/metrics/reset")

        assert response.status_code == 500
        data = response.json()
        assert "error" in data
        assert data["error"]["message"] == "Failed to reset metrics"

    @patch("app.services.llm_service.llm_service.health_check")
    def test_health_check_success(self, mock_health_check, client):
        """Test successful health check."""
        mock_health_status = {
            "status": "healthy",
            "providers": {
                "openai": {
                    "status": "healthy",
                    "healthy": True,
                    "response_time": 0.8,
                    "model": "gpt-3.5-turbo",
                },
                "anthropic": {
                    "status": "healthy",
                    "healthy": True,
                    "response_time": 1.2,
                    "model": "claude-3-haiku-20240307",
                },
            },
            "timestamp": "2024-01-01T12:00:00",
        }
        mock_health_check.return_value = mock_health_status

        response = client.get("/api/v1/llm/health")

        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "healthy"
        assert "openai" in data["providers"]
        assert "anthropic" in data["providers"]
        assert data["providers"]["openai"]["healthy"] is True
        assert data["providers"]["anthropic"]["healthy"] is True

    @patch("app.services.llm_service.llm_service.health_check")
    def test_health_check_error(self, mock_health_check, client):
        """Test health check error."""
        mock_health_check.side_effect = Exception("Health check error")

        response = client.get("/api/v1/llm/health")

        assert response.status_code == 500
        data = response.json()
        assert "error" in data
        assert data["error"]["message"] == "Health check failed"

    @patch("app.services.llm_service.llm_service.get_metrics")
    def test_get_available_providers_success(self, mock_get_metrics, client):
        """Test successful provider information retrieval."""
        mock_metrics = {
            "available_providers": ["openai", "anthropic"],
            "circuit_breaker_state": {
                "openai": {"failures": 0, "state": "closed"},
                "anthropic": {"failures": 1, "state": "closed"},
            },
            "provider_usage": {"openai": 60, "anthropic": 35},
        }
        mock_get_metrics.return_value = mock_metrics

        response = client.get("/api/v1/llm/providers")

        assert response.status_code == 200
        data = response.json()

        assert data["available_providers"] == ["openai", "anthropic"]
        assert "openai" in data["circuit_breaker_state"]
        assert "anthropic" in data["circuit_breaker_state"]
        assert data["provider_usage"] == {"openai": 60, "anthropic": 35}

    @patch("app.services.llm_service.llm_service.get_metrics")
    def test_get_available_providers_error(self, mock_get_metrics, client):
        """Test provider information retrieval error."""
        mock_get_metrics.side_effect = Exception("Provider info error")

        response = client.get("/api/v1/llm/providers")

        assert response.status_code == 500
        data = response.json()
        assert "error" in data
        assert data["error"]["message"] == "Failed to retrieve provider information"
