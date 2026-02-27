"""
Test script for weather service coordinate-to-address conversion.

This script tests the integration between weather service and maps service
to automatically convert coordinates to real addresses using reverse geocoding.
"""

import asyncio
import sys
from app.services.weather_service import get_weather_service, Location


async def test_coordinate_conversion():
    """Test coordinate-to-address conversion in weather service."""
    print("=" * 80)
    print("Testing Weather Service Coordinate-to-Address Conversion")
    print("=" * 80)
    print()

    # Initialize weather service
    weather_service = await get_weather_service()

    # Test cases: coordinates without address
    test_cases = [
        {
            "name": "New Delhi, India",
            "latitude": 28.6139,
            "longitude": 77.2090,
        },
        {
            "name": "Mumbai, India",
            "latitude": 19.0760,
            "longitude": 72.8777,
        },
        {
            "name": "Bangalore, India",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
    ]

    for i, test_case in enumerate(test_cases, 1):
        print(f"Test Case {i}: {test_case['name']}")
        print("-" * 80)
        print(f"Input Coordinates: ({test_case['latitude']}, {test_case['longitude']})")
        print()

        try:
            # Create location with only coordinates (no address)
            location = Location(
                latitude=test_case["latitude"],
                longitude=test_case["longitude"],
                address="",  # Empty address - should be populated by reverse geocoding
            )

            # Get current weather (this should trigger address enrichment)
            weather_data = await weather_service.get_current_weather(location)

            # Display results
            print("✓ Weather data retrieved successfully")
            print()
            print("Location Information:")
            print(f"  Address: {weather_data.location.address}")
            print(f"  District: {weather_data.location.district}")
            print(f"  State: {weather_data.location.state}")
            print(
                f"  Coordinates: ({weather_data.location.latitude}, {weather_data.location.longitude})"
            )
            print()
            print("Weather Information:")
            print(f"  Temperature: {weather_data.temperature}°C")
            print(f"  Feels Like: {weather_data.feels_like}°C")
            print(f"  Humidity: {weather_data.humidity}%")
            print(f"  Wind Speed: {weather_data.wind_speed} m/s")
            print(f"  Description: {weather_data.weather_description}")
            print()

            # Verify address was populated
            if weather_data.location.address and weather_data.location.address.strip():
                print("✓ Address successfully populated via reverse geocoding")
            else:
                print("✗ Address was not populated")

        except Exception as e:
            print(f"✗ Error: {e}")
            import traceback

            traceback.print_exc()

        print()
        print("=" * 80)
        print()

    # Close weather service
    await weather_service.close()


async def test_with_existing_address():
    """Test that existing addresses are not overwritten."""
    print("Testing with Pre-existing Address")
    print("=" * 80)
    print()

    weather_service = await get_weather_service()

    try:
        # Create location with address already populated
        location = Location(
            latitude=28.6139,
            longitude=77.2090,
            address="Custom Address - Should Not Change",
            district="Custom District",
            state="Custom State",
        )

        print(f"Input Location:")
        print(f"  Address: {location.address}")
        print(f"  District: {location.district}")
        print(f"  State: {location.state}")
        print()

        # Get weather data
        weather_data = await weather_service.get_current_weather(location)

        print(f"Output Location:")
        print(f"  Address: {weather_data.location.address}")
        print(f"  District: {weather_data.location.district}")
        print(f"  State: {weather_data.location.state}")
        print()

        # Verify address was NOT changed
        if weather_data.location.address == "Custom Address - Should Not Change":
            print("✓ Pre-existing address was preserved (not overwritten)")
        else:
            print("✗ Pre-existing address was overwritten (unexpected)")

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback

        traceback.print_exc()

    await weather_service.close()
    print()
    print("=" * 80)


async def main():
    """Run all tests."""
    try:
        await test_coordinate_conversion()
        await test_with_existing_address()
        print()
        print("All tests completed!")
    except Exception as e:
        print(f"Test suite failed: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
