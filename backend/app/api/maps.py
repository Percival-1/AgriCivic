"""
Maps API endpoints for the AI-Driven Agri-Civic Intelligence Platform.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.maps_service import (
    get_maps_service,
    MapsAPIError,
    Location,
    TravelMode,
    MandiInfo,
    DistanceInfo,
    RouteInfo,
)
from app.core.logging import get_logger


def _parse_travel_mode(mode_str: str) -> TravelMode:
    """
    Parse travel mode string to TravelMode enum.

    Maps common travel mode names to the enum values.

    Args:
        mode_str: Travel mode string (e.g., "driving", "walking", "bicycling", "transit")

    Returns:
        TravelMode enum value

    Raises:
        ValueError: If mode string is not recognized
    """
    mode_mapping = {
        "driving": TravelMode.DRIVE,
        "drive": TravelMode.DRIVE,
        "walking": TravelMode.WALK,
        "walk": TravelMode.WALK,
        "bicycling": TravelMode.BICYCLE,
        "bicycle": TravelMode.BICYCLE,
        "bike": TravelMode.BICYCLE,
        "transit": TravelMode.TRANSIT,
        "truck": TravelMode.TRUCK,
    }

    mode_lower = mode_str.lower()
    if mode_lower not in mode_mapping:
        valid_modes = ", ".join(sorted(set(mode_mapping.keys())))
        raise ValueError(
            f"Invalid travel mode: {mode_str}. Must be one of: {valid_modes}"
        )

    return mode_mapping[mode_lower]


logger = get_logger(__name__)

router = APIRouter(prefix="/maps", tags=["maps"])


# Request/Response Models
class LocationRequest(BaseModel):
    """Location request model."""

    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    address: Optional[str] = Field(None, description="Address string")


class GeocodeRequest(BaseModel):
    """Geocoding request model."""

    address: str = Field(..., description="Address to geocode")


class AutocompleteRequest(BaseModel):
    """Autocomplete request model."""

    text: str = Field(..., description="Search text for autocomplete", min_length=2)
    limit: Optional[int] = Field(
        5, description="Maximum number of results", ge=1, le=10
    )


class DistanceRequest(BaseModel):
    """Distance calculation request model."""

    origin: LocationRequest = Field(..., description="Origin location")
    destination: LocationRequest = Field(..., description="Destination location")
    mode: Optional[str] = Field(
        "driving", description="Travel mode (driving, walking, bicycling, transit)"
    )


class NearestMandisRequest(BaseModel):
    """Nearest mandis request model."""

    location: LocationRequest = Field(..., description="User location")
    max_results: Optional[int] = Field(
        10, description="Maximum number of results", ge=1, le=50
    )
    max_distance_km: Optional[float] = Field(
        100.0, description="Maximum search distance in km", ge=1, le=200
    )


class LocationResponse(BaseModel):
    """Location response model."""

    latitude: float
    longitude: float
    address: str
    district: str
    state: str
    country: str
    postal_code: str


class DistanceInfoResponse(BaseModel):
    """Distance information response model."""

    distance_meters: float
    distance_text: str
    duration_seconds: float
    duration_text: str
    travel_mode: str


class MandiInfoResponse(BaseModel):
    """Mandi information response model."""

    name: str
    location: LocationResponse
    distance_km: float
    distance_info: Optional[DistanceInfoResponse]
    current_prices: dict
    contact_info: str
    transport_cost_estimate: float
    place_id: str
    rating: float
    is_open: bool


class RouteInfoResponse(BaseModel):
    """Route information response model."""

    origin: LocationResponse
    destination: LocationResponse
    distance_info: DistanceInfoResponse
    polyline: str
    steps: List[str]


def _location_to_response(location: Location) -> LocationResponse:
    """Convert Location to LocationResponse."""
    return LocationResponse(
        latitude=location.latitude,
        longitude=location.longitude,
        address=location.address,
        district=location.district,
        state=location.state,
        country=location.country,
        postal_code=location.postal_code,
    )


def _distance_info_to_response(distance_info: DistanceInfo) -> DistanceInfoResponse:
    """Convert DistanceInfo to DistanceInfoResponse."""
    return DistanceInfoResponse(
        distance_meters=distance_info.distance_meters,
        distance_text=distance_info.distance_text,
        duration_seconds=distance_info.duration_seconds,
        duration_text=distance_info.duration_text,
        travel_mode=distance_info.travel_mode.value,
    )


def _mandi_info_to_response(mandi: MandiInfo) -> MandiInfoResponse:
    """Convert MandiInfo to MandiInfoResponse."""
    return MandiInfoResponse(
        name=mandi.name,
        location=_location_to_response(mandi.location),
        distance_km=mandi.distance_km,
        distance_info=(
            _distance_info_to_response(mandi.distance_info)
            if mandi.distance_info
            else None
        ),
        current_prices=mandi.current_prices,
        contact_info=mandi.contact_info,
        transport_cost_estimate=mandi.transport_cost_estimate,
        place_id=mandi.place_id,
        rating=mandi.rating,
        is_open=mandi.is_open,
    )


@router.post("/geocode", response_model=LocationResponse)
async def geocode_address(request: GeocodeRequest):
    """
    Convert address to geographic coordinates.

    Args:
        request: Geocoding request with address

    Returns:
        Location with coordinates and address components
    """
    try:
        maps_service = await get_maps_service()
        location = await maps_service.geocode(request.address)
        return _location_to_response(location)

    except MapsAPIError as e:
        logger.error(f"Geocoding failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in geocoding: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/autocomplete", response_model=List[dict])
async def autocomplete_address(request: AutocompleteRequest):
    """
    Get address suggestions for autocomplete.

    Args:
        request: Autocomplete request with search text

    Returns:
        List of address suggestions with coordinates
    """
    try:
        maps_service = await get_maps_service()
        suggestions = await maps_service.autocomplete(request.text, request.limit)
        return suggestions

    except MapsAPIError as e:
        logger.error(f"Autocomplete failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in autocomplete: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/reverse-geocode", response_model=LocationResponse)
async def reverse_geocode_location(request: LocationRequest):
    """
    Convert coordinates to address.

    Args:
        request: Location request with coordinates

    Returns:
        Location with address information
    """
    try:
        maps_service = await get_maps_service()
        location = await maps_service.reverse_geocode(
            request.latitude, request.longitude
        )
        return _location_to_response(location)

    except MapsAPIError as e:
        logger.error(f"Reverse geocoding failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in reverse geocoding: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/distance", response_model=DistanceInfoResponse)
async def calculate_distance(request: DistanceRequest):
    """
    Calculate distance and duration between two locations.

    Args:
        request: Distance request with origin and destination

    Returns:
        Distance and duration information
    """
    try:
        maps_service = await get_maps_service()

        # Convert request to Location objects
        origin = Location(
            latitude=request.origin.latitude,
            longitude=request.origin.longitude,
            address=request.origin.address or "",
        )
        destination = Location(
            latitude=request.destination.latitude,
            longitude=request.destination.longitude,
            address=request.destination.address or "",
        )

        # Parse travel mode
        try:
            mode = _parse_travel_mode(request.mode)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        distance_info = await maps_service.calculate_distance(origin, destination, mode)
        return _distance_info_to_response(distance_info)

    except MapsAPIError as e:
        logger.error(f"Distance calculation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in distance calculation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/route", response_model=RouteInfoResponse)
async def get_route(request: DistanceRequest):
    """
    Get detailed route information between two locations.

    Args:
        request: Distance request with origin and destination

    Returns:
        Route information with steps and polyline
    """
    try:
        maps_service = await get_maps_service()

        # Convert request to Location objects
        origin = Location(
            latitude=request.origin.latitude,
            longitude=request.origin.longitude,
            address=request.origin.address or "",
        )
        destination = Location(
            latitude=request.destination.latitude,
            longitude=request.destination.longitude,
            address=request.destination.address or "",
        )

        # Parse travel mode
        try:
            mode = _parse_travel_mode(request.mode)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        route_info = await maps_service.get_route(origin, destination, mode)

        return RouteInfoResponse(
            origin=_location_to_response(route_info.origin),
            destination=_location_to_response(route_info.destination),
            distance_info=_distance_info_to_response(route_info.distance_info),
            polyline=route_info.polyline,
            steps=route_info.steps,
        )

    except MapsAPIError as e:
        logger.error(f"Route calculation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in route calculation: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/nearest-mandis", response_model=List[MandiInfoResponse])
async def find_nearest_mandis(request: NearestMandisRequest):
    """
    Find nearest mandis (markets) to a given location.

    Args:
        request: Request with user location and search parameters

    Returns:
        List of nearest mandis sorted by distance
    """
    try:
        maps_service = await get_maps_service()

        # Convert request to Location object
        location = Location(
            latitude=request.location.latitude,
            longitude=request.location.longitude,
            address=request.location.address or "",
        )

        mandis = await maps_service.find_nearest_mandis(
            location,
            max_results=request.max_results,
            max_distance_km=request.max_distance_km,
        )

        return [_mandi_info_to_response(mandi) for mandi in mandis]

    except MapsAPIError as e:
        logger.error(f"Nearest mandis search failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error in nearest mandis search: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/validate-location", response_model=dict)
async def validate_location(request: LocationRequest):
    """
    Validate if a location is valid and accessible.

    Args:
        request: Location request with coordinates

    Returns:
        Validation result
    """
    try:
        maps_service = await get_maps_service()

        location = Location(
            latitude=request.latitude,
            longitude=request.longitude,
            address=request.address or "",
        )

        is_valid = await maps_service.validate_location(location)

        return {
            "valid": is_valid,
            "latitude": request.latitude,
            "longitude": request.longitude,
        }

    except Exception as e:
        logger.error(f"Location validation failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/health")
async def health_check():
    """Health check endpoint for Maps service."""
    try:
        maps_service = await get_maps_service()
        return {
            "status": "healthy",
            "service": "maps",
            "circuit_breaker_open": maps_service.circuit_open,
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "unhealthy", "service": "maps", "error": str(e)}
