"""
Cache service for the AI-Driven Agri-Civic Intelligence Platform.

This service provides comprehensive caching capabilities with multi-tier caching,
cache invalidation, fallback mechanisms, and cache warming strategies.
"""

import asyncio
import logging
import time
import json
import hashlib
from enum import Enum
from typing import Dict, Any, Optional, List, Callable, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from functools import wraps

import redis.asyncio as redis

from app.config import get_settings
from app.core.logging import get_logger

# Configure logging
logger = get_logger(__name__)


class CacheTier(str, Enum):
    """Cache tier levels."""

    MEMORY = "memory"  # In-memory cache (fastest)
    REDIS = "redis"  # Redis cache (persistent)
    FALLBACK = "fallback"  # Fallback data (stale cache)


class CacheStrategy(str, Enum):
    """Cache invalidation strategies."""

    TTL = "ttl"  # Time-to-live based
    LRU = "lru"  # Least recently used
    MANUAL = "manual"  # Manual invalidation


@dataclass
class CacheEntry:
    """Cache entry data structure."""

    key: str
    value: Any
    tier: CacheTier
    created_at: datetime
    expires_at: Optional[datetime]
    access_count: int = 0
    last_accessed: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CacheMetrics:
    """Cache service metrics."""

    total_requests: int = 0
    memory_hits: int = 0
    redis_hits: int = 0
    fallback_hits: int = 0
    misses: int = 0
    evictions: int = 0
    invalidations: int = 0
    warming_operations: int = 0
    tier_usage: Dict[str, int] = field(default_factory=dict)
    average_access_time: float = 0.0


class CacheError(Exception):
    """Base exception for cache service errors."""

    pass


class CacheService:
    """
    Comprehensive caching service with multi-tier support.

    Features:
    - Multi-tier caching (memory + Redis)
    - TTL-based and LRU cache invalidation
    - Stale cache fallback for resilience
    - Cache warming and preloading
    - Comprehensive metrics and monitoring
    - Batch operations support
    """

    def __init__(self, max_memory_size: int = 1000):
        """
        Initialize cache service.

        Args:
            max_memory_size: Maximum number of entries in memory cache
        """
        self.settings = get_settings()
        self.max_memory_size = max_memory_size

        # Memory cache (tier 1)
        self.memory_cache: Dict[str, CacheEntry] = {}

        # Redis client (tier 2)
        self.redis_client: Optional[redis.Redis] = None

        # Metrics
        self.metrics = CacheMetrics()

        # Cache warming tasks
        self.warming_tasks: Dict[str, asyncio.Task] = {}

        # Default TTL values (in seconds)
        self.default_ttls = {
            "weather": 1800,  # 30 minutes
            "translation": 86400,  # 24 hours
            "market": 3600,  # 1 hour
            "scheme": 43200,  # 12 hours
            "llm": 7200,  # 2 hours
            "session": 3600,  # 1 hour
            "default": 3600,  # 1 hour
        }

    async def initialize(self):
        """Initialize Redis connection."""
        try:
            self.redis_client = redis.from_url(
                self.settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
            )
            await self.redis_client.ping()
            logger.info("Cache service Redis connection established")
        except Exception as e:
            logger.warning(f"Redis connection failed, using memory cache only: {e}")
            self.redis_client = None

    async def close(self):
        """Close Redis connection and cleanup."""
        # Cancel all warming tasks
        for task in self.warming_tasks.values():
            task.cancel()

        if self.redis_client:
            await self.redis_client.close()
            logger.info("Cache service closed")

    def _generate_key(self, namespace: str, identifier: str) -> str:
        """Generate cache key with namespace."""
        return f"{namespace}:{identifier}"

    def _get_ttl(self, namespace: str) -> int:
        """Get TTL for a namespace."""
        return self.default_ttls.get(namespace, self.default_ttls["default"])

    def _serialize_value(self, value: Any) -> str:
        """Serialize value for storage."""
        return json.dumps(value, default=str)

    def _deserialize_value(self, value: str) -> Any:
        """Deserialize value from storage."""
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value

    async def get(
        self,
        namespace: str,
        identifier: str,
        use_fallback: bool = True,
    ) -> Optional[Any]:
        """
        Get value from cache with multi-tier lookup.

        Args:
            namespace: Cache namespace (e.g., 'weather', 'translation')
            identifier: Unique identifier within namespace
            use_fallback: Whether to use stale cache as fallback

        Returns:
            Cached value or None if not found
        """
        start_time = time.time()
        self.metrics.total_requests += 1

        cache_key = self._generate_key(namespace, identifier)

        # Tier 1: Check memory cache
        if cache_key in self.memory_cache:
            entry = self.memory_cache[cache_key]

            # Check if expired
            if entry.expires_at and datetime.now() > entry.expires_at:
                # Remove expired entry
                del self.memory_cache[cache_key]
                logger.debug(f"Memory cache entry expired: {cache_key}")
            else:
                # Update access metadata
                entry.access_count += 1
                entry.last_accessed = datetime.now()

                self.metrics.memory_hits += 1
                self.metrics.tier_usage[CacheTier.MEMORY.value] = (
                    self.metrics.tier_usage.get(CacheTier.MEMORY.value, 0) + 1
                )

                access_time = time.time() - start_time
                self._update_average_access_time(access_time)

                logger.debug(f"Memory cache hit: {cache_key}")
                return entry.value

        # Tier 2: Check Redis cache
        if self.redis_client:
            try:
                cached_data = await self.redis_client.get(cache_key)

                if cached_data:
                    value = self._deserialize_value(cached_data)

                    # Promote to memory cache
                    await self._set_memory_cache(
                        cache_key, value, namespace, metadata={"promoted": True}
                    )

                    self.metrics.redis_hits += 1
                    self.metrics.tier_usage[CacheTier.REDIS.value] = (
                        self.metrics.tier_usage.get(CacheTier.REDIS.value, 0) + 1
                    )

                    access_time = time.time() - start_time
                    self._update_average_access_time(access_time)

                    logger.debug(f"Redis cache hit: {cache_key}")
                    return value

            except Exception as e:
                logger.warning(f"Redis cache lookup error: {e}")

        # Tier 3: Check fallback (stale cache)
        if use_fallback:
            fallback_value = await self._get_fallback(cache_key)
            if fallback_value:
                self.metrics.fallback_hits += 1
                self.metrics.tier_usage[CacheTier.FALLBACK.value] = (
                    self.metrics.tier_usage.get(CacheTier.FALLBACK.value, 0) + 1
                )

                access_time = time.time() - start_time
                self._update_average_access_time(access_time)

                logger.info(f"Fallback cache hit: {cache_key}")
                return fallback_value

        # Cache miss
        self.metrics.misses += 1
        logger.debug(f"Cache miss: {cache_key}")
        return None

    async def set(
        self,
        namespace: str,
        identifier: str,
        value: Any,
        ttl: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """
        Set value in cache with multi-tier storage.

        Args:
            namespace: Cache namespace
            identifier: Unique identifier within namespace
            value: Value to cache
            ttl: Time-to-live in seconds (uses namespace default if None)
            metadata: Additional metadata
        """
        cache_key = self._generate_key(namespace, identifier)
        ttl = ttl or self._get_ttl(namespace)

        # Set in memory cache
        await self._set_memory_cache(cache_key, value, namespace, ttl, metadata)

        # Set in Redis cache
        if self.redis_client:
            try:
                serialized_value = self._serialize_value(value)
                await self.redis_client.setex(cache_key, ttl, serialized_value)

                # Also store in fallback namespace (for stale cache)
                fallback_key = f"fallback:{cache_key}"
                await self.redis_client.setex(
                    fallback_key, ttl * 2, serialized_value
                )  # Double TTL for fallback

                logger.debug(f"Cached in Redis: {cache_key} (TTL: {ttl}s)")

            except Exception as e:
                logger.warning(f"Redis cache set error: {e}")

    async def _set_memory_cache(
        self,
        cache_key: str,
        value: Any,
        namespace: str,
        ttl: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Set value in memory cache with LRU eviction."""
        ttl = ttl or self._get_ttl(namespace)

        # Check if memory cache is full
        if len(self.memory_cache) >= self.max_memory_size:
            await self._evict_lru()

        # Create cache entry
        entry = CacheEntry(
            key=cache_key,
            value=value,
            tier=CacheTier.MEMORY,
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(seconds=ttl),
            metadata=metadata or {},
        )

        self.memory_cache[cache_key] = entry
        logger.debug(f"Cached in memory: {cache_key}")

    async def _evict_lru(self):
        """Evict least recently used entry from memory cache."""
        if not self.memory_cache:
            return

        # Find LRU entry
        lru_key = min(
            self.memory_cache.keys(),
            key=lambda k: self.memory_cache[k].last_accessed,
        )

        del self.memory_cache[lru_key]
        self.metrics.evictions += 1
        logger.debug(f"Evicted LRU entry: {lru_key}")

    async def _get_fallback(self, cache_key: str) -> Optional[Any]:
        """Get stale cache data as fallback."""
        if not self.redis_client:
            return None

        try:
            fallback_key = f"fallback:{cache_key}"
            cached_data = await self.redis_client.get(fallback_key)

            if cached_data:
                logger.warning(f"Using stale cache data: {cache_key}")
                return self._deserialize_value(cached_data)

        except Exception as e:
            logger.warning(f"Fallback cache lookup error: {e}")

        return None

    async def invalidate(
        self,
        namespace: str,
        identifier: Optional[str] = None,
    ):
        """
        Invalidate cache entries.

        Args:
            namespace: Cache namespace
            identifier: Specific identifier (invalidates entire namespace if None)
        """
        if identifier:
            # Invalidate specific entry
            cache_key = self._generate_key(namespace, identifier)
            await self._invalidate_key(cache_key)
        else:
            # Invalidate entire namespace
            await self._invalidate_namespace(namespace)

        self.metrics.invalidations += 1

    async def _invalidate_key(self, cache_key: str):
        """Invalidate specific cache key."""
        # Remove from memory cache
        if cache_key in self.memory_cache:
            del self.memory_cache[cache_key]
            logger.debug(f"Invalidated memory cache: {cache_key}")

        # Remove from Redis cache
        if self.redis_client:
            try:
                await self.redis_client.delete(cache_key)
                await self.redis_client.delete(f"fallback:{cache_key}")
                logger.debug(f"Invalidated Redis cache: {cache_key}")
            except Exception as e:
                logger.warning(f"Redis cache invalidation error: {e}")

    async def _invalidate_namespace(self, namespace: str):
        """Invalidate all entries in a namespace."""
        # Invalidate memory cache
        keys_to_delete = [
            key for key in self.memory_cache.keys() if key.startswith(f"{namespace}:")
        ]

        for key in keys_to_delete:
            del self.memory_cache[key]

        logger.info(
            f"Invalidated {len(keys_to_delete)} memory cache entries in namespace: {namespace}"
        )

        # Invalidate Redis cache
        if self.redis_client:
            try:
                pattern = f"{namespace}:*"
                cursor = 0
                deleted_count = 0

                while True:
                    cursor, keys = await self.redis_client.scan(
                        cursor, match=pattern, count=100
                    )

                    if keys:
                        await self.redis_client.delete(*keys)
                        deleted_count += len(keys)

                    if cursor == 0:
                        break

                logger.info(
                    f"Invalidated {deleted_count} Redis cache entries in namespace: {namespace}"
                )

            except Exception as e:
                logger.warning(f"Redis namespace invalidation error: {e}")

    async def warm_cache(
        self,
        namespace: str,
        data_loader: Callable,
        identifiers: List[str],
        ttl: Optional[int] = None,
    ):
        """
        Warm cache with preloaded data.

        Args:
            namespace: Cache namespace
            data_loader: Async function to load data (takes identifier as argument)
            identifiers: List of identifiers to preload
            ttl: Time-to-live for cached entries
        """
        logger.info(
            f"Starting cache warming for namespace: {namespace} ({len(identifiers)} entries)"
        )

        self.metrics.warming_operations += 1

        async def _warm_entry(identifier: str):
            try:
                # Check if already cached
                existing = await self.get(namespace, identifier, use_fallback=False)
                if existing is not None:
                    logger.debug(f"Entry already cached: {namespace}:{identifier}")
                    return

                # Load data
                data = await data_loader(identifier)

                if data is not None:
                    # Cache the data
                    await self.set(namespace, identifier, data, ttl)
                    logger.debug(f"Warmed cache entry: {namespace}:{identifier}")

            except Exception as e:
                logger.error(f"Cache warming error for {namespace}:{identifier}: {e}")

        # Warm entries concurrently
        tasks = [_warm_entry(identifier) for identifier in identifiers]
        await asyncio.gather(*tasks, return_exceptions=True)

        logger.info(f"Cache warming completed for namespace: {namespace}")

    async def start_periodic_warming(
        self,
        namespace: str,
        data_loader: Callable,
        identifiers: List[str],
        interval_seconds: int = 3600,
        ttl: Optional[int] = None,
    ):
        """
        Start periodic cache warming task.

        Args:
            namespace: Cache namespace
            data_loader: Async function to load data
            identifiers: List of identifiers to preload
            interval_seconds: Warming interval in seconds
            ttl: Time-to-live for cached entries
        """
        task_key = f"{namespace}_warming"

        # Cancel existing task if any
        if task_key in self.warming_tasks:
            self.warming_tasks[task_key].cancel()

        async def _periodic_warming():
            while True:
                try:
                    await self.warm_cache(namespace, data_loader, identifiers, ttl)
                    await asyncio.sleep(interval_seconds)
                except asyncio.CancelledError:
                    logger.info(f"Periodic warming cancelled for: {namespace}")
                    break
                except Exception as e:
                    logger.error(f"Periodic warming error for {namespace}: {e}")
                    await asyncio.sleep(interval_seconds)

        # Start warming task
        task = asyncio.create_task(_periodic_warming())
        self.warming_tasks[task_key] = task

        logger.info(
            f"Started periodic cache warming for {namespace} (interval: {interval_seconds}s)"
        )

    async def stop_periodic_warming(self, namespace: str):
        """Stop periodic cache warming task."""
        task_key = f"{namespace}_warming"

        if task_key in self.warming_tasks:
            self.warming_tasks[task_key].cancel()
            del self.warming_tasks[task_key]
            logger.info(f"Stopped periodic cache warming for: {namespace}")

    async def batch_get(
        self,
        namespace: str,
        identifiers: List[str],
        use_fallback: bool = True,
    ) -> Dict[str, Any]:
        """
        Get multiple values from cache in batch.

        Args:
            namespace: Cache namespace
            identifiers: List of identifiers
            use_fallback: Whether to use stale cache as fallback

        Returns:
            Dictionary mapping identifiers to cached values
        """
        tasks = [
            self.get(namespace, identifier, use_fallback) for identifier in identifiers
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        return {
            identifier: result
            for identifier, result in zip(identifiers, results)
            if not isinstance(result, Exception) and result is not None
        }

    async def batch_set(
        self,
        namespace: str,
        data: Dict[str, Any],
        ttl: Optional[int] = None,
    ):
        """
        Set multiple values in cache in batch.

        Args:
            namespace: Cache namespace
            data: Dictionary mapping identifiers to values
            ttl: Time-to-live in seconds
        """
        tasks = [
            self.set(namespace, identifier, value, ttl)
            for identifier, value in data.items()
        ]

        await asyncio.gather(*tasks, return_exceptions=True)

    def _update_average_access_time(self, access_time: float):
        """Update average access time metric."""
        total_accesses = (
            self.metrics.memory_hits
            + self.metrics.redis_hits
            + self.metrics.fallback_hits
        )

        if total_accesses > 0:
            self.metrics.average_access_time = (
                self.metrics.average_access_time * (total_accesses - 1) + access_time
            ) / total_accesses

    def get_metrics(self) -> Dict[str, Any]:
        """Get cache service metrics."""
        total_hits = (
            self.metrics.memory_hits
            + self.metrics.redis_hits
            + self.metrics.fallback_hits
        )
        total_requests = self.metrics.total_requests

        return {
            "total_requests": total_requests,
            "total_hits": total_hits,
            "memory_hits": self.metrics.memory_hits,
            "redis_hits": self.metrics.redis_hits,
            "fallback_hits": self.metrics.fallback_hits,
            "misses": self.metrics.misses,
            "hit_rate": total_hits / max(total_requests, 1),
            "memory_hit_rate": self.metrics.memory_hits / max(total_requests, 1),
            "redis_hit_rate": self.metrics.redis_hits / max(total_requests, 1),
            "fallback_hit_rate": self.metrics.fallback_hits / max(total_requests, 1),
            "evictions": self.metrics.evictions,
            "invalidations": self.metrics.invalidations,
            "warming_operations": self.metrics.warming_operations,
            "tier_usage": self.metrics.tier_usage,
            "average_access_time": self.metrics.average_access_time,
            "memory_cache_size": len(self.memory_cache),
            "max_memory_size": self.max_memory_size,
            "memory_utilization": len(self.memory_cache) / self.max_memory_size,
            "active_warming_tasks": len(self.warming_tasks),
        }

    async def get_redis_stats(self) -> Dict[str, Any]:
        """Get Redis-level cache statistics."""
        if not self.redis_client:
            return {}

        try:
            # Get Redis INFO stats
            info_stats = await self.redis_client.info("stats")
            info_memory = await self.redis_client.info("memory")

            # Get keyspace info
            info_keyspace = await self.redis_client.info("keyspace")

            # Count keys by namespace
            namespace_stats = {}
            for namespace in self.default_ttls.keys():
                if namespace == "default":
                    continue
                pattern = f"{namespace}:*"
                cursor = 0
                count = 0
                while True:
                    cursor, keys = await self.redis_client.scan(
                        cursor, match=pattern, count=100
                    )
                    count += len(keys)
                    if cursor == 0:
                        break
                namespace_stats[namespace] = count

            return {
                "redis_version": info_stats.get("redis_version", "unknown"),
                "total_commands_processed": info_stats.get(
                    "total_commands_processed", 0
                ),
                "keyspace_hits": info_stats.get("keyspace_hits", 0),
                "keyspace_misses": info_stats.get("keyspace_misses", 0),
                "used_memory": info_memory.get("used_memory", 0),
                "used_memory_human": info_memory.get("used_memory_human", "0B"),
                "used_memory_peak_human": info_memory.get(
                    "used_memory_peak_human", "0B"
                ),
                "total_keys": sum(namespace_stats.values()),
                "namespace_keys": namespace_stats,
            }
        except Exception as e:
            logger.error(f"Failed to get Redis stats: {e}")
            return {}

    def reset_metrics(self):
        """Reset cache metrics."""
        self.metrics = CacheMetrics()
        logger.info("Cache service metrics reset")

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on cache service."""
        health_status = {
            "status": "healthy",
            "memory_cache": {"status": "healthy", "healthy": True},
            "redis_cache": {"status": "unknown", "healthy": False},
            "timestamp": datetime.now().isoformat(),
        }

        # Check memory cache
        health_status["memory_cache"]["size"] = len(self.memory_cache)
        health_status["memory_cache"]["max_size"] = self.max_memory_size

        # Check Redis cache
        if self.redis_client:
            try:
                await self.redis_client.ping()
                health_status["redis_cache"] = {
                    "status": "healthy",
                    "healthy": True,
                }
            except Exception as e:
                health_status["redis_cache"] = {
                    "status": "unhealthy",
                    "healthy": False,
                    "error": str(e),
                }
                health_status["status"] = "degraded"
        else:
            health_status["redis_cache"] = {
                "status": "not_configured",
                "healthy": False,
            }
            health_status["status"] = "degraded"

        return health_status


# Decorator for automatic caching
def cached(
    namespace: str,
    ttl: Optional[int] = None,
    key_builder: Optional[Callable] = None,
):
    """
    Decorator for automatic function result caching.

    Args:
        namespace: Cache namespace
        ttl: Time-to-live in seconds
        key_builder: Function to build cache key from arguments
    """

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # Default key builder using function arguments
                key_parts = [str(arg) for arg in args]
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()

            # Try to get from cache
            cached_result = await cache_service.get(namespace, cache_key)

            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}: {cache_key}")
                return cached_result

            # Execute function
            result = await func(*args, **kwargs)

            # Cache result
            if result is not None:
                await cache_service.set(namespace, cache_key, result, ttl)

            return result

        return wrapper

    return decorator


# Global cache service instance
cache_service = CacheService()
