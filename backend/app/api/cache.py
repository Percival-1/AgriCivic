"""
Cache management API endpoints.
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.cache_service import cache_service
from app.services.fallback_service import fallback_service
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/cache", tags=["cache"])


class CacheInvalidateRequest(BaseModel):
    """Request model for cache invalidation."""

    namespace: str = Field(..., description="Cache namespace to invalidate")
    identifier: Optional[str] = Field(
        None, description="Specific identifier (invalidates entire namespace if None)"
    )


class CacheWarmingRequest(BaseModel):
    """Request model for cache warming."""

    namespace: str = Field(..., description="Cache namespace")
    identifiers: List[str] = Field(..., description="List of identifiers to warm")
    ttl: Optional[int] = Field(None, description="Time-to-live in seconds")


class CacheMetricsResponse(BaseModel):
    """Response model for cache metrics."""

    total_requests: int
    total_hits: int
    memory_hits: int
    redis_hits: int
    fallback_hits: int
    misses: int
    hit_rate: float
    memory_hit_rate: float
    redis_hit_rate: float
    fallback_hit_rate: float
    evictions: int
    invalidations: int
    warming_operations: int
    tier_usage: Dict[str, int]
    average_access_time: float
    memory_cache_size: int
    max_memory_size: int
    memory_utilization: float
    active_warming_tasks: int
    redis_stats: Optional[Dict[str, Any]] = None


class FallbackMetricsResponse(BaseModel):
    """Response model for fallback metrics."""

    total_fallbacks: int
    fallback_by_service: Dict[str, int]
    most_used_fallback: Optional[str]


class CacheHealthResponse(BaseModel):
    """Response model for cache health check."""

    status: str
    memory_cache: Dict[str, Any]
    redis_cache: Dict[str, Any]
    timestamp: str


@router.get("/metrics", response_model=CacheMetricsResponse)
async def get_cache_metrics():
    """
    Get cache service metrics.

    Returns comprehensive metrics about cache performance including:
    - Hit rates for different cache tiers
    - Memory utilization
    - Average access times
    - Eviction and invalidation counts
    """
    try:
        metrics = cache_service.get_metrics()

        # Get Redis-level stats for actual cache usage
        redis_stats = await cache_service.get_redis_stats()

        # If Redis stats are available, use them for more accurate metrics
        if redis_stats and redis_stats.get("keyspace_hits", 0) > 0:
            total_redis_ops = redis_stats.get("keyspace_hits", 0) + redis_stats.get(
                "keyspace_misses", 0
            )
            metrics["total_requests"] = total_redis_ops
            metrics["total_hits"] = redis_stats.get("keyspace_hits", 0)
            metrics["redis_hits"] = redis_stats.get("keyspace_hits", 0)
            metrics["misses"] = redis_stats.get("keyspace_misses", 0)
            metrics["hit_rate"] = redis_stats.get("keyspace_hits", 0) / max(
                total_redis_ops, 1
            )
            metrics["redis_hit_rate"] = redis_stats.get("keyspace_hits", 0) / max(
                total_redis_ops, 1
            )
            metrics["redis_stats"] = redis_stats

        return CacheMetricsResponse(**metrics)
    except Exception as e:
        logger.error(f"Failed to get cache metrics: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get cache metrics: {str(e)}"
        )


@router.get("/fallback/metrics", response_model=FallbackMetricsResponse)
async def get_fallback_metrics():
    """
    Get fallback service metrics.

    Returns metrics about fallback usage including:
    - Total fallback invocations
    - Fallback usage by service type
    - Most frequently used fallback
    """
    try:
        metrics = fallback_service.get_metrics()
        return FallbackMetricsResponse(**metrics)
    except Exception as e:
        logger.error(f"Failed to get fallback metrics: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get fallback metrics: {str(e)}"
        )


@router.post("/invalidate")
async def invalidate_cache(request: CacheInvalidateRequest):
    """
    Invalidate cache entries.

    Invalidates specific cache entries or entire namespaces.
    Use this when data needs to be refreshed immediately.
    """
    try:
        await cache_service.invalidate(
            namespace=request.namespace,
            identifier=request.identifier,
        )

        return {
            "status": "success",
            "message": f"Cache invalidated for namespace: {request.namespace}"
            + (
                f", identifier: {request.identifier}"
                if request.identifier
                else " (all entries)"
            ),
        }
    except Exception as e:
        logger.error(f"Failed to invalidate cache: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to invalidate cache: {str(e)}"
        )


@router.post("/warm")
async def warm_cache(request: CacheWarmingRequest):
    """
    Warm cache with preloaded data.

    Note: This endpoint requires a data loader function to be implemented
    for the specific namespace. Currently returns a placeholder response.
    """
    try:
        # Note: In a real implementation, you would need to provide
        # a data loader function specific to the namespace
        return {
            "status": "accepted",
            "message": f"Cache warming request accepted for namespace: {request.namespace}",
            "note": "Cache warming requires a data loader implementation for the namespace",
        }
    except Exception as e:
        logger.error(f"Failed to warm cache: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to warm cache: {str(e)}")


@router.post("/reset-metrics")
async def reset_cache_metrics():
    """
    Reset cache metrics.

    Resets all cache performance metrics to zero.
    Useful for testing or after maintenance operations.
    """
    try:
        cache_service.reset_metrics()
        return {
            "status": "success",
            "message": "Cache metrics reset successfully",
        }
    except Exception as e:
        logger.error(f"Failed to reset cache metrics: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to reset cache metrics: {str(e)}"
        )


@router.post("/fallback/reset-metrics")
async def reset_fallback_metrics():
    """
    Reset fallback metrics.

    Resets all fallback usage metrics to zero.
    """
    try:
        fallback_service.reset_metrics()
        return {
            "status": "success",
            "message": "Fallback metrics reset successfully",
        }
    except Exception as e:
        logger.error(f"Failed to reset fallback metrics: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to reset fallback metrics: {str(e)}"
        )


@router.get("/health", response_model=CacheHealthResponse)
async def cache_health_check():
    """
    Perform health check on cache service.

    Returns the health status of memory cache and Redis cache.
    """
    try:
        health_status = await cache_service.health_check()
        return CacheHealthResponse(**health_status)
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Cache health check failed: {str(e)}"
        )


@router.get("/namespaces")
async def get_cache_namespaces():
    """
    Get list of available cache namespaces.

    Returns the predefined cache namespaces and their TTL configurations.
    """
    return {
        "namespaces": [
            {
                "name": "weather",
                "description": "Weather data cache",
                "default_ttl": 1800,
            },
            {
                "name": "translation",
                "description": "Translation results cache",
                "default_ttl": 86400,
            },
            {
                "name": "market",
                "description": "Market price data cache",
                "default_ttl": 3600,
            },
            {
                "name": "scheme",
                "description": "Government scheme data cache",
                "default_ttl": 43200,
            },
            {
                "name": "llm",
                "description": "LLM response cache",
                "default_ttl": 7200,
            },
            {
                "name": "session",
                "description": "User session cache",
                "default_ttl": 3600,
            },
        ]
    }
