"""
Weather service for the AI-Driven Agri-Civic Intelligence Platform.

This service provides comprehensive weather data integration with OpenWeatherMap API,
including caching, error handling, and agricultural insights generation.
"""

import asyncio
import logging
import time
from enum import Enum
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import hashlib
import json

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
    FallbackStrategy,
    with_fallback_async,
    ErrorContext,
    ErrorSeverity,
    error_tracker,
)
from app.services.maps_service import get_maps_service

# Configure logging
logger = get_logger(__name__)


class WeatherProvider(str, Enum):
    """Supported weather API providers."""

    OPENWEATHERMAP = "openweathermap"


class AlertSeverity(str, Enum):
    """Weather alert severity levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Location:
    """Location data model."""

    latitude: float
    longitude: float
    address: str = ""
    district: str = ""
    state: str = ""


@dataclass
class DailyForecast:
    """Daily weather forecast data."""

    date: str
    temperature_min: float
    temperature_max: float
    humidity: float
    rainfall_probability: float
    weather_description: str
    wind_speed: float


@dataclass
class WeatherAlert:
    """Weather alert data model."""

    alert_type: str
    severity: AlertSeverity
    message: str
    start_time: datetime
    end_time: datetime
    agricultural_impact: str


@dataclass
class WeatherData:
    """Comprehensive weather data model."""

    temperature: float
    feels_like: float
    humidity: float
    pressure: float
    wind_speed: float
    wind_direction: int
    rainfall_prediction: float
    weather_description: str
    weather_alerts: List[WeatherAlert] = field(default_factory=list)
    forecast: List[DailyForecast] = field(default_factory=list)
    agricultural_insights: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)
    location: Optional[Location] = None


class WeatherAPIError(Exception):
    """Custom exception for weather API errors."""

    pass


class WeatherService:
    """
    Weather service integrating with OpenWeatherMap API.

    Features:
    - Real-time weather data retrieval
    - Multi-day forecasts
    - Weather alert generation
    - Agricultural insights based on weather conditions
    - Redis caching for performance
    - Circuit breaker pattern for resilience
    """

    def __init__(self):
        """Initialize weather service with configuration."""
        self.settings = get_settings()
        self.api_key = self.settings.openweather_api_key
        self.base_url = "https://api.openweathermap.org/data/2.5"
        self.cache_ttl = 1800  # 30 minutes cache
        self.redis_client: Optional[redis.Redis] = None

        # Initialize circuit breaker with configuration
        self.circuit_breaker = CircuitBreaker(
            name="weather_api",
            config=CircuitBreakerConfig(
                failure_threshold=5,
                success_threshold=2,
                timeout_seconds=60,
                expected_exception=WeatherAPIError,
            ),
        )

        # Retry configuration
        self.retry_config = RetryConfig(
            max_attempts=3, initial_delay=1.0, max_delay=10.0, exponential_base=2.0
        )

    async def initialize(self):
        """Initialize Redis connection for caching."""
        try:
            self.redis_client = redis.from_url(
                self.settings.redis_url, encoding="utf-8", decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Weather service Redis connection established")
        except Exception as e:
            logger.warning(f"Redis connection failed, caching disabled: {e}")
            self.redis_client = None

    async def close(self):
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()

    def _generate_cache_key(self, location: Location, data_type: str) -> str:
        """Generate cache key for weather data."""
        location_str = f"{location.latitude},{location.longitude}"
        location_hash = hashlib.md5(location_str.encode()).hexdigest()
        return f"weather:{data_type}:{location_hash}"

    async def _get_cached_data(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached weather data."""
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

    async def _set_cached_data(self, cache_key: str, data: Dict[str, Any]):
        """Store weather data in cache."""
        if not self.redis_client:
            return

        try:
            await self.redis_client.setex(
                cache_key, self.cache_ttl, json.dumps(data, default=str)
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
        """Make API request to OpenWeatherMap with error handling."""
        if self._check_circuit_breaker():
            error_context = ErrorContext(
                error_type="CircuitBreakerOpen",
                error_message="Weather API circuit breaker is open",
                severity=ErrorSeverity.HIGH,
                service_name="weather_service",
            )
            error_tracker.track_error(error_context)
            raise CircuitBreakerError("weather_api")

        params["appid"] = self.api_key
        params["units"] = "metric"  # Use metric units

        url = f"{self.base_url}/{endpoint}"

        async def _make_request():
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url, params=params, timeout=10) as response:
                        if response.status == 200:
                            return await response.json()
                        elif response.status == 401:
                            raise WeatherAPIError("Invalid API key")
                        elif response.status == 404:
                            raise WeatherAPIError("Location not found")
                        else:
                            error_text = await response.text()
                            raise WeatherAPIError(
                                f"API error {response.status}: {error_text}"
                            )

            except asyncio.TimeoutError:
                raise WeatherAPIError("API request timeout")
            except aiohttp.ClientError as e:
                raise WeatherAPIError(f"Network error: {str(e)}")
            except WeatherAPIError:
                raise
            except Exception as e:
                raise WeatherAPIError(f"Unexpected error: {str(e)}")

        try:
            # Use circuit breaker and retry mechanism
            result = await self.circuit_breaker.call_async(
                retry_async, _make_request, config=self.retry_config
            )
            return result
        except WeatherAPIError as e:
            # Track error
            error_context = ErrorContext(
                error_type=type(e).__name__,
                error_message=str(e),
                severity=ErrorSeverity.MEDIUM,
                service_name="weather_service",
                additional_context={"endpoint": endpoint, "params": params},
            )
            error_tracker.track_error(error_context)
            raise

    def _generate_agricultural_insights(
        self, weather_data: Dict[str, Any]
    ) -> List[str]:
        """Generate agricultural insights based on weather conditions."""
        insights = []

        # Temperature insights
        temp = weather_data.get("main", {}).get("temp", 0)
        if temp > 35:
            insights.append(
                "High temperature alert: Increase irrigation frequency and provide shade for sensitive crops"
            )
        elif temp > 30:
            insights.append(
                "Warm weather: Monitor crop water needs and consider evening irrigation"
            )
        elif temp < 10:
            insights.append(
                "Low temperature warning: Protect crops from frost damage, consider covering sensitive plants"
            )
        elif temp < 15:
            insights.append(
                "Cool weather: Reduce irrigation frequency and monitor for cold-sensitive crops"
            )
        else:
            insights.append(
                "Moderate temperature: Ideal conditions for most crop activities"
            )

        # Humidity insights
        humidity = weather_data.get("main", {}).get("humidity", 0)
        if humidity > 80:
            insights.append(
                "High humidity: Monitor for fungal diseases, ensure good air circulation"
            )
        elif humidity > 60:
            insights.append(
                "Moderate to high humidity: Good for crop growth, watch for disease signs"
            )
        elif humidity < 30:
            insights.append(
                "Low humidity: Increase irrigation, consider mulching to retain soil moisture"
            )
        elif humidity < 50:
            insights.append("Moderate humidity: Monitor soil moisture levels regularly")

        # Wind insights
        wind_speed = weather_data.get("wind", {}).get("speed", 0)
        if wind_speed > 10:
            insights.append(
                "Strong winds expected: Secure tall crops and protect young plants"
            )
        elif wind_speed > 5:
            insights.append(
                "Moderate winds: Good for pollination but monitor young plants"
            )

        # Rain insights
        rain = weather_data.get("rain", {}).get("1h", 0)
        if rain > 10:
            insights.append(
                "Heavy rainfall expected: Ensure proper drainage, delay pesticide application"
            )
        elif rain > 0:
            insights.append(
                "Light rainfall expected: Good time for transplanting, reduce irrigation"
            )

        # Weather condition insights
        weather_main = weather_data.get("weather", [{}])[0].get("main", "")
        if weather_main == "Thunderstorm":
            insights.append("Thunderstorm warning: Avoid field work, protect livestock")
        elif weather_main == "Clear":
            insights.append("Clear weather: Ideal for harvesting and field operations")
        elif weather_main == "Rain":
            insights.append(
                "Rainy conditions: Delay spraying operations, check drainage systems"
            )
        elif weather_main == "Clouds":
            insights.append(
                "Cloudy weather: Reduced evaporation, adjust irrigation accordingly"
            )
        elif weather_main in ["Haze", "Mist", "Fog"]:
            insights.append(
                "Reduced visibility: Exercise caution during field operations"
            )

        return insights

    def _generate_weather_alerts(
        self,
        current_weather: Dict[str, Any],
        forecast_data: Optional[Dict[str, Any]] = None,
    ) -> List[WeatherAlert]:
        """Generate weather alerts based on conditions."""
        alerts = []

        # Temperature alerts
        temp = current_weather.get("main", {}).get("temp", 0)
        if temp > 40:
            alerts.append(
                WeatherAlert(
                    alert_type="extreme_heat",
                    severity=AlertSeverity.CRITICAL,
                    message="Extreme heat warning: Temperature above 40°C",
                    start_time=datetime.now(),
                    end_time=datetime.now() + timedelta(hours=12),
                    agricultural_impact="High risk of crop stress and water loss",
                )
            )
        elif temp < 5:
            alerts.append(
                WeatherAlert(
                    alert_type="frost_warning",
                    severity=AlertSeverity.HIGH,
                    message="Frost warning: Temperature below 5°C",
                    start_time=datetime.now(),
                    end_time=datetime.now() + timedelta(hours=12),
                    agricultural_impact="Risk of frost damage to crops",
                )
            )

        # Wind alerts
        wind_speed = current_weather.get("wind", {}).get("speed", 0)
        if wind_speed > 15:
            alerts.append(
                WeatherAlert(
                    alert_type="high_wind",
                    severity=AlertSeverity.MEDIUM,
                    message=f"High wind alert: Wind speed {wind_speed} m/s",
                    start_time=datetime.now(),
                    end_time=datetime.now() + timedelta(hours=6),
                    agricultural_impact="Risk of crop damage and lodging",
                )
            )

        # Rain alerts
        rain = current_weather.get("rain", {}).get("1h", 0)
        if rain > 20:
            alerts.append(
                WeatherAlert(
                    alert_type="heavy_rain",
                    severity=AlertSeverity.HIGH,
                    message=f"Heavy rainfall alert: {rain}mm expected",
                    start_time=datetime.now(),
                    end_time=datetime.now() + timedelta(hours=3),
                    agricultural_impact="Risk of waterlogging and soil erosion",
                )
            )

        return alerts

    async def _enrich_location_with_address(self, location: Location) -> Location:
        """
        Enrich location with address information using reverse geocoding.

        Args:
            location: Location object with coordinates

        Returns:
            Location object with populated address fields
        """
        # If address is already populated, return as-is
        if location.address and location.address.strip():
            return location

        try:
            # Get maps service and perform reverse geocoding
            maps_service = await get_maps_service()
            enriched_location = await maps_service.reverse_geocode(
                location.latitude, location.longitude
            )

            # Update the original location with address information
            location.address = enriched_location.address
            location.district = enriched_location.district
            location.state = enriched_location.state

            logger.info(f"Enriched location with address: {location.address}")
            return location

        except Exception as e:
            logger.warning(
                f"Failed to enrich location with address: {e}. Using coordinates only."
            )
            # Return original location if reverse geocoding fails
            return location

    async def get_current_weather(self, location: Location) -> WeatherData:
        """
        Get current weather data for a location.

        Args:
            location: Location object with latitude and longitude

        Returns:
            WeatherData object with current weather information

        Raises:
            WeatherAPIError: If API request fails
        """
        # Enrich location with address if not provided
        location = await self._enrich_location_with_address(location)

        cache_key = self._generate_cache_key(location, "current")

        # Try to get from cache
        cached_data = await self._get_cached_data(cache_key)
        if cached_data:
            return self._parse_weather_data(cached_data, location)

        # Fetch from API with fallback strategy
        async def fetch_weather():
            params = {"lat": location.latitude, "lon": location.longitude}
            data = await self._make_api_request("weather", params)
            # Cache the response
            await self._set_cached_data(cache_key, data)
            return self._parse_weather_data(data, location)

        # Define fallback function that uses stale cache
        async def fallback_to_stale_cache():
            # Try to get stale cached data
            if self.redis_client:
                try:
                    # Get data without TTL check
                    stale_data = await self.redis_client.get(cache_key)
                    if stale_data:
                        logger.warning(
                            f"Using stale cached weather data for {location.address}"
                        )
                        return self._parse_weather_data(
                            json.loads(stale_data), location
                        )
                except Exception as e:
                    logger.error(f"Failed to retrieve stale cache: {e}")
            return None

        try:
            return await fetch_weather()
        except (WeatherAPIError, CircuitBreakerError) as e:
            logger.error(f"Failed to fetch weather data: {e}")
            # Try fallback to stale cache
            fallback_result = await fallback_to_stale_cache()
            if fallback_result:
                return fallback_result
            raise

    def _parse_weather_data(
        self, data: Dict[str, Any], location: Location
    ) -> WeatherData:
        """Parse OpenWeatherMap API response into WeatherData object."""
        main = data.get("main", {})
        wind = data.get("wind", {})
        weather = data.get("weather", [{}])[0]
        rain = data.get("rain", {})

        # Generate insights and alerts
        insights = self._generate_agricultural_insights(data)
        alerts = self._generate_weather_alerts(data)

        return WeatherData(
            temperature=main.get("temp", 0),
            feels_like=main.get("feels_like", 0),
            humidity=main.get("humidity", 0),
            pressure=main.get("pressure", 0),
            wind_speed=wind.get("speed", 0),
            wind_direction=wind.get("deg", 0),
            rainfall_prediction=rain.get("1h", 0),
            weather_description=weather.get("description", ""),
            weather_alerts=alerts,
            agricultural_insights=insights,
            location=location,
        )

    async def get_forecast(
        self, location: Location, days: int = 5
    ) -> List[DailyForecast]:
        """
        Get weather forecast for a location.

        Args:
            location: Location object with latitude and longitude
            days: Number of days to forecast (max 5 for free tier)

        Returns:
            List of DailyForecast objects

        Raises:
            WeatherAPIError: If API request fails
        """
        # Enrich location with address if not provided
        location = await self._enrich_location_with_address(location)

        cache_key = self._generate_cache_key(location, f"forecast_{days}")

        # Try to get from cache
        cached_data = await self._get_cached_data(cache_key)
        if cached_data:
            return self._parse_forecast_data(cached_data)

        # Fetch from API
        try:
            params = {
                "lat": location.latitude,
                "lon": location.longitude,
                "cnt": days * 8,  # 8 data points per day (3-hour intervals)
            }

            data = await self._make_api_request("forecast", params)

            # Cache the response
            await self._set_cached_data(cache_key, data)

            return self._parse_forecast_data(data)

        except WeatherAPIError as e:
            logger.error(f"Failed to fetch forecast data: {e}")
            raise

    def _parse_forecast_data(self, data: Dict[str, Any]) -> List[DailyForecast]:
        """Parse forecast API response into DailyForecast objects."""
        forecasts = []
        daily_data = {}

        # Group forecast data by day
        for item in data.get("list", []):
            date = datetime.fromtimestamp(item["dt"]).strftime("%Y-%m-%d")

            if date not in daily_data:
                daily_data[date] = {
                    "temps": [],
                    "humidity": [],
                    "rain_prob": [],
                    "descriptions": [],
                    "wind_speeds": [],
                }

            daily_data[date]["temps"].append(item["main"]["temp"])
            daily_data[date]["humidity"].append(item["main"]["humidity"])
            daily_data[date]["rain_prob"].append(item.get("pop", 0) * 100)
            daily_data[date]["descriptions"].append(item["weather"][0]["description"])
            daily_data[date]["wind_speeds"].append(item["wind"]["speed"])

        # Create DailyForecast objects
        for date, values in daily_data.items():
            forecasts.append(
                DailyForecast(
                    date=date,
                    temperature_min=min(values["temps"]),
                    temperature_max=max(values["temps"]),
                    humidity=sum(values["humidity"]) / len(values["humidity"]),
                    rainfall_probability=max(values["rain_prob"]),
                    weather_description=max(
                        set(values["descriptions"]), key=values["descriptions"].count
                    ),
                    wind_speed=sum(values["wind_speeds"]) / len(values["wind_speeds"]),
                )
            )

        return forecasts

    async def get_weather_with_forecast(self, location: Location) -> WeatherData:
        """
        Get comprehensive weather data including current conditions and forecast.

        Args:
            location: Location object with latitude and longitude

        Returns:
            WeatherData object with current weather and forecast
        """
        # Enrich location with address if not provided
        location = await self._enrich_location_with_address(location)

        try:
            # Fetch both current weather and forecast
            current_weather = await self.get_current_weather(location)
            forecast = await self.get_forecast(location)

            # Add forecast to weather data
            current_weather.forecast = forecast

            return current_weather

        except WeatherAPIError as e:
            logger.error(f"Failed to fetch comprehensive weather data: {e}")
            raise

    async def process_weather_query(
        self, location: Location, query_type: str = "current"
    ) -> WeatherData:
        """
        Process weather query based on type.

        Args:
            location: Location object
            query_type: Type of query ("current", "forecast", "comprehensive")

        Returns:
            WeatherData object
        """
        # Enrich location with address if not provided
        location = await self._enrich_location_with_address(location)

        if query_type == "forecast":
            weather_data = WeatherData(
                temperature=0,
                feels_like=0,
                humidity=0,
                pressure=0,
                wind_speed=0,
                wind_direction=0,
                rainfall_prediction=0,
                weather_description="",
                location=location,
            )
            weather_data.forecast = await self.get_forecast(location)
            return weather_data
        elif query_type == "comprehensive":
            return await self.get_weather_with_forecast(location)
        else:
            return await self.get_current_weather(location)


# Global weather service instance
_weather_service: Optional[WeatherService] = None


async def get_weather_service() -> WeatherService:
    """Get or create weather service instance."""
    global _weather_service

    if _weather_service is None:
        _weather_service = WeatherService()
        await _weather_service.initialize()

    return _weather_service


async def close_weather_service():
    """Close weather service and cleanup resources."""
    global _weather_service

    if _weather_service:
        await _weather_service.close()
        _weather_service = None
