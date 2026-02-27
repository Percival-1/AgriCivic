"""
Geoapify Maps API service for the AI-Driven Agri-Civic Intelligence Platform.

This service provides location services including:
- Geocoding and reverse geocoding
- Distance calculation and routing
- Nearest mandi identification
- Location validation
"""

import asyncio
import logging
import time
import hashlib
import json
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

import aiohttp
import redis.asyncio as redis

from app.config import get_settings
from app.core.logging import get_logger
from app.core.error_handling import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitBreakerError,
    RetryConfig,
    retry_async,
    ErrorContext,
    ErrorSeverity,
    error_tracker,
)

# Configure logging
logger = get_logger(__name__)


class TravelMode(str, Enum):
    """Travel modes for distance calculation."""

    DRIVE = "drive"
    WALK = "walk"
    BICYCLE = "bicycle"
    TRANSIT = "transit"
    TRUCK = "truck"


@dataclass
class Location:
    """Location data model."""

    latitude: float
    longitude: float
    address: str = ""
    district: str = ""
    state: str = ""
    country: str = ""
    postal_code: str = ""


@dataclass
class DistanceInfo:
    """Distance and duration information."""

    distance_meters: float
    distance_text: str
    duration_seconds: float
    duration_text: str
    travel_mode: TravelMode


@dataclass
class RouteInfo:
    """Route information between two locations."""

    origin: Location
    destination: Location
    distance_info: DistanceInfo
    polyline: str = ""
    steps: List[str] = field(default_factory=list)


@dataclass
class MandiInfo:
    """Market (Mandi) information."""

    name: str
    location: Location
    distance_km: float
    distance_info: Optional[DistanceInfo] = None
    current_prices: Dict[str, float] = field(default_factory=dict)
    contact_info: str = ""
    transport_cost_estimate: float = 0.0
    place_id: str = ""
    rating: float = 0.0
    is_open: bool = True


class MapsAPIError(Exception):
    """Custom exception for Maps API errors."""

    pass


class MapsService:
    """
    Geoapify Maps API service for location-based operations.

    Features:
    - Geocoding and reverse geocoding
    - Distance matrix calculations
    - Nearest mandi identification
    - Location validation
    - Redis caching for performance
    - Circuit breaker pattern for resilience
    """

    def __init__(self):
        """Initialize Maps service with configuration."""
        self.settings = get_settings()
        self.api_key = self.settings.geoapify_api_key
        self.base_url = "https://api.geoapify.com/v1"
        self.cache_ttl = 86400  # 24 hours cache for location data
        self.redis_client: Optional[redis.Redis] = None

        # Initialize circuit breaker with configuration
        self.circuit_breaker = CircuitBreaker(
            name="maps_api",
            config=CircuitBreakerConfig(
                failure_threshold=5,
                success_threshold=2,
                timeout_seconds=60,
                expected_exception=MapsAPIError,
            ),
        )

        # Retry configuration
        self.retry_config = RetryConfig(
            max_attempts=3, initial_delay=1.0, max_delay=10.0, exponential_base=2.0
        )

        # Transport cost estimation (per km)
        self.transport_cost_per_km = 5.0  # Default: ₹5 per km

    async def initialize(self):
        """Initialize Redis connection for caching."""
        try:
            self.redis_client = redis.from_url(
                self.settings.redis_url, encoding="utf-8", decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Maps service Redis connection established")
        except Exception as e:
            logger.warning(f"Redis connection failed, caching disabled: {e}")
            self.redis_client = None

    async def close(self):
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()

    def _generate_cache_key(self, operation: str, params: str) -> str:
        """Generate cache key for Maps data."""
        params_hash = hashlib.md5(params.encode()).hexdigest()
        return f"maps:{operation}:{params_hash}"

    async def _get_cached_data(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached Maps data."""
        if not self.redis_client:
            return None

        try:
            cached = await self.redis_client.get(cache_key)
            if cached:
                logger.info(f"Cache hit for {cache_key}")
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Cache retrieval error: {e}")

        return None

    async def _set_cached_data(
        self, cache_key: str, data: Dict[str, Any], ttl: Optional[int] = None
    ):
        """Store Maps data in cache."""
        if not self.redis_client:
            return

        try:
            cache_ttl = ttl or self.cache_ttl
            await self.redis_client.setex(
                cache_key, cache_ttl, json.dumps(data, default=str)
            )
            logger.info(f"Cached data for {cache_key}")
        except Exception as e:
            logger.warning(f"Cache storage error: {e}")

    def _check_circuit_breaker(self) -> bool:
        """Check if circuit breaker is open."""
        return self.circuit_breaker.get_state().value == "open"

    def _record_failure(self):
        """Record API failure - handled by circuit breaker."""
        pass  # Circuit breaker handles this automatically

    def _record_success(self):
        """Record successful API call - handled by circuit breaker."""
        pass  # Circuit breaker handles this automatically

    async def _make_api_request(
        self, endpoint: str, params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Make API request to Geoapify with error handling."""
        if self._check_circuit_breaker():
            error_context = ErrorContext(
                error_type="CircuitBreakerOpen",
                error_message="Maps API circuit breaker is open",
                severity=ErrorSeverity.HIGH,
                service_name="maps_service",
            )
            error_tracker.track_error(error_context)
            raise CircuitBreakerError("maps_api")

        params["apiKey"] = self.api_key
        url = f"{self.base_url}/{endpoint}"

        async def _make_request():
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, params=params, timeout=10) as response:
                        if response.status == 200:
                            data = await response.json()
                            return data
                        elif response.status == 401:
                            raise MapsAPIError("API request denied - check API key")
                        elif response.status == 400:
                            error_text = await response.text()
                            raise MapsAPIError(
                                f"Invalid request parameters: {error_text}"
                            )
                        elif response.status == 429:
                            raise MapsAPIError("API query limit exceeded")
                        else:
                            error_text = await response.text()
                            raise MapsAPIError(
                                f"HTTP error {response.status}: {error_text}"
                            )

            except asyncio.TimeoutError:
                raise MapsAPIError("API request timeout")
            except aiohttp.ClientError as e:
                raise MapsAPIError(f"Network error: {str(e)}")
            except MapsAPIError:
                raise
            except Exception as e:
                raise MapsAPIError(f"Unexpected error: {str(e)}")

        try:
            # Use circuit breaker and retry mechanism
            result = await self.circuit_breaker.call_async(
                retry_async, _make_request, config=self.retry_config
            )
            return result
        except MapsAPIError as e:
            # Track error
            error_context = ErrorContext(
                error_type=type(e).__name__,
                error_message=str(e),
                severity=ErrorSeverity.MEDIUM,
                service_name="maps_service",
                additional_context={"endpoint": endpoint, "params": params},
            )
            error_tracker.track_error(error_context)
            raise

    async def geocode(self, address: str) -> Location:
        """
        Convert address to geographic coordinates.

        Args:
            address: Address string to geocode

        Returns:
            Location object with coordinates and address components

        Raises:
            MapsAPIError: If geocoding fails
        """
        cache_key = self._generate_cache_key("geocode", address)

        # Try to get from cache
        cached_data = await self._get_cached_data(cache_key)
        if cached_data:
            return self._parse_location_from_geocode(cached_data)

        # Fetch from API
        try:
            params = {"text": address, "format": "json"}
            data = await self._make_api_request("geocode/search", params)

            if not data.get("results") or len(data["results"]) == 0:
                raise MapsAPIError(f"Location not found: {address}")

            # Cache the response
            await self._set_cached_data(cache_key, data)

            return self._parse_location_from_geocode(data)

        except MapsAPIError as e:
            logger.error(f"Failed to geocode address: {e}")
            raise

    async def reverse_geocode(self, latitude: float, longitude: float) -> Location:
        """
        Convert coordinates to address.

        Args:
            latitude: Latitude coordinate
            longitude: Longitude coordinate

        Returns:
            Location object with address information

        Raises:
            MapsAPIError: If reverse geocoding fails
        """
        latlng = f"{latitude},{longitude}"
        cache_key = self._generate_cache_key("reverse_geocode", latlng)

        # Try to get from cache
        cached_data = await self._get_cached_data(cache_key)
        if cached_data:
            return self._parse_location_from_reverse(cached_data)

        # Fetch from API
        try:
            params = {"lat": latitude, "lon": longitude, "format": "json"}
            data = await self._make_api_request("geocode/reverse", params)

            if not data.get("results") or len(data["results"]) == 0:
                raise MapsAPIError(f"Address not found for coordinates: {latlng}")

            # Cache the response
            await self._set_cached_data(cache_key, data)

            return self._parse_location_from_reverse(data)

        except MapsAPIError as e:
            logger.error(f"Failed to reverse geocode: {e}")
            raise

    async def autocomplete(self, text: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get address suggestions for autocomplete.

        Args:
            text: Search text (minimum 2 characters)
            limit: Maximum number of suggestions (default: 5)

        Returns:
            List of address suggestions with coordinates

        Raises:
            MapsAPIError: If autocomplete fails
        """
        if len(text) < 2:
            return []

        cache_key = self._generate_cache_key("autocomplete", f"{text}:{limit}")

        # Try to get from cache
        cached_data = await self._get_cached_data(cache_key)
        if cached_data:
            return cached_data

        # Fetch from API
        try:
            params = {"text": text, "limit": limit, "format": "json"}
            data = await self._make_api_request("geocode/autocomplete", params)

            if not data.get("results"):
                logger.warning(f"No autocomplete results for '{text}'")
                return []

            # Parse suggestions
            suggestions = []
            for idx, result in enumerate(data["results"]):
                # Debug logging to see actual structure
                if idx == 0:
                    logger.info(f"First autocomplete result structure: {result.keys()}")
                    logger.info(f"First result sample: {str(result)[:500]}")

                properties = result.get("properties", {})

                # Try both nested properties and direct fields
                suggestion = {
                    "address": properties.get("formatted", "")
                    or result.get("formatted", ""),
                    "latitude": properties.get("lat", 0) or result.get("lat", 0),
                    "longitude": properties.get("lon", 0) or result.get("lon", 0),
                    "district": properties.get("district", "")
                    or result.get("district", ""),
                    "state": properties.get("state", "") or result.get("state", ""),
                    "country": properties.get("country", "")
                    or result.get("country", ""),
                    "postal_code": properties.get("postcode", "")
                    or result.get("postcode", ""),
                    "place_id": properties.get("place_id", "")
                    or result.get("place_id", ""),
                }
                suggestions.append(suggestion)

            # Cache the response (shorter TTL for autocomplete)
            await self._set_cached_data(cache_key, suggestions, ttl=3600)  # 1 hour

            logger.info(
                f"Autocomplete returned {len(suggestions)} suggestions for '{text}'"
            )
            return suggestions

        except MapsAPIError as e:
            logger.error(f"Failed to autocomplete '{text}': {e}")
            # Re-raise the error instead of returning empty list
            raise

    def _parse_location_from_geocode(self, data: Dict[str, Any]) -> Location:
        """Parse geocoding API response into Location object."""
        if not data.get("results"):
            raise MapsAPIError("No results in geocoding response")

        result = data["results"][0]

        return Location(
            latitude=result.get("lat", 0.0),
            longitude=result.get("lon", 0.0),
            address=result.get("formatted", ""),
            district=result.get("county", ""),
            state=result.get("state", ""),
            country=result.get("country", ""),
            postal_code=result.get("postcode", ""),
        )

    def _parse_location_from_reverse(self, data: Dict[str, Any]) -> Location:
        """Parse reverse geocoding API response into Location object."""
        if not data.get("results"):
            raise MapsAPIError("No results in reverse geocoding response")

        result = data["results"][0]

        return Location(
            latitude=result.get("lat", 0.0),
            longitude=result.get("lon", 0.0),
            address=result.get("formatted", ""),
            district=result.get("county", ""),
            state=result.get("state", ""),
            country=result.get("country", ""),
            postal_code=result.get("postcode", ""),
        )

    async def calculate_distance(
        self,
        origin: Location,
        destination: Location,
        mode: TravelMode = TravelMode.DRIVE,
    ) -> DistanceInfo:
        """
        Calculate distance and duration between two locations.

        Args:
            origin: Starting location
            destination: Destination location
            mode: Travel mode (drive, walk, bicycle, etc.)

        Returns:
            DistanceInfo object with distance and duration

        Raises:
            MapsAPIError: If distance calculation fails
        """
        origin_str = f"{origin.latitude},{origin.longitude}"
        destination_str = f"{destination.latitude},{destination.longitude}"
        cache_params = f"{origin_str}|{destination_str}|{mode.value}"
        cache_key = self._generate_cache_key("distance", cache_params)

        # Try to get from cache
        cached_data = await self._get_cached_data(cache_key)
        if cached_data:
            return self._parse_distance_info(cached_data, mode)

        # Fetch from API using Route Matrix
        try:
            # Geoapify Route Matrix API (requires POST)
            body = {
                "mode": mode.value,
                "sources": [{"location": [origin.longitude, origin.latitude]}],
                "targets": [
                    {"location": [destination.longitude, destination.latitude]}
                ],
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
                        raise MapsAPIError(f"Route matrix error: {error_text}")

            # Cache the response (shorter TTL for distance data)
            await self._set_cached_data(cache_key, data, ttl=3600)  # 1 hour

            return self._parse_distance_info(data, mode)

        except MapsAPIError as e:
            logger.error(f"Failed to calculate distance: {e}")
            raise

    def _parse_distance_info(
        self, data: Dict[str, Any], mode: TravelMode
    ) -> DistanceInfo:
        """Parse route matrix API response into DistanceInfo object."""
        sources_to_targets = data.get("sources_to_targets", [[]])

        if not sources_to_targets or not sources_to_targets[0]:
            raise MapsAPIError("No distance data in response")

        element = sources_to_targets[0][0]

        distance_meters = element.get("distance", 0)
        duration_seconds = element.get("time", 0)

        # Format distance text
        if distance_meters < 1000:
            distance_text = f"{distance_meters:.0f} m"
        else:
            distance_text = f"{distance_meters / 1000:.1f} km"

        # Format duration text
        if duration_seconds < 60:
            duration_text = f"{duration_seconds:.0f} sec"
        elif duration_seconds < 3600:
            duration_text = f"{duration_seconds / 60:.0f} min"
        else:
            hours = duration_seconds / 3600
            minutes = (duration_seconds % 3600) / 60
            duration_text = f"{hours:.0f} hr {minutes:.0f} min"

        return DistanceInfo(
            distance_meters=distance_meters,
            distance_text=distance_text,
            duration_seconds=duration_seconds,
            duration_text=duration_text,
            travel_mode=mode,
        )

    async def get_route(
        self,
        origin: Location,
        destination: Location,
        mode: TravelMode = TravelMode.DRIVE,
    ) -> RouteInfo:
        """
        Get detailed route information between two locations.

        Args:
            origin: Starting location
            destination: Destination location
            mode: Travel mode

        Returns:
            RouteInfo object with route details

        Raises:
            MapsAPIError: If route calculation fails
        """
        origin_str = f"{origin.latitude},{origin.longitude}"
        destination_str = f"{destination.latitude},{destination.longitude}"
        cache_params = f"{origin_str}|{destination_str}|{mode.value}"
        cache_key = self._generate_cache_key("directions", cache_params)

        # Try to get from cache
        cached_data = await self._get_cached_data(cache_key)
        if cached_data:
            return self._parse_route_info(cached_data, origin, destination, mode)

        # Fetch from API
        try:
            params = {
                "waypoints": f"{origin.latitude},{origin.longitude}|{destination.latitude},{destination.longitude}",
                "mode": mode.value,
                "details": "instruction_details",
            }
            data = await self._make_api_request("routing", params)

            if not data.get("features") or len(data["features"]) == 0:
                raise MapsAPIError("No route found between locations")

            # Cache the response (shorter TTL for route data)
            await self._set_cached_data(cache_key, data, ttl=3600)  # 1 hour

            return self._parse_route_info(data, origin, destination, mode)

        except MapsAPIError as e:
            logger.error(f"Failed to get route: {e}")
            raise

    def _parse_route_info(
        self,
        data: Dict[str, Any],
        origin: Location,
        destination: Location,
        mode: TravelMode,
    ) -> RouteInfo:
        """Parse routing API response into RouteInfo object."""
        features = data.get("features", [])
        if not features:
            raise MapsAPIError("No routes in response")

        feature = features[0]
        properties = feature.get("properties", {})

        distance_meters = properties.get("distance", 0)
        duration_seconds = properties.get("time", 0)

        # Format distance text
        if distance_meters < 1000:
            distance_text = f"{distance_meters:.0f} m"
        else:
            distance_text = f"{distance_meters / 1000:.1f} km"

        # Format duration text
        if duration_seconds < 60:
            duration_text = f"{duration_seconds:.0f} sec"
        elif duration_seconds < 3600:
            duration_text = f"{duration_seconds / 60:.0f} min"
        else:
            hours = duration_seconds / 3600
            minutes = (duration_seconds % 3600) / 60
            duration_text = f"{hours:.0f} hr {minutes:.0f} min"

        distance_info = DistanceInfo(
            distance_meters=distance_meters,
            distance_text=distance_text,
            duration_seconds=duration_seconds,
            duration_text=duration_text,
            travel_mode=mode,
        )

        # Extract step-by-step instructions
        steps = []
        legs = properties.get("legs", [])
        for leg in legs:
            leg_steps = leg.get("steps", [])
            for step in leg_steps:
                instruction = step.get("instruction", {}).get("text", "")
                if instruction:
                    steps.append(instruction)

        # Get polyline from geometry
        geometry = feature.get("geometry", {})
        coordinates = geometry.get("coordinates", [])
        # Convert coordinates to encoded polyline format (simplified)
        polyline = json.dumps(coordinates)

        return RouteInfo(
            origin=origin,
            destination=destination,
            distance_info=distance_info,
            polyline=polyline,
            steps=steps,
        )

    async def validate_location(self, location: Location) -> bool:
        """
        Validate if a location is valid and accessible.

        Args:
            location: Location to validate

        Returns:
            True if location is valid, False otherwise
        """
        try:
            # Try reverse geocoding to validate coordinates
            validated_location = await self.reverse_geocode(
                location.latitude, location.longitude
            )
            return validated_location.address != ""
        except MapsAPIError:
            return False

    async def search_nearby_places(
        self,
        location: Location,
        keyword: str,
        radius: int = 50000,  # 50km default
        place_type: str = "",
    ) -> List[Dict[str, Any]]:
        """
        Search for nearby places using Geoapify Places API.

        Args:
            location: Center location for search
            keyword: Search keyword (e.g., "mandi", "market")
            radius: Search radius in meters (max 50000)
            place_type: Place type filter (categories)

        Returns:
            List of place results

        Raises:
            MapsAPIError: If search fails
        """
        location_str = f"{location.latitude},{location.longitude}"
        cache_params = f"{location_str}|{keyword}|{radius}|{place_type}"
        cache_key = self._generate_cache_key("places", cache_params)

        # Try to get from cache
        cached_data = await self._get_cached_data(cache_key)
        if cached_data:
            return cached_data.get("features", [])

        # Fetch from API
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
            data = await self._make_api_request("../v2/places", params)

            # Cache the response (shorter TTL for place data)
            await self._set_cached_data(cache_key, data, ttl=7200)  # 2 hours

            return data.get("features", [])

        except MapsAPIError as e:
            logger.error(f"Failed to search nearby places: {e}")
            raise

    async def find_nearest_mandis(
        self, location: Location, max_results: int = 10, max_distance_km: float = 100.0
    ) -> List[MandiInfo]:
        """
        Find nearest mandis (markets) to a given location.

        Args:
            location: User's location
            max_results: Maximum number of results to return
            max_distance_km: Maximum distance to search (in km)

        Returns:
            List of MandiInfo objects sorted by distance

        Raises:
            MapsAPIError: If search fails
        """
        try:
            # Search for mandis using multiple keywords
            keywords = [
                "mandi",
                "market",
                "agricultural market",
                "krishi mandi",
                "wholesale market",
            ]
            all_places = []

            for keyword in keywords:
                places = await self.search_nearby_places(
                    location, keyword, radius=int(max_distance_km * 1000)
                )
                all_places.extend(places)

            # Remove duplicates based on place_id
            unique_places = {}
            for place in all_places:
                place_id = place.get("properties", {}).get("place_id", "")
                if place_id and place_id not in unique_places:
                    unique_places[place_id] = place

            places = list(unique_places.values())

            # Convert to MandiInfo objects with distance calculation
            mandis = []
            for place in places:
                properties = place.get("properties", {})
                geometry = place.get("geometry", {})
                coordinates = geometry.get("coordinates", [0, 0])

                place_location = Location(
                    latitude=coordinates[1] if len(coordinates) > 1 else 0,
                    longitude=coordinates[0] if len(coordinates) > 0 else 0,
                    address=properties.get("formatted", ""),
                )

                # Calculate distance
                try:
                    distance_info = await self.calculate_distance(
                        location, place_location, TravelMode.DRIVE
                    )
                    distance_km = distance_info.distance_meters / 1000

                    # Filter by max distance
                    if distance_km > max_distance_km:
                        continue

                    # Estimate transport cost
                    transport_cost = distance_km * self.transport_cost_per_km

                    mandi = MandiInfo(
                        name=properties.get("name", "Unknown Market"),
                        location=place_location,
                        distance_km=distance_km,
                        distance_info=distance_info,
                        place_id=properties.get("place_id", ""),
                        rating=0.0,  # Geoapify doesn't provide ratings
                        is_open=True,  # Default to open
                        transport_cost_estimate=transport_cost,
                    )
                    mandis.append(mandi)

                except MapsAPIError as e:
                    logger.warning(
                        f"Failed to calculate distance for {properties.get('name')}: {e}"
                    )
                    continue

            # Sort by distance
            mandis.sort(key=lambda m: m.distance_km)

            # Return top results
            return mandis[:max_results]

        except MapsAPIError as e:
            logger.error(f"Failed to find nearest mandis: {e}")
            raise

    def calculate_haversine_distance(self, loc1: Location, loc2: Location) -> float:
        """
        Calculate straight-line distance between two locations using Haversine formula.

        Args:
            loc1: First location
            loc2: Second location

        Returns:
            Distance in kilometers
        """
        from math import radians, sin, cos, sqrt, atan2

        # Earth radius in kilometers
        R = 6371.0

        lat1 = radians(loc1.latitude)
        lon1 = radians(loc1.longitude)
        lat2 = radians(loc2.latitude)
        lon2 = radians(loc2.longitude)

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        distance = R * c
        return distance


# Global maps service instance
_maps_service: Optional[MapsService] = None


async def get_maps_service() -> MapsService:
    """Get or create maps service instance."""
    global _maps_service

    if _maps_service is None:
        _maps_service = MapsService()
        await _maps_service.initialize()

    return _maps_service


async def close_maps_service():
    """Close maps service and cleanup resources."""
    global _maps_service

    if _maps_service:
        await _maps_service.close()
        _maps_service = None
