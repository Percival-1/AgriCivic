"""
Check user details for notification eligibility.
"""

import asyncio
from sqlalchemy import select
from app.database import get_db_session
from app.models.user import User
from app.models.notification import NotificationPreferences


async def check_users():
    async with get_db_session() as db:
        # Get users with MSP updates enabled
        query = (
            select(User)
            .join(NotificationPreferences)
            .where(NotificationPreferences.daily_msp_updates == True)
        )
        result = await db.execute(query)
        users = result.scalars().all()

        print(f"Users with MSP updates enabled: {len(users)}")
        print("=" * 80)

        for user in users:
            print(f"\nUser: {user.name or user.phone_number}")
            print(f"  ID: {user.id}")
            print(f"  Phone: {user.phone_number}")
            print(
                f"  Has location_lat: {hasattr(user, 'location_lat') and user.location_lat is not None}"
            )
            print(
                f"  Has location_lng: {hasattr(user, 'location_lng') and user.location_lng is not None}"
            )

            if hasattr(user, "location_lat") and user.location_lat:
                print(f"  Location: ({user.location_lat}, {user.location_lng})")

            if hasattr(user, "crops"):
                print(f"  Crops: {user.crops}")
            else:
                print(f"  Crops: Not set")

            if hasattr(user, "preferred_language"):
                print(f"  Language: {user.preferred_language}")

            # Check all user attributes
            print(
                f"  User attributes: {[attr for attr in dir(user) if not attr.startswith('_')]}"
            )


if __name__ == "__main__":
    asyncio.run(check_users())
