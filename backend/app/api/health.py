"""
Health check endpoints for the AI-Driven Agri-Civic Intelligence Platform.
"""

import asyncio
from datetime import datetime
from typing import Dict, Any, Optional

from fastapi import APIRouter, status, Response
from pydantic import BaseModel

from app.config import get_settings
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str
    timestamp: datetime
    version: str
    environment: str


class ServiceHealthStatus(BaseModel):
    """Individual service health status."""

    status: str
    healthy: bool
    message: Optional[str] = None
    response_time_ms: Optional[float] = None
    details: Optional[Dict[str, Any]] = None


class DetailedHealthResponse(BaseModel):
    """Detailed health check response model."""

    status: str
    timestamp: datetime
    version: str
    environment: str
    services: Dict[str, ServiceHealthStatus]
    overall_healthy: bool


async def check_database_health() -> ServiceHealthStatus:
    """Check PostgreSQL database health."""
    start_time = datetime.now()
    try:
        from app.database import engine
        from sqlalchemy import text

        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))

        response_time = (datetime.now() - start_time).total_seconds() * 1000

        return ServiceHealthStatus(
            status="healthy",
            healthy=True,
            message="Database connection successful",
            response_time_ms=round(response_time, 2),
        )
    except Exception as e:
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        logger.error(f"Database health check failed: {e}")
        return ServiceHealthStatus(
            status="unhealthy",
            healthy=False,
            message=f"Database connection failed: {str(e)}",
            response_time_ms=round(response_time, 2),
        )


async def check_redis_health() -> ServiceHealthStatus:
    """Check Redis cache health."""
    start_time = datetime.now()
    try:
        from app.services.cache_service import cache_service

        health_data = await cache_service.health_check()
        response_time = (datetime.now() - start_time).total_seconds() * 1000

        redis_healthy = health_data.get("redis_cache", {}).get("healthy", False)

        return ServiceHealthStatus(
            status=health_data.get("status", "unknown"),
            healthy=redis_healthy,
            message=(
                "Redis connection successful" if redis_healthy else "Redis unavailable"
            ),
            response_time_ms=round(response_time, 2),
            details=health_data,
        )
    except Exception as e:
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        logger.error(f"Redis health check failed: {e}")
        return ServiceHealthStatus(
            status="unhealthy",
            healthy=False,
            message=f"Redis connection failed: {str(e)}",
            response_time_ms=round(response_time, 2),
        )


async def check_vector_db_health() -> ServiceHealthStatus:
    """Check vector database health."""
    start_time = datetime.now()
    try:
        from app.services.vector_db import chroma_service

        health_data = chroma_service.health_check()
        response_time = (datetime.now() - start_time).total_seconds() * 1000

        is_healthy = health_data.get("status") == "healthy"

        return ServiceHealthStatus(
            status=health_data.get("status", "unknown"),
            healthy=is_healthy,
            message=health_data.get("message", "Vector DB status unknown"),
            response_time_ms=round(response_time, 2),
            details=health_data,
        )
    except Exception as e:
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        logger.error(f"Vector DB health check failed: {e}")
        return ServiceHealthStatus(
            status="unhealthy",
            healthy=False,
            message=f"Vector DB check failed: {str(e)}",
            response_time_ms=round(response_time, 2),
        )


async def check_llm_service_health() -> ServiceHealthStatus:
    """Check LLM service health."""
    start_time = datetime.now()
    try:
        from app.services.llm_service import llm_service

        health_data = await llm_service.health_check()
        response_time = (datetime.now() - start_time).total_seconds() * 1000

        is_healthy = health_data.get("status") == "healthy"

        return ServiceHealthStatus(
            status=health_data.get("status", "unknown"),
            healthy=is_healthy,
            message=health_data.get("message", "LLM service status unknown"),
            response_time_ms=round(response_time, 2),
            details=health_data,
        )
    except Exception as e:
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        logger.error(f"LLM service health check failed: {e}")
        return ServiceHealthStatus(
            status="unhealthy",
            healthy=False,
            message=f"LLM service check failed: {str(e)}",
            response_time_ms=round(response_time, 2),
        )


async def check_external_apis_health() -> ServiceHealthStatus:
    """Check external API integrations health."""
    start_time = datetime.now()
    try:
        from app.core.error_handling import circuit_breaker_registry

        breaker_metrics = circuit_breaker_registry.get_all_metrics()
        response_time = (datetime.now() - start_time).total_seconds() * 1000

        # Check if any critical circuit breakers are open
        open_breakers = [
            name
            for name, metrics in breaker_metrics.items()
            if metrics["state"] == "open"
        ]

        is_healthy = len(open_breakers) == 0

        return ServiceHealthStatus(
            status="healthy" if is_healthy else "degraded",
            healthy=is_healthy,
            message=(
                f"External APIs operational"
                if is_healthy
                else f"Circuit breakers open: {', '.join(open_breakers)}"
            ),
            response_time_ms=round(response_time, 2),
            details={
                "total_breakers": len(breaker_metrics),
                "open_breakers": open_breakers,
                "breaker_states": {
                    name: m["state"] for name, m in breaker_metrics.items()
                },
            },
        )
    except Exception as e:
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        logger.error(f"External APIs health check failed: {e}")
        return ServiceHealthStatus(
            status="unknown",
            healthy=False,
            message=f"External APIs check failed: {str(e)}",
            response_time_ms=round(response_time, 2),
        )


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health_check() -> HealthResponse:
    """Basic health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        version="0.1.0",
        environment=settings.environment,
    )


@router.get("/health/detailed")
async def detailed_health_check(response: Response) -> DetailedHealthResponse:
    """Detailed health check endpoint with service status."""
    logger.info("Performing detailed health check")

    # Run all health checks concurrently
    health_checks = await asyncio.gather(
        check_database_health(),
        check_redis_health(),
        check_vector_db_health(),
        check_llm_service_health(),
        check_external_apis_health(),
        return_exceptions=True,
    )

    # Map results to service names
    service_names = ["database", "redis", "vector_db", "llm_service", "external_apis"]
    services = {}

    for name, result in zip(service_names, health_checks):
        if isinstance(result, Exception):
            logger.error(f"Health check failed for {name}: {result}")
            services[name] = ServiceHealthStatus(
                status="error",
                healthy=False,
                message=f"Health check error: {str(result)}",
            )
        else:
            services[name] = result

    # Determine overall health status
    # Core services: database and redis - at least one should be working
    core_services_healthy = (
        services.get(
            "database", ServiceHealthStatus(status="unknown", healthy=False)
        ).healthy
        or services.get(
            "redis", ServiceHealthStatus(status="unknown", healthy=False)
        ).healthy
    )

    all_healthy = all(service.healthy for service in services.values())
    any_critical_unhealthy = not core_services_healthy

    if all_healthy:
        overall_status = "healthy"
        response.status_code = status.HTTP_200_OK
    elif any_critical_unhealthy:
        overall_status = "unhealthy"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    else:
        # Some non-critical services are down, but core services work
        overall_status = "degraded"
        response.status_code = status.HTTP_200_OK

    return DetailedHealthResponse(
        status=overall_status,
        timestamp=datetime.utcnow(),
        version="0.1.0",
        environment=settings.environment,
        services=services,
        overall_healthy=all_healthy,
    )


@router.get("/health/live")
async def liveness_probe() -> Dict[str, Any]:
    """
    Kubernetes liveness probe endpoint.
    Returns 200 if the application is running.
    """
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/ready")
async def readiness_probe(response: Response) -> Dict[str, Any]:
    """
    Kubernetes readiness probe endpoint.
    Returns 200 if the application is ready to serve traffic.
    """
    # Check critical dependencies
    try:
        db_health = await check_database_health()
        cache_health = await check_redis_health()

        is_ready = db_health.healthy or cache_health.healthy  # At least one should work

        if not is_ready:
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            return {
                "status": "not_ready",
                "timestamp": datetime.utcnow().isoformat(),
                "message": "Critical dependencies unavailable",
            }

        return {
            "status": "ready",
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Readiness probe failed: {e}")
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
        }
