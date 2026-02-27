"""
Celery tasks for system maintenance.

This module contains background tasks for:
- Session cleanup
- Database maintenance
- Cache management
- System health checks
"""

import asyncio
import logging
from datetime import datetime, timedelta

from celery import Task
from sqlalchemy import select, delete, and_

from app.celery_app import celery_app
from app.database import get_db_session
from app.models.session import Session

logger = logging.getLogger(__name__)


def run_async(coro):
    """Helper to run async functions in Celery tasks."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        # No event loop in current thread, create a new one
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    try:
        return loop.run_until_complete(coro)
    finally:
        # Don't close the loop if it was already running
        if not loop.is_running():
            pass  # Keep the loop for reuse


@celery_app.task(
    name="app.tasks.maintenance.cleanup_expired_sessions",
    bind=True,
    max_retries=2,
)
def cleanup_expired_sessions(self):
    """
    Celery task to clean up expired user sessions.

    This task:
    1. Identifies sessions older than 24 hours with no activity
    2. Removes expired sessions from database
    3. Frees up storage and improves performance
    """
    try:
        logger.info("Starting expired session cleanup")

        async def _cleanup_sessions():
            async with get_db_session() as db_session:
                # Find sessions older than 24 hours
                cutoff_time = datetime.utcnow() - timedelta(hours=24)

                # Count sessions to be deleted
                count_query = select(Session).where(Session.last_activity < cutoff_time)
                count_result = await db_session.execute(count_query)
                sessions_to_delete = len(count_result.scalars().all())

                # Delete expired sessions
                delete_query = delete(Session).where(
                    Session.last_activity < cutoff_time
                )
                await db_session.execute(delete_query)
                await db_session.commit()

                logger.info(f"Cleaned up {sessions_to_delete} expired sessions")

                return {
                    "deleted_sessions": sessions_to_delete,
                    "cutoff_time": cutoff_time.isoformat(),
                    "timestamp": datetime.utcnow().isoformat(),
                }

        result = run_async(_cleanup_sessions())
        return result

    except Exception as e:
        logger.error(f"Failed to cleanup expired sessions: {e}")
        raise self.retry(exc=e)
