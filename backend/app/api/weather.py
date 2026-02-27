"""
Weather API endpoints for frontend integration
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.services.weather_service import get_weather_service, WeatherService, Location
from app.core.auth import get_optional_user
from app.models.user import User
from app.core.logging import get_logger
import uuid

logger = get_logger(__name__)

router = APIRouter(prefix="/weather", tags=["weather"])


def _get_icon_from_description(description: str) -> str:
    """Generate icon code from weather description."""
    desc_lower = description.lower()
    if "clear" in desc_lower or "sunny" in desc_lower:
        return "01d"
    elif "cloud" in desc_lower:
        return "03d"
    elif "rain" in desc_lower or "drizzle" in desc_lower:
        return "10d"
    elif "thunder" in desc_lower or "storm" in desc_lower:
        return "11d"
    elif "snow" in desc_lower:
        return "13d"
    elif "mist" in desc_lower or "fog" in desc_lower:
        return "50d"
    else:
        return "02d"


@router.get("/current")
async def get_current_weather(
    location: str = Query(..., description="Location (city name or coordinates)"),
    current_user: Optional[User] = Depends(get_optional_user),
    weather_service: WeatherService = Depends(get_weather_service),
):
    """Get current weather conditions for a location."""
    try:
        loc = await _parse_location(location, current_user)
        weather_data = await weather_service.get_current_weather(loc)

        wind_dir_degrees = weather_data.wind_direction
        directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
        wind_direction_str = directions[int((wind_dir_degrees + 22.5) / 45) % 8]
        icon_code = _get_icon_from_description(weather_data.weather_description)

        return {
            "success": True,
            "data": {
                "temperature": weather_data.temperature,
                "feels_like": weather_data.feels_like,
                "humidity": weather_data.humidity,
                "wind_speed": weather_data.wind_speed,
                "wind_direction": wind_direction_str,
                "description": weather_data.weather_description,
                "icon": icon_code,
                "location": (
                    weather_data.location.address if weather_data.location else location
                ),
                "coordinates": {
                    "latitude": (
                        weather_data.location.latitude
                        if weather_data.location
                        else None
                    ),
                    "longitude": (
                        weather_data.location.longitude
                        if weather_data.location
                        else None
                    ),
                },
                "district": (
                    weather_data.location.district if weather_data.location else ""
                ),
                "state": weather_data.location.state if weather_data.location else "",
                "timestamp": weather_data.timestamp.isoformat(),
            },
        }
    except Exception as e:
        logger.error(f"Error getting current weather: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forecast")
async def get_weather_forecast(
    location: str = Query(..., description="Location (city name or coordinates)"),
    days: int = Query(7, ge=1, le=14, description="Number of days to forecast"),
    current_user: Optional[User] = Depends(get_optional_user),
    weather_service: WeatherService = Depends(get_weather_service),
):
    """Get weather forecast for a location."""
    try:
        loc = await _parse_location(location, current_user)
        weather_data = await weather_service.get_weather_with_forecast(loc)

        forecast_list = []
        if weather_data.forecast:
            for forecast in weather_data.forecast[:days]:
                icon_code = _get_icon_from_description(forecast.weather_description)
                forecast_list.append(
                    {
                        "date": forecast.date,
                        "temperature_max": forecast.temperature_max,
                        "temperature_min": forecast.temperature_min,
                        "humidity": forecast.humidity,
                        "rainfall_probability": forecast.rainfall_probability,
                        "rainfall_amount": 0.0,
                        "wind_speed": forecast.wind_speed,
                        "description": forecast.weather_description,
                        "icon": icon_code,
                    }
                )

        return {
            "success": True,
            "data": forecast_list,
            "location": {
                "address": (
                    weather_data.location.address if weather_data.location else location
                ),
                "coordinates": {
                    "latitude": (
                        weather_data.location.latitude
                        if weather_data.location
                        else None
                    ),
                    "longitude": (
                        weather_data.location.longitude
                        if weather_data.location
                        else None
                    ),
                },
                "district": (
                    weather_data.location.district if weather_data.location else ""
                ),
                "state": weather_data.location.state if weather_data.location else "",
            },
        }
    except Exception as e:
        logger.error(f"Error getting weather forecast: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts")
async def get_weather_alerts(
    location: str = Query(..., description="Location (city name or coordinates)"),
    current_user: Optional[User] = Depends(get_optional_user),
    weather_service: WeatherService = Depends(get_weather_service),
):
    """Get weather alerts for a location."""
    try:
        loc = await _parse_location(location, current_user)
        weather_data = await weather_service.get_weather_with_forecast(loc)

        alerts_list = []
        if weather_data.weather_alerts:
            for alert in weather_data.weather_alerts:
                alerts_list.append(
                    {
                        "id": str(uuid.uuid4()),
                        "severity": alert.severity.value,
                        "event": alert.alert_type,
                        "description": alert.message,
                        "start_time": alert.start_time.isoformat(),
                        "end_time": alert.end_time.isoformat(),
                        "affected_areas": [
                            (
                                weather_data.location.address
                                if weather_data.location
                                else location
                            )
                        ],
                    }
                )

        return {
            "success": True,
            "data": alerts_list,
            "location": {
                "address": (
                    weather_data.location.address if weather_data.location else location
                ),
                "coordinates": {
                    "latitude": (
                        weather_data.location.latitude
                        if weather_data.location
                        else None
                    ),
                    "longitude": (
                        weather_data.location.longitude
                        if weather_data.location
                        else None
                    ),
                },
                "district": (
                    weather_data.location.district if weather_data.location else ""
                ),
                "state": weather_data.location.state if weather_data.location else "",
            },
        }
    except Exception as e:
        logger.error(f"Error getting weather alerts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agricultural-insights")
async def get_agricultural_insights(
    location: str = Query(..., description="Location (city name or coordinates)"),
    current_user: Optional[User] = Depends(get_optional_user),
    weather_service: WeatherService = Depends(get_weather_service),
):
    """Get agricultural insights based on weather conditions."""
    try:
        loc = await _parse_location(location, current_user)
        weather_data = await weather_service.get_weather_with_forecast(loc)

        insights_list = (
            weather_data.agricultural_insights
            if weather_data.agricultural_insights
            else []
        )
        recommendation = (
            insights_list[0]
            if len(insights_list) > 0
            else "Weather conditions are suitable for general farming activities."
        )

        suitable_activities = []
        activities_to_avoid = []
        irrigation_advice = "Monitor soil moisture and irrigate as needed."
        pest_risk_level = "Low"

        if weather_data.temperature > 35:
            activities_to_avoid.append("Midday field work")
            irrigation_advice = (
                "Increase irrigation frequency due to high temperatures."
            )
            pest_risk_level = "Medium"
        else:
            suitable_activities.append("Field work")

        if weather_data.rainfall_prediction > 5:
            activities_to_avoid.append("Harvesting")
            activities_to_avoid.append("Spraying pesticides")
            irrigation_advice = "Reduce irrigation due to expected rainfall."
        else:
            suitable_activities.append("Harvesting")
            suitable_activities.append("Spraying")

        if weather_data.wind_speed < 15:
            suitable_activities.append("Pesticide application")
        else:
            activities_to_avoid.append("Pesticide spraying")

        if weather_data.humidity > 80:
            pest_risk_level = "High"

        if not suitable_activities:
            suitable_activities = ["Planning", "Equipment maintenance"]

        return {
            "success": True,
            "data": {
                "recommendation": recommendation,
                "suitable_activities": suitable_activities,
                "activities_to_avoid": (
                    activities_to_avoid if activities_to_avoid else ["None"]
                ),
                "irrigation_advice": irrigation_advice,
                "pest_risk_level": pest_risk_level,
            },
            "location": {
                "address": (
                    weather_data.location.address if weather_data.location else location
                ),
                "coordinates": {
                    "latitude": (
                        weather_data.location.latitude
                        if weather_data.location
                        else None
                    ),
                    "longitude": (
                        weather_data.location.longitude
                        if weather_data.location
                        else None
                    ),
                },
                "district": (
                    weather_data.location.district if weather_data.location else ""
                ),
                "state": weather_data.location.state if weather_data.location else "",
            },
        }
    except Exception as e:
        logger.error(f"Error getting agricultural insights: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def weather_health_check():
    """Check weather service health."""
    try:
        weather_service = await get_weather_service()
        return {
            "status": "healthy",
            "service": "weather",
            "circuit_breaker": weather_service.circuit_breaker.get_metrics(),
        }
    except Exception as e:
        logger.error(f"Weather health check failed: {e}", exc_info=True)
        return {"status": "unhealthy", "service": "weather", "error": str(e)}


async def _parse_location(location_str: str, user: Optional[User]) -> Location:
    """Parse location string into Location object."""
    # If coordinates are provided directly (lat,lon format)
    if "," in location_str:
        try:
            lat_str, lon_str = location_str.split(",")
            lat = float(lat_str.strip())
            lon = float(lon_str.strip())
            # Don't set address to coordinates - leave it empty so enrichment can happen
            return Location(latitude=lat, longitude=lon, address="")
        except ValueError:
            pass

    # Use maps service to geocode the location string
    try:
        from app.services.maps_service import get_maps_service

        maps_service = await get_maps_service()
        geocoded = await maps_service.geocode(location_str)

        if geocoded:
            return Location(
                latitude=geocoded.latitude,
                longitude=geocoded.longitude,
                address=geocoded.address,
                district=geocoded.district,
                state=geocoded.state,
            )
    except Exception as e:
        logger.warning(f"Failed to geocode location '{location_str}': {e}")

    # Fallback: Default to New Delhi coordinates if geocoding fails
    logger.warning(f"Using default coordinates for location: {location_str}")
    return Location(latitude=28.6139, longitude=77.2090, address=location_str)
