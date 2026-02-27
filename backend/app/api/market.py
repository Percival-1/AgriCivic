"""
Market data API endpoints for the AI-Driven Agri-Civic Intelligence Platform.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.market_service import (
    get_market_service,
    MarketService,
    MarketAPIError,
    Location,
    MarketRecommendation,
    PriceTrend,
)
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/market", tags=["market"])


# Request/Response Models
class LocationRequest(BaseModel):
    """Location request model."""

    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    address: Optional[str] = Field(None, description="Address")
    district: Optional[str] = Field(None, description="District")
    state: Optional[str] = Field(None, description="State")


class CropPriceResponse(BaseModel):
    """Crop price response model."""

    crop_name: str
    price_per_quintal: float
    mandi_name: str
    date: str
    location: dict
    quality_grade: Optional[str] = None
    source: Optional[str] = None
    previous_price: Optional[float] = None
    price_change_percentage: Optional[float] = None


class PriceComparisonResponse(BaseModel):
    """Price comparison response model."""

    crop_name: str
    prices: list[CropPriceResponse]
    highest_price: Optional[CropPriceResponse] = None
    lowest_price: Optional[CropPriceResponse] = None
    average_price: float
    price_variance: float
    recommendation: str


class PriceTrendResponse(BaseModel):
    """Price trend response model."""

    crop_name: str
    current_price: float
    trend: str
    historical_prices: list[dict]
    price_change_7d: float
    price_change_30d: float
    forecast_7d: Optional[float] = None
    confidence: float


class MarketIntelligenceResponse(BaseModel):
    """Market intelligence response model."""

    crop_name: str
    user_location: dict
    nearest_mandis: list[dict]
    price_comparison: Optional[PriceComparisonResponse] = None
    price_trend: Optional[PriceTrendResponse] = None
    recommendation: str
    optimal_mandi: Optional[dict] = None
    reasoning: str
    transport_considerations: dict
    demand_signals: list[str]


@router.get("/prices/{crop_name}", response_model=list[CropPriceResponse])
async def get_current_prices(
    crop_name: str,
    latitude: float = Query(..., description="User latitude"),
    longitude: float = Query(..., description="User longitude"),
    radius_km: float = Query(100.0, description="Search radius in kilometers"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current prices for a crop near a location.

    Args:
        crop_name: Name of the crop
        latitude: User's latitude
        longitude: User's longitude
        radius_km: Search radius in kilometers

    Returns:
        List of current crop prices
    """
    try:
        location = Location(latitude=latitude, longitude=longitude)
        market_service = await get_market_service(db)

        prices = await market_service.get_current_prices(crop_name, location, radius_km)

        return [
            CropPriceResponse(
                crop_name=p.crop_name,
                price_per_quintal=p.price_per_quintal,
                mandi_name=p.mandi_name,
                date=p.date.isoformat(),
                location={
                    "latitude": p.location.latitude,
                    "longitude": p.location.longitude,
                    "address": p.location.address,
                    "district": p.location.district,
                    "state": p.location.state,
                },
                quality_grade=p.quality_grade,
                source=p.source,
                previous_price=p.previous_price,
                price_change_percentage=p.price_change_percentage,
            )
            for p in prices
        ]

    except MarketAPIError as e:
        logger.error(f"Market API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/compare/{crop_name}", response_model=PriceComparisonResponse)
async def compare_prices(
    crop_name: str,
    latitude: float = Query(..., description="User latitude"),
    longitude: float = Query(..., description="User longitude"),
    radius_km: float = Query(100.0, description="Search radius in kilometers"),
    db: AsyncSession = Depends(get_db),
):
    """
    Compare prices across multiple mandis.

    Args:
        crop_name: Name of the crop
        latitude: User's latitude
        longitude: User's longitude
        radius_km: Search radius in kilometers

    Returns:
        Price comparison analysis
    """
    try:
        location = Location(latitude=latitude, longitude=longitude)
        market_service = await get_market_service(db)

        comparison = await market_service.compare_prices(crop_name, location, radius_km)

        def to_price_response(p):
            return CropPriceResponse(
                crop_name=p.crop_name,
                price_per_quintal=p.price_per_quintal,
                mandi_name=p.mandi_name,
                date=p.date.isoformat(),
                location={
                    "latitude": p.location.latitude,
                    "longitude": p.location.longitude,
                    "address": p.location.address,
                    "district": p.location.district,
                    "state": p.location.state,
                },
                quality_grade=p.quality_grade,
                source=p.source,
                previous_price=p.previous_price,
                price_change_percentage=p.price_change_percentage,
            )

        return PriceComparisonResponse(
            crop_name=comparison.crop_name,
            prices=[to_price_response(p) for p in comparison.prices],
            highest_price=to_price_response(comparison.highest_price),
            lowest_price=to_price_response(comparison.lowest_price),
            average_price=comparison.average_price,
            price_variance=comparison.price_variance,
            recommendation=comparison.recommendation,
        )

    except MarketAPIError as e:
        logger.error(f"Market API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/trend/{crop_name}", response_model=PriceTrendResponse)
async def analyze_price_trend(
    crop_name: str,
    latitude: float = Query(..., description="User latitude"),
    longitude: float = Query(..., description="User longitude"),
    days: int = Query(30, description="Number of days to analyze"),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze price trends for a crop.

    Args:
        crop_name: Name of the crop
        latitude: User's latitude
        longitude: User's longitude
        days: Number of days to analyze

    Returns:
        Price trend analysis
    """
    try:
        location = Location(latitude=latitude, longitude=longitude)
        market_service = await get_market_service(db)

        trend = await market_service.analyze_price_trend(crop_name, location, days)

        return PriceTrendResponse(
            crop_name=trend.crop_name,
            current_price=trend.current_price,
            trend=trend.trend.value,
            historical_prices=[
                {"date": d.isoformat(), "price": p} for d, p in trend.historical_prices
            ],
            price_change_7d=trend.price_change_7d,
            price_change_30d=trend.price_change_30d,
            forecast_7d=trend.forecast_7d,
            confidence=trend.confidence,
        )

    except MarketAPIError as e:
        logger.error(f"Market API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/intelligence/{crop_name}", response_model=MarketIntelligenceResponse)
async def get_market_intelligence(
    crop_name: str,
    latitude: float = Query(..., description="User latitude"),
    longitude: float = Query(..., description="User longitude"),
    radius_km: float = Query(100.0, description="Search radius in kilometers"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get comprehensive market intelligence with recommendations.

    Args:
        crop_name: Name of the crop
        latitude: User's latitude
        longitude: User's longitude
        radius_km: Search radius in kilometers

    Returns:
        Comprehensive market intelligence
    """
    try:
        location = Location(latitude=latitude, longitude=longitude)
        market_service = await get_market_service(db)

        intelligence = await market_service.generate_market_intelligence(
            crop_name, location, radius_km
        )

        def to_price_response(p):
            return CropPriceResponse(
                crop_name=p.crop_name,
                price_per_quintal=p.price_per_quintal,
                mandi_name=p.mandi_name,
                date=p.date.isoformat(),
                location={
                    "latitude": p.location.latitude,
                    "longitude": p.location.longitude,
                    "address": p.location.address,
                    "district": p.location.district,
                    "state": p.location.state,
                },
                quality_grade=p.quality_grade,
                source=p.source,
                previous_price=p.previous_price,
                price_change_percentage=p.price_change_percentage,
            )

        return MarketIntelligenceResponse(
            crop_name=intelligence.crop_name,
            user_location={
                "latitude": intelligence.user_location.latitude,
                "longitude": intelligence.user_location.longitude,
                "address": intelligence.user_location.address,
            },
            nearest_mandis=intelligence.nearest_mandis,
            price_comparison=(
                PriceComparisonResponse(
                    crop_name=intelligence.price_comparison.crop_name,
                    prices=[
                        to_price_response(p)
                        for p in intelligence.price_comparison.prices
                    ],
                    highest_price=(
                        to_price_response(intelligence.price_comparison.highest_price)
                        if intelligence.price_comparison.highest_price
                        else None
                    ),
                    lowest_price=(
                        to_price_response(intelligence.price_comparison.lowest_price)
                        if intelligence.price_comparison.lowest_price
                        else None
                    ),
                    average_price=intelligence.price_comparison.average_price,
                    price_variance=intelligence.price_comparison.price_variance,
                    recommendation=intelligence.price_comparison.recommendation,
                )
                if intelligence.price_comparison
                else None
            ),
            price_trend=(
                PriceTrendResponse(
                    crop_name=intelligence.price_trend.crop_name,
                    current_price=intelligence.price_trend.current_price,
                    trend=intelligence.price_trend.trend.value,
                    historical_prices=[
                        {"date": d.isoformat(), "price": p}
                        for d, p in intelligence.price_trend.historical_prices
                    ],
                    price_change_7d=intelligence.price_trend.price_change_7d,
                    price_change_30d=intelligence.price_trend.price_change_30d,
                    forecast_7d=intelligence.price_trend.forecast_7d,
                    confidence=intelligence.price_trend.confidence,
                )
                if intelligence.price_trend
                and intelligence.price_trend.historical_prices
                else None
            ),
            recommendation=intelligence.recommendation.value,
            optimal_mandi=intelligence.optimal_mandi,
            reasoning=intelligence.reasoning,
            transport_considerations=intelligence.transport_considerations,
            demand_signals=intelligence.demand_signals,
        )

    except MarketAPIError as e:
        logger.error(f"Market API error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/health")
async def health_check():
    """Health check endpoint for market service."""
    return {"status": "healthy", "service": "market"}
