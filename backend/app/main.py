"""
FastAPI application entry point for the AI-Driven Agri-Civic Intelligence Platform.
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
import socketio

from app.config import get_settings
from app.api import health, ivr
from app.core.logging import setup_logging
from app.core.middleware import (
    RequestIDMiddleware,
    SecurityHeadersMiddleware,
    PerformanceMonitoringMiddleware,
)
from app.services.socketio_manager import get_socketio_app

settings = get_settings()

# Setup logging
setup_logging(settings.log_level, settings.log_format)
logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging requests and responses."""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()

        # Log request
        logger.info(
            f"Request: {request.method} {request.url.path} - "
            f"Client: {request.client.host if request.client else 'unknown'}"
        )

        try:
            response = await call_next(request)
            process_time = time.time() - start_time

            # Log response
            logger.info(
                f"Response: {response.status_code} - "
                f"Time: {process_time:.4f}s - "
                f"Path: {request.url.path}"
            )

            # Add response time header
            response.headers["X-Process-Time"] = str(process_time)

            return response

        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"Error: {str(e)} - "
                f"Time: {process_time:.4f}s - "
                f"Path: {request.url.path}"
            )
            raise


class ResponseTimeMiddleware(BaseHTTPMiddleware):
    """Middleware for monitoring response times."""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time

        # Check if response time exceeds the configured limit
        if process_time > settings.max_response_time_seconds:
            logger.warning(
                f"Slow response detected: {process_time:.4f}s > {settings.max_response_time_seconds}s - "
                f"Path: {request.url.path}"
            )

        return response


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    # Startup
    logger.info("🚀 Starting AI-Driven Agri-Civic Intelligence Platform")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")

    # TODO: Initialize database connections
    # TODO: Initialize Redis connections
    # TODO: Initialize external API clients
    # TODO: Load ML models and vector databases

    # Initialize cache service
    from app.services.cache_service import cache_service

    await cache_service.initialize()
    logger.info("Cache service initialized")

    # Initialize speech service cache
    from app.services.speech_service import speech_service, tts_service

    await speech_service.initialize_cache()
    logger.info("Speech service cache initialized")

    await tts_service.initialize_cache()
    logger.info("TTS service cache initialized")

    # Initialize translation service cache
    from app.services.translation import translation_service

    await translation_service.initialize_cache()
    logger.info("Translation service cache initialized")

    # Start background scheduler
    from app.services.scheduler import scheduler

    scheduler_task = asyncio.create_task(scheduler.start())

    yield

    # Shutdown
    logger.info("🛑 Shutting down AI-Driven Agri-Civic Intelligence Platform")

    # Stop background scheduler
    await scheduler.stop()
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass

    # Close cache service
    await cache_service.close()
    logger.info("Cache service closed")

    # TODO: Close database connections
    # TODO: Close Redis connections
    # TODO: Cleanup external API clients
    # TODO: Cleanup ML models and vector databases


app = FastAPI(
    title="AI-Driven Agri-Civic Intelligence Platform",
    description="Multilingual agricultural intelligence platform for farmers and rural communities",
    version="0.1.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
    lifespan=lifespan,
)

# Get Socket.IO server instance
sio = get_socketio_app()

# Create Socket.IO ASGI application
socket_app = socketio.ASGIApp(sio, app, socketio_path="socket.io")

# Security middleware
if settings.environment == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"],  # Configure with actual allowed hosts in production
    )

# CORS middleware - MUST be added before other middlewares to handle OPTIONS requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Custom middleware - Added AFTER CORS
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(PerformanceMonitoringMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(ResponseTimeMiddleware)

# Add rate limiting middleware
from app.core.middleware import (
    RateLimitMiddleware,
    InputValidationMiddleware,
    HTTPSRedirectMiddleware,
)

if settings.rate_limit_enabled:
    app.add_middleware(RateLimitMiddleware)
    logger.info(
        f"Rate limiting enabled: {settings.rate_limit_calls} calls per {settings.rate_limit_period}s"
    )

# Add input validation middleware
app.add_middleware(InputValidationMiddleware)

# Add HTTPS redirect middleware for production
if settings.environment == "production" and settings.force_https:
    app.add_middleware(HTTPSRedirectMiddleware)
    logger.info("HTTPS redirect enabled")


# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    logger.error(f"HTTP {exc.status_code}: {exc.detail} - Path: {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "path": str(request.url.path),
                "timestamp": time.time(),
            }
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    logger.error(
        f"Unhandled exception: {str(exc)} - Path: {request.url.path}", exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": 500,
                "message": "Internal server error",
                "path": str(request.url.path),
                "timestamp": time.time(),
            }
        },
    )


# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(ivr.router, prefix="/api/v1/ivr", tags=["ivr"])

# Import and include auth router
from app.api import auth

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])

# Import and include vector database router
from app.api import vector_db

app.include_router(vector_db.router, prefix="/api/v1", tags=["vector-db"])

# Import and include RAG router
from app.api import rag

app.include_router(rag.router, prefix="/api/v1", tags=["rag"])

# Import and include LLM router
from app.api import llm

app.include_router(llm.router, prefix="/api/v1", tags=["llm"])

# Import and include Translation router
from app.api import translation

app.include_router(translation.router, prefix="/api/v1", tags=["translation"])

# Import and include Session router
from app.api import session

app.include_router(session.router, prefix="/api/v1", tags=["session"])

# Import and include Maps router
from app.api import maps

app.include_router(maps.router, prefix="/api/v1", tags=["maps"])

# Import and include Market router
from app.api import market

app.include_router(market.router, prefix="/api/v1", tags=["market"])

# Import and include Vision router
from app.api import vision

app.include_router(vision.router, prefix="/api/v1", tags=["vision"])

# Import and include Scheme router
from app.api import scheme

app.include_router(scheme.router, prefix="/api/v1", tags=["scheme"])

# Import and include Portal Sync router
from app.api import portal_sync

app.include_router(portal_sync.router, prefix="/api/v1", tags=["portal-sync"])

# Import and include SMS router
from app.api import sms

app.include_router(sms.router, prefix="/api/v1", tags=["sms"])

# Import and include Chat router
from app.api import chat

app.include_router(chat.router, prefix="/api/v1", tags=["chat"])

# Import and include Speech router
from app.api import speech

app.include_router(speech.router, prefix="/api/v1", tags=["speech"])

# Import and include Notification router
from app.api import notification

app.include_router(notification.router, prefix="/api/v1", tags=["notification"])

# Import and include Notification Preferences router
from app.api import notification_preferences

app.include_router(
    notification_preferences.router, prefix="/api/v1", tags=["notification-preferences"]
)

# Import and include Monitoring router
from app.api import monitoring

app.include_router(monitoring.router, prefix="/api/v1", tags=["monitoring"])

# Import and include Cache router
from app.api import cache

app.include_router(cache.router, prefix="/api/v1", tags=["cache"])

# Import and include Weather router
from app.api import weather

app.include_router(weather.router, prefix="/api/v1", tags=["weather"])

# Import and include Performance router
from app.api import performance

app.include_router(performance.router, prefix="/api/v1", tags=["performance"])

# Import and include Admin router
from app.api import admin

app.include_router(admin.router, prefix="/admin", tags=["admin"])

# Mount static files directory
import os

static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """Root endpoint with basic information."""
    return {
        "name": "AI-Driven Agri-Civic Intelligence Platform",
        "version": "0.1.0",
        "description": "Multilingual agricultural intelligence platform for farmers and rural communities",
        "environment": settings.environment,
        "docs_url": "/docs" if settings.environment != "production" else None,
        "health_check": "/api/v1/health",
    }


if __name__ == "__main__":
    import uvicorn

    # Run with Socket.IO support
    uvicorn.run(
        "app.main:socket_app",
        host="0.0.0.0",
        port=8000,
        reload=True if settings.environment == "development" else False,
        log_level=settings.log_level.lower(),
    )
