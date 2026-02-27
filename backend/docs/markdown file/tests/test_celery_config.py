"""
Test script to verify Celery configuration and scheduled tasks.
"""

import sys
from app.celery_app import celery_app

print("=" * 80)
print("CELERY CONFIGURATION TEST")
print("=" * 80)

# Check broker connection
print(f"\n1. Broker URL: {celery_app.conf.broker_url}")
print(f"2. Result Backend: {celery_app.conf.result_backend}")

# Check if beat schedule is configured
print(f"\n3. Beat Schedule Configured: {bool(celery_app.conf.beat_schedule)}")
print(f"4. Number of Scheduled Tasks: {len(celery_app.conf.beat_schedule)}")

# List all scheduled tasks
print("\n5. Scheduled Tasks:")
print("-" * 80)
for task_name, task_config in celery_app.conf.beat_schedule.items():
    print(f"\nTask: {task_name}")
    print(f"  - Task Function: {task_config['task']}")
    print(f"  - Schedule: {task_config['schedule']}")
    print(f"  - Queue: {task_config.get('options', {}).get('queue', 'default')}")

# Check registered tasks
print("\n6. Registered Tasks:")
print("-" * 80)
registered_tasks = [
    task for task in celery_app.tasks.keys() if task.startswith("app.tasks")
]
for task in sorted(registered_tasks):
    print(f"  - {task}")

# Test broker connection
print("\n7. Testing Broker Connection:")
print("-" * 80)
try:
    # Inspect active workers
    inspect = celery_app.control.inspect()
    active_workers = inspect.active()

    if active_workers:
        print(f"✓ Connected to broker successfully!")
        print(f"✓ Active workers: {list(active_workers.keys())}")
    else:
        print("✗ No active workers found!")
        print("  Make sure Celery worker is running:")
        print("  celery -A app.celery_app worker --loglevel=info --pool=solo")
except Exception as e:
    print(f"✗ Failed to connect to broker: {e}")
    print("\nTroubleshooting:")
    print("  1. Check if Redis is running: docker ps | grep redis")
    print("  2. Check if CELERY_BROKER_URL is set in .env")
    print("  3. Restart Celery worker")

# Test beat scheduler
print("\n8. Testing Beat Scheduler:")
print("-" * 80)
try:
    inspect = celery_app.control.inspect()
    scheduled = inspect.scheduled()

    if scheduled:
        print(f"✓ Beat scheduler is running!")
        for worker, tasks in scheduled.items():
            print(f"  Worker: {worker}")
            print(f"  Scheduled tasks: {len(tasks)}")
    else:
        print("✗ No scheduled tasks found!")
        print("  Make sure Celery beat is running:")
        print("  celery -A app.celery_app beat --loglevel=info")
except Exception as e:
    print(f"✗ Could not check beat scheduler: {e}")

print("\n" + "=" * 80)
print("TEST COMPLETE")
print("=" * 80)

# Instructions
print("\nTo start Celery services:")
print("\n1. Start Worker (in one terminal):")
print("   celery -A app.celery_app worker --loglevel=info --pool=solo")
print("\n2. Start Beat Scheduler (in another terminal):")
print("   celery -A app.celery_app beat --loglevel=info")
print("\nOr run both together (for development):")
print("   celery -A app.celery_app worker --beat --loglevel=info --pool=solo")
print("\n" + "=" * 80)
