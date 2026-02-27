"""
Tests for performance monitoring API endpoints.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.performance_monitoring import performance_monitor


@pytest.fixture(autouse=True)
def reset_monitor():
    """Reset performance monitor before each test."""
    performance_monitor.reset_metrics()
    yield
    performance_monitor.reset_metrics()


def test_get_performance_metrics():
    """Test getting overall performance metrics."""
    client = TestClient(app)
    response = client.get("/api/v1/performance/metrics")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "metrics" in data


def test_get_endpoint_metrics():
    """Test getting endpoint-specific metrics."""
    client = TestClient(app)

    # Make a request to generate some metrics
    client.get("/api/v1/health")

    # Get endpoint metrics
    response = client.get("/api/v1/performance/metrics/endpoints")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "endpoint_metrics" in data


def test_get_slow_requests():
    """Test getting slow requests."""
    client = TestClient(app)
    response = client.get(
        "/api/v1/performance/metrics/slow-requests?threshold=1.0&limit=10"
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "slow_requests" in data
    assert "count" in data


def test_get_database_metrics():
    """Test getting database query metrics."""
    client = TestClient(app)
    response = client.get("/api/v1/performance/metrics/database")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "database_metrics" in data


def test_get_slow_queries():
    """Test getting slow database queries."""
    client = TestClient(app)
    response = client.get("/api/v1/performance/metrics/slow-queries?limit=10")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "slow_queries" in data


def test_get_time_series_metrics():
    """Test getting time series metrics."""
    client = TestClient(app)
    response = client.get("/api/v1/performance/metrics/time-series?minutes=30")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "time_series" in data


def test_clear_old_metrics():
    """Test clearing old metrics."""
    client = TestClient(app)
    response = client.post("/api/v1/performance/metrics/clear?hours=24")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "message" in data


def test_reset_metrics():
    """Test resetting all metrics."""
    client = TestClient(app)
    response = client.post("/api/v1/performance/metrics/reset")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "message" in data


def test_run_benchmark():
    """Test running performance benchmark."""
    client = TestClient(app)
    response = client.get("/api/v1/performance/benchmark")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "benchmark_results" in data
    assert "computation_time" in data["benchmark_results"]
    assert "async_io_time" in data["benchmark_results"]
    assert "memory_allocation_time" in data["benchmark_results"]


def test_get_optimization_recommendations():
    """Test getting database optimization recommendations."""
    client = TestClient(app)
    response = client.get("/api/v1/performance/database/optimization-recommendations")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "recommendations" in data
    assert "query_metrics" in data


def test_performance_middleware_tracking():
    """Test that performance middleware tracks requests."""
    client = TestClient(app)

    # Reset metrics
    performance_monitor.reset_metrics()

    # Make a request
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    # Check that the request was tracked
    metrics = performance_monitor.get_overall_metrics()
    assert metrics["total_requests"] > 0
