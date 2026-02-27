"""
Check when scheduled tasks will run next.
"""

from datetime import datetime, timezone
from celery.schedules import crontab

# Current time
now = datetime.now(timezone.utc)
print(f"Current UTC Time: {now.strftime('%Y-%m-%d %H:%M:%S %Z')}")
print(f"Current Local Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("\n" + "=" * 80)

# Define schedules
schedules = {
    "send-daily-msp-updates": crontab(hour=8, minute=0),
    "process-weather-alerts": crontab(minute=0, hour="*/3"),
    "cleanup-expired-sessions": crontab(minute=0),
    "retry-failed-notifications": crontab(minute="*/15"),
    "aggregate-notification-stats": crontab(hour=0, minute=0),
}

print("\nNext Run Times:")
print("=" * 80)

for task_name, schedule in schedules.items():
    # Calculate next run time
    next_run = schedule.remaining_estimate(now)
    next_run_time = now + next_run

    print(f"\n{task_name}:")
    print(f"  Schedule: {schedule}")
    print(f"  Next run in: {next_run}")
    print(f"  Next run at: {next_run_time.strftime('%Y-%m-%d %H:%M:%S %Z')}")

print("\n" + "=" * 80)
print("\nTo test immediately, you can:")
print("1. Manually trigger via API:")
print("   curl -X POST http://localhost:8000/api/v1/notifications/trigger \\")
print("     -H 'Content-Type: application/json' \\")
print('     -d \'{"notification_type": "msp_update"}\'')
print("\n2. Or trigger from Python:")
print("   from app.tasks.notifications import send_daily_msp_updates")
print("   result = send_daily_msp_updates.delay()")
print("=" * 80)
