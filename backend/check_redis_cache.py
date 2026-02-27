"""
Simple script to check Redis cache contents for weather and maps data.
"""

import asyncio
import redis.asyncio as redis
from app.config import get_settings


async def check_redis_cache():
    """Check Redis cache contents."""

    print("=" * 70)
    print("Redis Cache Inspector")
    print("=" * 70)

    settings = get_settings()
    print(f"\n📋 Redis URL: {settings.redis_url}")

    try:
        # Connect to Redis
        print("\n🔌 Connecting to Redis...")
        redis_client = redis.from_url(
            settings.redis_url, encoding="utf-8", decode_responses=True
        )

        # Test connection
        await redis_client.ping()
        print("   ✓ Connected successfully")

        # Get all keys
        print("\n🔍 Scanning cache keys...")
        all_keys = await redis_client.keys("*")

        if not all_keys:
            print("   ℹ️  Cache is empty")
            await redis_client.close()
            return

        print(f"   Found {len(all_keys)} cached entries")

        # Categorize keys
        weather_keys = [k for k in all_keys if k.startswith("weather:")]
        maps_keys = [k for k in all_keys if k.startswith("maps:")]
        other_keys = [k for k in all_keys if not k.startswith(("weather:", "maps:"))]

        # Display weather cache
        if weather_keys:
            print(f"\n🌤️  Weather Cache ({len(weather_keys)} entries):")
            print("   " + "-" * 66)
            for key in weather_keys:
                ttl = await redis_client.ttl(key)
                size = len(await redis_client.get(key) or "")

                if ttl > 0:
                    ttl_minutes = ttl / 60
                    print(f"   📦 {key}")
                    print(
                        f"      TTL: {ttl}s ({ttl_minutes:.1f} min) | Size: {size} bytes"
                    )
                else:
                    print(f"   📦 {key} (expired or no TTL)")

        # Display maps cache
        if maps_keys:
            print(f"\n🗺️  Maps Cache ({len(maps_keys)} entries):")
            print("   " + "-" * 66)
            for key in maps_keys:
                ttl = await redis_client.ttl(key)
                size = len(await redis_client.get(key) or "")

                if ttl > 0:
                    ttl_hours = ttl / 3600
                    print(f"   📦 {key}")
                    print(
                        f"      TTL: {ttl}s ({ttl_hours:.1f} hrs) | Size: {size} bytes"
                    )
                else:
                    print(f"   📦 {key} (expired or no TTL)")

        # Display other cache
        if other_keys:
            print(f"\n📁 Other Cache ({len(other_keys)} entries):")
            print("   " + "-" * 66)
            for key in other_keys[:10]:  # Show first 10
                ttl = await redis_client.ttl(key)
                print(f"   📦 {key} (TTL: {ttl}s)")

            if len(other_keys) > 10:
                print(f"   ... and {len(other_keys) - 10} more")

        # Cache statistics
        print(f"\n📊 Cache Statistics:")
        print("   " + "-" * 66)
        info = await redis_client.info("memory")
        print(f"   Used Memory: {info.get('used_memory_human', 'N/A')}")
        print(f"   Peak Memory: {info.get('used_memory_peak_human', 'N/A')}")

        info_stats = await redis_client.info("stats")
        print(
            f"   Total Connections: {info_stats.get('total_connections_received', 'N/A')}"
        )
        print(f"   Total Commands: {info_stats.get('total_commands_processed', 'N/A')}")

        # Cleanup
        await redis_client.close()

        print("\n" + "=" * 70)
        print("✅ Cache inspection complete")
        print("=" * 70)

    except redis.ConnectionError as e:
        print(f"\n❌ Could not connect to Redis: {e}")
        print("\n💡 Make sure Redis is running:")
        print("   - Windows: Start Redis service or run redis-server.exe")
        print("   - Linux/Mac: sudo service redis-server start")
        print("   - Docker: docker run -d -p 6379:6379 redis")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback

        traceback.print_exc()


async def clear_cache(pattern: str = "*"):
    """Clear cache entries matching pattern."""

    print(f"\n⚠️  WARNING: This will delete cache entries matching: {pattern}")
    confirm = input("Are you sure? (yes/no): ")

    if confirm.lower() != "yes":
        print("Cancelled.")
        return

    settings = get_settings()
    redis_client = redis.from_url(
        settings.redis_url, encoding="utf-8", decode_responses=True
    )

    try:
        keys = await redis_client.keys(pattern)
        if keys:
            deleted = await redis_client.delete(*keys)
            print(f"✓ Deleted {deleted} cache entries")
        else:
            print("No matching keys found")
    finally:
        await redis_client.close()


if __name__ == "__main__":
    import sys

    print("\n🔍 Redis Cache Inspector\n")

    if len(sys.argv) > 1 and sys.argv[1] == "clear":
        pattern = sys.argv[2] if len(sys.argv) > 2 else "*"
        asyncio.run(clear_cache(pattern))
    else:
        asyncio.run(check_redis_cache())

        print("\n💡 Usage:")
        print("   python check_redis_cache.py              # Inspect cache")
        print("   python check_redis_cache.py clear        # Clear all cache")
        print(
            "   python check_redis_cache.py clear weather:*  # Clear weather cache only"
        )
        print("   python check_redis_cache.py clear maps:*     # Clear maps cache only")
        print("\n")
