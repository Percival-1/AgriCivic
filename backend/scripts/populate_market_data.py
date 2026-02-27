"""
Script to populate sample market intelligence data for testing.

This script creates realistic market price data for various crops across
different mandis in India with historical price trends.
"""

import asyncio
import sys
from pathlib import Path
from datetime import date, timedelta
from decimal import Decimal
import random

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

from app.models.market import MarketPrice
from app.models.base import Base
from app.config import get_settings

# Sample data configuration
CROPS = ["Wheat", "Rice", "Cotton", "Sugarcane", "Maize", "Soybean", "Potato", "Onion"]

MANDIS = [
    {
        "name": "Azadpur Mandi",
        "district": "North Delhi",
        "state": "Delhi",
        "lat": 28.7041,
        "lng": 77.1025,
        "address": "Azadpur, Delhi, India",
    },
    {
        "name": "Narela Mandi",
        "district": "North West Delhi",
        "state": "Delhi",
        "lat": 28.8534,
        "lng": 77.0924,
        "address": "Narela, Delhi, India",
    },
    {
        "name": "Ghazipur Mandi",
        "district": "East Delhi",
        "state": "Delhi",
        "lat": 28.6328,
        "lng": 77.3507,
        "address": "Ghazipur, Delhi, India",
    },
    {
        "name": "Anaj Mandi Karnal",
        "district": "Karnal",
        "state": "Haryana",
        "lat": 29.6857,
        "lng": 76.9905,
        "address": "Karnal, Haryana, India",
    },
    {
        "name": "Kisan Mandi Rohtak",
        "district": "Rohtak",
        "state": "Haryana",
        "lat": 28.8955,
        "lng": 76.6066,
        "address": "Rohtak, Haryana, India",
    },
    {
        "name": "Mandi Gobindgarh",
        "district": "Fatehgarh Sahib",
        "state": "Punjab",
        "lat": 30.6708,
        "lng": 76.3022,
        "address": "Mandi Gobindgarh, Punjab, India",
    },
    {
        "name": "Ludhiana Grain Market",
        "district": "Ludhiana",
        "state": "Punjab",
        "lat": 30.9010,
        "lng": 75.8573,
        "address": "Ludhiana, Punjab, India",
    },
    {
        "name": "Amritsar Mandi",
        "district": "Amritsar",
        "state": "Punjab",
        "lat": 31.6340,
        "lng": 74.8723,
        "address": "Amritsar, Punjab, India",
    },
]

# Base prices for crops (per quintal in INR)
BASE_PRICES = {
    "Wheat": 2200,
    "Rice": 2500,
    "Cotton": 6500,
    "Sugarcane": 350,
    "Maize": 1800,
    "Soybean": 4200,
    "Potato": 1200,
    "Onion": 1500,
}

QUALITY_GRADES = ["A", "B", "C", None]


def generate_price_with_trend(
    base_price: float, days_ago: int, trend: str = "stable"
) -> float:
    """
    Generate price with realistic trend and daily variation.

    Args:
        base_price: Base price for the crop
        days_ago: Number of days in the past
        trend: Price trend (rising, falling, stable, volatile)

    Returns:
        Generated price with trend and variation
    """
    # Apply trend
    if trend == "rising":
        trend_factor = 1 + (days_ago * 0.002)  # 0.2% increase per day
    elif trend == "falling":
        trend_factor = 1 - (days_ago * 0.002)  # 0.2% decrease per day
    elif trend == "volatile":
        trend_factor = 1 + (random.uniform(-0.05, 0.05))  # ±5% random
    else:  # stable
        trend_factor = 1 + (random.uniform(-0.01, 0.01))  # ±1% random

    # Add daily variation
    daily_variation = random.uniform(-0.03, 0.03)  # ±3% daily variation

    # Calculate final price
    price = base_price * trend_factor * (1 + daily_variation)

    # Add regional variation (±10%)
    regional_variation = random.uniform(-0.1, 0.1)
    price = price * (1 + regional_variation)

    return round(price, 2)


async def populate_market_data(session: AsyncSession, days_history: int = 90):
    """
    Populate market data with historical prices.

    Args:
        session: Database session
        days_history: Number of days of historical data to generate
    """
    print(f"Populating market data for {days_history} days...")

    # Check if data already exists
    result = await session.execute(select(MarketPrice).limit(1))
    existing = result.scalar_one_or_none()

    if existing:
        print("Market data already exists. Clearing existing data...")
        from sqlalchemy import delete

        await session.execute(delete(MarketPrice))
        await session.commit()

    records_created = 0
    today = date.today()

    # Assign trends to crops
    crop_trends = {
        "Wheat": "rising",
        "Rice": "stable",
        "Cotton": "falling",
        "Sugarcane": "stable",
        "Maize": "rising",
        "Soybean": "volatile",
        "Potato": "volatile",
        "Onion": "volatile",
    }

    # Generate data for each day
    for days_ago in range(days_history, -1, -1):
        current_date = today - timedelta(days=days_ago)

        # Generate prices for each crop in each mandi
        for crop in CROPS:
            base_price = BASE_PRICES[crop]
            trend = crop_trends.get(crop, "stable")

            for mandi in MANDIS:
                # Generate price with trend
                price = generate_price_with_trend(
                    base_price, days_history - days_ago, trend
                )

                # Calculate previous price (from 7 days ago if available)
                previous_price = None
                price_change_pct = None
                if days_ago < days_history - 7:
                    previous_price = generate_price_with_trend(
                        base_price, days_history - days_ago - 7, trend
                    )
                    price_change_pct = round(
                        ((price - previous_price) / previous_price) * 100, 2
                    )

                # Create market price record
                market_price = MarketPrice(
                    mandi_name=mandi["name"],
                    crop_name=crop,
                    price_per_quintal=Decimal(str(price)),
                    date=current_date,
                    location_lat=Decimal(str(mandi["lat"])),
                    location_lng=Decimal(str(mandi["lng"])),
                    location_address=mandi["address"],
                    district=mandi["district"],
                    state=mandi["state"],
                    quality_grade=random.choice(QUALITY_GRADES),
                    source="Sample Data Generator",
                    previous_price=(
                        Decimal(str(previous_price)) if previous_price else None
                    ),
                    price_change_percentage=(
                        Decimal(str(price_change_pct)) if price_change_pct else None
                    ),
                )

                session.add(market_price)
                records_created += 1

        # Commit every 10 days to avoid memory issues
        if days_ago % 10 == 0:
            await session.commit()
            print(f"  Processed {days_history - days_ago}/{days_history} days...")

    # Final commit
    await session.commit()
    print(f"\n✓ Successfully created {records_created} market price records!")
    print(f"  - {len(CROPS)} crops")
    print(f"  - {len(MANDIS)} mandis")
    print(f"  - {days_history + 1} days of historical data")


async def print_sample_data(session: AsyncSession):
    """Print sample of created data for verification."""
    print("\n" + "=" * 80)
    print("SAMPLE DATA (Latest 5 records per crop)")
    print("=" * 80)

    for crop in CROPS[:3]:  # Show first 3 crops
        print(f"\n{crop}:")
        result = await session.execute(
            select(MarketPrice)
            .where(MarketPrice.crop_name == crop)
            .order_by(MarketPrice.date.desc())
            .limit(5)
        )
        records = result.scalars().all()

        for record in records:
            print(
                f"  {record.date} | {record.mandi_name:25s} | "
                f"₹{record.price_per_quintal:7.2f}/quintal | "
                f"{record.state:10s} | "
                f"Change: {record.price_change_percentage or 0:+6.2f}%"
            )


async def main():
    """Main function to populate market data."""
    print("=" * 80)
    print("MARKET DATA POPULATION SCRIPT")
    print("=" * 80)

    # Get settings
    settings = get_settings()

    # Create async engine
    engine = create_async_engine(
        settings.database_url,
        echo=False,
        future=True,
    )

    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            # Populate data with 90 days of history
            await populate_market_data(session, days_history=90)

            # Print sample data
            await print_sample_data(session)

            print("\n" + "=" * 80)
            print("✓ Market data population completed successfully!")
            print("=" * 80)

        except Exception as e:
            print(f"\n✗ Error populating market data: {e}")
            import traceback

            traceback.print_exc()
            await session.rollback()
        finally:
            await session.close()

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
