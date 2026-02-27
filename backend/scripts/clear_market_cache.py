"""
Script to clear market-related cache from Redis.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import redis.asyncio as redis
from app.config import get_settings


async def clear_market_cache():
    """Clear all market-related cache keys from Redis."""
    settings = get_settings()

    print("=" * 80)
    print("CLEAR MARKET CACHE SCRIPT")
    print("=" * 80)

    try:
        # Connect to Redis
        redis_client = redis.from_url(
            settings.redis_url, encoding="utf-8", decode_responses=True
        )

        await redis_client.ping()
        print("✓ Connected to Redis")

        # Find all market-related keys
        market_keys = []
        cursor = 0

        while True:
            cursor, keys = await redis_client.scan(
                cursor=cursor, match="market:*", count=100
            )
            market_keys.extend(keys)

            if cursor == 0:
                break

        if market_keys:
            print(f"\nFound {len(market_keys)} market cache keys")
            print("Deleting cache keys...")

            # Delete all market keys
            deleted = await redis_client.delete(*market_keys)
            print(f"✓ Deleted {deleted} cache keys")
        else:
            print("\nNo market cache keys found")

        await redis_client.close()

        print("\n" + "=" * 80)
        print("✓ Market cache cleared successfully!")
        print("=" * 80)

    except Exception as e:
        print(f"\n✗ Error clearing cache: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(clear_market_cache())
