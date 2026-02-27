"""
Manually trigger a Celery task for testing.
"""

from app.tasks.notifications import send_daily_msp_updates, process_weather_alerts

print("Triggering MSP updates task...")
result = send_daily_msp_updates.delay()
print(f"Task ID: {result.id}")
print(f"Task Status: {result.status}")
print("\nCheck the Celery worker logs to see the task execution!")
print("The task is running in the background...")
