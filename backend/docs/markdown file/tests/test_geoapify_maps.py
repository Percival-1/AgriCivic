"""
Test script for Geoapify Maps API integration.

This script tests all major functions of the maps service:
1. Geocoding (address to coordinates)
2. Reverse geocoding (coordinates to address)
3. Distance calculation
4. Route planning
5. Places search (finding mandis)

Usage:
    python test_geoapify_maps.py
"""

import asyncio
import sys
from app.services.maps_service import (
    get_maps_service,
    close_maps_service,
    Location,
    TravelMode,
)
from app.config import get_settings


async def test_geocoding():
    """Test geocoding: address to coordinates."""
    print("\n" + "=" * 60)
    print("TEST 1: Geocoding (Address → Coordinates)")
    print("=" * 60)

    maps_service = await get_maps_service()

    test_addresses = [
        "Delhi, India",
        "Mumbai, Maharashtra, India",
        "Connaught Place, New Delhi",
    ]

    for address in test_addresses:
        try:
            print(f"\n📍 Testing: {address}")
            location = await maps_service.geocode(address)
            print(f"   ✅ Success!")
            print(f"   Latitude: {location.latitude}")
            print(f"   Longitude: {location.longitude}")
            print(f"   Address: {location.address}")
            print(f"   District: {location.district}")
            print(f"   State: {location.state}")
            print(f"   Country: {location.country}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False

    return True


async def test_reverse_geocoding():
    """Test reverse geocoding: coordinates to address."""
    print("\n" + "=" * 60)
    print("TEST 2: Reverse Geocoding (Coordinates → Address)")
    print("=" * 60)

    maps_service = await get_maps_service()

    test_coordinates = [
        (28.6139, 77.2090, "Delhi"),  # Delhi
        (19.0760, 72.8777, "Mumbai"),  # Mumbai
        (12.9716, 77.5946, "Bangalore"),  # Bangalore
    ]

    for lat, lon, expected_city in test_coordinates:
        try:
            print(f"\n📍 Testing: {lat}, {lon} (Expected: {expected_city})")
            location = await maps_service.reverse_geocode(lat, lon)
            print(f"   ✅ Success!")
            print(f"   Address: {location.address}")
            print(f"   District: {location.district}")
            print(f"   State: {location.state}")
            print(f"   Country: {location.country}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False

    return True


async def test_distance_calculation():
    """Test distance calculation between two locations."""
    print("\n" + "=" * 60)
    print("TEST 3: Distance Calculation")
    print("=" * 60)

    maps_service = await get_maps_service()

    # Delhi to Mumbai
    origin = Location(latitude=28.6139, longitude=77.2090, address="Delhi")
    destination = Location(latitude=19.0760, longitude=72.8777, address="Mumbai")

    travel_modes = [TravelMode.DRIVE, TravelMode.WALK]

    for mode in travel_modes:
        try:
            print(f"\n🚗 Testing: Delhi → Mumbai ({mode.value})")
            distance_info = await maps_service.calculate_distance(
                origin, destination, mode
            )
            print(f"   ✅ Success!")
            print(f"   Distance: {distance_info.distance_text}")
            print(f"   Duration: {distance_info.duration_text}")
            print(f"   Distance (meters): {distance_info.distance_meters}")
            print(f"   Duration (seconds): {distance_info.duration_seconds}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False

    return True


async def test_route_planning():
    """Test route planning with turn-by-turn directions."""
    print("\n" + "=" * 60)
    print("TEST 4: Route Planning")
    print("=" * 60)

    maps_service = await get_maps_service()

    # Shorter route for testing: Connaught Place to India Gate
    origin = Location(
        latitude=28.6315, longitude=77.2167, address="Connaught Place, Delhi"
    )
    destination = Location(
        latitude=28.6129, longitude=77.2295, address="India Gate, Delhi"
    )

    try:
        print(f"\n🗺️  Testing: {origin.address} → {destination.address}")
        route_info = await maps_service.get_route(origin, destination, TravelMode.DRIVE)
        print(f"   ✅ Success!")
        print(f"   Distance: {route_info.distance_info.distance_text}")
        print(f"   Duration: {route_info.distance_info.duration_text}")
        print(f"   Number of steps: {len(route_info.steps)}")
        if route_info.steps:
            print(f"   First 3 steps:")
            for i, step in enumerate(route_info.steps[:3], 1):
                print(f"      {i}. {step}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

    return True


async def test_places_search():
    """Test places search for finding mandis."""
    print("\n" + "=" * 60)
    print("TEST 5: Places Search (Finding Mandis)")
    print("=" * 60)

    maps_service = await get_maps_service()

    # Search for markets near Delhi
    location = Location(latitude=28.6139, longitude=77.2090, address="Delhi")

    try:
        print(f"\n🏪 Testing: Search for markets near {location.address}")
        places = await maps_service.search_nearby_places(
            location, keyword="market", radius=5000  # 5km radius
        )
        print(f"   ✅ Success!")
        print(f"   Found {len(places)} places")

        if places:
            print(f"   First 3 results:")
            for i, place in enumerate(places[:3], 1):
                props = place.get("properties", {})
                print(f"      {i}. {props.get('name', 'Unknown')}")
                print(f"         Address: {props.get('formatted', 'N/A')}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

    return True


async def test_find_nearest_mandis():
    """Test finding nearest mandis (integrated function)."""
    print("\n" + "=" * 60)
    print("TEST 6: Find Nearest Mandis (Integrated)")
    print("=" * 60)

    maps_service = await get_maps_service()

    # Search for mandis near Delhi
    location = Location(latitude=28.6139, longitude=77.2090, address="Delhi")

    try:
        print(f"\n🏪 Testing: Find nearest mandis to {location.address}")
        mandis = await maps_service.find_nearest_mandis(
            location, max_results=5, max_distance_km=50.0
        )
        print(f"   ✅ Success!")
        print(f"   Found {len(mandis)} mandis")

        if mandis:
            print(f"   Results:")
            for i, mandi in enumerate(mandis, 1):
                print(f"      {i}. {mandi.name}")
                print(f"         Distance: {mandi.distance_km:.2f} km")
                print(f"         Transport Cost: ₹{mandi.transport_cost_estimate:.2f}")
                print(f"         Address: {mandi.location.address}")
                print()
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

    return True


async def test_haversine_distance():
    """Test Haversine distance calculation (offline)."""
    print("\n" + "=" * 60)
    print("TEST 7: Haversine Distance (Offline Calculation)")
    print("=" * 60)

    maps_service = await get_maps_service()

    # Delhi to Mumbai
    loc1 = Location(latitude=28.6139, longitude=77.2090, address="Delhi")
    loc2 = Location(latitude=19.0760, longitude=72.8777, address="Mumbai")

    try:
        print(f"\n📏 Testing: {loc1.address} → {loc2.address}")
        distance = maps_service.calculate_haversine_distance(loc1, loc2)
        print(f"   ✅ Success!")
        print(f"   Straight-line distance: {distance:.2f} km")
        print(f"   (Note: This is air distance, not road distance)")
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

    return True


async def run_all_tests():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("🧪 GEOAPIFY MAPS API TEST SUITE")
    print("=" * 60)

    # Check if API key is configured
    settings = get_settings()
    if (
        not settings.geoapify_api_key
        or settings.geoapify_api_key == "your_geoapify_api_key_here"
    ):
        print("\n❌ ERROR: Geoapify API key not configured!")
        print("\nPlease set GEOAPIFY_API_KEY in your .env file:")
        print("1. Get a free API key from https://www.geoapify.com/")
        print("2. Add to .env: GEOAPIFY_API_KEY=your_actual_key_here")
        print("3. Run this test again")
        return False

    print(f"\n✅ API Key configured: {settings.geoapify_api_key[:10]}...")

    tests = [
        ("Geocoding", test_geocoding),
        ("Reverse Geocoding", test_reverse_geocoding),
        ("Distance Calculation", test_distance_calculation),
        ("Route Planning", test_route_planning),
        ("Places Search", test_places_search),
        ("Find Nearest Mandis", test_find_nearest_mandis),
        ("Haversine Distance", test_haversine_distance),
    ]

    results = []

    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))

    # Close maps service
    await close_maps_service()

    # Print summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")

    print(f"\n{'='*60}")
    print(f"Results: {passed}/{total} tests passed")
    print("=" * 60)

    if passed == total:
        print("\n🎉 All tests passed! Geoapify Maps API is working correctly.")
        return True
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please check the errors above.")
        return False


if __name__ == "__main__":
    try:
        success = asyncio.run(run_all_tests())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
