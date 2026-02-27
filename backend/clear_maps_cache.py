"""
Clear Maps service cache from Redis
Run this script to clear cached location data after updating API keys
"""

import asyncio
import redis.asyncio as redis


async def clear_maps_cache():
    """Clear all maps-related cache entries from Redis."""
    try:
        # Connect to Redis
        redis_client = redis.from_url(
            "redis://localhost:6379/0", encoding="utf-8", decode_responses=True
        )

        # Ping to check connection
        await redis_client.ping()
        print("✓ Connected to Redis")

        # Find all maps cache keys
        keys = await redis_client.keys("maps:*")

        if keys:
            print(f"Found {len(keys)} cached maps entries")

            # Delete all maps cache keys
            deleted = await redis_client.delete(*keys)
            print(f"✓ Cleared {deleted} cache entries")
        else:
            print("No maps cache entries found")

        # Close connection
        await redis_client.close()
        print("✓ Done!")

    except Exception as e:
        print(f"✗ Error: {e}")


if __name__ == "__main__":
    asyncio.run(clear_maps_cache())
