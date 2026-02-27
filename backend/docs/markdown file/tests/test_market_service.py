"""
Tests for market data service.
"""

import pytest
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy import select

from app.services.market_service import (
    MarketService,
    Location,
    PriceTrend,
    MarketRecommendation,
    MarketAPIError,
)
from app.models.market import MarketPrice


@pytest.fixture
async def market_service(db_session):
    """Create market service instance with database session."""
    service = MarketService(db_session)
    await service.initialize()
    yield service
    await service.close()


@pytest.fixture
async def sample_market_data(db_session):
    """Create sample market data for testing."""
    today = date.today()

    # Create sample market prices
    prices = [
        MarketPrice(
            mandi_name="Delhi Mandi",
            crop_name="wheat",
            price_per_quintal=Decimal("2000.00"),
            date=today,
            location_lat=Decimal("28.6139"),
            location_lng=Decimal("77.2090"),
            location_address="Delhi, India",
            district="Delhi",
            state="Delhi",
            quality_grade="A",
            source="test",
            previous_price=Decimal("1950.00"),
            price_change_percentage=Decimal("2.56"),
        ),
        MarketPrice(
            mandi_name="Gurgaon Mandi",
            crop_name="wheat",
            price_per_quintal=Decimal("2100.00"),
            date=today,
            location_lat=Decimal("28.4595"),
            location_lng=Decimal("77.0266"),
            location_address="Gurgaon, Haryana",
            district="Gurgaon",
            state="Haryana",
            quality_grade="A",
            source="test",
            previous_price=Decimal("2050.00"),
            price_change_percentage=Decimal("2.44"),
        ),
        MarketPrice(
            mandi_name="Noida Mandi",
            crop_name="wheat",
            price_per_quintal=Decimal("1950.00"),
            date=today,
            location_lat=Decimal("28.5355"),
            location_lng=Decimal("77.3910"),
            location_address="Noida, UP",
            district="Gautam Buddha Nagar",
            state="Uttar Pradesh",
            quality_grade="B",
            source="test",
            previous_price=Decimal("1900.00"),
            price_change_percentage=Decimal("2.63"),
        ),
    ]

    # Add historical prices for trend analysis
    for i in range(1, 31):
        past_date = today - timedelta(days=i)
        base_price = 1900 + (i * 2)  # Gradually increasing prices

        prices.append(
            MarketPrice(
                mandi_name="Delhi Mandi",
                crop_name="wheat",
                price_per_quintal=Decimal(str(base_price)),
                date=past_date,
                location_lat=Decimal("28.6139"),
                location_lng=Decimal("77.2090"),
                location_address="Delhi, India",
                district="Delhi",
                state="Delhi",
                source="test",
            )
        )

    db_session.add_all(prices)
    await db_session.commit()

    return prices


@pytest.mark.asyncio
async def test_get_current_prices(market_service, sample_market_data):
    """Test getting current prices for a crop."""
    location = Location(latitude=28.6139, longitude=77.2090)

    prices = await market_service.get_current_prices("wheat", location, radius_km=100.0)

    assert len(prices) > 0
    assert all(p.crop_name == "wheat" for p in prices)
    assert all(p.price_per_quintal > 0 for p in prices)


@pytest.mark.asyncio
async def test_compare_prices(market_service, sample_market_data):
    """Test price comparison across mandis."""
    location = Location(latitude=28.6139, longitude=77.2090)

    comparison = await market_service.compare_prices("wheat", location, radius_km=100.0)

    assert comparison.crop_name == "wheat"
    assert len(comparison.prices) > 0
    assert (
        comparison.highest_price.price_per_quintal
        >= comparison.lowest_price.price_per_quintal
    )
    assert comparison.average_price > 0
    assert comparison.recommendation != ""


@pytest.mark.asyncio
async def test_analyze_price_trend(market_service, sample_market_data):
    """Test price trend analysis."""
    location = Location(latitude=28.6139, longitude=77.2090)

    trend = await market_service.analyze_price_trend("wheat", location, days=30)

    assert trend.crop_name == "wheat"
    assert trend.current_price > 0
    assert trend.trend in [t.value for t in PriceTrend]
    assert len(trend.historical_prices) > 0
    assert trend.forecast_7d is not None


@pytest.mark.asyncio
async def test_generate_market_intelligence(market_service, sample_market_data):
    """Test comprehensive market intelligence generation."""
    location = Location(latitude=28.6139, longitude=77.2090)

    intelligence = await market_service.generate_market_intelligence(
        "wheat", location, radius_km=100.0
    )

    assert intelligence.crop_name == "wheat"
    assert intelligence.price_comparison is not None
    assert intelligence.price_trend is not None
    assert intelligence.recommendation in [r.value for r in MarketRecommendation]
    assert intelligence.reasoning != ""
    assert len(intelligence.demand_signals) > 0


@pytest.mark.asyncio
async def test_price_trend_determination():
    """Test price trend determination logic."""
    service = MarketService()

    # Test rising trend
    trend = service._determine_trend(10.0, 8.0)
    assert trend == PriceTrend.RISING

    # Test falling trend
    trend = service._determine_trend(-10.0, -8.0)
    assert trend == PriceTrend.FALLING

    # Test stable trend
    trend = service._determine_trend(2.0, 1.0)
    assert trend == PriceTrend.STABLE

    # Test volatile trend
    trend = service._determine_trend(15.0, -5.0)
    assert trend == PriceTrend.VOLATILE


@pytest.mark.asyncio
async def test_forecast_price():
    """Test price forecasting logic."""
    service = MarketService()

    # Create sample historical prices
    today = date.today()
    historical_prices = [
        (today - timedelta(days=i), 1900 + (i * 10)) for i in range(7, 0, -1)
    ]

    forecast = service._forecast_price(historical_prices, days_ahead=7)

    assert forecast > 0
    # Forecast should be reasonable based on trend
    assert 1800 < forecast < 2200


@pytest.mark.asyncio
async def test_no_data_error(market_service):
    """Test error handling when no data is available."""
    location = Location(latitude=0.0, longitude=0.0)

    with pytest.raises(MarketAPIError):
        await market_service.compare_prices("nonexistent_crop", location)


@pytest.mark.asyncio
async def test_cache_functionality(market_service, sample_market_data):
    """Test that caching works correctly."""
    location = Location(latitude=28.6139, longitude=77.2090)

    # First call - should hit database
    prices1 = await market_service.get_current_prices("wheat", location)

    # Second call - should hit cache
    prices2 = await market_service.get_current_prices("wheat", location)

    assert len(prices1) == len(prices2)
    assert prices1[0].price_per_quintal == prices2[0].price_per_quintal


@pytest.mark.asyncio
async def test_distance_calculation():
    """Test distance calculation between locations."""
    service = MarketService()

    loc1 = Location(latitude=28.6139, longitude=77.2090)  # Delhi
    loc2 = Location(latitude=28.4595, longitude=77.0266)  # Gurgaon

    distance = service._calculate_simple_distance(loc1, loc2)

    # Distance should be approximately 25-30 km
    assert 20 < distance < 35


@pytest.mark.asyncio
async def test_demand_signals_generation():
    """Test demand signal generation."""
    service = MarketService()

    from app.services.market_service import PriceTrendData

    # Rising trend
    trend_data = PriceTrendData(
        crop_name="wheat",
        current_price=2000.0,
        trend=PriceTrend.RISING,
        historical_prices=[],
        price_change_7d=15.0,
        price_change_30d=20.0,
        forecast_7d=2100.0,
    )

    signals = service._generate_demand_signals(trend_data)

    assert len(signals) > 0
    assert any("demand" in s.lower() for s in signals)


@pytest.mark.asyncio
async def test_transport_considerations():
    """Test transport cost considerations calculation."""
    service = MarketService()

    from app.services.market_service import PriceComparison, CropPrice

    nearest_mandis = [
        {
            "name": "Delhi Mandi",
            "distance_km": 10.0,
            "transport_cost": 50.0,
        },
        {
            "name": "Gurgaon Mandi",
            "distance_km": 25.0,
            "transport_cost": 125.0,
        },
    ]

    location = Location(latitude=28.6139, longitude=77.2090)

    price1 = CropPrice(
        crop_name="wheat",
        price_per_quintal=2000.0,
        mandi_name="Delhi Mandi",
        date=date.today(),
        location=location,
    )

    price2 = CropPrice(
        crop_name="wheat",
        price_per_quintal=2100.0,
        mandi_name="Gurgaon Mandi",
        date=date.today(),
        location=location,
    )

    comparison = PriceComparison(
        crop_name="wheat",
        prices=[price1, price2],
        highest_price=price2,
        lowest_price=price1,
        average_price=2050.0,
        price_variance=2500.0,
        recommendation="Test",
    )

    considerations = service._calculate_transport_considerations(
        nearest_mandis, comparison
    )

    assert "nearest_mandi" in considerations
    assert "nearest_distance_km" in considerations
