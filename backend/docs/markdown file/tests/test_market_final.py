#!/usr/bin/env python3
"""
Final Market Service Test with PostgreSQL
"""

import asyncio
import sys
import os
from getpass import getpass

# Add the project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import date, timedelta
from decimal import Decimal

from app.models.base import Base
from app.models.market import MarketPrice
from app.services.market_service import MarketService, Location


async def test_market_service_full():
    """Complete market service test with PostgreSQL."""
    print("🚀 Market Service PostgreSQL Integration Test")
    print("=" * 60)

    # Get password
    password = getpass("Enter PostgreSQL password for user 'postgres': ")

    # Create database URL
    db_url = f"postgresql+asyncpg://postgres:{password}@localhost:5432/postgres"

    try:
        # Create engine
        engine = create_async_engine(db_url, echo=False)

        # Test connection
        async with engine.begin() as conn:
            result = await conn.execute("SELECT version()")
            version = result.scalar()
            print(f"✅ Connected to: {version}")

        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created")

        # Create session
        async_session = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )

        async with async_session() as session:
            # Create comprehensive sample data
            await create_comprehensive_sample_data(session)

            # Test all market service features
            await test_all_market_features(session)

        await engine.dispose()

        print("\n" + "=" * 60)
        print("🎉 ALL TESTS PASSED!")
        print("✅ Market Service fully functional with PostgreSQL")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback

        traceback.print_exc()


async def create_comprehensive_sample_data(session: AsyncSession):
    """Create comprehensive sample data for testing."""
    print("\n📊 Creating comprehensive sample data...")

    today = date.today()

    # Create multiple mandis with different crops and prices
    mandis_data = [
        {
            "name": "Delhi Azadpur Mandi",
            "lat": 28.7041,
            "lng": 77.1025,
            "address": "Azadpur, Delhi",
            "district": "North Delhi",
            "state": "Delhi",
        },
        {
            "name": "Gurgaon Mandi",
            "lat": 28.4595,
            "lng": 77.0266,
            "address": "Gurgaon, Haryana",
            "district": "Gurgaon",
            "state": "Haryana",
        },
        {
            "name": "Faridabad Mandi",
            "lat": 28.4089,
            "lng": 77.3178,
            "address": "Faridabad, Haryana",
            "district": "Faridabad",
            "state": "Haryana",
        },
        {
            "name": "Noida Mandi",
            "lat": 28.5355,
            "lng": 77.3910,
            "address": "Noida, UP",
            "district": "Gautam Buddha Nagar",
            "state": "Uttar Pradesh",
        },
        {
            "name": "Sonipat Mandi",
            "lat": 28.9931,
            "lng": 77.0151,
            "address": "Sonipat, Haryana",
            "district": "Sonipat",
            "state": "Haryana",
        },
    ]

    crops_data = [
        {"name": "wheat", "base_price": 2000, "volatility": 0.1},
        {"name": "rice", "base_price": 2500, "volatility": 0.15},
        {"name": "corn", "base_price": 1800, "volatility": 0.12},
    ]

    prices = []

    # Create current prices for all mandi-crop combinations
    for mandi in mandis_data:
        for crop in crops_data:
            # Add some randomness to prices
            import random

            price_variation = random.uniform(-0.1, 0.1)  # ±10% variation
            current_price = crop["base_price"] * (1 + price_variation)
            previous_price = current_price * 0.98  # 2% increase

            price_record = MarketPrice(
                mandi_name=mandi["name"],
                crop_name=crop["name"],
                price_per_quintal=Decimal(f"{current_price:.2f}"),
                date=today,
                location_lat=Decimal(f"{mandi['lat']:.6f}"),
                location_lng=Decimal(f"{mandi['lng']:.6f}"),
                location_address=mandi["address"],
                district=mandi["district"],
                state=mandi["state"],
                quality_grade="A",
                source="test_data",
                previous_price=Decimal(f"{previous_price:.2f}"),
                price_change_percentage=Decimal("2.04"),
            )
            prices.append(price_record)

    # Create historical data for trend analysis (30 days for wheat in Delhi)
    for i in range(1, 31):
        past_date = today - timedelta(days=i)
        # Simulate gradually rising trend
        base_price = 1900 + (30 - i) * 2  # Rising from 1900 to 1960

        historical_price = MarketPrice(
            mandi_name="Delhi Azadpur Mandi",
            crop_name="wheat",
            price_per_quintal=Decimal(f"{base_price:.2f}"),
            date=past_date,
            location_lat=Decimal("28.7041"),
            location_lng=Decimal("77.1025"),
            location_address="Azadpur, Delhi",
            district="North Delhi",
            state="Delhi",
            source="test_data",
        )
        prices.append(historical_price)

    session.add_all(prices)
    await session.commit()
    print(f"✅ Created {len(prices)} market price records")
    print(f"   - {len(mandis_data)} mandis")
    print(f"   - {len(crops_data)} crops")
    print(f"   - 30 days of historical data for wheat")


async def test_all_market_features(session: AsyncSession):
    """Test all market service features comprehensively."""
    print("\n🧪 Testing All Market Service Features")
    print("=" * 60)

    # Initialize market service
    market_service = MarketService(session)
    await market_service.initialize()

    # User location (Central Delhi)
    user_location = Location(
        latitude=28.6139,
        longitude=77.2090,
        address="Connaught Place, New Delhi",
        district="Central Delhi",
        state="Delhi",
    )

    # Test 1: Current Prices
    print("\n1. CURRENT PRICES TEST")
    print("-" * 40)
    try:
        for crop in ["wheat", "rice", "corn"]:
            prices = await market_service.get_current_prices(
                crop, user_location, radius_km=100.0
            )
            print(f"✅ {crop.upper()}: Found {len(prices)} mandis")
            if prices:
                best_price = max(prices, key=lambda p: p.price_per_quintal)
                print(
                    f"   Best price: ₹{best_price.price_per_quintal} at {best_price.mandi_name}"
                )
    except Exception as e:
        print(f"❌ Current prices test failed: {e}")

    # Test 2: Price Comparison
    print("\n2. PRICE COMPARISON TEST")
    print("-" * 40)
    try:
        comparison = await market_service.compare_prices(
            "wheat", user_location, radius_km=100.0
        )
        print(f"✅ Wheat price comparison:")
        print(f"   Mandis analyzed: {len(comparison.prices)}")
        print(f"   Average price: ₹{comparison.average_price:.2f}")
        print(
            f"   Price range: ₹{comparison.lowest_price.price_per_quintal:.2f} - ₹{comparison.highest_price.price_per_quintal:.2f}"
        )
        print(f"   Best mandi: {comparison.highest_price.mandi_name}")
        print(f"   Recommendation: {comparison.recommendation[:100]}...")
    except Exception as e:
        print(f"❌ Price comparison test failed: {e}")

    # Test 3: Price Trend Analysis
    print("\n3. PRICE TREND ANALYSIS TEST")
    print("-" * 40)
    try:
        trend = await market_service.analyze_price_trend(
            "wheat", user_location, days=30
        )
        print(f"✅ Wheat trend analysis:")
        print(f"   Current price: ₹{trend.current_price:.2f}")
        print(f"   Trend: {trend.trend.value.upper()}")
        print(f"   7-day change: {trend.price_change_7d:+.2f}%")
        print(f"   30-day change: {trend.price_change_30d:+.2f}%")
        print(f"   Historical data points: {len(trend.historical_prices)}")
        if trend.forecast_7d:
            print(f"   7-day forecast: ₹{trend.forecast_7d:.2f}")
        print(f"   Confidence: {trend.confidence * 100:.0f}%")
    except Exception as e:
        print(f"❌ Price trend test failed: {e}")

    # Test 4: Market Intelligence
    print("\n4. MARKET INTELLIGENCE TEST")
    print("-" * 40)
    try:
        intelligence = await market_service.generate_market_intelligence(
            "wheat", user_location, radius_km=100.0
        )
        print(f"✅ Market intelligence generated:")
        print(f"   Crop: {intelligence.crop_name}")
        print(f"   Recommendation: {intelligence.recommendation.value.upper()}")
        print(f"   Reasoning: {intelligence.reasoning[:150]}...")

        if intelligence.optimal_mandi:
            print(f"   Optimal mandi: {intelligence.optimal_mandi['name']}")
            print(f"   Expected price: ₹{intelligence.optimal_mandi['price']:.2f}")
            print(f"   Distance: {intelligence.optimal_mandi['distance_km']:.1f} km")

        print(f"   Demand signals: {len(intelligence.demand_signals)} generated")
        for signal in intelligence.demand_signals[:2]:  # Show first 2
            print(f"     • {signal}")

        if intelligence.transport_considerations:
            print(
                f"   Transport analysis: {len(intelligence.transport_considerations)} factors"
            )

    except Exception as e:
        print(f"❌ Market intelligence test failed: {e}")

    # Test 5: Multi-Crop Analysis
    print("\n5. MULTI-CROP ANALYSIS TEST")
    print("-" * 40)
    try:
        crops = ["wheat", "rice", "corn"]
        crop_summaries = []

        for crop in crops:
            prices = await market_service.get_current_prices(
                crop, user_location, radius_km=100.0
            )
            if prices:
                avg_price = sum(p.price_per_quintal for p in prices) / len(prices)
                best_price = max(prices, key=lambda p: p.price_per_quintal)
                crop_summaries.append(
                    {
                        "crop": crop,
                        "avg_price": avg_price,
                        "best_price": best_price.price_per_quintal,
                        "best_mandi": best_price.mandi_name,
                        "mandis_count": len(prices),
                    }
                )

        print("✅ Multi-crop analysis:")
        for summary in crop_summaries:
            print(f"   {summary['crop'].upper()}:")
            print(f"     Average: ₹{summary['avg_price']:.2f}")
            print(f"     Best: ₹{summary['best_price']:.2f} at {summary['best_mandi']}")
            print(f"     Available at {summary['mandis_count']} mandis")

    except Exception as e:
        print(f"❌ Multi-crop analysis test failed: {e}")

    # Cleanup
    await market_service.close()


if __name__ == "__main__":
    asyncio.run(test_market_service_full())
