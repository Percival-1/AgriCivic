"""
Background scheduler service for periodic tasks.

Handles automatic session cleanup, notification generation, and other maintenance tasks.
"""

import asyncio
import logging
from typing import Callable, Dict, Any
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db_session
from app.services.session_manager import session_manager

logger = logging.getLogger(__name__)


class BackgroundScheduler:
    """
    Background scheduler for periodic maintenance tasks.
    """

    def __init__(self):
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.running = False
        self.logger = logger

    def add_task(
        self,
        name: str,
        func: Callable,
        interval_minutes: int,
        run_immediately: bool = False,
    ):
        """
        Add a periodic task to the scheduler.

        Args:
            name: Task name
            func: Function to execute
            interval_minutes: Interval between executions in minutes
            run_immediately: Whether to run the task immediately
        """
        self.tasks[name] = {
            "func": func,
            "interval": timedelta(minutes=interval_minutes),
            "last_run": None if run_immediately else datetime.utcnow(),
            "run_immediately": run_immediately,
        }

        self.logger.info(
            f"Added scheduled task: {name} (interval: {interval_minutes} minutes)"
        )

    async def start(self):
        """Start the background scheduler."""
        if self.running:
            return

        self.running = True
        self.logger.info("Starting background scheduler")

        while self.running:
            try:
                await self._run_due_tasks()
                await asyncio.sleep(60)  # Check every minute
            except Exception as e:
                self.logger.error(f"Error in scheduler loop: {str(e)}")
                await asyncio.sleep(60)

    async def stop(self):
        """Stop the background scheduler."""
        self.running = False
        self.logger.info("Stopping background scheduler")

    async def _run_due_tasks(self):
        """Run tasks that are due for execution."""
        current_time = datetime.utcnow()

        for name, task_info in self.tasks.items():
            try:
                last_run = task_info["last_run"]
                interval = task_info["interval"]
                run_immediately = task_info["run_immediately"]

                # Check if task should run
                should_run = (
                    run_immediately
                    or last_run is None
                    or (current_time - last_run) >= interval
                )

                if should_run:
                    self.logger.info(f"Running scheduled task: {name}")
                    await task_info["func"]()
                    self.tasks[name]["last_run"] = current_time
                    self.tasks[name]["run_immediately"] = False

            except Exception as e:
                self.logger.error(f"Error running task {name}: {str(e)}")


# Background task functions
async def cleanup_expired_sessions():
    """Background task to clean up expired sessions."""
    try:
        async with get_db_session() as db:
            cleaned_count = await session_manager.cleanup_expired_sessions(db)
            if cleaned_count > 0:
                logger.info(
                    f"Background cleanup: removed {cleaned_count} expired sessions"
                )
    except Exception as e:
        logger.error(f"Failed to cleanup expired sessions in background: {str(e)}")


async def send_daily_msp_notifications():
    """Background task to send daily MSP update notifications."""
    try:
        from app.services.notification_service import get_notification_service

        async with get_db_session() as db:
            notification_service = await get_notification_service(db)

            # Generate MSP updates
            msp_notifications = await notification_service.generate_daily_msp_updates()

            # Send notifications
            results = await notification_service.send_msp_notifications(
                msp_notifications
            )

            logger.info(
                f"Daily MSP notifications sent: {len(results)} notifications delivered"
            )

    except Exception as e:
        logger.error(f"Failed to send daily MSP notifications: {str(e)}")


async def process_weather_alerts():
    """Background task to process and send weather alerts."""
    try:
        from app.services.notification_service import get_notification_service

        async with get_db_session() as db:
            notification_service = await get_notification_service(db)

            # Process weather alerts
            weather_alerts = await notification_service.process_weather_alerts()

            # Send alerts if any
            if weather_alerts:
                results = await notification_service.send_weather_alert_notifications(
                    weather_alerts
                )

                logger.info(
                    f"Weather alerts sent: {len(results)} notifications delivered"
                )

    except Exception as e:
        logger.error(f"Failed to process weather alerts: {str(e)}")


# Global scheduler instance
scheduler = BackgroundScheduler()

# Add default tasks
scheduler.add_task(
    name="session_cleanup",
    func=cleanup_expired_sessions,
    interval_minutes=60,  # Run every hour
    run_immediately=False,
)

scheduler.add_task(
    name="daily_msp_notifications",
    func=send_daily_msp_notifications,
    interval_minutes=1440,  # Run once per day (24 hours)
    run_immediately=False,
)

scheduler.add_task(
    name="weather_alerts",
    func=process_weather_alerts,
    interval_minutes=180,  # Run every 3 hours
    run_immediately=False,
)
