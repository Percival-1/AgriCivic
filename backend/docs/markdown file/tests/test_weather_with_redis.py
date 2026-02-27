"""
Test script for Weather Service with real API and Redis caching demonstration.

This script will:
1. Test weather API with real OpenWeatherMap API
2. Demonstrate Redis caching behavior
3. Show cache hit/miss scenarios
4. Display response times with and without cache
"""

import asyncio
import time
from app.services.weather_service import (
    get_weather_service,
    close_weather_service,
    Location,
)
from app.config import get_settings


async def test_weather_with_caching():
    """Test weather service with Redis caching."""

    print("=" * 70)
    print("Weather Service Test - API & Redis Caching Demonstration")
    print("=" * 70)

    # Check configuration
    settings = get_settings()
    print(f"\n📋 Configuration:")
    print(
        f"   OpenWeather API Key: {'✓ Set' if settings.openweather_api_key else '✗ Not Set'}"
    )
    print(f"   Redis URL: {settings.redis_url}")

    if not settings.openweather_api_key:
        print("\n❌ ERROR: OPENWEATHER_API_KEY not set in .env file")
        print("   Please add: OPENWEATHER_API_KEY=your_api_key_here")
        return

    # Initialize weather service
    print("\n🔧 Initializing Weather Service...")
    weather_service = await get_weather_service()

    if weather_service.redis_client:
        print("   ✓ Redis connection established")
    else:
        print("   ⚠ Redis not available - caching disabled")

    # Test location (New Delhi, India)
    test_location = Location(
        latitude=28.6139,
        longitude=77.2090,
        address="New Delhi, India",
        district="New Delhi",
        state="Delhi",
    )

    print(f"\n📍 Test Location:")
    print(f"   Address: {test_location.address}")
    print(f"   Coordinates: {test_location.latitude}, {test_location.longitude}")

    try:
        # Test 1: First API call (should hit API, not cache)
        print("\n" + "=" * 70)
        print("TEST 1: First API Call (Cache Miss Expected)")
        print("=" * 70)

        start_time = time.time()
        weather_data = await weather_service.get_current_weather(test_location)
        elapsed_time = time.time() - start_time

        print(f"\n✓ Weather data retrieved in {elapsed_time:.3f} seconds")
        print(f"\n🌡️  Current Weather:")
        print(f"   Temperature: {weather_data.temperature}°C")
        print(f"   Feels Like: {weather_data.feels_like}°C")
        print(f"   Humidity: {weather_data.humidity}%")
        print(f"   Wind Speed: {weather_data.wind_speed} m/s")
        print(f"   Description: {weather_data.weather_description}")

        if weather_data.weather_alerts:
            print(f"\n⚠️  Weather Alerts: {len(weather_data.weather_alerts)}")
            for alert in weather_data.weather_alerts:
                print(f"   - {alert.alert_type}: {alert.message}")

        if weather_data.agricultural_insights:
            print(f"\n🌾 Agricultural Insights:")
            for insight in weather_data.agricultural_insights[:3]:
                print(f"   • {insight}")

        # Check if data was cached
        if weather_service.redis_client:
            cache_key = weather_service._generate_cache_key(test_location, "current")
            cached_data = await weather_service._get_cached_data(cache_key)
            if cached_data:
                print(f"\n✓ Data cached in Redis with key: {cache_key}")

        # Test 2: Second API call (should hit cache)
        print("\n" + "=" * 70)
        print("TEST 2: Second API Call (Cache Hit Expected)")
        print("=" * 70)
        print("\nWaiting 2 seconds before next call...")
        await asyncio.sleep(2)

        start_time = time.time()
        weather_data_cached = await weather_service.get_current_weather(test_location)
        elapsed_time_cached = time.time() - start_time

        print(f"\n✓ Weather data retrieved in {elapsed_time_cached:.3f} seconds")
        print(f"\n📊 Performance Comparison:")
        print(f"   First call (API):   {elapsed_time:.3f} seconds")
        print(f"   Second call (Cache): {elapsed_time_cached:.3f} seconds")

        if elapsed_time_cached < elapsed_time:
            speedup = elapsed_time / elapsed_time_cached
            print(f"   🚀 Cache speedup: {speedup:.1f}x faster!")

        # Verify data consistency
        print(f"\n🔍 Data Consistency Check:")
        print(
            f"   Temperature match: {weather_data.temperature == weather_data_cached.temperature}"
        )
        print(
            f"   Humidity match: {weather_data.humidity == weather_data_cached.humidity}"
        )

        # Test 3: Get forecast data
        print("\n" + "=" * 70)
        print("TEST 3: Weather Forecast (5 days)")
        print("=" * 70)

        start_time = time.time()
        forecast = await weather_service.get_forecast(test_location, days=5)
        elapsed_time = time.time() - start_time

        print(f"\n✓ Forecast retrieved in {elapsed_time:.3f} seconds")
        print(f"\n📅 5-Day Forecast:")
        for day_forecast in forecast:
            print(f"\n   Date: {day_forecast.date}")
            print(
                f"   Temp: {day_forecast.temperature_min:.1f}°C - {day_forecast.temperature_max:.1f}°C"
            )
            print(f"   Humidity: {day_forecast.humidity:.0f}%")
            print(f"   Rain Probability: {day_forecast.rainfall_probability:.0f}%")
            print(f"   Description: {day_forecast.weather_description}")

        # Test 4: Comprehensive weather data
        print("\n" + "=" * 70)
        print("TEST 4: Comprehensive Weather (Current + Forecast)")
        print("=" * 70)

        start_time = time.time()
        comprehensive = await weather_service.get_weather_with_forecast(test_location)
        elapsed_time = time.time() - start_time

        print(f"\n✓ Comprehensive data retrieved in {elapsed_time:.3f} seconds")
        print(f"   Current weather: ✓")
        print(f"   Forecast days: {len(comprehensive.forecast)}")
        print(f"   Agricultural insights: {len(comprehensive.agricultural_insights)}")
        print(f"   Weather alerts: {len(comprehensive.weather_alerts)}")

        # Test 5: Circuit breaker status
        print("\n" + "=" * 70)
        print("TEST 5: Service Health Check")
        print("=" * 70)

        print(f"\n🏥 Service Status:")
        print(
            f"   Circuit Breaker: {'🔴 OPEN' if weather_service.circuit_open else '🟢 CLOSED'}"
        )
        print(f"   Failure Count: {weather_service.failure_count}")
        print(
            f"   Cache TTL: {weather_service.cache_ttl} seconds ({weather_service.cache_ttl/60:.0f} minutes)"
        )

        # Redis cache inspection
        if weather_service.redis_client:
            print(f"\n💾 Redis Cache Status:")
            try:
                # Get all weather cache keys
                keys = await weather_service.redis_client.keys("weather:*")
                print(f"   Total cached entries: {len(keys)}")

                if keys:
                    print(f"\n   Cached keys:")
                    for key in keys[:5]:  # Show first 5 keys
                        ttl = await weather_service.redis_client.ttl(key)
                        print(f"   - {key}")
                        print(
                            f"     TTL: {ttl} seconds ({ttl/60:.1f} minutes remaining)"
                        )

                    if len(keys) > 5:
                        print(f"   ... and {len(keys) - 5} more")
            except Exception as e:
                print(f"   ⚠ Could not inspect cache: {e}")

        print("\n" + "=" * 70)
        print("✅ All Tests Completed Successfully!")
        print("=" * 70)

    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        print(f"   Error type: {type(e).__name__}")
        import traceback

        traceback.print_exc()

    finally:
        # Cleanup
        print("\n🧹 Cleaning up...")
        await close_weather_service()
        print("   ✓ Weather service closed")


async def test_cache_expiration():
    """Test cache expiration behavior."""
    print("\n" + "=" * 70)
    print("BONUS TEST: Cache Expiration Demonstration")
    print("=" * 70)
    print("\nThis test would require waiting 30 minutes for cache expiration.")
    print("Skipping for now. Cache TTL is set to 1800 seconds (30 minutes).")


if __name__ == "__main__":
    print("\n🚀 Starting Weather Service Test with Redis Caching\n")

    # Check if Redis is running
    print("⚠️  Prerequisites:")
    print("   1. Redis server must be running (default: localhost:6379)")
    print("   2. OPENWEATHER_API_KEY must be set in .env file")
    print("   3. Internet connection required for API calls")

    input("\nPress Enter to continue with the test...")

    asyncio.run(test_weather_with_caching())

    print("\n" + "=" * 70)
    print("Test Complete!")
    print("=" * 70)
    print("\n💡 Tips:")
    print("   - Run this script multiple times to see cache hits")
    print("   - Check Redis with: redis-cli KEYS 'weather:*'")
    print("   - Monitor cache with: redis-cli MONITOR")
    print("   - Clear cache with: redis-cli FLUSHDB")
    print("\n")
