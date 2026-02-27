"""
Tests for error handling and resilience mechanisms.
"""

import pytest
import asyncio
import time
from app.core.error_handling import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitBreakerError,
    CircuitState,
    RetryConfig,
    retry_async,
    retry_sync,
    RetryExhaustedError,
    FallbackStrategy,
    with_fallback_async,
    with_fallback_sync,
    ErrorContext,
    ErrorSeverity,
    ErrorTracker,
    with_circuit_breaker,
    with_retry,
)


class TestCircuitBreaker:
    """Test circuit breaker functionality."""

    def test_circuit_breaker_initial_state(self):
        """Test circuit breaker starts in closed state."""
        breaker = CircuitBreaker("test")
        assert breaker.get_state() == CircuitState.CLOSED

    def test_circuit_breaker_opens_after_failures(self):
        """Test circuit breaker opens after threshold failures."""
        breaker = CircuitBreaker(
            "test",
            CircuitBreakerConfig(failure_threshold=3, expected_exception=ValueError),
        )

        def failing_function():
            raise ValueError("Test error")

        # Cause failures
        for _ in range(3):
            with pytest.raises(ValueError):
                breaker.call(failing_function)

        # Circuit should be open
        assert breaker.get_state() == CircuitState.OPEN

        # Next call should be rejected
        with pytest.raises(CircuitBreakerError):
            breaker.call(failing_function)

    def test_circuit_breaker_closes_after_success(self):
        """Test circuit breaker closes after successful calls in half-open state."""
        breaker = CircuitBreaker(
            "test",
            CircuitBreakerConfig(
                failure_threshold=2,
                success_threshold=2,
                timeout_seconds=1,
                expected_exception=ValueError,
            ),
        )

        call_count = [0]

        def sometimes_failing_function():
            call_count[0] += 1
            if call_count[0] <= 2:
                raise ValueError("Test error")
            return "success"

        # Cause failures to open circuit
        for _ in range(2):
            with pytest.raises(ValueError):
                breaker.call(sometimes_failing_function)

        assert breaker.get_state() == CircuitState.OPEN

        # Wait for timeout
        time.sleep(1.1)

        # Should transition to half-open and succeed
        result = breaker.call(sometimes_failing_function)
        assert result == "success"
        assert breaker.get_state() == CircuitState.HALF_OPEN

        # Another success should close the circuit
        result = breaker.call(sometimes_failing_function)
        assert result == "success"
        assert breaker.get_state() == CircuitState.CLOSED

    @pytest.mark.asyncio
    async def test_circuit_breaker_async(self):
        """Test circuit breaker with async functions."""
        breaker = CircuitBreaker(
            "test_async",
            CircuitBreakerConfig(failure_threshold=2, expected_exception=ValueError),
        )

        async def failing_async_function():
            raise ValueError("Async test error")

        # Cause failures
        for _ in range(2):
            with pytest.raises(ValueError):
                await breaker.call_async(failing_async_function)

        # Circuit should be open
        assert breaker.get_state() == CircuitState.OPEN

        # Next call should be rejected
        with pytest.raises(CircuitBreakerError):
            await breaker.call_async(failing_async_function)

    def test_circuit_breaker_metrics(self):
        """Test circuit breaker metrics collection."""
        breaker = CircuitBreaker("test_metrics")

        def success_function():
            return "success"

        # Make some successful calls
        for _ in range(5):
            breaker.call(success_function)

        metrics = breaker.get_metrics()
        assert metrics["total_requests"] == 5
        assert metrics["successful_requests"] == 5
        assert metrics["failed_requests"] == 0
        assert metrics["success_rate"] == 1.0

    def test_circuit_breaker_decorator(self):
        """Test circuit breaker decorator."""

        @with_circuit_breaker(
            "test_decorator", CircuitBreakerConfig(failure_threshold=2)
        )
        def decorated_function(should_fail: bool):
            if should_fail:
                raise ValueError("Test error")
            return "success"

        # Successful call
        result = decorated_function(False)
        assert result == "success"

        # Cause failures
        for _ in range(2):
            with pytest.raises(ValueError):
                decorated_function(True)

        # Circuit should be open
        with pytest.raises(CircuitBreakerError):
            decorated_function(False)


class TestRetryMechanism:
    """Test retry mechanism functionality."""

    @pytest.mark.asyncio
    async def test_retry_async_success_after_failures(self):
        """Test retry succeeds after initial failures."""
        call_count = [0]

        async def sometimes_failing_function():
            call_count[0] += 1
            if call_count[0] < 3:
                raise ValueError("Temporary error")
            return "success"

        config = RetryConfig(max_attempts=5, initial_delay=0.1, jitter=False)
        result = await retry_async(sometimes_failing_function, config=config)

        assert result == "success"
        assert call_count[0] == 3

    @pytest.mark.asyncio
    async def test_retry_async_exhausted(self):
        """Test retry exhausted after max attempts."""

        async def always_failing_function():
            raise ValueError("Permanent error")

        config = RetryConfig(max_attempts=3, initial_delay=0.1, jitter=False)

        with pytest.raises(RetryExhaustedError) as exc_info:
            await retry_async(always_failing_function, config=config)

        assert exc_info.value.attempts == 3
        assert isinstance(exc_info.value.last_exception, ValueError)

    def test_retry_sync_success(self):
        """Test synchronous retry mechanism."""
        call_count = [0]

        def sometimes_failing_function():
            call_count[0] += 1
            if call_count[0] < 2:
                raise ValueError("Temporary error")
            return "success"

        config = RetryConfig(max_attempts=3, initial_delay=0.1, jitter=False)
        result = retry_sync(sometimes_failing_function, config=config)

        assert result == "success"
        assert call_count[0] == 2

    @pytest.mark.asyncio
    async def test_retry_decorator(self):
        """Test retry decorator."""
        call_count = [0]

        @with_retry(RetryConfig(max_attempts=3, initial_delay=0.1, jitter=False))
        async def decorated_function():
            call_count[0] += 1
            if call_count[0] < 2:
                raise ValueError("Temporary error")
            return "success"

        result = await decorated_function()
        assert result == "success"
        assert call_count[0] == 2


class TestFallbackStrategy:
    """Test graceful degradation with fallback strategies."""

    @pytest.mark.asyncio
    async def test_fallback_with_default_value(self):
        """Test fallback to default value."""

        async def failing_function():
            raise ValueError("Error")

        strategy = FallbackStrategy(default_value="fallback_value", log_fallback=False)
        result = await with_fallback_async(failing_function, strategy=strategy)

        assert result == "fallback_value"

    @pytest.mark.asyncio
    async def test_fallback_with_function(self):
        """Test fallback to fallback function."""

        async def failing_function():
            raise ValueError("Error")

        async def fallback_function():
            return "fallback_result"

        strategy = FallbackStrategy(
            fallback_function=fallback_function, log_fallback=False
        )
        result = await with_fallback_async(failing_function, strategy=strategy)

        assert result == "fallback_result"

    def test_fallback_sync(self):
        """Test synchronous fallback."""

        def failing_function():
            raise ValueError("Error")

        strategy = FallbackStrategy(default_value="fallback_value", log_fallback=False)
        result = with_fallback_sync(failing_function, strategy=strategy)

        assert result == "fallback_value"


class TestErrorTracking:
    """Test error tracking functionality."""

    def test_error_tracker_basic(self):
        """Test basic error tracking."""
        tracker = ErrorTracker()

        context = ErrorContext(
            error_type="TestError",
            error_message="Test error message",
            severity=ErrorSeverity.HIGH,
            service_name="test_service",
        )

        tracker.track_error(context)

        summary = tracker.get_error_summary(time_window_seconds=60)
        assert summary["total_errors"] == 1
        assert "test_service:TestError" in summary["error_counts"]

    def test_error_tracker_severity_distribution(self):
        """Test error severity distribution."""
        tracker = ErrorTracker()

        # Track errors with different severities
        for severity in [ErrorSeverity.LOW, ErrorSeverity.MEDIUM, ErrorSeverity.HIGH]:
            context = ErrorContext(
                error_type="TestError",
                error_message="Test",
                severity=severity,
                service_name="test_service",
            )
            tracker.track_error(context)

        summary = tracker.get_error_summary(time_window_seconds=60)
        assert summary["total_errors"] == 3
        assert summary["severity_distribution"]["low"] == 1
        assert summary["severity_distribution"]["medium"] == 1
        assert summary["severity_distribution"]["high"] == 1

    def test_error_tracker_clear_old_errors(self):
        """Test clearing old errors."""
        import time
        from datetime import datetime, timedelta

        tracker = ErrorTracker()

        # Create an old error by manually setting timestamp
        context = ErrorContext(
            error_type="TestError",
            error_message="Test",
            severity=ErrorSeverity.LOW,
            service_name="test_service",
            timestamp=datetime.now() - timedelta(seconds=120),  # 2 minutes ago
        )
        tracker.errors.append(context)

        # Clear errors older than 60 seconds
        tracker.clear_old_errors(max_age_seconds=60)

        summary = tracker.get_error_summary(time_window_seconds=180)
        assert summary["total_errors"] == 0


class TestIntegration:
    """Integration tests combining multiple error handling mechanisms."""

    @pytest.mark.asyncio
    async def test_circuit_breaker_with_retry(self):
        """Test circuit breaker combined with retry mechanism."""
        breaker = CircuitBreaker(
            "integration_test",
            CircuitBreakerConfig(failure_threshold=3, expected_exception=ValueError),
        )

        call_count = [0]

        async def sometimes_failing_function():
            call_count[0] += 1
            if call_count[0] < 2:
                raise ValueError("Temporary error")
            return "success"

        config = RetryConfig(max_attempts=3, initial_delay=0.1, jitter=False)

        # Should succeed after retry
        result = await breaker.call_async(
            retry_async, sometimes_failing_function, config=config
        )
        assert result == "success"

    @pytest.mark.asyncio
    async def test_full_resilience_stack(self):
        """Test complete resilience stack: circuit breaker + retry + fallback."""
        breaker = CircuitBreaker(
            "full_stack_test",
            CircuitBreakerConfig(failure_threshold=5, expected_exception=ValueError),
        )

        call_count = [0]

        async def unreliable_function():
            call_count[0] += 1
            if call_count[0] < 2:
                raise ValueError("Temporary error")
            return "success"

        async def fallback_function():
            return "fallback_result"

        retry_config = RetryConfig(max_attempts=3, initial_delay=0.1, jitter=False)
        fallback_strategy = FallbackStrategy(
            fallback_function=fallback_function, log_fallback=False
        )

        # Should succeed with retry
        result = await breaker.call_async(
            with_fallback_async,
            retry_async,
            unreliable_function,
            config=retry_config,
            strategy=fallback_strategy,
        )
        assert result == "success"
