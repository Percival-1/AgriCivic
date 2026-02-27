"""
Example usage of the Google Maps API integration service.

This script demonstrates how to use the Maps service for:
- Geocoding addresses
- Reverse geocoding coordinates
- Calculating distances
- Finding nearest mandis
- Getting route information
"""

import asyncio
from app.services.maps_service import (
    MapsService,
    Location,
    TravelMode,
    get_maps_service,
    close_maps_service,
)


async def main():
    """Main example function."""
    print("=" * 60)
    print("Google Maps API Integration - Example Usage")
    print("=" * 60)

    # Get the maps service instance
    maps_service = await get_maps_service()

    try:
        # Example 1: Geocode an address
        print("\n1. Geocoding an address:")
        print("-" * 60)
        address = "Connaught Place, New Delhi, India"
        print(f"Address: {address}")

        location = await maps_service.geocode(address)
        print(f"Latitude: {location.latitude}")
        print(f"Longitude: {location.longitude}")
        print(f"District: {location.district}")
        print(f"State: {location.state}")

        # Example 2: Reverse geocode coordinates
        print("\n2. Reverse geocoding coordinates:")
        print("-" * 60)
        lat, lng = 28.6139, 77.2090
        print(f"Coordinates: {lat}, {lng}")

        location = await maps_service.reverse_geocode(lat, lng)
        print(f"Address: {location.address}")
        print(f"District: {location.district}")
        print(f"State: {location.state}")

        # Example 3: Calculate distance between two locations
        print("\n3. Calculating distance:")
        print("-" * 60)
        origin = Location(latitude=28.6139, longitude=77.2090, address="Delhi")
        destination = Location(latitude=28.7041, longitude=77.1025, address="Rohini")

        distance_info = await maps_service.calculate_distance(
            origin, destination, TravelMode.DRIVING
        )
        print(f"Distance: {distance_info.distance_text}")
        print(f"Duration: {distance_info.duration_text}")
        print(f"Travel mode: {distance_info.travel_mode.value}")

        # Example 4: Find nearest mandis
        print("\n4. Finding nearest mandis:")
        print("-" * 60)
        user_location = Location(
            latitude=28.6139, longitude=77.2090, address="New Delhi"
        )

        mandis = await maps_service.find_nearest_mandis(
            user_location, max_results=5, max_distance_km=50.0
        )

        print(f"Found {len(mandis)} mandis within 50 km:")
        for i, mandi in enumerate(mandis, 1):
            print(f"\n{i}. {mandi.name}")
            print(f"   Distance: {mandi.distance_km:.2f} km")
            print(f"   Transport cost estimate: ₹{mandi.transport_cost_estimate:.2f}")
            print(f"   Rating: {mandi.rating}")
            print(f"   Open: {'Yes' if mandi.is_open else 'No'}")

        # Example 5: Get route information
        print("\n5. Getting route information:")
        print("-" * 60)
        route_info = await maps_service.get_route(
            origin, destination, TravelMode.DRIVING
        )

        print(f"Distance: {route_info.distance_info.distance_text}")
        print(f"Duration: {route_info.distance_info.duration_text}")
        print(f"\nRoute steps:")
        for i, step in enumerate(route_info.steps[:3], 1):  # Show first 3 steps
            print(f"{i}. {step}")
        if len(route_info.steps) > 3:
            print(f"... and {len(route_info.steps) - 3} more steps")

        # Example 6: Validate location
        print("\n6. Validating location:")
        print("-" * 60)
        test_location = Location(latitude=28.6139, longitude=77.2090, address="")
        is_valid = await maps_service.validate_location(test_location)
        print(
            f"Location ({test_location.latitude}, {test_location.longitude}) is valid: {is_valid}"
        )

        # Example 7: Calculate Haversine distance (offline calculation)
        print("\n7. Calculating Haversine distance (offline):")
        print("-" * 60)
        loc1 = Location(latitude=28.6139, longitude=77.2090, address="Delhi")
        loc2 = Location(latitude=28.7041, longitude=77.1025, address="Rohini")

        distance_km = maps_service.calculate_haversine_distance(loc1, loc2)
        print(f"Straight-line distance: {distance_km:.2f} km")

    except Exception as e:
        print(f"\nError: {e}")

    finally:
        # Close the maps service
        await close_maps_service()

    print("\n" + "=" * 60)
    print("Example completed!")
    print("=" * 60)


if __name__ == "__main__":
    # Note: This example requires a valid Google Maps API key
    # Set the GOOGLE_MAPS_API_KEY environment variable before running
    asyncio.run(main())
