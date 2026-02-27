"""
Check if market data exists in the database.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.models.market import MarketPrice


async def check_mandi_data():
    """Check mandi data in database."""
    settings = get_settings()

    # Create async engine
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Count total records
        result = await session.execute(select(func.count(MarketPrice.id)))
        total_count = result.scalar()
        print(f"Total market price records: {total_count}")

        # Count unique crops
        result = await session.execute(
            select(func.count(func.distinct(MarketPrice.crop_name)))
        )
        crop_count = result.scalar()
        print(f"Unique crops: {crop_count}")

        # Count unique mandis
        result = await session.execute(
            select(func.count(func.distinct(MarketPrice.mandi_name)))
        )
        mandi_count = result.scalar()
        print(f"Unique mandis: {mandi_count}")

        # List crops
        result = await session.execute(select(MarketPrice.crop_name).distinct())
        crops = [row[0] for row in result.all()]
        print(f"\nCrops: {', '.join(crops)}")

        # List mandis with coordinates
        result = await session.execute(
            select(
                MarketPrice.mandi_name,
                MarketPrice.location_lat,
                MarketPrice.location_lng,
                MarketPrice.state,
            )
            .where(MarketPrice.location_lat.isnot(None))
            .distinct(MarketPrice.mandi_name)
        )
        mandis = result.all()
        print(f"\nMandis with coordinates:")
        for mandi in mandis:
            print(
                f"  - {mandi.mandi_name} ({mandi.state}): {mandi.location_lat}, {mandi.location_lng}"
            )

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(check_mandi_data())
