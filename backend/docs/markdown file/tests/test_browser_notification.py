"""
Test browser notification via Socket.IO.
"""

import asyncio
from app.database import get_db_session
from app.services.notification_service import get_notification_service, NotificationType


async def test_notification():
    async with get_db_session() as db:
        # Get notification service
        notification_service = await get_notification_service(db)

        # Use your user ID (from the check earlier)
        user_id = "5b0d6268-340c-4a31-b9b3-6cce878acd9f"  # Shubhranshu Ranjan

        print(f"Sending test notification to user {user_id}...")

        # Send a test notification
        result = await notification_service._deliver_notification(
            user_id=user_id,
            notification_type=NotificationType.MSP_UPDATE,
            channel="sms",  # Channel doesn't matter for Socket.IO
            message="🌾 Test Notification: This is a test MSP update! Wheat price: ₹2500/quintal",
            language="en",
        )

        print(f"\nNotification Result:")
        print(f"  Notification ID: {result.notification_id}")
        print(f"  Status: {result.status}")
        print(f"  User ID: {result.user_id}")

        print(f"\n✅ Notification sent!")
        print(f"📱 Check your browser for the notification")
        print(f"🔌 Make sure you're logged in and Socket.IO is connected")


if __name__ == "__main__":
    asyncio.run(test_notification())
