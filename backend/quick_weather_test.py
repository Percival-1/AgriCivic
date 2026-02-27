"""
Quick test to verify OpenWeather API key works
"""

import requests

API_KEY = "ef7fb4ef42490abd6203a7956f801276"
LAT = 28.6139
LON = 77.2090

url = f"https://api.openweathermap.org/data/2.5/weather?lat={LAT}&lon={LON}&appid={API_KEY}&units=metric"

print(f"Testing OpenWeather API...")
print(f"URL: {url}")
print()

try:
    response = requests.get(url, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    if response.status_code == 200:
        print("\n✅ OpenWeather API is working!")
    else:
        print(f"\n❌ OpenWeather API returned error: {response.status_code}")
except Exception as e:
    print(f"\n❌ Error calling OpenWeather API: {e}")
