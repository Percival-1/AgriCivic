"""
Check which users have notifications enabled.
"""

import asyncio
from sqlalchemy import select
from app.database import get_db_session
from app.models.user import User
from app.models.notification import NotificationPreferences


async def check_users():
    async with get_db_session() as db:
        # Get all users
        users_result = await db.execute(select(User))
        users = users_result.scalars().all()

        print(f"Total users: {len(users)}")
        print("=" * 80)

        for user in users:
            print(f"\nUser: {user.name or user.phone_number}")
            print(f"  ID: {user.id}")
            print(f"  Phone: {user.phone_number}")

            # Get preferences
            prefs_result = await db.execute(
                select(NotificationPreferences).where(
                    NotificationPreferences.user_id == user.id
                )
            )
            prefs = prefs_result.scalar_one_or_none()

            if prefs:
                print(f"  Preferences:")
                print(f"    - MSP Updates: {prefs.daily_msp_updates}")
                print(f"    - Weather Alerts: {prefs.weather_alerts}")
                print(f"    - Scheme Notifications: {prefs.scheme_notifications}")
                print(f"    - Market Alerts: {prefs.market_price_alerts}")
                print(f"    - Channels: {prefs.preferred_channels}")
            else:
                print(f"  Preferences: None (will use defaults)")


if __name__ == "__main__":
    asyncio.run(check_users())
