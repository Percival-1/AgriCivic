#!/usr/bin/env python3
"""
Synchronous PostgreSQL test for Market Service
"""

import sys
import os
from getpass import getpass

# Add the project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import psycopg2
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import date, timedelta
from decimal import Decimal

from app.models.base import Base
from app.models.market import MarketPrice


def test_postgres_connection():
    """Test PostgreSQL connection and create sample data."""
    print("🚀 Market Service PostgreSQL Test (Synchronous)")
    print("=" * 60)

    # Get password
    password = getpass("Enter PostgreSQL password for user 'postgres': ")

    try:
        # Test basic connection with psycopg2
        print("\n🔗 Testing basic connection...")
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password=password,
            database="postgres",
        )

        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"✅ Connected to: {version}")
        cursor.close()
        conn.close()

        # Test SQLAlchemy connection
        print("\n🔗 Testing SQLAlchemy connection...")
        from urllib.parse import quote_plus

        encoded_password = quote_plus(password)
        db_url = f"postgresql://postgres:{encoded_password}@localhost:5432/postgres"
        engine = create_engine(db_url, echo=False)

        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"✅ SQLAlchemy connected: {version[:50]}...")

        # Create tables
        print("\n🗄️ Creating database tables...")
        Base.metadata.create_all(engine)
        print("✅ Tables created successfully")

        # Create session
        Session = sessionmaker(bind=engine)
        session = Session()

        # Create sample data
        print("\n📊 Creating sample market data...")
        create_sample_data_sync(session)

        # Test basic queries
        print("\n🧪 Testing basic queries...")
        test_basic_queries(session)

        session.close()
        engine.dispose()

        print("\n" + "=" * 60)
        print("🎉 SUCCESS! PostgreSQL integration working!")
        print("✅ Database connection established")
        print("✅ Tables created successfully")
        print("✅ Sample data inserted")
        print("✅ Basic queries working")
        print("=" * 60)

        return True

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def create_sample_data_sync(session):
    """Create sample data synchronously."""
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
    for i in range(1, 11):  # Just 10 days for quick test
        past_date = today - timedelta(days=i)
        base_price = 1900 + (10 - i) * 5  # Rising prices

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
    session.commit()
    print(f"✅ Created {len(prices)} market price records")


def test_basic_queries(session):
    """Test basic database queries."""

    # Test 1: Count records
    total_records = session.query(MarketPrice).count()
    print(f"✅ Total records in database: {total_records}")

    # Test 2: Get current wheat prices
    today = date.today()
    wheat_prices = (
        session.query(MarketPrice)
        .filter(MarketPrice.crop_name == "wheat", MarketPrice.date == today)
        .all()
    )
    print(f"✅ Current wheat prices: {len(wheat_prices)} mandis")

    for price in wheat_prices:
        print(f"   • {price.mandi_name}: ₹{price.price_per_quintal}")

    # Test 3: Get historical data
    historical_count = (
        session.query(MarketPrice)
        .filter(MarketPrice.crop_name == "wheat", MarketPrice.date < today)
        .count()
    )
    print(f"✅ Historical wheat records: {historical_count}")

    # Test 4: Test location queries
    delhi_prices = (
        session.query(MarketPrice).filter(MarketPrice.state == "Delhi").count()
    )
    print(f"✅ Delhi market records: {delhi_prices}")

    # Test 5: Test price range queries
    high_prices = (
        session.query(MarketPrice).filter(MarketPrice.price_per_quintal > 2000).count()
    )
    print(f"✅ High-value records (>₹2000): {high_prices}")


if __name__ == "__main__":
    success = test_postgres_connection()

    if success:
        print("\n🎯 Next Steps:")
        print("1. The database connection is working!")
        print("2. You can now run the async tests with the same password")
        print("3. Try running: python examples/market_service_example.py")
        print(
            "4. Or run the full test suite: python -m pytest tests/test_market_service.py -v"
        )
    else:
        print("\n🔧 Troubleshooting:")
        print("1. Check if PostgreSQL service is running")
        print("2. Verify the password is correct")
        print("3. Check PostgreSQL configuration (pg_hba.conf)")
        print("4. Try connecting with psql command line first")
