"""
Quick fix script for maps_service.py to correct API endpoints.

This script updates the calculate_distance and search_nearby_places methods
to use the correct Geoapify API endpoints and parameters.
"""

import re

# Read the current file
with open("app/services/maps_service.py", "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: Update calculate_distance to use POST for routematrix
old_distance_calc = """        # Fetch from API using Route Matrix
        try:
            # Geoapify Route Matrix API
            params = {
                "sources": f"{origin.latitude},{origin.longitude}",
                "targets": f"{destination.latitude},{destination.longitude}",
                "mode": mode.value,
            }
            data = await self._make_api_request("routematrix", params)"""

new_distance_calc = """        # Fetch from API using Route Matrix
        try:
            # Geoapify Route Matrix API (requires POST)
            body = {
                "mode": mode.value,
                "sources": [{"location": [origin.longitude, origin.latitude]}],
                "targets": [{"location": [destination.longitude, destination.latitude]}],
            }
            # Remove apiKey from body, add as query param
            api_key = body.pop("apiKey", self.api_key)
            url = f"{self.base_url}/routematrix?apiKey={api_key}"
            
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=body, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                    else:
                        error_text = await response.text()
                        raise MapsAPIError(f"Route matrix error: {error_text}")"""

content = content.replace(old_distance_calc, new_distance_calc)

# Fix 2: Update search_nearby_places to use correct parameters
old_places_search = """        # Fetch from API
        try:
            params = {
                "filter": f"circle:{location.longitude},{location.latitude},{min(radius, 50000)}",
                "bias": f"proximity:{location.longitude},{location.latitude}",
                "limit": 20,
            }

            # Add text filter if keyword provided
            if keyword:
                params["text"] = keyword

            # Add categories filter if place_type provided
            if place_type:
                params["categories"] = place_type

            data = await self._make_api_request("places", params)"""

new_places_search = """        # Fetch from API
        try:
            # Geoapify Places API v2 requires categories parameter
            params = {
                "categories": place_type if place_type else "commercial,catering",
                "filter": f"circle:{location.longitude},{location.latitude},{min(radius, 50000)}",
                "bias": f"proximity:{location.longitude},{location.latitude}",
                "limit": 20,
            }

            # Add text filter if keyword provided
            if keyword:
                params["text"] = keyword

            # Use v2 endpoint for places
            data = await self._make_api_request("../v2/places", params)"""

content = content.replace(old_places_search, new_places_search)

# Write the fixed content
with open("app/services/maps_service.py", "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Fixed maps_service.py")
print("   - Updated calculate_distance to use POST for routematrix")
print("   - Updated search_nearby_places to use v2 API with required categories")
