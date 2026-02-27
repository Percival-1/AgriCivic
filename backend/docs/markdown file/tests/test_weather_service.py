"""
Unit tests for weather service.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
import json

from app.services.weather_service import (
    WeatherService,
    WeatherData,
    Location,
    DailyForecast,
    WeatherAlert,
    AlertSeverity,
    WeatherAPIError,
    get_weather_service,
    close_weather_service,
)


@pytest.fixture
def sample_location():
    """Sample location for testing."""
    return Location(
        latitude=28.6139,
        longitude=77.2090,
        address="New Delhi",
        district="New Delhi",
        state="Delhi",
    )


@pytest.fixture
def sample_weather_response():
    """Sample OpenWeatherMap API response."""
    return {
        "main": {"temp": 30.5, "feels_like": 32.0, "humidity": 65, "pressure": 1013},
        "wind": {"speed": 5.5, "deg": 180},
        "weather": [{"main": "Clear", "description": "clear sky"}],
        "rain": {"1h": 0},
    }


@pytest.fixture
def sample_forecast_response():
    """Sample forecast API response."""
    return {
        "list": [
            {
                "dt": 1609459200,
                "main": {"temp": 25.0, "humidity": 60},
                "weather": [{"description": "partly cloudy"}],
                "wind": {"speed": 4.0},
                "pop": 0.2,
            },
            {
                "dt": 1609470000,
                "main": {"temp": 28.0, "humidity": 55},
                "weather": [{"description": "clear sky"}],
                "wind": {"speed": 3.5},
                "pop": 0.1,
            },
        ]
    }


@pytest.fixture
async def weather_service():
    """Create weather service instance for testing."""
    service = WeatherService()
    service.api_key = "test_api_key"
    # Mock Redis client
    service.redis_client = AsyncMock()
    service.redis_client.get = AsyncMock(return_value=None)
    service.redis_client.setex = AsyncMock()
    yield service
    await service.close()


class TestWeatherService:
    """Test suite for WeatherService."""

    @pytest.mark.asyncio
    async def test_initialization(self):
        """Test weather service initialization."""
        service = WeatherService()
        assert service.api_key is not None
        assert service.base_url == "https://api.openweathermap.org/data/2.5"
        assert service.cache_ttl == 1800
        assert service.failure_threshold == 5

    @pytest.mark.asyncio
    async def test_cache_key_generation(self, weather_service, sample_location):
        """Test cache key generation."""
        cache_key = weather_service._generate_cache_key(sample_location, "current")
        assert cache_key.startswith("weather:current:")
        assert len(cache_key) > 20

    @pytest.mark.asyncio
    async def test_agricultural_insights_high_temp(self, weather_service):
        """Test agricultural insights for high temperature."""
        weather_data = {
            "main": {"temp": 38, "humidity": 50},
            "wind": {"speed": 5},
            "rain": {},
            "weather": [{"main": "Clear"}],
        }

        insights = weather_service._generate_agricultural_insights(weather_data)
        assert len(insights) > 0
        assert any("temperature" in insight.lower() for insight in insights)

    @pytest.mark.asyncio
    async def test_agricultural_insights_high_humidity(self, weather_service):
        """Test agricultural insights for high humidity."""
        weather_data = {
            "main": {"temp": 25, "humidity": 85},
            "wind": {"speed": 3},
            "rain": {},
            "weather": [{"main": "Clouds"}],
        }

        insights = weather_service._generate_agricultural_insights(weather_data)
        assert len(insights) > 0
        assert any("humidity" in insight.lower() for insight in insights)

    @pytest.mark.asyncio
    async def test_agricultural_insights_heavy_rain(self, weather_service):
        """Test agricultural insights for heavy rain."""
        weather_data = {
            "main": {"temp": 25, "humidity": 70},
            "wind": {"speed": 5},
            "rain": {"1h": 15},
            "weather": [{"main": "Rain"}],
        }

        insights = weather_service._generate_agricultural_insights(weather_data)
        assert len(insights) > 0
        assert any("rain" in insight.lower() for insight in insights)

    @pytest.mark.asyncio
    async def test_weather_alerts_extreme_heat(self, weather_service):
        """Test weather alert generation for extreme heat."""
        weather_data = {
            "main": {"temp": 42, "humidity": 40},
            "wind": {"speed": 5},
            "rain": {},
        }

        alerts = weather_service._generate_weather_alerts(weather_data)
        assert len(alerts) > 0
        assert any(alert.alert_type == "extreme_heat" for alert in alerts)
        assert any(alert.severity == AlertSeverity.CRITICAL for alert in alerts)

    @pytest.mark.asyncio
    async def test_weather_alerts_frost_warning(self, weather_service):
        """Test weather alert generation for frost."""
        weather_data = {
            "main": {"temp": 3, "humidity": 60},
            "wind": {"speed": 2},
            "rain": {},
        }

        alerts = weather_service._generate_weather_alerts(weather_data)
        assert len(alerts) > 0
        assert any(alert.alert_type == "frost_warning" for alert in alerts)

    @pytest.mark.asyncio
    async def test_weather_alerts_high_wind(self, weather_service):
        """Test weather alert generation for high wind."""
        weather_data = {
            "main": {"temp": 25, "humidity": 50},
            "wind": {"speed": 18},
            "rain": {},
        }

        alerts = weather_service._generate_weather_alerts(weather_data)
        assert len(alerts) > 0
        assert any(alert.alert_type == "high_wind" for alert in alerts)

    @pytest.mark.asyncio
    async def test_parse_weather_data(
        self, weather_service, sample_weather_response, sample_location
    ):
        """Test parsing of weather API response."""
        weather_data = weather_service._parse_weather_data(
            sample_weather_response, sample_location
        )

        assert isinstance(weather_data, WeatherData)
        assert weather_data.temperature == 30.5
        assert weather_data.humidity == 65
        assert weather_data.wind_speed == 5.5
        assert weather_data.weather_description == "clear sky"
        assert weather_data.location == sample_location

    @pytest.mark.asyncio
    async def test_parse_forecast_data(self, weather_service, sample_forecast_response):
        """Test parsing of forecast API response."""
        forecasts = weather_service._parse_forecast_data(sample_forecast_response)

        assert len(forecasts) > 0
        assert isinstance(forecasts[0], DailyForecast)
        assert forecasts[0].temperature_min > 0
        assert forecasts[0].temperature_max > 0

    @pytest.mark.asyncio
    async def test_circuit_breaker_opens(self, weather_service):
        """Test circuit breaker opens after failures."""
        # Record multiple failures
        for _ in range(weather_service.failure_threshold):
            weather_service._record_failure()

        assert weather_service.circuit_open is True
        assert weather_service._check_circuit_breaker() is True

    @pytest.mark.asyncio
    async def test_circuit_breaker_closes_after_timeout(self, weather_service):
        """Test circuit breaker closes after timeout."""
        # Open circuit breaker
        for _ in range(weather_service.failure_threshold):
            weather_service._record_failure()

        assert weather_service.circuit_open is True

        # Simulate timeout
        weather_service.last_failure_time = 0

        # Check should close circuit
        is_open = weather_service._check_circuit_breaker()
        assert is_open is False
        assert weather_service.circuit_open is False

    @pytest.mark.asyncio
    async def test_get_current_weather_success(
        self, weather_service, sample_location, sample_weather_response
    ):
        """Test successful current weather retrieval."""
        # Mock API request
        weather_service._make_api_request = AsyncMock(
            return_value=sample_weather_response
        )

        weather_data = await weather_service.get_current_weather(sample_location)

        assert isinstance(weather_data, WeatherData)
        assert weather_data.temperature == 30.5
        assert weather_data.location == sample_location

    @pytest.mark.asyncio
    async def test_get_current_weather_with_cache(
        self, weather_service, sample_location, sample_weather_response
    ):
        """Test current weather retrieval from cache."""
        # Mock cache hit
        weather_service.redis_client.get = AsyncMock(
            return_value=json.dumps(sample_weather_response)
        )

        weather_data = await weather_service.get_current_weather(sample_location)

        assert isinstance(weather_data, WeatherData)
        assert weather_data.temperature == 30.5

    @pytest.mark.asyncio
    async def test_get_current_weather_api_error(
        self, weather_service, sample_location
    ):
        """Test weather retrieval with API error."""
        # Mock API error
        weather_service._make_api_request = AsyncMock(
            side_effect=WeatherAPIError("API error")
        )

        with pytest.raises(WeatherAPIError):
            await weather_service.get_current_weather(sample_location)

    @pytest.mark.asyncio
    async def test_get_forecast_success(
        self, weather_service, sample_location, sample_forecast_response
    ):
        """Test successful forecast retrieval."""
        # Mock API request
        weather_service._make_api_request = AsyncMock(
            return_value=sample_forecast_response
        )

        forecasts = await weather_service.get_forecast(sample_location)

        assert len(forecasts) > 0
        assert isinstance(forecasts[0], DailyForecast)

    @pytest.mark.asyncio
    async def test_get_weather_with_forecast(
        self,
        weather_service,
        sample_location,
        sample_weather_response,
        sample_forecast_response,
    ):
        """Test comprehensive weather data retrieval."""
        # Mock both API calls
        weather_service._make_api_request = AsyncMock(
            side_effect=[sample_weather_response, sample_forecast_response]
        )

        weather_data = await weather_service.get_weather_with_forecast(sample_location)

        assert isinstance(weather_data, WeatherData)
        assert weather_data.temperature == 30.5
        assert len(weather_data.forecast) > 0

    @pytest.mark.asyncio
    async def test_process_weather_query_current(
        self, weather_service, sample_location, sample_weather_response
    ):
        """Test processing current weather query."""
        weather_service._make_api_request = AsyncMock(
            return_value=sample_weather_response
        )

        weather_data = await weather_service.process_weather_query(
            sample_location, "current"
        )

        assert isinstance(weather_data, WeatherData)
        assert weather_data.temperature == 30.5

    @pytest.mark.asyncio
    async def test_process_weather_query_forecast(
        self, weather_service, sample_location, sample_forecast_response
    ):
        """Test processing forecast query."""
        weather_service._make_api_request = AsyncMock(
            return_value=sample_forecast_response
        )

        weather_data = await weather_service.process_weather_query(
            sample_location, "forecast"
        )

        assert isinstance(weather_data, WeatherData)
        assert len(weather_data.forecast) > 0

    @pytest.mark.asyncio
    async def test_process_weather_query_comprehensive(
        self,
        weather_service,
        sample_location,
        sample_weather_response,
        sample_forecast_response,
    ):
        """Test processing comprehensive weather query."""
        weather_service._make_api_request = AsyncMock(
            side_effect=[sample_weather_response, sample_forecast_response]
        )

        weather_data = await weather_service.process_weather_query(
            sample_location, "comprehensive"
        )

        assert isinstance(weather_data, WeatherData)
        assert weather_data.temperature == 30.5
        assert len(weather_data.forecast) > 0


class TestWeatherServiceGlobalInstance:
    """Test global weather service instance management."""

    @pytest.mark.asyncio
    async def test_get_weather_service(self):
        """Test getting global weather service instance."""
        service = await get_weather_service()
        assert service is not None
        assert isinstance(service, WeatherService)

        # Should return same instance
        service2 = await get_weather_service()
        assert service is service2

        await close_weather_service()

    @pytest.mark.asyncio
    async def test_close_weather_service(self):
        """Test closing global weather service."""
        service = await get_weather_service()
        assert service is not None

        await close_weather_service()

        # Should create new instance after close
        service2 = await get_weather_service()
        assert service2 is not None

        await close_weather_service()
