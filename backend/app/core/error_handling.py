"""
Comprehensive error handling module for the AI-Driven Agri-Civic Intelligence Platform.

This module provides:
- Circuit breaker pattern for external API resilience
- Retry mechanisms with exponential backoff
- Graceful degradation strategies
- Comprehensive error tracking and logging
"""

import asyncio
import functools
import logging
import time
from enum import Enum
from typing import Any, Callable, Dict, Optional, TypeVar, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from app.core.logging import get_logger

logger = get_logger(__name__)

T = TypeVar("T")


class CircuitState(str, Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if service recovered


class ErrorSeverity(str, Enum):
    """Error severity levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""

    failure_threshold: int = 5  # Number of failures before opening
    success_threshold: int = 2  # Number of successes to close from half-open
    timeout_seconds: int = 60  # Time before transitioning to half-open
    expected_exception: type = Exception  # Exception type to catch


@dataclass
class RetryConfig:
    """Configuration for retry mechanism."""

    max_attempts: int = 3
    initial_delay: float = 1.0  # Initial delay in seconds
    max_delay: float = 60.0  # Maximum delay in seconds
    exponential_base: float = 2.0  # Base for exponential backoff
    jitter: bool = True  # Add randomness to delay


@dataclass
class CircuitBreakerMetrics:
    """Metrics for circuit breaker."""

    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    rejected_requests: int = 0  # Rejected due to open circuit
    state_transitions: Dict[str, int] = field(default_factory=dict)
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None


class CircuitBreakerError(Exception):
    """Exception raised when circuit breaker is open."""

    def __init__(self, service_name: str, message: str = ""):
        self.service_name = service_name
        super().__init__(
            message
            or f"Circuit breaker is open for {service_name}. Service temporarily unavailable."
        )


class RetryExhaustedError(Exception):
    """Exception raised when all retry attempts are exhausted."""

    def __init__(self, attempts: int, last_exception: Exception):
        self.attempts = attempts
        self.last_exception = last_exception
        super().__init__(
            f"All {attempts} retry attempts exhausted. Last error: {str(last_exception)}"
        )


class CircuitBreaker:
    """
    Circuit breaker implementation for resilient external API calls.

    The circuit breaker prevents cascading failures by:
    1. CLOSED: Normal operation, requests pass through
    2. OPEN: After threshold failures, reject requests immediately
    3. HALF_OPEN: After timeout, allow limited requests to test recovery
    """

    def __init__(self, name: str, config: Optional[CircuitBreakerConfig] = None):
        """
        Initialize circuit breaker.

        Args:
            name: Name of the service/circuit
            config: Circuit breaker configuration
        """
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[float] = None
        self.last_state_change: float = time.time()
        self.metrics = CircuitBreakerMetrics()

        logger.info(f"Circuit breaker '{name}' initialized in CLOSED state")

    def _should_attempt_reset(self) -> bool:
        """Check if circuit breaker should attempt to reset."""
        if self.state != CircuitState.OPEN:
            return False

        if self.last_failure_time is None:
            return False

        time_since_failure = time.time() - self.last_failure_time
        return time_since_failure >= self.config.timeout_seconds

    def _transition_state(self, new_state: CircuitState):
        """Transition to a new state."""
        old_state = self.state
        self.state = new_state
        self.last_state_change = time.time()

        # Update metrics
        transition_key = f"{old_state.value}_to_{new_state.value}"
        self.metrics.state_transitions[transition_key] = (
            self.metrics.state_transitions.get(transition_key, 0) + 1
        )

        logger.warning(
            f"Circuit breaker '{self.name}' transitioned from {old_state.value} to {new_state.value}"
        )

    def _record_success(self):
        """Record a successful request."""
        self.metrics.total_requests += 1
        self.metrics.successful_requests += 1
        self.metrics.last_success_time = datetime.now()

        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.config.success_threshold:
                self._transition_state(CircuitState.CLOSED)
                self.failure_count = 0
                self.success_count = 0
                logger.info(
                    f"Circuit breaker '{self.name}' closed after successful recovery"
                )
        elif self.state == CircuitState.CLOSED:
            self.failure_count = 0  # Reset failure count on success

    def _record_failure(self):
        """Record a failed request."""
        self.metrics.total_requests += 1
        self.metrics.failed_requests += 1
        self.metrics.last_failure_time = datetime.now()
        self.last_failure_time = time.time()

        if self.state == CircuitState.HALF_OPEN:
            # Failure in half-open state, reopen circuit
            self._transition_state(CircuitState.OPEN)
            self.failure_count = 1
            self.success_count = 0
        elif self.state == CircuitState.CLOSED:
            self.failure_count += 1
            if self.failure_count >= self.config.failure_threshold:
                self._transition_state(CircuitState.OPEN)
                logger.error(
                    f"Circuit breaker '{self.name}' opened after {self.failure_count} failures"
                )

    def call(self, func: Callable[..., T], *args, **kwargs) -> T:
        """
        Execute function with circuit breaker protection (synchronous).

        Args:
            func: Function to execute
            *args: Positional arguments for function
            **kwargs: Keyword arguments for function

        Returns:
            Function result

        Raises:
            CircuitBreakerError: If circuit is open
            Exception: Original exception from function
        """
        # Check if we should attempt reset
        if self._should_attempt_reset():
            self._transition_state(CircuitState.HALF_OPEN)
            logger.info(
                f"Circuit breaker '{self.name}' transitioned to HALF_OPEN for testing"
            )

        # Reject if circuit is open
        if self.state == CircuitState.OPEN:
            self.metrics.rejected_requests += 1
            raise CircuitBreakerError(self.name)

        # Attempt to execute function
        try:
            result = func(*args, **kwargs)
            self._record_success()
            return result
        except self.config.expected_exception as e:
            self._record_failure()
            raise e

    async def call_async(self, func: Callable[..., T], *args, **kwargs) -> T:
        """
        Execute async function with circuit breaker protection.

        Args:
            func: Async function to execute
            *args: Positional arguments for function
            **kwargs: Keyword arguments for function

        Returns:
            Function result

        Raises:
            CircuitBreakerError: If circuit is open
            Exception: Original exception from function
        """
        # Check if we should attempt reset
        if self._should_attempt_reset():
            self._transition_state(CircuitState.HALF_OPEN)
            logger.info(
                f"Circuit breaker '{self.name}' transitioned to HALF_OPEN for testing"
            )

        # Reject if circuit is open
        if self.state == CircuitState.OPEN:
            self.metrics.rejected_requests += 1
            raise CircuitBreakerError(self.name)

        # Attempt to execute function
        try:
            result = await func(*args, **kwargs)
            self._record_success()
            return result
        except self.config.expected_exception as e:
            self._record_failure()
            raise e

    def get_state(self) -> CircuitState:
        """Get current circuit state."""
        return self.state

    def get_metrics(self) -> Dict[str, Any]:
        """Get circuit breaker metrics."""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "total_requests": self.metrics.total_requests,
            "successful_requests": self.metrics.successful_requests,
            "failed_requests": self.metrics.failed_requests,
            "rejected_requests": self.metrics.rejected_requests,
            "success_rate": (
                self.metrics.successful_requests / max(self.metrics.total_requests, 1)
            ),
            "state_transitions": self.metrics.state_transitions,
            "last_failure_time": (
                self.metrics.last_failure_time.isoformat()
                if self.metrics.last_failure_time
                else None
            ),
            "last_success_time": (
                self.metrics.last_success_time.isoformat()
                if self.metrics.last_success_time
                else None
            ),
        }

    def reset(self):
        """Manually reset circuit breaker to closed state."""
        self._transition_state(CircuitState.CLOSED)
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        logger.info(f"Circuit breaker '{self.name}' manually reset to CLOSED state")


class CircuitBreakerRegistry:
    """Registry for managing multiple circuit breakers."""

    def __init__(self):
        self._breakers: Dict[str, CircuitBreaker] = {}

    def get_or_create(
        self, name: str, config: Optional[CircuitBreakerConfig] = None
    ) -> CircuitBreaker:
        """Get existing circuit breaker or create new one."""
        if name not in self._breakers:
            self._breakers[name] = CircuitBreaker(name, config)
        return self._breakers[name]

    def get(self, name: str) -> Optional[CircuitBreaker]:
        """Get circuit breaker by name."""
        return self._breakers.get(name)

    def get_all_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Get metrics for all circuit breakers."""
        return {name: breaker.get_metrics() for name, breaker in self._breakers.items()}

    def reset_all(self):
        """Reset all circuit breakers."""
        for breaker in self._breakers.values():
            breaker.reset()


# Global circuit breaker registry
circuit_breaker_registry = CircuitBreakerRegistry()


def with_circuit_breaker(
    name: str, config: Optional[CircuitBreakerConfig] = None
) -> Callable:
    """
    Decorator to add circuit breaker protection to a function.

    Args:
        name: Name of the circuit breaker
        config: Circuit breaker configuration

    Example:
        @with_circuit_breaker("weather_api")
        async def fetch_weather():
            # API call
            pass
    """

    def decorator(func: Callable) -> Callable:
        breaker = circuit_breaker_registry.get_or_create(name, config)

        if asyncio.iscoroutinefunction(func):

            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                return await breaker.call_async(func, *args, **kwargs)

            return async_wrapper
        else:

            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                return breaker.call(func, *args, **kwargs)

            return sync_wrapper

    return decorator


async def retry_async(
    func: Callable[..., T],
    *args,
    config: Optional[RetryConfig] = None,
    **kwargs,
) -> T:
    """
    Retry async function with exponential backoff.

    Args:
        func: Async function to retry
        *args: Positional arguments for function
        config: Retry configuration
        **kwargs: Keyword arguments for function

    Returns:
        Function result

    Raises:
        RetryExhaustedError: If all retry attempts fail
    """
    config = config or RetryConfig()
    last_exception = None

    for attempt in range(config.max_attempts):
        try:
            result = await func(*args, **kwargs)
            if attempt > 0:
                logger.info(
                    f"Function {func.__name__} succeeded on attempt {attempt + 1}"
                )
            return result
        except Exception as e:
            last_exception = e
            if attempt == config.max_attempts - 1:
                # Last attempt failed
                break

            # Calculate delay with exponential backoff
            delay = min(
                config.initial_delay * (config.exponential_base**attempt),
                config.max_delay,
            )

            # Add jitter if enabled
            if config.jitter:
                import random

                delay = delay * (0.5 + random.random())

            logger.warning(
                f"Function {func.__name__} failed on attempt {attempt + 1}/{config.max_attempts}: {str(e)}. "
                f"Retrying in {delay:.2f} seconds..."
            )

            await asyncio.sleep(delay)

    # All attempts failed
    raise RetryExhaustedError(config.max_attempts, last_exception)


def retry_sync(
    func: Callable[..., T],
    *args,
    config: Optional[RetryConfig] = None,
    **kwargs,
) -> T:
    """
    Retry synchronous function with exponential backoff.

    Args:
        func: Function to retry
        *args: Positional arguments for function
        config: Retry configuration
        **kwargs: Keyword arguments for function

    Returns:
        Function result

    Raises:
        RetryExhaustedError: If all retry attempts fail
    """
    config = config or RetryConfig()
    last_exception = None

    for attempt in range(config.max_attempts):
        try:
            result = func(*args, **kwargs)
            if attempt > 0:
                logger.info(
                    f"Function {func.__name__} succeeded on attempt {attempt + 1}"
                )
            return result
        except Exception as e:
            last_exception = e
            if attempt == config.max_attempts - 1:
                # Last attempt failed
                break

            # Calculate delay with exponential backoff
            delay = min(
                config.initial_delay * (config.exponential_base**attempt),
                config.max_delay,
            )

            # Add jitter if enabled
            if config.jitter:
                import random

                delay = delay * (0.5 + random.random())

            logger.warning(
                f"Function {func.__name__} failed on attempt {attempt + 1}/{config.max_attempts}: {str(e)}. "
                f"Retrying in {delay:.2f} seconds..."
            )

            time.sleep(delay)

    # All attempts failed
    raise RetryExhaustedError(config.max_attempts, last_exception)


def with_retry(config: Optional[RetryConfig] = None) -> Callable:
    """
    Decorator to add retry logic to a function.

    Args:
        config: Retry configuration

    Example:
        @with_retry(RetryConfig(max_attempts=5))
        async def fetch_data():
            # API call
            pass
    """

    def decorator(func: Callable) -> Callable:
        if asyncio.iscoroutinefunction(func):

            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                return await retry_async(func, *args, config=config, **kwargs)

            return async_wrapper
        else:

            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                return retry_sync(func, *args, config=config, **kwargs)

            return sync_wrapper

    return decorator


@dataclass
class FallbackStrategy:
    """Strategy for graceful degradation."""

    use_cache: bool = True
    cache_max_age_seconds: int = 3600  # 1 hour
    default_value: Optional[Any] = None
    fallback_function: Optional[Callable] = None
    log_fallback: bool = True


async def with_fallback_async(
    func: Callable[..., T],
    *args,
    strategy: Optional[FallbackStrategy] = None,
    **kwargs,
) -> T:
    """
    Execute async function with fallback strategy for graceful degradation.

    Args:
        func: Async function to execute
        *args: Positional arguments
        strategy: Fallback strategy
        **kwargs: Keyword arguments

    Returns:
        Function result or fallback value
    """
    strategy = strategy or FallbackStrategy()

    try:
        return await func(*args, **kwargs)
    except Exception as e:
        if strategy.log_fallback:
            logger.warning(
                f"Function {func.__name__} failed, using fallback strategy: {str(e)}"
            )

        # Try fallback function
        if strategy.fallback_function:
            try:
                if asyncio.iscoroutinefunction(strategy.fallback_function):
                    return await strategy.fallback_function(*args, **kwargs)
                else:
                    return strategy.fallback_function(*args, **kwargs)
            except Exception as fallback_error:
                logger.error(f"Fallback function also failed: {str(fallback_error)}")

        # Return default value
        if strategy.default_value is not None:
            return strategy.default_value

        # Re-raise if no fallback available
        raise e


def with_fallback_sync(
    func: Callable[..., T],
    *args,
    strategy: Optional[FallbackStrategy] = None,
    **kwargs,
) -> T:
    """
    Execute synchronous function with fallback strategy for graceful degradation.

    Args:
        func: Function to execute
        *args: Positional arguments
        strategy: Fallback strategy
        **kwargs: Keyword arguments

    Returns:
        Function result or fallback value
    """
    strategy = strategy or FallbackStrategy()

    try:
        return func(*args, **kwargs)
    except Exception as e:
        if strategy.log_fallback:
            logger.warning(
                f"Function {func.__name__} failed, using fallback strategy: {str(e)}"
            )

        # Try fallback function
        if strategy.fallback_function:
            try:
                return strategy.fallback_function(*args, **kwargs)
            except Exception as fallback_error:
                logger.error(f"Fallback function also failed: {str(fallback_error)}")

        # Return default value
        if strategy.default_value is not None:
            return strategy.default_value

        # Re-raise if no fallback available
        raise e


@dataclass
class ErrorContext:
    """Context information for error tracking."""

    error_type: str
    error_message: str
    severity: ErrorSeverity
    service_name: str
    timestamp: datetime = field(default_factory=datetime.now)
    stack_trace: Optional[str] = None
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    additional_context: Dict[str, Any] = field(default_factory=dict)


class ErrorTracker:
    """Track and aggregate errors for monitoring and alerting."""

    def __init__(self):
        self.errors: list[ErrorContext] = []
        self.error_counts: Dict[str, int] = {}
        self.error_rates: Dict[str, list[float]] = {}

    def track_error(self, context: ErrorContext):
        """Track an error occurrence."""
        self.errors.append(context)

        # Update error counts
        error_key = f"{context.service_name}:{context.error_type}"
        self.error_counts[error_key] = self.error_counts.get(error_key, 0) + 1

        # Update error rates
        if error_key not in self.error_rates:
            self.error_rates[error_key] = []
        self.error_rates[error_key].append(time.time())

        # Log based on severity
        log_message = (
            f"Error tracked - Service: {context.service_name}, "
            f"Type: {context.error_type}, "
            f"Severity: {context.severity.value}, "
            f"Message: {context.error_message}"
        )

        if context.severity == ErrorSeverity.CRITICAL:
            logger.critical(log_message)
        elif context.severity == ErrorSeverity.HIGH:
            logger.error(log_message)
        elif context.severity == ErrorSeverity.MEDIUM:
            logger.warning(log_message)
        else:
            logger.info(log_message)

    def get_error_summary(self, time_window_seconds: int = 3600) -> Dict[str, Any]:
        """Get summary of errors within time window."""
        current_time = time.time()
        cutoff_time = current_time - time_window_seconds

        # Filter recent errors
        recent_errors = [
            e for e in self.errors if e.timestamp.timestamp() >= cutoff_time
        ]

        # Calculate error rates
        error_rates = {}
        for error_key, timestamps in self.error_rates.items():
            recent_timestamps = [t for t in timestamps if t >= cutoff_time]
            error_rates[error_key] = len(recent_timestamps) / (
                time_window_seconds / 60
            )  # errors per minute

        # Group by severity
        severity_counts = {}
        for error in recent_errors:
            severity_counts[error.severity.value] = (
                severity_counts.get(error.severity.value, 0) + 1
            )

        return {
            "total_errors": len(recent_errors),
            "error_counts": self.error_counts,
            "error_rates_per_minute": error_rates,
            "severity_distribution": severity_counts,
            "time_window_seconds": time_window_seconds,
        }

    def clear_old_errors(self, max_age_seconds: int = 86400):
        """Clear errors older than max age."""
        cutoff_time = datetime.now() - timedelta(seconds=max_age_seconds)
        self.errors = [e for e in self.errors if e.timestamp >= cutoff_time]


# Global error tracker
error_tracker = ErrorTracker()
