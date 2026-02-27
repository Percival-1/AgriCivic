"""
Tests for the LLM service.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta

from app.services.llm_service import (
    LLMService,
    OpenAIClient,
    AnthropicClient,
    LLMRequest,
    LLMResponse,
    LLMError,
    LLMProviderError,
    LLMTimeoutError,
    LLMRateLimitError,
    LLMProvider,
)


@pytest.fixture
def llm_service():
    """Create LLM service instance for testing."""
    service = LLMService()
    # Clear any existing clients for clean testing
    service.clients = {}
    service.metrics.total_requests = 0
    service.metrics.successful_requests = 0
    service.metrics.failed_requests = 0
    return service


@pytest.fixture
def mock_openai_client():
    """Create mock OpenAI client."""
    client = Mock(spec=OpenAIClient)
    client.provider = LLMProvider.OPENAI
    return client


@pytest.fixture
def mock_anthropic_client():
    """Create mock Anthropic client."""
    client = Mock(spec=AnthropicClient)
    client.provider = LLMProvider.ANTHROPIC
    return client


@pytest.fixture
def sample_llm_request():
    """Create sample LLM request."""
    return LLMRequest(
        prompt="What is the weather like today?",
        system_message="You are a helpful agricultural assistant.",
        max_tokens=100,
        temperature=0.7,
        metadata={"user_id": "test_user"},
    )


@pytest.fixture
def sample_llm_response():
    """Create sample LLM response."""
    return LLMResponse(
        content="The weather is sunny with a temperature of 25°C.",
        provider="openai",
        model="gpt-3.5-turbo",
        tokens_used=50,
        response_time=1.5,
        timestamp=datetime.now(),
        metadata={"user_id": "test_user"},
    )


class TestLLMRequest:
    """Test LLM request data structure."""

    def test_llm_request_creation(self):
        """Test LLM request creation with default values."""
        request = LLMRequest(prompt="Test prompt")

        assert request.prompt == "Test prompt"
        assert request.system_message is None
        assert request.max_tokens is None
        assert request.temperature is None
        assert request.model is None
        assert request.metadata == {}

    def test_llm_request_with_all_fields(self):
        """Test LLM request creation with all fields."""
        metadata = {"user_id": "123", "session_id": "abc"}
        request = LLMRequest(
            prompt="Test prompt",
            system_message="System message",
            max_tokens=100,
            temperature=0.5,
            model="gpt-4",
            metadata=metadata,
        )

        assert request.prompt == "Test prompt"
        assert request.system_message == "System message"
        assert request.max_tokens == 100
        assert request.temperature == 0.5
        assert request.model == "gpt-4"
        assert request.metadata == metadata


class TestLLMResponse:
    """Test LLM response data structure."""

    def test_llm_response_creation(self, sample_llm_response):
        """Test LLM response creation."""
        response = sample_llm_response

        assert response.content == "The weather is sunny with a temperature of 25°C."
        assert response.provider == "openai"
        assert response.model == "gpt-3.5-turbo"
        assert response.tokens_used == 50
        assert response.response_time == 1.5
        assert isinstance(response.timestamp, datetime)
        assert response.metadata == {"user_id": "test_user"}


class TestLLMService:
    """Test LLM service functionality."""

    def test_llm_service_initialization(self, llm_service):
        """Test LLM service initialization."""
        assert isinstance(llm_service.clients, dict)
        assert isinstance(llm_service.metrics.total_requests, int)
        assert isinstance(llm_service.circuit_breaker_state, dict)

    def test_circuit_breaker_initial_state(self, llm_service):
        """Test circuit breaker initial state."""
        for provider in [LLMProvider.OPENAI, LLMProvider.ANTHROPIC]:
            state = llm_service.circuit_breaker_state[provider.value]
            assert state["failures"] == 0
            assert state["last_failure"] is None
            assert state["state"] == "closed"

    def test_record_success(self, llm_service):
        """Test recording successful requests."""
        provider = "openai"

        # Simulate some failures first
        llm_service.circuit_breaker_state[provider]["failures"] = 2
        llm_service.circuit_breaker_state[provider]["state"] = "open"

        # Record success
        llm_service._record_success(provider)

        state = llm_service.circuit_breaker_state[provider]
        assert state["failures"] == 0
        assert state["state"] == "closed"
        assert state["last_failure"] is None

    def test_record_failure(self, llm_service):
        """Test recording failed requests."""
        provider = "openai"

        # Record failures
        for i in range(3):
            llm_service._record_failure(provider)

        state = llm_service.circuit_breaker_state[provider]
        assert state["failures"] == 3
        assert state["state"] == "open"
        assert isinstance(state["last_failure"], datetime)

    def test_circuit_breaker_open_check(self, llm_service):
        """Test circuit breaker open state check."""
        provider = "openai"

        # Initially closed
        assert not llm_service._is_circuit_breaker_open(provider)

        # Open circuit breaker
        llm_service.circuit_breaker_state[provider]["state"] = "open"
        llm_service.circuit_breaker_state[provider]["last_failure"] = datetime.now()

        assert llm_service._is_circuit_breaker_open(provider)

    def test_circuit_breaker_half_open_transition(self, llm_service):
        """Test circuit breaker transition to half-open."""
        provider = "openai"

        # Set circuit breaker to open with old failure time
        old_failure = datetime.now() - timedelta(minutes=10)
        llm_service.circuit_breaker_state[provider]["state"] = "open"
        llm_service.circuit_breaker_state[provider]["last_failure"] = old_failure

        # Check should transition to half-open
        is_open = llm_service._is_circuit_breaker_open(provider)

        assert not is_open
        assert llm_service.circuit_breaker_state[provider]["state"] == "half-open"

    @pytest.mark.asyncio
    async def test_generate_response_success(
        self, llm_service, mock_openai_client, sample_llm_response
    ):
        """Test successful response generation."""
        # Setup mock client
        mock_openai_client.generate_response = AsyncMock(
            return_value=sample_llm_response
        )
        llm_service.clients["openai"] = mock_openai_client

        # Generate response
        response = await llm_service.generate_response("Test prompt")

        assert response == sample_llm_response
        assert llm_service.metrics.total_requests == 1
        assert llm_service.metrics.successful_requests == 1
        assert llm_service.metrics.failed_requests == 0
        assert llm_service.metrics.total_tokens_used == 50

    @pytest.mark.asyncio
    async def test_generate_response_with_failover(
        self,
        llm_service,
        mock_openai_client,
        mock_anthropic_client,
        sample_llm_response,
    ):
        """Test response generation with failover."""
        # Setup clients
        mock_openai_client.generate_response = AsyncMock(
            side_effect=LLMProviderError("openai", "API error")
        )
        mock_anthropic_client.generate_response = AsyncMock(
            return_value=sample_llm_response
        )

        llm_service.clients["openai"] = mock_openai_client
        llm_service.clients["anthropic"] = mock_anthropic_client

        # Generate response (should failover to Anthropic)
        response = await llm_service.generate_response("Test prompt")

        assert response == sample_llm_response
        assert llm_service.metrics.total_requests == 1
        assert llm_service.metrics.successful_requests == 1
        assert llm_service.metrics.provider_usage.get("anthropic", 0) == 1

    @pytest.mark.asyncio
    async def test_generate_response_all_providers_fail(
        self, llm_service, mock_openai_client, mock_anthropic_client
    ):
        """Test response generation when all providers fail."""
        # Setup clients to fail
        error = LLMProviderError("test", "All providers failed")
        mock_openai_client.generate_response = AsyncMock(side_effect=error)
        mock_anthropic_client.generate_response = AsyncMock(side_effect=error)

        llm_service.clients["openai"] = mock_openai_client
        llm_service.clients["anthropic"] = mock_anthropic_client

        # Should raise error
        with pytest.raises(LLMProviderError):
            await llm_service.generate_response("Test prompt")

        assert llm_service.metrics.total_requests == 1
        assert llm_service.metrics.successful_requests == 0
        assert llm_service.metrics.failed_requests == 1

    @pytest.mark.asyncio
    async def test_generate_response_no_providers(self, llm_service):
        """Test response generation with no available providers."""
        # No clients configured
        llm_service.clients = {}

        with pytest.raises(LLMError, match="No LLM providers available"):
            await llm_service.generate_response("Test prompt")

    @pytest.mark.asyncio
    async def test_generate_response_with_retry(
        self, llm_service, mock_openai_client, sample_llm_response
    ):
        """Test response generation with retry logic."""
        # Setup client to fail twice then succeed
        mock_openai_client.generate_response = AsyncMock(
            side_effect=[
                LLMTimeoutError("Timeout 1"),
                LLMTimeoutError("Timeout 2"),
                sample_llm_response,
            ]
        )
        llm_service.clients["openai"] = mock_openai_client

        # Should succeed after retries
        response = await llm_service.generate_response("Test prompt")

        assert response == sample_llm_response
        assert mock_openai_client.generate_response.call_count == 3

    @pytest.mark.asyncio
    async def test_generate_response_circuit_breaker_skip(
        self,
        llm_service,
        mock_openai_client,
        mock_anthropic_client,
        sample_llm_response,
    ):
        """Test that circuit breaker skips open providers."""
        # Open circuit breaker for OpenAI
        llm_service.circuit_breaker_state["openai"]["state"] = "open"
        llm_service.circuit_breaker_state["openai"]["last_failure"] = datetime.now()

        # Setup clients
        mock_openai_client.generate_response = AsyncMock()  # Should not be called
        mock_anthropic_client.generate_response = AsyncMock(
            return_value=sample_llm_response
        )

        llm_service.clients["openai"] = mock_openai_client
        llm_service.clients["anthropic"] = mock_anthropic_client

        # Generate response
        response = await llm_service.generate_response("Test prompt")

        assert response == sample_llm_response
        # OpenAI should not have been called due to circuit breaker
        mock_openai_client.generate_response.assert_not_called()
        mock_anthropic_client.generate_response.assert_called_once()

    def test_get_metrics(self, llm_service):
        """Test metrics retrieval."""
        # Set some test metrics
        llm_service.metrics.total_requests = 10
        llm_service.metrics.successful_requests = 8
        llm_service.metrics.failed_requests = 2
        llm_service.metrics.total_tokens_used = 1000
        llm_service.metrics.average_response_time = 1.5
        llm_service.metrics.provider_usage = {"openai": 5, "anthropic": 3}
        llm_service.metrics.error_counts = {"LLMTimeoutError": 2}

        metrics = llm_service.get_metrics()

        assert metrics["total_requests"] == 10
        assert metrics["successful_requests"] == 8
        assert metrics["failed_requests"] == 2
        assert metrics["success_rate"] == 0.8
        assert metrics["total_tokens_used"] == 1000
        assert metrics["average_response_time"] == 1.5
        assert metrics["provider_usage"] == {"openai": 5, "anthropic": 3}
        assert metrics["error_counts"] == {"LLMTimeoutError": 2}
        assert "circuit_breaker_state" in metrics
        assert "available_providers" in metrics

    def test_reset_metrics(self, llm_service):
        """Test metrics reset."""
        # Set some test metrics
        llm_service.metrics.total_requests = 10
        llm_service.metrics.successful_requests = 8

        llm_service.reset_metrics()

        assert llm_service.metrics.total_requests == 0
        assert llm_service.metrics.successful_requests == 0
        assert llm_service.metrics.failed_requests == 0

    @pytest.mark.asyncio
    async def test_health_check_all_healthy(
        self, llm_service, mock_openai_client, mock_anthropic_client
    ):
        """Test health check with all providers healthy."""
        # Setup healthy responses
        health_response = LLMResponse(
            content="OK",
            provider="openai",
            model="gpt-3.5-turbo",
            tokens_used=5,
            response_time=0.5,
            timestamp=datetime.now(),
        )

        mock_openai_client.generate_response = AsyncMock(return_value=health_response)
        mock_anthropic_client.generate_response = AsyncMock(
            return_value=health_response
        )

        llm_service.clients["openai"] = mock_openai_client
        llm_service.clients["anthropic"] = mock_anthropic_client

        health_status = await llm_service.health_check()

        assert health_status["status"] == "healthy"
        assert health_status["providers"]["openai"]["healthy"] is True
        assert health_status["providers"]["anthropic"]["healthy"] is True
        assert "timestamp" in health_status

    @pytest.mark.asyncio
    async def test_health_check_degraded(
        self, llm_service, mock_openai_client, mock_anthropic_client
    ):
        """Test health check with one provider failing."""
        # Setup mixed responses
        health_response = LLMResponse(
            content="OK",
            provider="anthropic",
            model="claude-3-haiku-20240307",
            tokens_used=5,
            response_time=0.5,
            timestamp=datetime.now(),
        )

        mock_openai_client.generate_response = AsyncMock(
            side_effect=LLMProviderError("openai", "API error")
        )
        mock_anthropic_client.generate_response = AsyncMock(
            return_value=health_response
        )

        llm_service.clients["openai"] = mock_openai_client
        llm_service.clients["anthropic"] = mock_anthropic_client

        health_status = await llm_service.health_check()

        assert health_status["status"] == "degraded"
        assert health_status["providers"]["openai"]["healthy"] is False
        assert health_status["providers"]["anthropic"]["healthy"] is True

    @pytest.mark.asyncio
    async def test_health_check_circuit_breaker_open(
        self, llm_service, mock_openai_client
    ):
        """Test health check with circuit breaker open."""
        # Open circuit breaker
        llm_service.circuit_breaker_state["openai"]["state"] = "open"
        llm_service.circuit_breaker_state["openai"]["last_failure"] = datetime.now()

        llm_service.clients["openai"] = mock_openai_client

        health_status = await llm_service.health_check()

        assert health_status["providers"]["openai"]["status"] == "circuit_breaker_open"
        assert health_status["providers"]["openai"]["healthy"] is False


class TestLLMExceptions:
    """Test LLM exception classes."""

    def test_llm_error(self):
        """Test base LLM error."""
        error = LLMError("Test error")
        assert str(error) == "Test error"

    def test_llm_provider_error(self):
        """Test LLM provider error."""
        original_error = Exception("Original error")
        error = LLMProviderError("openai", "API failed", original_error)

        assert error.provider == "openai"
        assert error.original_error == original_error
        assert "LLM Provider openai error: API failed" in str(error)

    def test_llm_timeout_error(self):
        """Test LLM timeout error."""
        error = LLMTimeoutError("Request timed out")
        assert str(error) == "Request timed out"

    def test_llm_rate_limit_error(self):
        """Test LLM rate limit error."""
        error = LLMRateLimitError("Rate limit exceeded")
        assert str(error) == "Rate limit exceeded"
