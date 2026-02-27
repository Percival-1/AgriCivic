"""
Performance monitoring API endpoints for the AI-Driven Agri-Civic Intelligence Platform.

This module provides endpoints for:
- Response time tracking and metrics
- Request/response logging
- Performance benchmarking
- Database query optimization metrics
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.performance_monitoring import performance_monitor
from app.services.database_optimizer import db_optimizer
from app.database import get_db
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/performance", tags=["performance"])


@router.get("/metrics")
async def get_performance_metrics() -> Dict[str, Any]:
    """
    Get overall performance metrics.

    Returns:
        Dictionary containing overall system performance metrics
    """
    try:
        return {
            "status": "success",
            "metrics": performance_monitor.get_overall_metrics(),
        }
    except Exception as e:
        logger.error(f"Failed to get performance metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/endpoints")
async def get_endpoint_metrics(
    path: Optional[str] = Query(None, description="Specific endpoint path")
) -> Dict[str, Any]:
    """
    Get performance metrics for endpoints.

    Args:
        path: Optional specific endpoint path

    Returns:
        Dictionary containing endpoint performance metrics
    """
    try:
        metrics = performance_monitor.get_endpoint_metrics(path)
        return {
            "status": "success",
            "endpoint_metrics": metrics,
        }
    except Exception as e:
        logger.error(f"Failed to get endpoint metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/slow-requests")
async def get_slow_requests(
    threshold: float = Query(3.0, description="Response time threshold in seconds"),
    limit: int = Query(50, description="Maximum number of results"),
) -> Dict[str, Any]:
    """
    Get slow requests above a threshold.

    Args:
        threshold: Response time threshold in seconds (default: 3.0)
        limit: Maximum number of results (default: 50)

    Returns:
        List of slow requests
    """
    try:
        slow_requests = performance_monitor.get_slow_requests(threshold, limit)
        return {
            "status": "success",
            "threshold": f"{threshold}s",
            "count": len(slow_requests),
            "slow_requests": slow_requests,
        }
    except Exception as e:
        logger.error(f"Failed to get slow requests: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/database")
async def get_database_metrics() -> Dict[str, Any]:
    """
    Get database query performance metrics.

    Returns:
        Dictionary containing database query metrics
    """
    try:
        metrics = performance_monitor.get_db_query_metrics()
        return {
            "status": "success",
            "database_metrics": metrics,
        }
    except Exception as e:
        logger.error(f"Failed to get database metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/slow-queries")
async def get_slow_queries(
    limit: int = Query(50, description="Maximum number of results"),
) -> Dict[str, Any]:
    """
    Get slow database queries.

    Args:
        limit: Maximum number of results (default: 50)

    Returns:
        List of slow database queries
    """
    try:
        slow_queries = performance_monitor.get_slow_queries(limit)
        return {
            "status": "success",
            "count": len(slow_queries),
            "slow_queries": slow_queries,
        }
    except Exception as e:
        logger.error(f"Failed to get slow queries: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/time-series")
async def get_time_series_metrics(
    minutes: int = Query(60, description="Time window in minutes"),
) -> Dict[str, Any]:
    """
    Get time series performance metrics.

    Args:
        minutes: Time window in minutes (default: 60)

    Returns:
        Time series data for the specified window
    """
    try:
        metrics = performance_monitor.get_time_series_metrics(minutes)
        return {
            "status": "success",
            "time_series": metrics,
        }
    except Exception as e:
        logger.error(f"Failed to get time series metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/metrics/clear")
async def clear_old_metrics(
    hours: int = Query(24, description="Keep metrics from last N hours"),
) -> Dict[str, Any]:
    """
    Clear old performance metrics.

    Args:
        hours: Number of hours to keep (default: 24)

    Returns:
        Success message
    """
    try:
        await performance_monitor.clear_old_metrics(hours)
        return {
            "status": "success",
            "message": f"Cleared metrics older than {hours} hours",
        }
    except Exception as e:
        logger.error(f"Failed to clear old metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/metrics/reset")
async def reset_metrics() -> Dict[str, Any]:
    """
    Reset all performance metrics.

    Returns:
        Success message
    """
    try:
        performance_monitor.reset_metrics()
        return {
            "status": "success",
            "message": "All performance metrics reset",
        }
    except Exception as e:
        logger.error(f"Failed to reset metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/benchmark")
async def run_benchmark() -> Dict[str, Any]:
    """
    Run a simple performance benchmark.

    Returns:
        Benchmark results
    """
    import time
    import asyncio

    try:
        results = {}

        # Test 1: Simple computation
        start = time.time()
        _ = sum(range(1000000))
        results["computation_time"] = f"{time.time() - start:.6f}s"

        # Test 2: Async sleep (simulating I/O)
        start = time.time()
        await asyncio.sleep(0.001)
        results["async_io_time"] = f"{time.time() - start:.6f}s"

        # Test 3: Memory allocation
        start = time.time()
        _ = [i for i in range(100000)]
        results["memory_allocation_time"] = f"{time.time() - start:.6f}s"

        return {
            "status": "success",
            "benchmark_results": results,
        }
    except Exception as e:
        logger.error(f"Benchmark failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/database/table-stats")
async def get_table_statistics(
    table_name: str = Query(..., description="Name of the table"),
    session: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get statistics for a database table.

    Args:
        table_name: Name of the table
        session: Database session

    Returns:
        Table statistics
    """
    try:
        stats = await db_optimizer.get_table_statistics(session, table_name)
        return {
            "status": "success",
            "table_statistics": stats,
        }
    except Exception as e:
        logger.error(f"Failed to get table statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/database/index-usage")
async def get_index_usage(
    table_name: str = Query(..., description="Name of the table"),
    session: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get index usage statistics for a table.

    Args:
        table_name: Name of the table
        session: Database session

    Returns:
        Index usage statistics
    """
    try:
        usage = await db_optimizer.get_index_usage(session, table_name)
        return {
            "status": "success",
            "index_usage": usage,
        }
    except Exception as e:
        logger.error(f"Failed to get index usage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/database/missing-indexes")
async def get_missing_indexes(
    session: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Identify potential missing indexes.

    Args:
        session: Database session

    Returns:
        Recommendations for missing indexes
    """
    try:
        recommendations = await db_optimizer.get_missing_indexes(session)
        return {
            "status": "success",
            "missing_indexes": recommendations,
        }
    except Exception as e:
        logger.error(f"Failed to get missing indexes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/database/optimization-recommendations")
async def get_optimization_recommendations() -> Dict[str, Any]:
    """
    Get database optimization recommendations based on query metrics.

    Returns:
        List of optimization recommendations
    """
    try:
        query_metrics = performance_monitor.get_db_query_metrics()
        recommendations = db_optimizer.get_optimization_recommendations(query_metrics)

        return {
            "status": "success",
            "query_metrics": query_metrics,
            "recommendations": recommendations,
        }
    except Exception as e:
        logger.error(f"Failed to get optimization recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))
