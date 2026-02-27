"""
Simple test script for weather API endpoints
Run this after starting the backend server
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
# You'll need to replace this with a valid token from your auth system
TOKEN = "your_jwt_token_here"

headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


def test_weather_health():
    """Test weather health endpoint (no auth required)"""
    print("\n=== Testing Weather Health ===")
    response = requests.get(f"{BASE_URL}/weather/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def test_current_weather():
    """Test current weather endpoint"""
    print("\n=== Testing Current Weather ===")
    params = {"location": "New Delhi"}
    response = requests.get(
        f"{BASE_URL}/weather/current", params=params, headers=headers
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"Error: {response.text}")
    return response.status_code == 200


def test_forecast():
    """Test weather forecast endpoint"""
    print("\n=== Testing Weather Forecast ===")
    params = {"location": "New Delhi", "days": 7}
    response = requests.get(
        f"{BASE_URL}/weather/forecast", params=params, headers=headers
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Forecast days: {len(data.get('data', []))}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"Error: {response.text}")
    return response.status_code == 200


def test_alerts():
    """Test weather alerts endpoint"""
    print("\n=== Testing Weather Alerts ===")
    params = {"location": "New Delhi"}
    response = requests.get(
        f"{BASE_URL}/weather/alerts", params=params, headers=headers
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Alerts count: {len(data.get('data', []))}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"Error: {response.text}")
    return response.status_code == 200


def test_agricultural_insights():
    """Test agricultural insights endpoint"""
    print("\n=== Testing Agricultural Insights ===")
    params = {"location": "New Delhi"}
    response = requests.get(
        f"{BASE_URL}/weather/agricultural-insights", params=params, headers=headers
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"Error: {response.text}")
    return response.status_code == 200


if __name__ == "__main__":
    print("Weather API Test Suite")
    print("=" * 50)
    print("\nNote: Make sure the backend server is running on http://localhost:8000")
    print(
        "Note: Update TOKEN variable with a valid JWT token for authenticated endpoints"
    )

    # Test health endpoint (no auth required)
    health_ok = test_weather_health()

    if not health_ok:
        print("\n⚠️  Weather service health check failed. Check if:")
        print("  1. Backend server is running")
        print("  2. OpenWeather API key is configured")
        print("  3. Redis is running (optional but recommended)")

    # Test authenticated endpoints
    print("\n" + "=" * 50)
    print("Testing authenticated endpoints...")
    print("(These will fail with 401 if TOKEN is not set)")

    test_current_weather()
    test_forecast()
    test_alerts()
    test_agricultural_insights()

    print("\n" + "=" * 50)
    print("Test suite completed!")
