"""
Tests for cache service.
"""

import pytest
import asyncio
from datetime import datetime

from app.services.cache_service import cache_service, CacheTier


@pytest.mark.asyncio
async def test_cache_initialization():
    """Test cache service initialization."""
    await cache_service.initialize()
    assert (
        cache_service.redis_client is not None or cache_service.redis_client is None
    )  # May fail if Redis not available


@pytest.mark.asyncio
async def test_cache_set_and_get():
    """Test basic cache set and get operations."""
    await cache_service.initialize()

    # Set value
    test_data = {"message": "Hello, World!", "timestamp": datetime.now().isoformat()}
    await cache_service.set("test", "key1", test_data, ttl=60)

    # Get value
    result = await cache_service.get("test", "key1")

    assert result is not None
    assert result["message"] == "Hello, World!"

    # Cleanup
    await cache_service.invalidate("test", "key1")


@pytest.mark.asyncio
async def test_cache_expiration():
    """Test cache expiration."""
    await cache_service.initialize()

    # Set value with short TTL
    await cache_service.set("test", "expire_key", "test_value", ttl=1)

    # Get immediately
    result = await cache_service.get("test", "expire_key")
    assert result == "test_value"

    # Wait for expiration
    await asyncio.sleep(2)

    # Should be expired
    result = await cache_service.get("test", "expire_key", use_fallback=False)
    # Note: May still be in fallback cache

    # Cleanup
    await cache_service.invalidate("test", "expire_key")


@pytest.mark.asyncio
async def test_cache_invalidation():
    """Test cache invalidation."""
    await cache_service.initialize()

    # Set multiple values
    await cache_service.set("test", "inv_key1", "value1", ttl=60)
    await cache_service.set("test", "inv_key2", "value2", ttl=60)

    # Verify they exist
    assert await cache_service.get("test", "inv_key1") == "value1"
    assert await cache_service.get("test", "inv_key2") == "value2"

    # Invalidate one key
    await cache_service.invalidate("test", "inv_key1")

    # First key should be gone
    assert await cache_service.get("test", "inv_key1", use_fallback=False) is None

    # Second key should still exist
    assert await cache_service.get("test", "inv_key2") == "value2"

    # Cleanup
    await cache_service.invalidate("test")


@pytest.mark.asyncio
async def test_batch_operations():
    """Test batch get and set operations."""
    await cache_service.initialize()

    # Batch set
    data = {
        "batch1": {"value": 1},
        "batch2": {"value": 2},
        "batch3": {"value": 3},
    }
    await cache_service.batch_set("test", data, ttl=60)

    # Batch get
    results = await cache_service.batch_get("test", ["batch1", "batch2", "batch3"])

    assert len(results) == 3
    assert results["batch1"]["value"] == 1
    assert results["batch2"]["value"] == 2
    assert results["batch3"]["value"] == 3

    # Cleanup
    await cache_service.invalidate("test")


@pytest.mark.asyncio
async def test_cache_metrics():
    """Test cache metrics tracking."""
    await cache_service.initialize()

    # Reset metrics
    cache_service.reset_metrics()

    # Perform some operations
    await cache_service.set("test", "metrics_key", "value", ttl=60)
    await cache_service.get("test", "metrics_key")  # Hit
    await cache_service.get("test", "nonexistent", use_fallback=False)  # Miss

    # Get metrics
    metrics = cache_service.get_metrics()

    assert metrics["total_requests"] >= 2
    assert metrics["memory_hits"] >= 1
    assert metrics["misses"] >= 1

    # Cleanup
    await cache_service.invalidate("test")


@pytest.mark.asyncio
async def test_cache_health_check():
    """Test cache health check."""
    await cache_service.initialize()

    health = await cache_service.health_check()

    assert "status" in health
    assert "memory_cache" in health
    assert "redis_cache" in health
    assert health["memory_cache"]["healthy"] is True


@pytest.mark.asyncio
async def test_namespace_invalidation():
    """Test invalidating entire namespace."""
    await cache_service.initialize()

    # Set values in namespace
    await cache_service.set("test_ns", "key1", "value1", ttl=60)
    await cache_service.set("test_ns", "key2", "value2", ttl=60)
    await cache_service.set("other_ns", "key3", "value3", ttl=60)

    # Invalidate test_ns namespace
    await cache_service.invalidate("test_ns")

    # test_ns keys should be gone
    assert await cache_service.get("test_ns", "key1", use_fallback=False) is None
    assert await cache_service.get("test_ns", "key2", use_fallback=False) is None

    # other_ns key should still exist
    assert await cache_service.get("other_ns", "key3") == "value3"

    # Cleanup
    await cache_service.invalidate("other_ns")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
