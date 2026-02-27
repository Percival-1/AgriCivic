"""
Database query optimization utilities for the AI-Driven Agri-Civic Intelligence Platform.

This module provides:
- Query execution time tracking
- Query optimization recommendations
- Index usage analysis
- Connection pool monitoring
"""

import time
import hashlib
from typing import Any, Dict, Optional, Callable
from functools import wraps
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.logging import get_logger
from app.services.performance_monitoring import performance_monitor

logger = get_logger(__name__)


def track_query_performance(query_type: str, table_name: str):
    """
    Decorator to track database query performance.

    Args:
        query_type: Type of query (SELECT, INSERT, UPDATE, DELETE)
        table_name: Name of the table being queried

    Returns:
        Decorated function
    """

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            result = None
            error = None

            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                error = e
                raise
            finally:
                execution_time = time.time() - start_time

                # Record query metrics
                rows_affected = None
                if result is not None:
                    if hasattr(result, "rowcount"):
                        rows_affected = result.rowcount
                    elif isinstance(result, list):
                        rows_affected = len(result)

                await performance_monitor.record_db_query(
                    query_type=query_type,
                    table_name=table_name,
                    execution_time=execution_time,
                    rows_affected=rows_affected,
                )

                # Log slow queries
                if execution_time > 1.0:
                    logger.warning(
                        f"Slow query detected: {query_type} on {table_name} - "
                        f"{execution_time:.4f}s (rows: {rows_affected})"
                    )

        return wrapper

    return decorator


@asynccontextmanager
async def track_query_context(
    query_type: str,
    table_name: str,
    query_text: Optional[str] = None,
):
    """
    Context manager to track database query performance.

    Args:
        query_type: Type of query (SELECT, INSERT, UPDATE, DELETE)
        table_name: Name of the table being queried
        query_text: Optional query text for hashing

    Usage:
        async with track_query_context("SELECT", "users"):
            result = await session.execute(query)
    """
    start_time = time.time()
    query_hash = None

    if query_text:
        query_hash = hashlib.md5(query_text.encode()).hexdigest()

    try:
        yield
    finally:
        execution_time = time.time() - start_time

        await performance_monitor.record_db_query(
            query_type=query_type,
            table_name=table_name,
            execution_time=execution_time,
            query_hash=query_hash,
        )


class DatabaseOptimizer:
    """Database query optimization utilities."""

    @staticmethod
    async def analyze_query_plan(
        session: AsyncSession,
        query: str,
    ) -> Dict[str, Any]:
        """
        Analyze query execution plan.

        Args:
            session: Database session
            query: SQL query to analyze

        Returns:
            Query execution plan
        """
        try:
            # Use EXPLAIN ANALYZE for PostgreSQL
            explain_query = f"EXPLAIN ANALYZE {query}"
            result = await session.execute(text(explain_query))
            plan = result.fetchall()

            return {
                "query": query,
                "execution_plan": [row[0] for row in plan],
            }
        except Exception as e:
            logger.error(f"Failed to analyze query plan: {e}")
            return {
                "query": query,
                "error": str(e),
            }

    @staticmethod
    async def get_table_statistics(
        session: AsyncSession,
        table_name: str,
    ) -> Dict[str, Any]:
        """
        Get table statistics for optimization.

        Args:
            session: Database session
            table_name: Name of the table

        Returns:
            Table statistics
        """
        try:
            # Get row count
            count_query = f"SELECT COUNT(*) FROM {table_name}"
            result = await session.execute(text(count_query))
            row_count = result.scalar()

            # Get table size
            size_query = f"""
                SELECT pg_size_pretty(pg_total_relation_size('{table_name}'))
            """
            result = await session.execute(text(size_query))
            table_size = result.scalar()

            return {
                "table_name": table_name,
                "row_count": row_count,
                "table_size": table_size,
            }
        except Exception as e:
            logger.error(f"Failed to get table statistics: {e}")
            return {
                "table_name": table_name,
                "error": str(e),
            }

    @staticmethod
    async def get_index_usage(
        session: AsyncSession,
        table_name: str,
    ) -> Dict[str, Any]:
        """
        Get index usage statistics for a table.

        Args:
            session: Database session
            table_name: Name of the table

        Returns:
            Index usage statistics
        """
        try:
            query = f"""
                SELECT
                    indexrelname as index_name,
                    idx_scan as index_scans,
                    idx_tup_read as tuples_read,
                    idx_tup_fetch as tuples_fetched
                FROM pg_stat_user_indexes
                WHERE relname = '{table_name}'
            """
            result = await session.execute(text(query))
            indexes = result.fetchall()

            return {
                "table_name": table_name,
                "indexes": [
                    {
                        "index_name": row[0],
                        "index_scans": row[1],
                        "tuples_read": row[2],
                        "tuples_fetched": row[3],
                    }
                    for row in indexes
                ],
            }
        except Exception as e:
            logger.error(f"Failed to get index usage: {e}")
            return {
                "table_name": table_name,
                "error": str(e),
            }

    @staticmethod
    async def get_missing_indexes(
        session: AsyncSession,
    ) -> Dict[str, Any]:
        """
        Identify potential missing indexes.

        Args:
            session: Database session

        Returns:
            Recommendations for missing indexes
        """
        try:
            # Query to find sequential scans on large tables
            query = """
                SELECT
                    schemaname,
                    tablename,
                    seq_scan,
                    seq_tup_read,
                    idx_scan,
                    seq_tup_read / seq_scan as avg_seq_tup_read
                FROM pg_stat_user_tables
                WHERE seq_scan > 0
                ORDER BY seq_tup_read DESC
                LIMIT 10
            """
            result = await session.execute(text(query))
            tables = result.fetchall()

            recommendations = []
            for row in tables:
                if row[5] > 1000:  # Average sequential tuples read > 1000
                    recommendations.append(
                        {
                            "schema": row[0],
                            "table": row[1],
                            "sequential_scans": row[2],
                            "tuples_read": row[3],
                            "index_scans": row[4],
                            "recommendation": "Consider adding indexes to reduce sequential scans",
                        }
                    )

            return {
                "recommendations": recommendations,
            }
        except Exception as e:
            logger.error(f"Failed to get missing indexes: {e}")
            return {
                "error": str(e),
            }

    @staticmethod
    def get_optimization_recommendations(
        query_metrics: Dict[str, Any],
    ) -> list[str]:
        """
        Get optimization recommendations based on query metrics.

        Args:
            query_metrics: Query performance metrics

        Returns:
            List of optimization recommendations
        """
        recommendations = []

        # Check average execution time
        avg_time = query_metrics.get("average_execution_time", "0.0000s")
        avg_time_float = float(avg_time.rstrip("s"))

        if avg_time_float > 1.0:
            recommendations.append(
                "High average query execution time detected. "
                "Consider adding indexes or optimizing query structure."
            )

        # Check slow queries count
        slow_queries = query_metrics.get("slow_queries_count", 0)
        if slow_queries > 10:
            recommendations.append(
                f"Found {slow_queries} slow queries. "
                "Review and optimize these queries for better performance."
            )

        # Check query types
        by_type = query_metrics.get("by_query_type", {})
        for qtype, metrics in by_type.items():
            avg_time_str = metrics.get("avg_time", "0.0000s")
            avg_time_val = float(avg_time_str.rstrip("s"))

            if qtype == "SELECT" and avg_time_val > 0.5:
                recommendations.append(
                    f"SELECT queries are slow (avg: {avg_time_str}). "
                    "Consider adding indexes or using query result caching."
                )
            elif qtype in ["INSERT", "UPDATE", "DELETE"] and avg_time_val > 1.0:
                recommendations.append(
                    f"{qtype} queries are slow (avg: {avg_time_str}). "
                    "Consider batch operations or optimizing triggers/constraints."
                )

        if not recommendations:
            recommendations.append("Query performance is within acceptable limits.")

        return recommendations


# Global database optimizer instance
db_optimizer = DatabaseOptimizer()
