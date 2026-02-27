"""
Example usage of the Market Service for the AI-Driven Agri-Civic Intelligence Platform.

This script demonstrates:
1. Getting current crop prices near a location
2. Comparing prices across multiple mandis
3. Analyzing price trends
4. Generating comprehensive market intelligence
"""

import asyncio
import sys
import os
from datetime import date, timedelta
from decimal import Decimal

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.services.market_service import MarketService, Location
from app.models.market import MarketPrice
from app.models.base import Base


async def create_sample_data(session: AsyncSession):
    """Create sample market data for demonstration."""
    print("Creating sample market data...")

    today = date.today()

    # Create sample market prices for wheat
    prices = [
        MarketPrice(
            mandi_name="Delhi Azadpur Mandi",
            crop_name="wheat",
            price_per_quintal=Decimal("2050.00"),
            date=today,
            location_lat=Decimal("28.7041"),
            location_lng=Decimal("77.1025"),
            location_address="Azadpur, Delhi",
            district="North Delhi",
            state="Delhi",
            quality_grade="A",
            source="agmarknet",
            previous_price=Decimal("2000.00"),
            price_change_percentage=Decimal("2.50"),
        ),
        MarketPrice(
            mandi_name="Gurgaon Mandi",
            crop_name="wheat",
            price_per_quintal=Decimal("2150.00"),
            date=today,
            location_lat=Decimal("28.4595"),
            location_lng=Decimal("77.0266"),
            location_address="Gurgaon, Haryana",
            district="Gurgaon",
            state="Haryana",
            quality_grade="A",
            source="agmarknet",
            previous_price=Decimal("2100.00"),
            price_change_percentage=Decimal("2.38"),
        ),
        MarketPrice(
            mandi_name="Faridabad Mandi",
            crop_name="wheat",
            price_per_quintal=Decimal("1980.00"),
            date=today,
            location_lat=Decimal("28.4089"),
            location_lng=Decimal("77.3178"),
            location_address="Faridabad, Haryana",
            district="Faridabad",
            state="Haryana",
            quality_grade="B",
            source="agmarknet",
            previous_price=Decimal("1950.00"),
            price_change_percentage=Decimal("1.54"),
        ),
        MarketPrice(
            mandi_name="Sonipat Mandi",
            crop_name="wheat",
            price_per_quintal=Decimal("2020.00"),
            date=today,
            location_lat=Decimal("28.9931"),
            location_lng=Decimal("77.0151"),
            location_address="Sonipat, Haryana",
            district="Sonipat",
            state="Haryana",
            quality_grade="A",
            source="agmarknet",
            previous_price=Decimal("1980.00"),
            price_change_percentage=Decimal("2.02"),
        ),
    ]

    # Add historical prices for trend analysis (30 days)
    for i in range(1, 31):
        past_date = today - timedelta(days=i)
        # Simulate gradually rising prices
        base_price = 1900 + (30 - i) * 3

        prices.append(
            MarketPrice(
                mandi_name="Delhi Azadpur Mandi",
                crop_name="wheat",
                price_per_quintal=Decimal(str(base_price)),
                date=past_date,
                location_lat=Decimal("28.7041"),
                location_lng=Decimal("77.1025"),
                location_address="Azadpur, Delhi",
                district="North Delhi",
                state="Delhi",
                source="agmarknet",
            )
        )

    session.add_all(prices)
    await session.commit()
    print(f"Created {len(prices)} sample market price records")


async def demonstrate_market_service():
    """Demonstrate market service functionality."""
    settings = get_settings()

    # Create database engine
    engine = create_async_engine(settings.database_url, echo=False)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Create sample data
        await create_sample_data(session)

        # Initialize market service
        market_service = MarketService(session)
        await market_service.initialize()

        # User location (Delhi area)
        user_location = Location(
            latitude=28.6139,
            longitude=77.2090,
            address="Connaught Place, New Delhi",
            district="Central Delhi",
            state="Delhi",
        )

        print("\n" + "=" * 80)
        print("MARKET INTELLIGENCE DEMONSTRATION")
        print("=" * 80)

        # 1. Get current prices
        print("\n1. CURRENT WHEAT PRICES NEAR USER LOCATION")
        print("-" * 80)
        try:
            prices = await market_service.get_current_prices(
                "wheat", user_location, radius_km=100.0
            )
            print(f"Found {len(prices)} mandis with wheat prices within 100km:")
            for price in prices[:5]:  # Show top 5
                print(f"  • {price.mandi_name}: ₹{price.price_per_quintal:.2f}/quintal")
                print(f"    Location: {price.location.address}")
                if price.price_change_percentage:
                    print(f"    Change: {price.price_change_percentage:+.2f}%")
        except Exception as e:
            print(f"Error: {e}")

        # 2. Compare prices
        print("\n2. PRICE COMPARISON ACROSS MANDIS")
        print("-" * 80)
        try:
            comparison = await market_service.compare_prices(
                "wheat", user_location, radius_km=100.0
            )
            print(f"Crop: {comparison.crop_name}")
            print(f"Number of mandis: {len(comparison.prices)}")
            print(f"Average price: ₹{comparison.average_price:.2f}/quintal")
            print(
                f"Highest price: ₹{comparison.highest_price.price_per_quintal:.2f} at {comparison.highest_price.mandi_name}"
            )
            print(
                f"Lowest price: ₹{comparison.lowest_price.price_per_quintal:.2f} at {comparison.lowest_price.mandi_name}"
            )
            print(f"Price variance: ₹{comparison.price_variance:.2f}")
            print(f"\nRecommendation: {comparison.recommendation}")
        except Exception as e:
            print(f"Error: {e}")

        # 3. Analyze price trend
        print("\n3. PRICE TREND ANALYSIS (30 DAYS)")
        print("-" * 80)
        try:
            trend = await market_service.analyze_price_trend(
                "wheat", user_location, days=30
            )
            print(f"Crop: {trend.crop_name}")
            print(f"Current price: ₹{trend.current_price:.2f}/quintal")
            print(f"Trend: {trend.trend.value.upper()}")
            print(f"7-day change: {trend.price_change_7d:+.2f}%")
            print(f"30-day change: {trend.price_change_30d:+.2f}%")
            if trend.forecast_7d:
                print(f"7-day forecast: ₹{trend.forecast_7d:.2f}/quintal")
                forecast_change = (
                    (trend.forecast_7d - trend.current_price)
                    / trend.current_price
                    * 100
                )
                print(f"Expected change: {forecast_change:+.2f}%")
            print(f"Confidence: {trend.confidence * 100:.0f}%")
        except Exception as e:
            print(f"Error: {e}")

        # 4. Generate comprehensive market intelligence
        print("\n4. COMPREHENSIVE MARKET INTELLIGENCE")
        print("-" * 80)
        try:
            intelligence = await market_service.generate_market_intelligence(
                "wheat", user_location, radius_km=100.0
            )
            print(f"Crop: {intelligence.crop_name}")
            print(f"User location: {intelligence.user_location.address}")
            print(f"\nRecommendation: {intelligence.recommendation.value.upper()}")
            print(f"Reasoning: {intelligence.reasoning}")

            if intelligence.optimal_mandi:
                print(f"\nOptimal Mandi:")
                print(f"  • Name: {intelligence.optimal_mandi['name']}")
                print(f"  • Price: ₹{intelligence.optimal_mandi['price']:.2f}/quintal")
                print(
                    f"  • Distance: {intelligence.optimal_mandi['distance_km']:.1f} km"
                )
                print(
                    f"  • Transport cost: ₹{intelligence.optimal_mandi['transport_cost']:.2f}"
                )
                print(
                    f"  • Net benefit: ₹{intelligence.optimal_mandi['net_benefit']:.2f}"
                )

            print(f"\nDemand Signals:")
            for signal in intelligence.demand_signals:
                print(f"  • {signal}")

            if intelligence.transport_considerations:
                print(f"\nTransport Considerations:")
                for key, value in intelligence.transport_considerations.items():
                    print(f"  • {key}: {value}")
        except Exception as e:
            print(f"Error: {e}")

        print("\n" + "=" * 80)
        print("DEMONSTRATION COMPLETE")
        print("=" * 80)

        # Cleanup
        await market_service.close()

    await engine.dispose()


if __name__ == "__main__":
    print("Market Service Example")
    print("=" * 80)
    asyncio.run(demonstrate_market_service())
