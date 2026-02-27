"""
Market data service for the AI-Driven Agri-Civic Intelligence Platform.

This service provides comprehensive market intelligence including:
- Real-time mandi price data retrieval
- Price comparison across multiple locations
- Price trend analysis and forecasting
- Market intelligence generation with LLM analysis
- Integration with Maps API for location-based recommendations
"""

import asyncio
import logging
import time
import hashlib
import json
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from enum import Enum
from decimal import Decimal

import aiohttp
import redis.asyncio as redis
from sqlalchemy import select, and_, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.logging import get_logger
from app.models.market import MarketPrice
from app.services.maps_service import Location, get_maps_service, MapsService

# Configure logging
logger = get_logger(__name__)


class PriceTrend(str, Enum):
    """Price trend indicators."""

    RISING = "rising"
    FALLING = "falling"
    STABLE = "stable"
    VOLATILE = "volatile"


class MarketRecommendation(str, Enum):
    """Market selling recommendations."""

    SELL_NOW = "sell_now"
    WAIT = "wait"
    SELL_SOON = "sell_soon"
    MONITOR = "monitor"


@dataclass
class CropPrice:
    """Crop price information."""

    crop_name: str
    price_per_quintal: float
    mandi_name: str
    date: date
    location: Location
    quality_grade: Optional[str] = None
    source: Optional[str] = None
    previous_price: Optional[float] = None
    price_change_percentage: Optional[float] = None


@dataclass
class PriceComparison:
    """Price comparison across multiple mandis."""

    crop_name: str
    prices: List[CropPrice]
    highest_price: CropPrice
    lowest_price: CropPrice
    average_price: float
    price_variance: float
    recommendation: str


@dataclass
class PriceTrendData:
    """Price trend analysis data."""

    crop_name: str
    current_price: float
    trend: PriceTrend
    historical_prices: List[Tuple[date, float]]
    price_change_7d: float
    price_change_30d: float
    forecast_7d: Optional[float] = None
    confidence: float = 0.0


@dataclass
class MarketIntelligence:
    """Comprehensive market intelligence."""

    crop_name: str
    user_location: Location
    nearest_mandis: List[Dict[str, Any]]
    price_comparison: PriceComparison
    price_trend: PriceTrendData
    recommendation: MarketRecommendation
    optimal_mandi: Optional[Dict[str, Any]] = None
    reasoning: str = ""
    transport_considerations: Dict[str, Any] = field(default_factory=dict)
    demand_signals: List[str] = field(default_factory=list)


class MarketAPIError(Exception):
    """Custom exception for market API errors."""

    pass


class MarketService:
    """
    Market data service for price intelligence and recommendations.

    Features:
    - Real-time mandi price data retrieval
    - Price comparison across multiple locations
    - Historical price trend analysis
    - Market intelligence generation
    - Integration with Maps API for location-based recommendations
    - Redis caching for performance
    - Circuit breaker pattern for resilience
    """

    def __init__(self, db_session: Optional[AsyncSession] = None):
        """Initialize market service with configuration."""
        self.settings = get_settings()
        self.db_session = db_session
        self.cache_ttl = 3600  # 1 hour cache for market data
        self.redis_client: Optional[redis.Redis] = None
        self.maps_service: Optional[MapsService] = None

        # Circuit breaker configuration
        self.failure_threshold = 5
        self.failure_timeout = 60  # seconds
        self.failure_count = 0
        self.last_failure_time = 0
        self.circuit_open = False

        # Market data API configuration (placeholder for actual API)
        self.market_api_base_url = "https://api.data.gov.in/resource"  # Example
        self.market_api_key = ""  # Would be configured in settings

    async def initialize(self):
        """Initialize Redis connection and Maps service."""
        try:
            self.redis_client = redis.from_url(
                self.settings.redis_url, encoding="utf-8", decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Market service Redis connection established")
        except Exception as e:
            logger.warning(f"Redis connection failed, caching disabled: {e}")
            self.redis_client = None

        # Initialize Maps service
        try:
            self.maps_service = await get_maps_service()
            logger.info("Market service Maps integration established")
        except Exception as e:
            logger.warning(f"Maps service initialization failed: {e}")
            self.maps_service = None

    async def close(self):
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()

    def _generate_cache_key(self, operation: str, params: str) -> str:
        """Generate cache key for market data."""
        params_hash = hashlib.md5(params.encode()).hexdigest()
        return f"market:{operation}:{params_hash}"

    async def _get_cached_data(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached market data."""
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
        """Store market data in cache."""
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
        if not self.circuit_open:
            return False

        # Check if timeout has passed
        if time.time() - self.last_failure_time > self.failure_timeout:
            logger.info("Circuit breaker timeout passed, attempting to close")
            self.circuit_open = False
            self.failure_count = 0
            return False

        return True

    def _record_failure(self):
        """Record API failure for circuit breaker."""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.failure_count >= self.failure_threshold:
            self.circuit_open = True
            logger.error(f"Circuit breaker opened after {self.failure_count} failures")

    def _record_success(self):
        """Record successful API call."""
        self.failure_count = 0
        self.circuit_open = False

    async def _fetch_from_external_api(
        self, endpoint: str, params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Fetch market data from external API.

        This is a placeholder implementation. In production, this would connect
        to actual mandi price APIs like:
        - Agmarknet API (https://agmarknet.gov.in/)
        - Data.gov.in agricultural APIs
        - State-specific mandi APIs
        """
        if self._check_circuit_breaker():
            raise MarketAPIError("Circuit breaker is open, API temporarily unavailable")

        # Placeholder implementation - would be replaced with actual API calls
        logger.info(f"Fetching market data from external API: {endpoint}")

        # For now, return empty data structure
        # In production, this would make actual HTTP requests
        return {"status": "success", "data": []}

    async def get_current_prices(
        self, crop_name: str, location: Location, radius_km: float = 100.0
    ) -> List[CropPrice]:
        """
        Get current prices for a crop near a location.

        Args:
            crop_name: Name of the crop
            location: User's location
            radius_km: Search radius in kilometers

        Returns:
            List of CropPrice objects

        Raises:
            MarketAPIError: If price retrieval fails
        """
        if not self.db_session:
            raise MarketAPIError("Database session not available")

        cache_params = (
            f"{crop_name}|{location.latitude},{location.longitude}|{radius_km}"
        )
        cache_key = self._generate_cache_key("current_prices", cache_params)

        # Try to get from cache
        cached_data = await self._get_cached_data(cache_key)
        if cached_data:
            return self._parse_crop_prices(cached_data)

        try:
            # Query database for recent prices
            today = date.today()
            week_ago = today - timedelta(days=7)

            # Build query to find prices near location
            query = (
                select(MarketPrice)
                .where(
                    and_(
                        MarketPrice.crop_name == crop_name,
                        MarketPrice.date >= week_ago,
                        MarketPrice.date <= today,
                    )
                )
                .order_by(desc(MarketPrice.date))
            )

            result = await self.db_session.execute(query)
            market_prices = result.scalars().all()

            # Filter by distance if location data is available
            crop_prices = []
            for mp in market_prices:
                if mp.location_lat and mp.location_lng:
                    mandi_location = Location(
                        latitude=float(mp.location_lat),
                        longitude=float(mp.location_lng),
                        address=mp.location_address or "",
                        district=mp.district or "",
                        state=mp.state or "",
                    )

                    # Calculate distance using Maps service if available
                    if self.maps_service:
                        distance = self.maps_service.calculate_haversine_distance(
                            location, mandi_location
                        )
                    else:
                        # Fallback to simple calculation
                        distance = self._calculate_simple_distance(
                            location, mandi_location
                        )

                    if distance <= radius_km:
                        crop_price = CropPrice(
                            crop_name=mp.crop_name,
                            price_per_quintal=float(mp.price_per_quintal),
                            mandi_name=mp.mandi_name,
                            date=mp.date,
                            location=mandi_location,
                            quality_grade=mp.quality_grade,
                            source=mp.source,
                            previous_price=(
                                float(mp.previous_price) if mp.previous_price else None
                            ),
                            price_change_percentage=(
                                float(mp.price_change_percentage)
                                if mp.price_change_percentage
                                else None
                            ),
                        )
                        crop_prices.append(crop_price)

            # Cache the results
            cache_data = self._serialize_crop_prices(crop_prices)
            await self._set_cached_data(cache_key, cache_data)

            return crop_prices

        except Exception as e:
            logger.error(f"Failed to get current prices: {e}")
            raise MarketAPIError(f"Failed to retrieve market prices: {str(e)}")

    def _calculate_simple_distance(self, loc1: Location, loc2: Location) -> float:
        """Simple distance calculation using Haversine formula."""
        from math import radians, sin, cos, sqrt, atan2

        R = 6371.0  # Earth radius in kilometers

        lat1 = radians(loc1.latitude)
        lon1 = radians(loc1.longitude)
        lat2 = radians(loc2.latitude)
        lon2 = radians(loc2.longitude)

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return R * c

    def _serialize_crop_prices(self, crop_prices: List[CropPrice]) -> Dict[str, Any]:
        """Serialize crop prices for caching."""
        return {
            "prices": [
                {
                    "crop_name": cp.crop_name,
                    "price_per_quintal": cp.price_per_quintal,
                    "mandi_name": cp.mandi_name,
                    "date": cp.date.isoformat(),
                    "location": {
                        "latitude": cp.location.latitude,
                        "longitude": cp.location.longitude,
                        "address": cp.location.address,
                        "district": cp.location.district,
                        "state": cp.location.state,
                    },
                    "quality_grade": cp.quality_grade,
                    "source": cp.source,
                    "previous_price": cp.previous_price,
                    "price_change_percentage": cp.price_change_percentage,
                }
                for cp in crop_prices
            ]
        }

    def _parse_crop_prices(self, data: Dict[str, Any]) -> List[CropPrice]:
        """Parse cached crop price data."""
        crop_prices = []
        for price_data in data.get("prices", []):
            location_data = price_data.get("location", {})
            location = Location(
                latitude=location_data.get("latitude", 0.0),
                longitude=location_data.get("longitude", 0.0),
                address=location_data.get("address", ""),
                district=location_data.get("district", ""),
                state=location_data.get("state", ""),
            )

            crop_price = CropPrice(
                crop_name=price_data.get("crop_name", ""),
                price_per_quintal=price_data.get("price_per_quintal", 0.0),
                mandi_name=price_data.get("mandi_name", ""),
                date=date.fromisoformat(
                    price_data.get("date", date.today().isoformat())
                ),
                location=location,
                quality_grade=price_data.get("quality_grade"),
                source=price_data.get("source"),
                previous_price=price_data.get("previous_price"),
                price_change_percentage=price_data.get("price_change_percentage"),
            )
            crop_prices.append(crop_price)

        return crop_prices

    async def compare_prices(
        self, crop_name: str, location: Location, radius_km: float = 100.0
    ) -> PriceComparison:
        """
        Compare prices across multiple mandis.

        Args:
            crop_name: Name of the crop
            location: User's location
            radius_km: Search radius in kilometers

        Returns:
            PriceComparison object with analysis

        Raises:
            MarketAPIError: If comparison fails
        """
        try:
            # Get current prices
            prices = await self.get_current_prices(crop_name, location, radius_km)

            if not prices:
                raise MarketAPIError(
                    f"No price data available for {crop_name} within {radius_km}km"
                )

            # Calculate statistics
            price_values = [p.price_per_quintal for p in prices]
            average_price = sum(price_values) / len(price_values)

            # Calculate variance
            variance = sum((p - average_price) ** 2 for p in price_values) / len(
                price_values
            )

            # Find highest and lowest prices
            highest_price = max(prices, key=lambda p: p.price_per_quintal)
            lowest_price = min(prices, key=lambda p: p.price_per_quintal)

            # Generate recommendation
            price_diff_percentage = (
                (highest_price.price_per_quintal - lowest_price.price_per_quintal)
                / lowest_price.price_per_quintal
                * 100
            )

            if price_diff_percentage > 20:
                recommendation = (
                    f"Significant price variation detected ({price_diff_percentage:.1f}%). "
                    f"Consider selling at {highest_price.mandi_name} for best returns."
                )
            elif price_diff_percentage > 10:
                recommendation = (
                    f"Moderate price variation ({price_diff_percentage:.1f}%). "
                    f"Compare transport costs before deciding."
                )
            else:
                recommendation = (
                    f"Prices are relatively stable ({price_diff_percentage:.1f}% variation). "
                    f"Choose nearest mandi for convenience."
                )

            return PriceComparison(
                crop_name=crop_name,
                prices=prices,
                highest_price=highest_price,
                lowest_price=lowest_price,
                average_price=average_price,
                price_variance=variance,
                recommendation=recommendation,
            )

        except MarketAPIError:
            raise
        except Exception as e:
            logger.error(f"Failed to compare prices: {e}")
            raise MarketAPIError(f"Price comparison failed: {str(e)}")

    async def analyze_price_trend(
        self, crop_name: str, location: Location, days: int = 30
    ) -> PriceTrendData:
        """
        Analyze price trends for a crop.

        Args:
            crop_name: Name of the crop
            location: User's location
            days: Number of days to analyze

        Returns:
            PriceTrendData object with trend analysis

        Raises:
            MarketAPIError: If analysis fails
        """
        if not self.db_session:
            raise MarketAPIError("Database session not available")

        cache_params = f"{crop_name}|{location.latitude},{location.longitude}|{days}"
        cache_key = self._generate_cache_key("price_trend", cache_params)

        # Try to get from cache
        cached_data = await self._get_cached_data(cache_key)
        if cached_data:
            return self._parse_price_trend(cached_data)

        try:
            # Query historical prices
            end_date = date.today()
            start_date = end_date - timedelta(days=days)

            query = (
                select(MarketPrice)
                .where(
                    and_(
                        MarketPrice.crop_name == crop_name,
                        MarketPrice.date >= start_date,
                        MarketPrice.date <= end_date,
                    )
                )
                .order_by(MarketPrice.date)
            )

            result = await self.db_session.execute(query)
            market_prices = result.scalars().all()

            if not market_prices:
                raise MarketAPIError(f"No historical data available for {crop_name}")

            # Build historical price list
            historical_prices = [
                (mp.date, float(mp.price_per_quintal)) for mp in market_prices
            ]

            # Get current price
            current_price = historical_prices[-1][1] if historical_prices else 0.0

            # Calculate price changes
            price_7d_ago = None
            price_30d_ago = None

            date_7d_ago = end_date - timedelta(days=7)
            date_30d_ago = end_date - timedelta(days=30)

            for price_date, price in historical_prices:
                if price_date <= date_7d_ago and price_7d_ago is None:
                    price_7d_ago = price
                if price_date <= date_30d_ago and price_30d_ago is None:
                    price_30d_ago = price

            price_change_7d = (
                ((current_price - price_7d_ago) / price_7d_ago * 100)
                if price_7d_ago
                else 0.0
            )
            price_change_30d = (
                ((current_price - price_30d_ago) / price_30d_ago * 100)
                if price_30d_ago
                else 0.0
            )

            # Determine trend
            trend = self._determine_trend(price_change_7d, price_change_30d)

            # Simple forecast (moving average)
            forecast_7d = self._forecast_price(historical_prices, 7)

            trend_data = PriceTrendData(
                crop_name=crop_name,
                current_price=current_price,
                trend=trend,
                historical_prices=historical_prices,
                price_change_7d=price_change_7d,
                price_change_30d=price_change_30d,
                forecast_7d=forecast_7d,
                confidence=0.7,  # Placeholder confidence score
            )

            # Cache the results
            cache_data = self._serialize_price_trend(trend_data)
            await self._set_cached_data(cache_key, cache_data)

            return trend_data

        except MarketAPIError:
            raise
        except Exception as e:
            logger.error(f"Failed to analyze price trend: {e}")
            raise MarketAPIError(f"Price trend analysis failed: {str(e)}")

    def _determine_trend(
        self, price_change_7d: float, price_change_30d: float
    ) -> PriceTrend:
        """Determine price trend based on recent changes."""
        # Check for volatility
        if abs(price_change_7d - price_change_30d) > 15:
            return PriceTrend.VOLATILE

        # Check for rising trend
        if price_change_7d > 5 and price_change_30d > 5:
            return PriceTrend.RISING

        # Check for falling trend
        if price_change_7d < -5 and price_change_30d < -5:
            return PriceTrend.FALLING

        # Otherwise stable
        return PriceTrend.STABLE

    def _forecast_price(
        self, historical_prices: List[Tuple[date, float]], days_ahead: int
    ) -> float:
        """
        Simple price forecast using moving average.

        In production, this would use more sophisticated forecasting models.
        """
        if len(historical_prices) < 7:
            return historical_prices[-1][1] if historical_prices else 0.0

        # Use last 7 days for moving average
        recent_prices = [p[1] for p in historical_prices[-7:]]
        moving_avg = sum(recent_prices) / len(recent_prices)

        # Calculate trend
        if len(recent_prices) >= 2:
            trend = (recent_prices[-1] - recent_prices[0]) / len(recent_prices)
            forecast = moving_avg + (trend * days_ahead)
        else:
            forecast = moving_avg

        return max(0.0, forecast)  # Ensure non-negative price

    def _serialize_price_trend(self, trend_data: PriceTrendData) -> Dict[str, Any]:
        """Serialize price trend data for caching."""
        return {
            "crop_name": trend_data.crop_name,
            "current_price": trend_data.current_price,
            "trend": trend_data.trend.value,
            "historical_prices": [
                {"date": d.isoformat(), "price": p}
                for d, p in trend_data.historical_prices
            ],
            "price_change_7d": trend_data.price_change_7d,
            "price_change_30d": trend_data.price_change_30d,
            "forecast_7d": trend_data.forecast_7d,
            "confidence": trend_data.confidence,
        }

    def _parse_price_trend(self, data: Dict[str, Any]) -> PriceTrendData:
        """Parse cached price trend data."""
        historical_prices = [
            (date.fromisoformat(item["date"]), item["price"])
            for item in data.get("historical_prices", [])
        ]

        return PriceTrendData(
            crop_name=data.get("crop_name", ""),
            current_price=data.get("current_price", 0.0),
            trend=PriceTrend(data.get("trend", "stable")),
            historical_prices=historical_prices,
            price_change_7d=data.get("price_change_7d", 0.0),
            price_change_30d=data.get("price_change_30d", 0.0),
            forecast_7d=data.get("forecast_7d"),
            confidence=data.get("confidence", 0.0),
        )

    async def _get_nearest_mandis_from_db(
        self, crop_name: str, user_location: Location, radius_km: float
    ) -> List[Dict[str, Any]]:
        """
        Get nearest mandis from database as fallback when Maps service is unavailable.

        Args:
            crop_name: Name of the crop
            user_location: User's location
            radius_km: Search radius in kilometers

        Returns:
            List of nearest mandis with distance and location info
        """
        if not self.db_session:
            return []

        # Get unique mandis from market prices for this crop
        result = await self.db_session.execute(
            select(
                MarketPrice.mandi_name,
                MarketPrice.location_lat,
                MarketPrice.location_lng,
                MarketPrice.location_address,
                MarketPrice.district,
                MarketPrice.state,
            )
            .where(MarketPrice.crop_name == crop_name)
            .where(MarketPrice.location_lat.isnot(None))
            .where(MarketPrice.location_lng.isnot(None))
            .distinct(MarketPrice.mandi_name)
        )

        mandis_data = result.all()

        # Calculate distances and filter by radius
        nearest_mandis = []
        for mandi in mandis_data:
            mandi_location = Location(
                latitude=float(mandi.location_lat),
                longitude=float(mandi.location_lng),
                address=mandi.location_address or "",
                district=mandi.district or "",
                state=mandi.state or "",
            )

            distance = self._calculate_simple_distance(user_location, mandi_location)

            if distance <= radius_km:
                # Estimate transport cost (simple calculation: ₹10 per km)
                transport_cost = distance * 10

                nearest_mandis.append(
                    {
                        "name": mandi.mandi_name,
                        "distance_km": round(distance, 2),
                        "latitude": float(mandi.location_lat),
                        "longitude": float(mandi.location_lng),
                        "state": mandi.state or "",
                        "district": mandi.district or "",
                        "location": {
                            "latitude": float(mandi.location_lat),
                            "longitude": float(mandi.location_lng),
                            "address": mandi.location_address or "",
                        },
                        "transport_cost": round(transport_cost, 2),
                    }
                )

        # Sort by distance and limit to 10
        nearest_mandis.sort(key=lambda x: x["distance_km"])
        return nearest_mandis[:10]

    async def generate_market_intelligence(
        self, crop_name: str, user_location: Location, radius_km: float = 100.0
    ) -> MarketIntelligence:
        """
        Generate comprehensive market intelligence with recommendations.

        Args:
            crop_name: Name of the crop
            user_location: User's location
            radius_km: Search radius in kilometers

        Returns:
            MarketIntelligence object with comprehensive analysis

        Raises:
            MarketAPIError: If intelligence generation fails completely
        """
        try:
            # Get nearest mandis using Maps service or fallback to database
            nearest_mandis = []
            if self.maps_service:
                try:
                    mandi_infos = await self.maps_service.find_nearest_mandis(
                        user_location, max_results=10, max_distance_km=radius_km
                    )
                    nearest_mandis = [
                        {
                            "name": m.name,
                            "distance_km": m.distance_km,
                            "location": {
                                "latitude": m.location.latitude,
                                "longitude": m.location.longitude,
                                "address": m.location.address,
                            },
                            "transport_cost": m.transport_cost_estimate,
                        }
                        for m in mandi_infos
                    ]
                except Exception as e:
                    logger.warning(
                        f"Failed to get nearest mandis from Maps service: {e}"
                    )

            # Fallback: Get mandis from database if Maps service failed or unavailable
            if not nearest_mandis and self.db_session:
                try:
                    nearest_mandis = await self._get_nearest_mandis_from_db(
                        crop_name, user_location, radius_km
                    )
                    logger.info(
                        f"Found {len(nearest_mandis)} mandis from database fallback"
                    )
                except Exception as e:
                    logger.warning(f"Failed to get nearest mandis from database: {e}")

            # Get price comparison (allow failure - not all crops may have price data)
            price_comparison = None
            try:
                price_comparison = await self.compare_prices(
                    crop_name, user_location, radius_km
                )
            except MarketAPIError as e:
                logger.warning(f"Price comparison unavailable: {e}")
                # Create empty price comparison if no data available
                if nearest_mandis:
                    # We have mandis but no price data - create minimal comparison
                    price_comparison = PriceComparison(
                        crop_name=crop_name,
                        prices=[],
                        highest_price=None,
                        lowest_price=None,
                        average_price=0.0,
                        price_variance=0.0,
                        recommendation="Price data not available for this crop in your area.",
                    )

            # Get price trend (allow failure)
            price_trend = None
            try:
                price_trend = await self.analyze_price_trend(crop_name, user_location)
            except MarketAPIError as e:
                logger.warning(f"Price trend unavailable: {e}")
                # Create minimal trend data
                price_trend = PriceTrendData(
                    crop_name=crop_name,
                    current_price=0.0,
                    trend=PriceTrend.STABLE,
                    historical_prices=[],
                    price_change_7d=0.0,
                    price_change_30d=0.0,
                    forecast_7d=None,
                    confidence=0.0,
                )

            # Ensure we have at least mandis or price data
            if not nearest_mandis and not (
                price_comparison and price_comparison.prices
            ):
                raise MarketAPIError(
                    f"No market data available for {crop_name} within {radius_km}km. "
                    "Try selecting a different location or crop."
                )

            # Generate recommendation
            recommendation, reasoning, optimal_mandi = self._generate_recommendation(
                price_comparison, price_trend, nearest_mandis
            )

            # Generate demand signals
            demand_signals = (
                self._generate_demand_signals(price_trend) if price_trend else []
            )

            # Calculate transport considerations
            transport_considerations = (
                self._calculate_transport_considerations(
                    nearest_mandis, price_comparison
                )
                if price_comparison
                else {}
            )

            return MarketIntelligence(
                crop_name=crop_name,
                user_location=user_location,
                nearest_mandis=nearest_mandis,
                price_comparison=price_comparison,
                price_trend=price_trend,
                recommendation=recommendation,
                optimal_mandi=optimal_mandi,
                reasoning=reasoning,
                transport_considerations=transport_considerations,
                demand_signals=demand_signals,
            )

        except MarketAPIError:
            raise
        except Exception as e:
            logger.error(f"Failed to generate market intelligence: {e}")
            raise MarketAPIError(f"Market intelligence generation failed: {str(e)}")

    def _generate_recommendation(
        self,
        price_comparison: Optional[PriceComparison],
        price_trend: Optional[PriceTrendData],
        nearest_mandis: List[Dict[str, Any]],
    ) -> Tuple[MarketRecommendation, str, Optional[Dict[str, Any]]]:
        """Generate selling recommendation based on market analysis."""
        reasoning_parts = []
        optimal_mandi = None

        # If no price data available, provide basic recommendation
        if not price_trend or not price_comparison or not price_comparison.prices:
            if nearest_mandis:
                recommendation = MarketRecommendation.MONITOR
                reasoning_parts.append(
                    f"Found {len(nearest_mandis)} mandis nearby. "
                    "Price data is currently unavailable. Contact mandis directly for current rates."
                )
                # Recommend nearest mandi
                if nearest_mandis:
                    nearest = nearest_mandis[0]
                    reasoning_parts.append(
                        f"Nearest mandi: {nearest['name']} "
                        f"({nearest['distance_km']:.1f}km away)"
                    )
            else:
                recommendation = MarketRecommendation.MONITOR
                reasoning_parts.append(
                    "Market data is currently unavailable. Please try again later or contact local mandis."
                )

            reasoning = " ".join(reasoning_parts)
            return recommendation, reasoning, optimal_mandi

        # Analyze price trend
        if price_trend.trend == PriceTrend.RISING:
            if price_trend.price_change_7d > 10:
                recommendation = MarketRecommendation.SELL_NOW
                reasoning_parts.append(
                    f"Prices are rising rapidly (+{price_trend.price_change_7d:.1f}% in 7 days). "
                    "Sell now to capitalize on high prices."
                )
            else:
                recommendation = MarketRecommendation.MONITOR
                reasoning_parts.append(
                    f"Prices are rising moderately (+{price_trend.price_change_7d:.1f}%). "
                    "Monitor for further increases."
                )
        elif price_trend.trend == PriceTrend.FALLING:
            recommendation = MarketRecommendation.SELL_NOW
            reasoning_parts.append(
                f"Prices are falling ({price_trend.price_change_7d:.1f}% in 7 days). "
                "Sell soon to avoid further losses."
            )
        elif price_trend.trend == PriceTrend.VOLATILE:
            recommendation = MarketRecommendation.WAIT
            reasoning_parts.append(
                "Market is volatile. Wait for price stabilization before selling."
            )
        else:
            recommendation = MarketRecommendation.SELL_SOON
            reasoning_parts.append(
                "Prices are stable. Good time to sell at current market rates."
            )

        # Find optimal mandi considering price and distance
        if price_comparison.prices and nearest_mandis:
            # Create a scoring system: higher price + lower distance = better
            best_score = -float("inf")

            for price_info in price_comparison.prices:
                # Find matching mandi in nearest_mandis
                matching_mandi = None
                for mandi in nearest_mandis:
                    if mandi["name"] == price_info.mandi_name:
                        matching_mandi = mandi
                        break

                if matching_mandi:
                    # Score = price benefit - transport cost
                    price_benefit = price_info.price_per_quintal
                    transport_cost = matching_mandi["transport_cost"]
                    net_benefit = price_benefit - (transport_cost / 100)  # Normalize

                    if net_benefit > best_score:
                        best_score = net_benefit
                        optimal_mandi = {
                            "name": price_info.mandi_name,
                            "price": price_info.price_per_quintal,
                            "distance_km": matching_mandi["distance_km"],
                            "transport_cost": transport_cost,
                            "net_benefit": net_benefit,
                        }

            if optimal_mandi:
                reasoning_parts.append(
                    f"Recommended mandi: {optimal_mandi['name']} "
                    f"(₹{optimal_mandi['price']:.2f}/quintal, "
                    f"{optimal_mandi['distance_km']:.1f}km away, "
                    f"transport cost: ₹{optimal_mandi['transport_cost']:.2f})"
                )

        reasoning = " ".join(reasoning_parts)
        return recommendation, reasoning, optimal_mandi

    def _generate_demand_signals(self, price_trend: PriceTrendData) -> List[str]:
        """Generate demand signals based on price trends."""
        signals = []

        if price_trend.trend == PriceTrend.RISING:
            signals.append("High demand indicated by rising prices")
            if price_trend.price_change_7d > 15:
                signals.append("Strong buying pressure in the market")
        elif price_trend.trend == PriceTrend.FALLING:
            signals.append("Weak demand indicated by falling prices")
            if price_trend.price_change_7d < -15:
                signals.append("Oversupply or low demand in the market")
        elif price_trend.trend == PriceTrend.VOLATILE:
            signals.append("Uncertain market conditions with high volatility")
        else:
            signals.append("Stable demand-supply balance")

        # Add forecast signal if available
        if price_trend.forecast_7d:
            forecast_change = (
                (price_trend.forecast_7d - price_trend.current_price)
                / price_trend.current_price
                * 100
            )
            if abs(forecast_change) > 5:
                direction = "increase" if forecast_change > 0 else "decrease"
                signals.append(
                    f"Forecast suggests {abs(forecast_change):.1f}% {direction} in next 7 days"
                )

        return signals

    def _calculate_transport_considerations(
        self,
        nearest_mandis: List[Dict[str, Any]],
        price_comparison: Optional[PriceComparison],
    ) -> Dict[str, Any]:
        """Calculate transport cost considerations."""
        if not nearest_mandis:
            return {}

        # Find nearest mandi
        nearest = min(nearest_mandis, key=lambda m: m["distance_km"])

        # Calculate if traveling to higher-price mandi is worth it
        if price_comparison and price_comparison.prices:
            highest_price_mandi = price_comparison.highest_price.mandi_name
            highest_price = price_comparison.highest_price.price_per_quintal

            # Find transport cost to highest price mandi
            highest_price_mandi_info = None
            for mandi in nearest_mandis:
                if mandi["name"] == highest_price_mandi:
                    highest_price_mandi_info = mandi
                    break

            if highest_price_mandi_info:
                # Calculate net benefit per quintal
                price_diff = highest_price - price_comparison.average_price
                transport_cost_per_quintal = (
                    highest_price_mandi_info["transport_cost"] / 100
                )  # Assuming 100 quintals
                net_benefit = price_diff - transport_cost_per_quintal

                return {
                    "nearest_mandi": nearest["name"],
                    "nearest_distance_km": nearest["distance_km"],
                    "highest_price_mandi": highest_price_mandi,
                    "worth_traveling": net_benefit > 0,
                    "net_benefit_per_quintal": net_benefit,
                    "recommendation": (
                        f"Travel to {highest_price_mandi} for ₹{net_benefit:.2f} extra per quintal"
                        if net_benefit > 0
                        else f"Sell at nearest mandi ({nearest['name']}) for convenience"
                    ),
                }

        return {
            "nearest_mandi": nearest["name"],
            "nearest_distance_km": nearest["distance_km"],
        }


# Global market service instance
_market_service: Optional[MarketService] = None


async def get_market_service(
    db_session: Optional[AsyncSession] = None,
) -> MarketService:
    """Get or create market service instance."""
    global _market_service

    if _market_service is None or db_session is not None:
        _market_service = MarketService(db_session)
        await _market_service.initialize()

    return _market_service


async def close_market_service():
    """Close market service and cleanup resources."""
    global _market_service

    if _market_service:
        await _market_service.close()
        _market_service = None
