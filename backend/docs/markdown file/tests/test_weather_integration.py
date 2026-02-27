"""
Integration tests for weather service with real API and Redis.

These tests verify the weather service works correctly with:
- Real OpenWeatherMap API
- Real Redis connection
- Actual network requests
"""

import pytest
import asyncio
from datetime import datetime

from app.services.weather_service import (
    WeatherService,
    WeatherData,
    Location,
    DailyForecast,
    WeatherAlert,
    WeatherAPIError,
    get_weather_service,
    close_weather_service,
)
from app.config import get_settings


@pytest.fixture
def test_locations():
    """Sample locations for testing."""
    return [
        Location(
            latitude=28.6139,
            longitude=77.2090,
            address="New Delhi",
            district="New Delhi",
            state="Delhi",
        ),
        Location(
            latitude=19.0760,
            longitude=72.8777,
            address="Mumbai",
            district="Mumbai",
            state="Maharashtra",
        ),
        Location(
            latitude=13.0827,
            longitude=80.2707,
            address="Chennai",
            district="Chennai",
            state="Tamil Nadu",
        ),
    ]


@pytest.mark.asyncio
@pytest.mark.integration
class TestWeatherServiceIntegration:
    """Integration tests for weather service."""

    async def test_redis_connection(self):
        """Test Redis connection is working."""
        service = await get_weather_service()

        # Check if Redis is connected
        if service.redis_client:
            try:
                await service.redis_client.ping()
                print("✓ Redis connection successful")
            except Exception as e:
                pytest.fail(f"Redis connection failed: {e}")
        else:
            print("⚠ Redis client not initialized (caching disabled)")

        await close_weather_service()

    async def test_api_key_configured(self):
        """Test OpenWeatherMap API key is configured."""
        settings = get_settings()
        assert settings.openweather_api_key, "OpenWeatherMap API key not configured"
        assert settings.openweather_api_key != "your_openweather_api_key_here"
        print(f"✓ API key configured: {settings.openweather_api_key[:10]}...")

    async def test_get_current_weather_real_api(self, test_locations):
        """Test getting current weather from real API."""
        service = await get_weather_service()
        location = test_locations[0]  # New Delhi

        try:
            weather_data = await service.get_current_weather(location)

            # Verify response structure
            assert isinstance(weather_data, WeatherData)
            assert weather_data.temperature is not None
            assert weather_data.humidity > 0
            assert weather_data.humidity <= 100
            assert weather_data.weather_description != ""
            assert weather_data.location == location

            # Verify agricultural insights are generated
            assert len(weather_data.agricultural_insights) > 0

            print(f"\n✓ Current Weather for {location.address}:")
            print(f"  Temperature: {weather_data.temperature}°C")
            print(f"  Feels Like: {weather_data.feels_like}°C")
            print(f"  Humidity: {weather_data.humidity}%")
            print(f"  Wind Speed: {weather_data.wind_speed} m/s")
            print(f"  Description: {weather_data.weather_description}")
            print(f"  Agricultural Insights: {len(weather_data.agricultural_insights)}")

            if weather_data.weather_alerts:
                print(f"  Weather Alerts: {len(weather_data.weather_alerts)}")
                for alert in weather_data.weather_alerts:
                    print(f"    - {alert.alert_type}: {alert.message}")

        except WeatherAPIError as e:
            pytest.fail(f"Weather API request failed: {e}")
        finally:
            await close_weather_service()

    async def test_get_forecast_real_api(self, test_locations):
        """Test getting weather forecast from real API."""
        service = await get_weather_service()
        location = test_locations[1]  # Mumbai

        try:
            forecasts = await service.get_forecast(location, days=5)

            # Verify response structure
            assert len(forecasts) > 0
            assert len(forecasts) <= 5

            for forecast in forecasts:
                assert isinstance(forecast, DailyForecast)
                assert forecast.date != ""
                assert forecast.temperature_min > 0
                assert forecast.temperature_max > 0
                assert forecast.temperature_max >= forecast.temperature_min
                assert 0 <= forecast.humidity <= 100
                assert 0 <= forecast.rainfall_probability <= 100

            print(f"\n✓ 5-Day Forecast for {location.address}:")
            for forecast in forecasts:
                print(f"  {forecast.date}:")
                print(
                    f"    Temp: {forecast.temperature_min}°C - {forecast.temperature_max}°C"
                )
                print(f"    Humidity: {forecast.humidity}%")
                print(f"    Rain Probability: {forecast.rainfall_probability}%")
                print(f"    Conditions: {forecast.weather_description}")

        except WeatherAPIError as e:
            pytest.fail(f"Forecast API request failed: {e}")
        finally:
            await close_weather_service()

    async def test_get_comprehensive_weather(self, test_locations):
        """Test getting comprehensive weather data."""
        service = await get_weather_service()
        location = test_locations[2]  # Chennai

        try:
            weather_data = await service.get_weather_with_forecast(location)

            # Verify current weather
            assert isinstance(weather_data, WeatherData)
            assert weather_data.temperature is not None

            # Verify forecast is included
            assert len(weather_data.forecast) > 0

            print(f"\n✓ Comprehensive Weather for {location.address}:")
            print(f"  Current Temperature: {weather_data.temperature}°C")
            print(f"  Current Conditions: {weather_data.weather_description}")
            print(f"  Forecast Days: {len(weather_data.forecast)}")
            print(f"  Agricultural Insights: {len(weather_data.agricultural_insights)}")

        except WeatherAPIError as e:
            pytest.fail(f"Comprehensive weather request failed: {e}")
        finally:
            await close_weather_service()

    async def test_caching_functionality(self, test_locations):
        """Test that caching works correctly."""
        service = await get_weather_service()
        location = test_locations[0]

        if not service.redis_client:
            pytest.skip("Redis not available, skipping cache test")

        try:
            # First request - should hit API
            start_time = datetime.now()
            weather_data1 = await service.get_current_weather(location)
            first_request_time = (datetime.now() - start_time).total_seconds()

            # Second request - should hit cache
            start_time = datetime.now()
            weather_data2 = await service.get_current_weather(location)
            second_request_time = (datetime.now() - start_time).total_seconds()

            # Verify data is the same
            assert weather_data1.temperature == weather_data2.temperature
            assert weather_data1.humidity == weather_data2.humidity

            # Cache should be faster (though not always guaranteed)
            print(f"\n✓ Caching Test:")
            print(f"  First request (API): {first_request_time:.3f}s")
            print(f"  Second request (Cache): {second_request_time:.3f}s")

            if second_request_time < first_request_time:
                print(
                    f"  Cache speedup: {(first_request_time/second_request_time):.2f}x faster"
                )

        except WeatherAPIError as e:
            pytest.fail(f"Caching test failed: {e}")
        finally:
            await close_weather_service()

    async def test_multiple_locations_concurrent(self, test_locations):
        """Test fetching weather for multiple locations concurrently."""
        service = await get_weather_service()

        try:
            # Fetch weather for all locations concurrently
            tasks = [
                service.get_current_weather(location) for location in test_locations
            ]

            start_time = datetime.now()
            results = await asyncio.gather(*tasks, return_exceptions=True)
            total_time = (datetime.now() - start_time).total_seconds()

            # Verify all requests succeeded
            successful_results = [r for r in results if isinstance(r, WeatherData)]
            failed_results = [r for r in results if isinstance(r, Exception)]

            print(f"\n✓ Concurrent Requests Test:")
            print(f"  Total locations: {len(test_locations)}")
            print(f"  Successful: {len(successful_results)}")
            print(f"  Failed: {len(failed_results)}")
            print(f"  Total time: {total_time:.3f}s")
            print(f"  Average per location: {total_time/len(test_locations):.3f}s")

            for i, result in enumerate(results):
                if isinstance(result, WeatherData):
                    print(
                        f"  {test_locations[i].address}: {result.temperature}°C - {result.weather_description}"
                    )
                else:
                    print(f"  {test_locations[i].address}: Failed - {result}")

            assert len(successful_results) > 0, "All requests failed"

        except Exception as e:
            pytest.fail(f"Concurrent requests test failed: {e}")
        finally:
            await close_weather_service()

    async def test_process_weather_query_types(self, test_locations):
        """Test different query types."""
        service = await get_weather_service()
        location = test_locations[0]

        try:
            # Test current query
            current_data = await service.process_weather_query(location, "current")
            assert isinstance(current_data, WeatherData)
            assert current_data.temperature is not None
            print(f"\n✓ Query Type 'current': Temperature {current_data.temperature}°C")

            # Test forecast query
            forecast_data = await service.process_weather_query(location, "forecast")
            assert isinstance(forecast_data, WeatherData)
            assert len(forecast_data.forecast) > 0
            print(f"✓ Query Type 'forecast': {len(forecast_data.forecast)} days")

            # Test comprehensive query
            comprehensive_data = await service.process_weather_query(
                location, "comprehensive"
            )
            assert isinstance(comprehensive_data, WeatherData)
            assert comprehensive_data.temperature is not None
            assert len(comprehensive_data.forecast) > 0
            print(
                f"✓ Query Type 'comprehensive': Current + {len(comprehensive_data.forecast)} day forecast"
            )

        except WeatherAPIError as e:
            pytest.fail(f"Query type test failed: {e}")
        finally:
            await close_weather_service()

    async def test_agricultural_insights_generation(self, test_locations):
        """Test that agricultural insights are generated correctly."""
        service = await get_weather_service()
        location = test_locations[0]

        try:
            weather_data = await service.get_current_weather(location)

            # Verify insights are generated
            assert len(weather_data.agricultural_insights) > 0

            print(f"\n✓ Agricultural Insights for {location.address}:")
            print(f"  Current Conditions:")
            print(f"    Temperature: {weather_data.temperature}°C")
            print(f"    Humidity: {weather_data.humidity}%")
            print(f"    Wind Speed: {weather_data.wind_speed} m/s")
            print(f"\n  Generated Insights:")
            for i, insight in enumerate(weather_data.agricultural_insights, 1):
                print(f"    {i}. {insight}")

            # Verify insights are relevant
            for insight in weather_data.agricultural_insights:
                assert len(insight) > 10, "Insight too short"
                # Check if insight contains relevant keywords (more flexible)
                assert any(
                    keyword in insight.lower()
                    for keyword in [
                        "temperature",
                        "humidity",
                        "wind",
                        "rain",
                        "irrigation",
                        "crop",
                        "plant",
                        "weather",
                        "frost",
                        "heat",
                        "moderate",
                        "visibility",
                        "field",
                        "operations",
                        "growth",
                        "moisture",
                    ]
                ), f"Insight doesn't contain agricultural keywords: {insight}"

        except WeatherAPIError as e:
            pytest.fail(f"Agricultural insights test failed: {e}")
        finally:
            await close_weather_service()

    async def test_weather_alerts_generation(self, test_locations):
        """Test weather alerts are generated when conditions warrant."""
        service = await get_weather_service()

        try:
            # Test multiple locations to increase chance of finding alerts
            for location in test_locations:
                weather_data = await service.get_current_weather(location)

                print(f"\n✓ Weather Alerts for {location.address}:")
                print(f"  Temperature: {weather_data.temperature}°C")
                print(f"  Wind Speed: {weather_data.wind_speed} m/s")

                if weather_data.weather_alerts:
                    print(f"  Active Alerts: {len(weather_data.weather_alerts)}")
                    for alert in weather_data.weather_alerts:
                        print(f"    - Type: {alert.alert_type}")
                        print(f"      Severity: {alert.severity}")
                        print(f"      Message: {alert.message}")
                        print(f"      Agricultural Impact: {alert.agricultural_impact}")
                else:
                    print(f"  No active alerts (conditions normal)")

        except WeatherAPIError as e:
            pytest.fail(f"Weather alerts test failed: {e}")
        finally:
            await close_weather_service()


if __name__ == "__main__":
    """Run integration tests manually."""
    pytest.main([__file__, "-v", "-s", "-m", "integration"])
