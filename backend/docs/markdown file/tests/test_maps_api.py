"""
Integration tests for Maps API endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from app.main import app
from app.services.maps_service import (
    Location,
    MandiInfo,
    DistanceInfo,
    TravelMode,
    MapsAPIError,
)

client = TestClient(app)


@pytest.fixture
def sample_location():
    """Sample location for testing."""
    return Location(
        latitude=28.6139,
        longitude=77.2090,
        address="New Delhi, Delhi, India",
        district="New Delhi",
        state="Delhi",
        country="India",
        postal_code="110001",
    )


@pytest.fixture
def sample_mandi():
    """Sample mandi for testing."""
    location = Location(
        latitude=28.6500,
        longitude=77.2500,
        address="Central Market Area",
        district="New Delhi",
        state="Delhi",
    )

    distance_info = DistanceInfo(
        distance_meters=15000,
        distance_text="15.0 km",
        duration_seconds=1800,
        duration_text="30 mins",
        travel_mode=TravelMode.DRIVING,
    )

    return MandiInfo(
        name="Central Mandi",
        location=location,
        distance_km=15.0,
        distance_info=distance_info,
        transport_cost_estimate=75.0,
        place_id="place123",
        rating=4.5,
        is_open=True,
    )


class TestMapsAPI:
    """Test cases for Maps API endpoints."""

    def test_geocode_endpoint(self, sample_location):
        """Test geocode endpoint."""
        with patch("app.api.maps.get_maps_service") as mock_service:
            mock_maps = AsyncMock()
            mock_maps.geocode = AsyncMock(return_value=sample_location)
            mock_service.return_value = mock_maps

            response = client.post(
                "/api/v1/maps/geocode", json={"address": "New Delhi, India"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["latitude"] == 28.6139
            assert data["longitude"] == 77.2090
            assert data["address"] == "New Delhi, Delhi, India"
            assert data["district"] == "New Delhi"
            assert data["state"] == "Delhi"

    def test_geocode_endpoint_error(self):
        """Test geocode endpoint with error."""
        with patch("app.api.maps.get_maps_service") as mock_service:
            mock_maps = AsyncMock()
            mock_maps.geocode = AsyncMock(
                side_effect=MapsAPIError("Location not found")
            )
            mock_service.return_value = mock_maps

            response = client.post(
                "/api/v1/maps/geocode", json={"address": "Invalid Address XYZ123"}
            )

            assert response.status_code == 400
            response_data = response.json()
            # Check if error is in the response (could be in 'detail' or 'error' field)
            assert "Location not found" in str(response_data)

    def test_reverse_geocode_endpoint(self, sample_location):
        """Test reverse geocode endpoint."""
        with patch("app.api.maps.get_maps_service") as mock_service:
            mock_maps = AsyncMock()
            mock_maps.reverse_geocode = AsyncMock(return_value=sample_location)
            mock_service.return_value = mock_maps

            response = client.post(
                "/api/v1/maps/reverse-geocode",
                json={"latitude": 28.6139, "longitude": 77.2090},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["latitude"] == 28.6139
            assert data["longitude"] == 77.2090
            assert data["address"] == "New Delhi, Delhi, India"

    def test_calculate_distance_endpoint(self):
        """Test distance calculation endpoint."""
        distance_info = DistanceInfo(
            distance_meters=15000,
            distance_text="15.0 km",
            duration_seconds=1800,
            duration_text="30 mins",
            travel_mode=TravelMode.DRIVING,
        )

        with patch("app.api.maps.get_maps_service") as mock_service:
            mock_maps = AsyncMock()
            mock_maps.calculate_distance = AsyncMock(return_value=distance_info)
            mock_service.return_value = mock_maps

            response = client.post(
                "/api/v1/maps/distance",
                json={
                    "origin": {"latitude": 28.6139, "longitude": 77.2090},
                    "destination": {"latitude": 28.6500, "longitude": 77.2500},
                    "mode": "driving",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["distance_meters"] == 15000
            assert data["distance_text"] == "15.0 km"
            assert data["duration_seconds"] == 1800
            assert data["travel_mode"] == "driving"

    def test_calculate_distance_invalid_mode(self):
        """Test distance calculation with invalid travel mode."""
        with patch("app.api.maps.get_maps_service") as mock_service:
            mock_maps = AsyncMock()
            mock_service.return_value = mock_maps

            response = client.post(
                "/api/v1/maps/distance",
                json={
                    "origin": {"latitude": 28.6139, "longitude": 77.2090},
                    "destination": {"latitude": 28.6500, "longitude": 77.2500},
                    "mode": "flying",  # Invalid mode
                },
            )

            assert response.status_code == 400
            response_data = response.json()
            # Check if error is in the response
            assert "Invalid travel mode" in str(response_data)

    def test_find_nearest_mandis_endpoint(self, sample_mandi):
        """Test find nearest mandis endpoint."""
        with patch("app.api.maps.get_maps_service") as mock_service:
            mock_maps = AsyncMock()
            mock_maps.find_nearest_mandis = AsyncMock(return_value=[sample_mandi])
            mock_service.return_value = mock_maps

            response = client.post(
                "/api/v1/maps/nearest-mandis",
                json={
                    "location": {"latitude": 28.6139, "longitude": 77.2090},
                    "max_results": 10,
                    "max_distance_km": 50.0,
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert len(data) == 1
            assert data[0]["name"] == "Central Mandi"
            assert data[0]["distance_km"] == 15.0
            assert data[0]["transport_cost_estimate"] == 75.0
            assert data[0]["rating"] == 4.5

    def test_find_nearest_mandis_empty_result(self):
        """Test find nearest mandis with no results."""
        with patch("app.api.maps.get_maps_service") as mock_service:
            mock_maps = AsyncMock()
            mock_maps.find_nearest_mandis = AsyncMock(return_value=[])
            mock_service.return_value = mock_maps

            response = client.post(
                "/api/v1/maps/nearest-mandis",
                json={
                    "location": {"latitude": 28.6139, "longitude": 77.2090},
                    "max_results": 10,
                    "max_distance_km": 5.0,  # Very small radius
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert len(data) == 0

    def test_validate_location_endpoint(self):
        """Test location validation endpoint."""
        with patch("app.api.maps.get_maps_service") as mock_service:
            mock_maps = AsyncMock()
            mock_maps.validate_location = AsyncMock(return_value=True)
            mock_service.return_value = mock_maps

            response = client.post(
                "/api/v1/maps/validate-location",
                json={"latitude": 28.6139, "longitude": 77.2090},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["valid"] is True
            assert data["latitude"] == 28.6139
            assert data["longitude"] == 77.2090

    def test_validate_location_invalid(self):
        """Test location validation with invalid location."""
        with patch("app.api.maps.get_maps_service") as mock_service:
            mock_maps = AsyncMock()
            mock_maps.validate_location = AsyncMock(return_value=False)
            mock_service.return_value = mock_maps

            response = client.post(
                "/api/v1/maps/validate-location",
                json={"latitude": 999.0, "longitude": 999.0},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["valid"] is False

    def test_health_check_endpoint(self):
        """Test Maps service health check endpoint."""
        with patch("app.api.maps.get_maps_service") as mock_service:
            mock_maps = AsyncMock()
            mock_maps.circuit_open = False
            mock_service.return_value = mock_maps

            response = client.get("/api/v1/maps/health")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["service"] == "maps"
            assert data["circuit_breaker_open"] is False

    def test_get_route_endpoint(self, sample_location):
        """Test get route endpoint."""
        from app.services.maps_service import RouteInfo

        destination = Location(
            latitude=28.6500, longitude=77.2500, address="Destination"
        )

        distance_info = DistanceInfo(
            distance_meters=15000,
            distance_text="15.0 km",
            duration_seconds=1800,
            duration_text="30 mins",
            travel_mode=TravelMode.DRIVING,
        )

        route_info = RouteInfo(
            origin=sample_location,
            destination=destination,
            distance_info=distance_info,
            polyline="encoded_polyline",
            steps=["Head north", "Turn right"],
        )

        with patch("app.api.maps.get_maps_service") as mock_service:
            mock_maps = AsyncMock()
            mock_maps.get_route = AsyncMock(return_value=route_info)
            mock_service.return_value = mock_maps

            response = client.post(
                "/api/v1/maps/route",
                json={
                    "origin": {"latitude": 28.6139, "longitude": 77.2090},
                    "destination": {"latitude": 28.6500, "longitude": 77.2500},
                    "mode": "driving",
                },
            )

            assert response.status_code == 200
            data = response.json()
            assert data["distance_info"]["distance_meters"] == 15000
            assert len(data["steps"]) == 2
            assert data["polyline"] == "encoded_polyline"


class TestMapsAPIValidation:
    """Test input validation for Maps API."""

    def test_geocode_missing_address(self):
        """Test geocode with missing address."""
        response = client.post("/api/v1/maps/geocode", json={})
        assert response.status_code == 422  # Validation error

    def test_reverse_geocode_missing_coordinates(self):
        """Test reverse geocode with missing coordinates."""
        response = client.post("/api/v1/maps/reverse-geocode", json={})
        assert response.status_code == 422

    def test_distance_missing_origin(self):
        """Test distance calculation with missing origin."""
        response = client.post(
            "/api/v1/maps/distance",
            json={"destination": {"latitude": 28.6500, "longitude": 77.2500}},
        )
        assert response.status_code == 422

    def test_nearest_mandis_invalid_max_results(self):
        """Test nearest mandis with invalid max_results."""
        response = client.post(
            "/api/v1/maps/nearest-mandis",
            json={
                "location": {"latitude": 28.6139, "longitude": 77.2090},
                "max_results": 100,  # Exceeds limit of 50
                "max_distance_km": 50.0,
            },
        )
        assert response.status_code == 422

    def test_nearest_mandis_invalid_distance(self):
        """Test nearest mandis with invalid distance."""
        response = client.post(
            "/api/v1/maps/nearest-mandis",
            json={
                "location": {"latitude": 28.6139, "longitude": 77.2090},
                "max_results": 10,
                "max_distance_km": 300.0,  # Exceeds limit of 200
            },
        )
        assert response.status_code == 422
