#!/usr/bin/env python3
"""
Test Market Service with PostgreSQL - Interactive Setup
"""

import asyncio
import sys
import os
from getpass import getpass

# Add the project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import date, timedelta
from decimal import Decimal

from app.models.base import Base
from app.models.market import MarketPrice
from app.services.market_service import MarketService, Location


async def get_postgres_connection():
    """Get PostgreSQL connection with user input."""
    print("🔧 PostgreSQL Connection Setup")
    print("-" * 40)

    # Try common configurations
    configs = [
        {"host": "localhost", "port": 5432, "user": "postgres", "password": "postgres"},
        {"host": "localhost", "port": 5432, "user": "postgres", "password": "password"},
        {"host": "localhost", "port": 5432, "user": "postgres", "password": ""},
    ]

    for i, config in enumerate(configs, 1):
        print(f"Trying config {i}: {config['user']}@{config['host']}:{config['port']}")
        try:
            conn = await asyncpg.connect(
                host=config["host"],
                port=config["port"],
                user=config["user"],
                password=config["password"],
                database="postgres",
            )
            print(f"✅ Connected successfully with config {i}")
            return conn, config
        except Exception as e:
            print(f"❌ Config {i} failed: {e}")

    # Manual input
    print("\n🔧 Manual Configuration")
    host = input("Enter PostgreSQL host (default: localhost): ").strip() or "localhost"
    port = int(input("Enter PostgreSQL port (default: 5432): ").strip() or "5432")
    user = input("Enter PostgreSQL user (default: postgres): ").strip() or "postgres"
    password = getpass("Enter PostgreSQL password: ")

    config = {"host": host, "port": port, "user": user, "password": password}

    try:
        conn = await asyncpg.connect(
            host=config["host"],
            port=config["port"],
            user=config["user"],
            password=config["password"],
            database="postgres",
        )
        print("✅ Connected successfully with manual config")
        return conn, config
    except Exception as e:
        print(f"❌ Manual config failed: {e}")
        raise


async def setup_test_database(config):
    """Set up test database."""
    print("\n🗄️ Setting up test database...")

    # Connect to PostgreSQL server
    conn = await asyncpg.connect(
        host=config["host"],
        port=config["port"],
        user=config["user"],
        password=config["password"],
        database="postgres",
    )

    # Check if test database exists
    result = await conn.fetchval(
        "SELECT 1 FROM pg_database WHERE datname = 'agri_platform_test'"
    )

    if not result:
        await conn.execute("CREATE DATABASE agri_platform_test")
        print("✅ Test database 'agri_platform_test' created")
    else:
        print("✅ Test database 'agri_platform_test' already exists")

    await conn.close()

    # Create database URL
    db_url = f"postgresql+asyncpg://{config['user']}:{config['password']}@{config['host']}:{config['port']}/agri_platform_test"

    # Create tables
    engine = create_async_engine(db_url, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("✅ Test database tables created")
    return engine, db_url


async def create_sample_data(session: AsyncSession):
    """Create sample market data."""
    print("\n📊 Creating sample market data...")

    today = date.today()

    # Create sample market prices
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
            source="test_data",
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
            source="test_data",
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
            source="test_data",
            previous_price=Decimal("1950.00"),
            price_change_percentage=Decimal("1.54"),
        ),
    ]

    # Add historical prices for trend analysis
    for i in range(1, 31):
        past_date = today - timedelta(days=i)
        base_price = 1900 + (30 - i) * 3  # Gradually rising prices

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
                source="test_data",
            )
        )

    session.add_all(prices)
    await session.commit()
    print(f"✅ Created {len(prices)} market price records")


async def test_market_service(session: AsyncSession):
    """Test market service functionality."""
    print("\n🧪 Testing Market Service with PostgreSQL")
    print("=" * 60)

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

    # Test 1: Get current prices
    print("\n1. CURRENT WHEAT PRICES")
    print("-" * 40)
    try:
        prices = await market_service.get_current_prices(
            "wheat", user_location, radius_km=100.0
        )
        print(f"✅ Found {len(prices)} mandis with wheat prices:")
        for price in prices[:5]:
            print(f"  • {price.mandi_name}: ₹{price.price_per_quintal:.2f}/quintal")
            print(f"    Location: {price.location.address}")
            if price.price_change_percentage:
                print(f"    Change: {price.price_change_percentage:+.2f}%")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test 2: Compare prices
    print("\n2. PRICE COMPARISON")
    print("-" * 40)
    try:
        comparison = await market_service.compare_prices(
            "wheat", user_location, radius_km=100.0
        )
        print(f"✅ Crop: {comparison.crop_name}")
        print(f"✅ Number of mandis: {len(comparison.prices)}")
        print(f"✅ Average price: ₹{comparison.average_price:.2f}/quintal")
        print(
            f"✅ Highest: ₹{comparison.highest_price.price_per_quintal:.2f} at {comparison.highest_price.mandi_name}"
        )
        print(
            f"✅ Lowest: ₹{comparison.lowest_price.price_per_quintal:.2f} at {comparison.lowest_price.mandi_name}"
        )
        print(f"✅ Recommendation: {comparison.recommendation}")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test 3: Analyze price trend
    print("\n3. PRICE TREND ANALYSIS")
    print("-" * 40)
    try:
        trend = await market_service.analyze_price_trend(
            "wheat", user_location, days=30
        )
        print(f"✅ Crop: {trend.crop_name}")
        print(f"✅ Current price: ₹{trend.current_price:.2f}/quintal")
        print(f"✅ Trend: {trend.trend.value.upper()}")
        print(f"✅ 7-day change: {trend.price_change_7d:+.2f}%")
        print(f"✅ 30-day change: {trend.price_change_30d:+.2f}%")
        if trend.forecast_7d:
            print(f"✅ 7-day forecast: ₹{trend.forecast_7d:.2f}/quintal")
        print(f"✅ Confidence: {trend.confidence * 100:.0f}%")
    except Exception as e:
        print(f"❌ Error: {e}")

    # Test 4: Generate market intelligence
    print("\n4. MARKET INTELLIGENCE")
    print("-" * 40)
    try:
        intelligence = await market_service.generate_market_intelligence(
            "wheat", user_location, radius_km=100.0
        )
        print(f"✅ Crop: {intelligence.crop_name}")
        print(f"✅ Recommendation: {intelligence.recommendation.value.upper()}")
        print(f"✅ Reasoning: {intelligence.reasoning}")

        if intelligence.optimal_mandi:
            print(f"\n✅ Optimal Mandi:")
            print(f"  • Name: {intelligence.optimal_mandi['name']}")
            print(f"  • Price: ₹{intelligence.optimal_mandi['price']:.2f}/quintal")
            print(f"  • Distance: {intelligence.optimal_mandi['distance_km']:.1f} km")
            print(
                f"  • Transport cost: ₹{intelligence.optimal_mandi['transport_cost']:.2f}"
            )

        print(f"\n✅ Demand Signals:")
        for signal in intelligence.demand_signals:
            print(f"  • {signal}")

    except Exception as e:
        print(f"❌ Error: {e}")

    # Cleanup
    await market_service.close()


async def main():
    """Main test function."""
    print("🚀 Market Service PostgreSQL Integration Test")
    print("=" * 60)

    try:
        # Get PostgreSQL connection
        conn, config = await get_postgres_connection()
        await conn.close()

        # Setup test database
        engine, db_url = await setup_test_database(config)

        # Create session
        async_session = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )

        async with async_session() as session:
            # Create sample data
            await create_sample_data(session)

            # Test market service
            await test_market_service(session)

        await engine.dispose()

        print("\n" + "=" * 60)
        print("🎉 ALL TESTS COMPLETED SUCCESSFULLY!")
        print("✅ Market Service is working with PostgreSQL")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
