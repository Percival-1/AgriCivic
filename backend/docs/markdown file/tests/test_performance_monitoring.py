"""
Tests for performance monitoring functionality.
"""

import pytest
import asyncio
from datetime import datetime, timedelta

from app.services.performance_monitoring import (
    PerformanceMonitor,
    RequestMetrics,
    EndpointMetrics,
    DatabaseQueryMetrics,
)


@pytest.fixture
def performance_monitor():
    """Create a fresh performance monitor for testing."""
    return PerformanceMonitor(max_history=100)


@pytest.mark.asyncio
async def test_record_request(performance_monitor):
    """Test recording a request metric."""
    await performance_monitor.record_request(
        request_id="test-123",
        method="GET",
        path="/api/v1/test",
        status_code=200,
        response_time=0.5,
        user_agent="test-agent",
        client_ip="127.0.0.1",
    )

    assert len(performance_monitor.request_history) == 1
    assert "/api/v1/test" in performance_monitor.endpoint_metrics

    metrics = performance_monitor.endpoint_metrics["/api/v1/test"]
    assert metrics.total_requests == 1
    assert metrics.total_errors == 0


@pytest.mark.asyncio
async def test_record_error_request(performance_monitor):
    """Test recording an error request."""
    await performance_monitor.record_request(
        request_id="test-456",
        method="POST",
        path="/api/v1/error",
        status_code=500,
        response_time=1.0,
        error="Internal server error",
    )

    metrics = performance_monitor.endpoint_metrics["/api/v1/error"]
    assert metrics.total_requests == 1
    assert metrics.total_errors == 1
    assert metrics.get_error_rate() == 100.0


@pytest.mark.asyncio
async def test_record_slow_request(performance_monitor):
    """Test recording a slow request."""
    await performance_monitor.record_request(
        request_id="test-789",
        method="GET",
        path="/api/v1/slow",
        status_code=200,
        response_time=5.0,
    )

    slow_requests = performance_monitor.get_slow_requests(threshold=3.0)
    assert len(slow_requests) == 1
    assert slow_requests[0]["path"] == "/api/v1/slow"


@pytest.mark.asyncio
async def test_endpoint_metrics_calculation(performance_monitor):
    """Test endpoint metrics calculations."""
    # Record multiple requests
    for i in range(10):
        await performance_monitor.record_request(
            request_id=f"test-{i}",
            method="GET",
            path="/api/v1/metrics",
            status_code=200,
            response_time=0.1 * (i + 1),
        )

    metrics = performance_monitor.endpoint_metrics["/api/v1/metrics"]
    assert metrics.total_requests == 10
    assert metrics.get_average_response_time() == pytest.approx(0.55, rel=0.01)
    assert metrics.min_response_time == 0.1
    assert metrics.max_response_time == 1.0


@pytest.mark.asyncio
async def test_record_db_query(performance_monitor):
    """Test recording database query metrics."""
    await performance_monitor.record_db_query(
        query_type="SELECT",
        table_name="users",
        execution_time=0.05,
        rows_affected=10,
    )

    assert len(performance_monitor.db_query_history) == 1

    db_metrics = performance_monitor.get_db_query_metrics()
    assert db_metrics["total_queries"] == 1


@pytest.mark.asyncio
async def test_record_slow_query(performance_monitor):
    """Test recording slow database queries."""
    await performance_monitor.record_db_query(
        query_type="SELECT",
        table_name="large_table",
        execution_time=2.5,
        rows_affected=1000,
    )

    assert len(performance_monitor.slow_queries) == 1

    slow_queries = performance_monitor.get_slow_queries()
    assert len(slow_queries) == 1
    assert slow_queries[0]["table_name"] == "large_table"


@pytest.mark.asyncio
async def test_get_overall_metrics(performance_monitor):
    """Test getting overall system metrics."""
    # Record some requests
    for i in range(5):
        await performance_monitor.record_request(
            request_id=f"test-{i}",
            method="GET",
            path=f"/api/v1/endpoint{i % 2}",
            status_code=200 if i % 2 == 0 else 500,
            response_time=0.5,
        )

    overall = performance_monitor.get_overall_metrics()
    assert overall["total_requests"] == 5
    assert overall["total_errors"] == 2
    assert overall["total_endpoints"] == 2


@pytest.mark.asyncio
async def test_get_time_series_metrics(performance_monitor):
    """Test getting time series metrics."""
    # Record requests over time
    for i in range(5):
        await performance_monitor.record_request(
            request_id=f"test-{i}",
            method="GET",
            path="/api/v1/test",
            status_code=200,
            response_time=0.5,
        )

    time_series = performance_monitor.get_time_series_metrics(minutes=60)
    assert time_series["total_requests"] == 5
    assert time_series["requests_per_minute"] == pytest.approx(5 / 60, rel=0.01)


@pytest.mark.asyncio
async def test_clear_old_metrics(performance_monitor):
    """Test clearing old metrics."""
    # Record some requests
    await performance_monitor.record_request(
        request_id="test-1",
        method="GET",
        path="/api/v1/test",
        status_code=200,
        response_time=0.5,
    )

    # Wait a moment to ensure time difference
    await asyncio.sleep(0.1)

    # Clear metrics older than 24 hours (should keep current)
    await performance_monitor.clear_old_metrics(hours=24)

    # Metrics should still be there
    assert len(performance_monitor.request_history) == 1


@pytest.mark.asyncio
async def test_reset_metrics(performance_monitor):
    """Test resetting all metrics."""
    # Record some data
    await performance_monitor.record_request(
        request_id="test-1",
        method="GET",
        path="/api/v1/test",
        status_code=200,
        response_time=0.5,
    )

    await performance_monitor.record_db_query(
        query_type="SELECT",
        table_name="users",
        execution_time=0.05,
    )

    # Reset all metrics
    performance_monitor.reset_metrics()

    assert len(performance_monitor.request_history) == 0
    assert len(performance_monitor.endpoint_metrics) == 0
    assert len(performance_monitor.db_query_history) == 0
    assert len(performance_monitor.slow_queries) == 0


def test_endpoint_metrics_percentiles():
    """Test percentile calculations for endpoint metrics."""
    metrics = EndpointMetrics(path="/test")

    # Add response times
    for i in range(100):
        metrics.add_request(response_time=i * 0.01)

    assert metrics.get_median_response_time() == pytest.approx(0.495, rel=0.01)
    assert metrics.get_p95_response_time() == pytest.approx(0.95, rel=0.01)
    assert metrics.get_p99_response_time() == pytest.approx(0.99, rel=0.01)


def test_endpoint_metrics_error_rate():
    """Test error rate calculation."""
    metrics = EndpointMetrics(path="/test")

    # Add 7 successful and 3 error requests
    for i in range(10):
        metrics.add_request(response_time=0.5, is_error=(i < 3))

    assert metrics.get_error_rate() == 30.0


@pytest.mark.asyncio
async def test_concurrent_metric_recording(performance_monitor):
    """Test concurrent metric recording."""
    # Record metrics concurrently
    tasks = []
    for i in range(50):
        task = performance_monitor.record_request(
            request_id=f"test-{i}",
            method="GET",
            path=f"/api/v1/endpoint{i % 5}",
            status_code=200,
            response_time=0.1,
        )
        tasks.append(task)

    await asyncio.gather(*tasks)

    assert len(performance_monitor.request_history) == 50
    assert len(performance_monitor.endpoint_metrics) == 5


@pytest.mark.asyncio
async def test_db_query_metrics_by_type(performance_monitor):
    """Test database query metrics grouped by type."""
    # Record different query types
    await performance_monitor.record_db_query("SELECT", "users", 0.1)
    await performance_monitor.record_db_query("SELECT", "posts", 0.2)
    await performance_monitor.record_db_query("INSERT", "users", 0.3)
    await performance_monitor.record_db_query("UPDATE", "users", 0.4)

    metrics = performance_monitor.get_db_query_metrics()

    assert metrics["total_queries"] == 4
    assert "SELECT" in metrics["by_query_type"]
    assert "INSERT" in metrics["by_query_type"]
    assert "UPDATE" in metrics["by_query_type"]
    assert metrics["by_query_type"]["SELECT"]["count"] == 2
