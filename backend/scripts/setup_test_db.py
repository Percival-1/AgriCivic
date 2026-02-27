#!/usr/bin/env python3
"""
Script to set up test database for the AI-Driven Agri-Civic Intelligence Platform.
"""

import asyncio
import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine
from app.models.base import Base


async def create_test_database():
    """Create test database if it doesn't exist."""
    try:
        # Connect to PostgreSQL server (not to a specific database)
        conn = await asyncpg.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password="password",
            database="postgres",  # Connect to default postgres database
        )

        # Check if test database exists
        result = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = 'agri_platform_test'"
        )

        if not result:
            # Create test database
            await conn.execute("CREATE DATABASE agri_platform_test")
            print("✅ Test database 'agri_platform_test' created successfully")
        else:
            print("✅ Test database 'agri_platform_test' already exists")

        await conn.close()

        # Now create tables in the test database
        engine = create_async_engine(
            "postgresql+asyncpg://postgres:password@localhost:5432/agri_platform_test",
            echo=False,
        )

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        await engine.dispose()
        print("✅ Test database tables created successfully")

    except Exception as e:
        print(f"❌ Error setting up test database: {e}")
        raise


async def main():
    """Main function."""
    print("🔧 Setting up test database...")
    await create_test_database()
    print("🎉 Test database setup completed!")


if __name__ == "__main__":
    asyncio.run(main())
