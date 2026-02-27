#!/usr/bin/env python3
"""
Simple PostgreSQL connection test for Market Service
"""

import asyncio
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import date, timedelta
from decimal import Decimal

from app.models.base import Base
from app.models.market import MarketPrice
from app.services.market_service import MarketService, Location


async def test_with_connection_string(db_url):
    """Test market service with a specific database URL."""
    print(f"🔗 Testing connection: {db_url.replace('password', '***')}")

    try:
        # Create engine
        engine = create_async_engine(db_url, echo=False)

        # Test connection
        async with engine.begin() as conn:
            result = await conn.execute("SELECT version()")
            version = result.scalar()
            print(f"✅ PostgreSQL version: {version}")

        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Tables created successfully")

        # Create session
        async_session = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )

        async with async_session() as session:
            # Create a simple test record
            test_price = MarketPrice(
                mandi_name="Test Mandi",
                crop_name="wheat",
                price_per_quintal=Decimal("2000.00"),
                date=date.today(),
                location_lat=Decimal("28.6139"),
                location_lng=Decimal("77.2090"),
                location_address="Test Location",
                district="Test District",
                state="Test State",
                source="test",
            )

            session.add(test_price)
            await session.commit()
            print("✅ Test record created successfully")

            # Test market service
            market_service = MarketService(session)
            await market_service.initialize()

            # Test basic functionality
            location = Location(latitude=28.6139, longitude=77.2090)

            # This should work even with one record
            prices = await market_service.get_current_prices(
                "wheat", location, radius_km=1000.0
            )
            print(f"✅ Retrieved {len(prices)} price records")

            if prices:
                print(
                    f"✅ Sample price: {prices[0].mandi_name} - ₹{prices[0].price_per_quintal}"
                )

            await market_service.close()

        await engine.dispose()
        print("✅ Database test completed successfully!")
        return True

    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False


async def main():
    """Main test function."""
    print("🧪 Simple PostgreSQL Market Service Test")
    print("=" * 50)

    # Common PostgreSQL connection strings to try
    connection_strings = [
        # Default PostgreSQL with common passwords
        "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres",
        "postgresql+asyncpg://postgres:password@localhost:5432/postgres",
        "postgresql+asyncpg://postgres:admin@localhost:5432/postgres",
        "postgresql+asyncpg://postgres:root@localhost:5432/postgres",
        "postgresql+asyncpg://postgres:@localhost:5432/postgres",  # No password
        # Alternative ports
        "postgresql+asyncpg://postgres:postgres@localhost:5433/postgres",
        # Alternative users
        "postgresql+asyncpg://admin:admin@localhost:5432/postgres",
        "postgresql+asyncpg://user:user@localhost:5432/postgres",
    ]

    success = False

    for db_url in connection_strings:
        print(f"\n🔍 Trying connection...")
        if await test_with_connection_string(db_url):
            success = True
            break
        print("❌ Connection failed, trying next...")

    if success:
        print("\n🎉 SUCCESS! Market Service works with PostgreSQL!")
        print("✅ Database connection established")
        print("✅ Tables created successfully")
        print("✅ Market service functionality verified")
    else:
        print("\n❌ Could not connect to PostgreSQL with any common configuration.")
        print("\nPlease check:")
        print("1. PostgreSQL is running")
        print("2. Check your PostgreSQL username/password")
        print("3. Check the port (usually 5432)")
        print("4. Ensure PostgreSQL accepts local connections")

        print("\nTo find your PostgreSQL details:")
        print("- Check PostgreSQL service status")
        print("- Look at pg_hba.conf for authentication settings")
        print("- Try connecting with psql command line tool first")


if __name__ == "__main__":
    asyncio.run(main())
