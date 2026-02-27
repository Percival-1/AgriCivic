"""
Unit tests for Maps service.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import json

from app.services.maps_service import (
    MapsService,
    Location,
    TravelMode,
    MandiInfo,
    DistanceInfo,
    RouteInfo,
    MapsAPIError,
)


@pytest.fixture
def maps_service():
    """Create a MapsService instance for testing."""
    service = MapsService()
    service.api_key = "test_api_key"
    return service


@pytest.fixture
def sample_location():
    """Sample location for testing."""
    return Location(
        latitude=28.6139,
        longitude=77.2090,
        address="New Delhi, India",
        district="New Delhi",
        state="Delhi",
        country="India",
    )


@pytest.fixture
def sample_geocode_response():
    """Sample geocoding API response."""
    return {
        "status": "OK",
        "results": [
            {
                "formatted_address": "New Delhi, Delhi, India",
                "geometry": {"location": {"lat": 28.6139, "lng": 77.2090}},
                "address_components": [
                    {
                        "long_name": "New Delhi",
                        "types": ["administrative_area_level_2"],
                    },
                    {"long_name": "Delhi", "types": ["administrative_area_level_1"]},
                    {"long_name": "India", "types": ["country"]},
                    {"long_name": "110001", "types": ["postal_code"]},
                ],
            }
        ],
    }


@pytest.fixture
def sample_distance_response():
    """Sample distance matrix API response."""
    return {
        "status": "OK",
        "rows": [
            {
                "elements": [
                    {
                        "status": "OK",
                        "distance": {"value": 15000, "text": "15.0 km"},
                        "duration": {"value": 1800, "text": "30 mins"},
                    }
                ]
            }
        ],
    }


@pytest.fixture
def sample_places_response():
    """Sample places API response."""
    return {
        "status": "OK",
        "results": [
            {
                "name": "Central Mandi",
                "place_id": "place123",
                "geometry": {"location": {"lat": 28.6500, "lng": 77.2500}},
                "vicinity": "Central Market Area",
                "rating": 4.5,
                "opening_hours": {"open_now": True},
            },
            {
                "name": "Agricultural Market",
                "place_id": "place456",
                "geometry": {"location": {"lat": 28.6300, "lng": 77.2200}},
                "vicinity": "Market Road",
                "rating": 4.2,
                "opening_hours": {"open_now": True},
            },
        ],
    }


class TestMapsService:
    """Test cases for MapsService."""

    @pytest.mark.asyncio
    async def test_geocode_success(self, maps_service, sample_geocode_response):
        """Test successful geocoding."""
        with patch.object(
            maps_service, "_make_api_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = sample_geocode_response

            location = await maps_service.geocode("New Delhi, India")

            assert location.latitude == 28.6139
            assert location.longitude == 77.2090
            assert location.address == "New Delhi, Delhi, India"
            assert location.district == "New Delhi"
            assert location.state == "Delhi"
            assert location.country == "India"
            assert location.postal_code == "110001"

    @pytest.mark.asyncio
    async def test_geocode_not_found(self, maps_service):
        """Test geocoding with location not found."""
        with patch.object(
            maps_service, "_make_api_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = {"status": "ZERO_RESULTS"}

            with pytest.raises(MapsAPIError, match="Location not found"):
                await maps_service.geocode("Invalid Address XYZ123")

    @pytest.mark.asyncio
    async def test_reverse_geocode_success(self, maps_service, sample_geocode_response):
        """Test successful reverse geocoding."""
        with patch.object(
            maps_service, "_make_api_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = sample_geocode_response

            location = await maps_service.reverse_geocode(28.6139, 77.2090)

            assert location.latitude == 28.6139
            assert location.longitude == 77.2090
            assert location.address == "New Delhi, Delhi, India"

    @pytest.mark.asyncio
    async def test_calculate_distance_success(
        self, maps_service, sample_location, sample_distance_response
    ):
        """Test successful distance calculation."""
        destination = Location(
            latitude=28.6500, longitude=77.2500, address="Destination"
        )

        with patch.object(
            maps_service, "_make_api_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = sample_distance_response

            distance_info = await maps_service.calculate_distance(
                sample_location, destination, TravelMode.DRIVING
            )

            assert distance_info.distance_meters == 15000
            assert distance_info.distance_text == "15.0 km"
            assert distance_info.duration_seconds == 1800
            assert distance_info.duration_text == "30 mins"
            assert distance_info.travel_mode == TravelMode.DRIVING

    @pytest.mark.asyncio
    async def test_find_nearest_mandis_success(
        self,
        maps_service,
        sample_location,
        sample_places_response,
        sample_distance_response,
    ):
        """Test finding nearest mandis."""
        with patch.object(
            maps_service, "search_nearby_places", new_callable=AsyncMock
        ) as mock_search:
            with patch.object(
                maps_service, "calculate_distance", new_callable=AsyncMock
            ) as mock_distance:
                mock_search.return_value = sample_places_response["results"]

                # Mock distance calculation
                mock_distance.return_value = DistanceInfo(
                    distance_meters=15000,
                    distance_text="15.0 km",
                    duration_seconds=1800,
                    duration_text="30 mins",
                    travel_mode=TravelMode.DRIVING,
                )

                mandis = await maps_service.find_nearest_mandis(
                    sample_location, max_results=10, max_distance_km=50.0
                )

                assert len(mandis) > 0
                assert all(isinstance(m, MandiInfo) for m in mandis)
                assert mandis[0].name in ["Central Mandi", "Agricultural Market"]
                assert mandis[0].distance_km == 15.0
                assert mandis[0].transport_cost_estimate > 0

    @pytest.mark.asyncio
    async def test_validate_location_success(
        self, maps_service, sample_location, sample_geocode_response
    ):
        """Test location validation."""
        with patch.object(
            maps_service, "reverse_geocode", new_callable=AsyncMock
        ) as mock_reverse:
            mock_reverse.return_value = sample_location

            is_valid = await maps_service.validate_location(sample_location)

            assert is_valid is True

    @pytest.mark.asyncio
    async def test_validate_location_failure(self, maps_service, sample_location):
        """Test location validation failure."""
        with patch.object(
            maps_service, "reverse_geocode", new_callable=AsyncMock
        ) as mock_reverse:
            mock_reverse.side_effect = MapsAPIError("Invalid location")

            is_valid = await maps_service.validate_location(sample_location)

            assert is_valid is False

    def test_haversine_distance_calculation(self, maps_service):
        """Test Haversine distance calculation."""
        loc1 = Location(latitude=28.6139, longitude=77.2090, address="Delhi")
        loc2 = Location(latitude=28.6500, longitude=77.2500, address="Nearby")

        distance = maps_service.calculate_haversine_distance(loc1, loc2)

        # Distance should be approximately 5-6 km
        assert 4.0 < distance < 7.0

    @pytest.mark.asyncio
    async def test_circuit_breaker_opens(self, maps_service):
        """Test circuit breaker opens after failures."""
        # Directly trigger failures in _make_api_request to test circuit breaker
        import aiohttp

        with patch("aiohttp.ClientSession") as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 500
            mock_response.text = AsyncMock(return_value="Server error")
            mock_response.__aenter__ = AsyncMock(return_value=mock_response)
            mock_response.__aexit__ = AsyncMock(return_value=None)

            mock_get = AsyncMock(return_value=mock_response)
            mock_session_instance = AsyncMock()
            mock_session_instance.get = mock_get
            mock_session_instance.__aenter__ = AsyncMock(
                return_value=mock_session_instance
            )
            mock_session_instance.__aexit__ = AsyncMock(return_value=None)
            mock_session.return_value = mock_session_instance

            # Trigger failures to open circuit breaker
            for _ in range(maps_service.failure_threshold):
                try:
                    await maps_service.geocode("test")
                except MapsAPIError:
                    pass

            assert maps_service.circuit_open is True

            # Next request should fail immediately
            with pytest.raises(MapsAPIError, match="Circuit breaker is open"):
                await maps_service.geocode("test")

    @pytest.mark.asyncio
    async def test_caching_geocode(self, maps_service, sample_geocode_response):
        """Test caching for geocode requests."""
        # Mock Redis client
        maps_service.redis_client = AsyncMock()
        maps_service.redis_client.get = AsyncMock(return_value=None)
        maps_service.redis_client.setex = AsyncMock()

        with patch.object(
            maps_service, "_make_api_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = sample_geocode_response

            # First call - should hit API
            location1 = await maps_service.geocode("New Delhi")
            assert mock_request.call_count == 1

            # Verify cache was set
            assert maps_service.redis_client.setex.called

            # Second call with cache hit
            maps_service.redis_client.get = AsyncMock(
                return_value=json.dumps(sample_geocode_response)
            )
            location2 = await maps_service.geocode("New Delhi")

            # API should not be called again
            assert mock_request.call_count == 1
            assert location1.latitude == location2.latitude

    @pytest.mark.asyncio
    async def test_get_route_success(self, maps_service, sample_location):
        """Test getting route information."""
        destination = Location(
            latitude=28.6500, longitude=77.2500, address="Destination"
        )

        route_response = {
            "status": "OK",
            "routes": [
                {
                    "legs": [
                        {
                            "distance": {"value": 15000, "text": "15.0 km"},
                            "duration": {"value": 1800, "text": "30 mins"},
                            "steps": [
                                {"html_instructions": "Head <b>north</b> on Main St"},
                                {"html_instructions": "Turn <b>right</b> onto Highway"},
                            ],
                        }
                    ],
                    "overview_polyline": {"points": "encoded_polyline_data"},
                }
            ],
        }

        with patch.object(
            maps_service, "_make_api_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = route_response

            route_info = await maps_service.get_route(
                sample_location, destination, TravelMode.DRIVING
            )

            assert isinstance(route_info, RouteInfo)
            assert route_info.distance_info.distance_meters == 15000
            assert len(route_info.steps) == 2
            assert "north" in route_info.steps[0].lower()
            assert route_info.polyline == "encoded_polyline_data"

    @pytest.mark.asyncio
    async def test_search_nearby_places_success(
        self, maps_service, sample_location, sample_places_response
    ):
        """Test searching nearby places."""
        with patch.object(
            maps_service, "_make_api_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.return_value = sample_places_response

            places = await maps_service.search_nearby_places(
                sample_location, keyword="mandi", radius=50000
            )

            assert len(places) == 2
            assert places[0]["name"] == "Central Mandi"
            assert places[1]["name"] == "Agricultural Market"

    @pytest.mark.asyncio
    async def test_api_error_handling(self, maps_service):
        """Test API error handling."""
        with patch.object(
            maps_service, "_make_api_request", new_callable=AsyncMock
        ) as mock_request:
            mock_request.side_effect = MapsAPIError("API request denied")

            with pytest.raises(MapsAPIError, match="API request denied"):
                await maps_service.geocode("test address")


class TestLocationModel:
    """Test cases for Location model."""

    def test_location_creation(self):
        """Test creating a Location object."""
        location = Location(
            latitude=28.6139,
            longitude=77.2090,
            address="New Delhi, India",
            district="New Delhi",
            state="Delhi",
        )

        assert location.latitude == 28.6139
        assert location.longitude == 77.2090
        assert location.address == "New Delhi, India"
        assert location.district == "New Delhi"
        assert location.state == "Delhi"


class TestMandiInfo:
    """Test cases for MandiInfo model."""

    def test_mandi_info_creation(self):
        """Test creating a MandiInfo object."""
        location = Location(latitude=28.6139, longitude=77.2090, address="Market Area")

        distance_info = DistanceInfo(
            distance_meters=15000,
            distance_text="15.0 km",
            duration_seconds=1800,
            duration_text="30 mins",
            travel_mode=TravelMode.DRIVING,
        )

        mandi = MandiInfo(
            name="Central Mandi",
            location=location,
            distance_km=15.0,
            distance_info=distance_info,
            transport_cost_estimate=75.0,
            place_id="place123",
            rating=4.5,
            is_open=True,
        )

        assert mandi.name == "Central Mandi"
        assert mandi.distance_km == 15.0
        assert mandi.transport_cost_estimate == 75.0
        assert mandi.rating == 4.5
        assert mandi.is_open is True
