"""
Custom middleware for the AI-Driven Agri-Civic Intelligence Platform.
"""

import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import get_logger
from app.config import get_settings

settings = get_settings()

logger = get_logger(__name__)


class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware to track performance metrics for all requests."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))

        error_message = None
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        except Exception as e:
            error_message = str(e)
            logger.error(f"Request failed: {error_message}")
            raise
        finally:
            response_time = time.time() - start_time

            # Import here to avoid circular dependency
            from app.services.performance_monitoring import performance_monitor

            # Record the request metrics
            await performance_monitor.record_request(
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                status_code=status_code,
                response_time=response_time,
                user_agent=request.headers.get("user-agent"),
                client_ip=request.client.host if request.client else None,
                error=error_message,
            )


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware to add unique request ID to each request."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        # Import security headers utility
        from app.core.security import secure_headers

        # Get appropriate headers based on environment
        if settings.environment == "production":
            headers = secure_headers.get_production_headers()
        else:
            headers = secure_headers.get_development_headers()

        # Apply all security headers
        for header, value in headers.items():
            response.headers[header] = value

        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Advanced rate limiting middleware with Redis support."""

    def __init__(self, app, calls: int = None, period: int = None):
        super().__init__(app)
        self.calls = calls or settings.rate_limit_calls
        self.period = period or settings.rate_limit_period
        self.clients = {}
        self.use_redis = False

        # Try to use Redis for distributed rate limiting
        try:
            from app.services.cache_service import cache_service

            self.cache_service = cache_service
            self.use_redis = True
            logger.info("Rate limiting using Redis")
        except Exception as e:
            logger.warning(
                f"Redis not available for rate limiting, using in-memory: {e}"
            )

    async def _check_rate_limit_redis(
        self, client_ip: str, current_time: float
    ) -> bool:
        """Check rate limit using Redis."""
        try:
            # Get current count - use 'rate_limit' as namespace and client_ip as identifier
            count = await self.cache_service.get(
                "rate_limit", client_ip, use_fallback=False
            )

            if count is None:
                # First request in this period
                await self.cache_service.set(
                    "rate_limit", client_ip, 1, ttl=self.period
                )
                return True

            count = int(count)

            if count >= self.calls:
                return False

            # Increment count
            await self.cache_service.set(
                "rate_limit", client_ip, count + 1, ttl=self.period
            )
            return True

        except Exception as e:
            logger.error(f"Redis rate limit check failed: {e}")
            # Fall back to in-memory
            return self._check_rate_limit_memory(client_ip, current_time)

    def _check_rate_limit_memory(self, client_ip: str, current_time: float) -> bool:
        """Check rate limit using in-memory storage."""
        # Clean old entries
        self.clients = {
            ip: timestamps
            for ip, timestamps in self.clients.items()
            if any(current_time - ts < self.period for ts in timestamps)
        }

        # Check rate limit
        if client_ip in self.clients:
            # Filter recent requests
            recent_requests = [
                ts for ts in self.clients[client_ip] if current_time - ts < self.period
            ]

            if len(recent_requests) >= self.calls:
                return False

            self.clients[client_ip] = recent_requests + [current_time]
        else:
            self.clients[client_ip] = [current_time]

        return True

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip rate limiting for health checks
        if request.url.path in ["/api/v1/health", "/health", "/"]:
            return await call_next(request)

        # Skip if rate limiting is disabled
        if not settings.rate_limit_enabled:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()

        # Check rate limit
        if self.use_redis:
            allowed = await self._check_rate_limit_redis(client_ip, current_time)
        else:
            allowed = self._check_rate_limit_memory(client_ip, current_time)

        if not allowed:
            logger.warning(f"Rate limit exceeded for client: {client_ip}")
            from fastapi import HTTPException

            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Limit: {self.calls} requests per {self.period} seconds",
                    "retry_after": self.period,
                },
            )

        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(self.calls)
        response.headers["X-RateLimit-Period"] = str(self.period)

        return response


class InputValidationMiddleware(BaseHTTPMiddleware):
    """Middleware for input validation and sanitization."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip validation for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Validate query parameters
        for key, value in request.query_params.items():
            if isinstance(value, str) and len(value) > settings.max_input_length:
                from fastapi import HTTPException

                raise HTTPException(
                    status_code=400,
                    detail=f"Query parameter '{key}' exceeds maximum length",
                )

        # Validate path parameters for suspicious patterns
        path = str(request.url.path)
        from app.core.security import input_validator

        if input_validator.detect_path_traversal(path):
            from fastapi import HTTPException

            raise HTTPException(
                status_code=400, detail="Invalid path: potential security risk detected"
            )

        return await call_next(request)


class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """Middleware to redirect HTTP to HTTPS in production."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Only enforce HTTPS in production if configured
        if settings.environment == "production" and settings.force_https:
            # Check if request is not HTTPS
            if request.url.scheme != "https":
                # Check for proxy headers
                forwarded_proto = request.headers.get("x-forwarded-proto")
                if forwarded_proto != "https":
                    # Redirect to HTTPS
                    url = request.url.replace(scheme="https")
                    from fastapi.responses import RedirectResponse

                    return RedirectResponse(url=str(url), status_code=301)

        return await call_next(request)
