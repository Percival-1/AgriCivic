"""
Performance monitoring service for the AI-Driven Agri-Civic Intelligence Platform.

This module provides:
- Response time tracking and optimization
- Request/response logging and metrics
- Performance benchmarking
- Database query optimization tracking
"""

import time
import asyncio
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, deque
import statistics

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class RequestMetrics:
    """Metrics for a single request."""

    request_id: str
    method: str
    path: str
    status_code: int
    response_time: float
    timestamp: datetime
    user_agent: Optional[str] = None
    client_ip: Optional[str] = None
    error: Optional[str] = None


@dataclass
class EndpointMetrics:
    """Aggregated metrics for an endpoint."""

    path: str
    total_requests: int = 0
    total_errors: int = 0
    total_response_time: float = 0.0
    min_response_time: float = float("inf")
    max_response_time: float = 0.0
    response_times: deque = field(default_factory=lambda: deque(maxlen=1000))

    def add_request(self, response_time: float, is_error: bool = False):
        """Add a request to the metrics."""
        self.total_requests += 1
        self.total_response_time += response_time
        self.response_times.append(response_time)

        if is_error:
            self.total_errors += 1

        self.min_response_time = min(self.min_response_time, response_time)
        self.max_response_time = max(self.max_response_time, response_time)

    def get_average_response_time(self) -> float:
        """Get average response time."""
        if self.total_requests == 0:
            return 0.0
        return self.total_response_time / self.total_requests

    def get_median_response_time(self) -> float:
        """Get median response time."""
        if not self.response_times:
            return 0.0
        return statistics.median(self.response_times)

    def get_p95_response_time(self) -> float:
        """Get 95th percentile response time."""
        if not self.response_times:
            return 0.0
        sorted_times = sorted(self.response_times)
        index = int(len(sorted_times) * 0.95)
        return sorted_times[index] if index < len(sorted_times) else sorted_times[-1]

    def get_p99_response_time(self) -> float:
        """Get 99th percentile response time."""
        if not self.response_times:
            return 0.0
        sorted_times = sorted(self.response_times)
        index = int(len(sorted_times) * 0.99)
        return sorted_times[index] if index < len(sorted_times) else sorted_times[-1]

    def get_error_rate(self) -> float:
        """Get error rate as a percentage."""
        if self.total_requests == 0:
            return 0.0
        return (self.total_errors / self.total_requests) * 100


@dataclass
class DatabaseQueryMetrics:
    """Metrics for database queries."""

    query_type: str
    table_name: str
    execution_time: float
    timestamp: datetime
    rows_affected: Optional[int] = None
    query_hash: Optional[str] = None


class PerformanceMonitor:
    """Performance monitoring service."""

    def __init__(self, max_history: int = 10000):
        """
        Initialize performance monitor.

        Args:
            max_history: Maximum number of request metrics to keep in history
        """
        self.max_history = max_history
        self.request_history: deque = deque(maxlen=max_history)
        self.endpoint_metrics: Dict[str, EndpointMetrics] = defaultdict(
            lambda: EndpointMetrics(path="")
        )
        self.db_query_history: deque = deque(maxlen=max_history)
        self.slow_queries: List[DatabaseQueryMetrics] = []
        self.slow_query_threshold = 1.0  # 1 second
        self._lock = asyncio.Lock()

        logger.info("Performance monitor initialized")

    async def record_request(
        self,
        request_id: str,
        method: str,
        path: str,
        status_code: int,
        response_time: float,
        user_agent: Optional[str] = None,
        client_ip: Optional[str] = None,
        error: Optional[str] = None,
    ):
        """
        Record a request metric.

        Args:
            request_id: Unique request identifier
            method: HTTP method
            path: Request path
            status_code: HTTP status code
            response_time: Response time in seconds
            user_agent: User agent string
            client_ip: Client IP address
            error: Error message if any
        """
        async with self._lock:
            metrics = RequestMetrics(
                request_id=request_id,
                method=method,
                path=path,
                status_code=status_code,
                response_time=response_time,
                timestamp=datetime.utcnow(),
                user_agent=user_agent,
                client_ip=client_ip,
                error=error,
            )

            self.request_history.append(metrics)

            # Update endpoint metrics
            if path not in self.endpoint_metrics:
                self.endpoint_metrics[path] = EndpointMetrics(path=path)

            is_error = status_code >= 400
            self.endpoint_metrics[path].add_request(response_time, is_error)

            # Log slow requests
            if response_time > 3.0:
                logger.warning(
                    f"Slow request detected: {method} {path} - "
                    f"{response_time:.4f}s (status: {status_code})"
                )

    async def record_db_query(
        self,
        query_type: str,
        table_name: str,
        execution_time: float,
        rows_affected: Optional[int] = None,
        query_hash: Optional[str] = None,
    ):
        """
        Record a database query metric.

        Args:
            query_type: Type of query (SELECT, INSERT, UPDATE, DELETE)
            table_name: Name of the table
            execution_time: Query execution time in seconds
            rows_affected: Number of rows affected
            query_hash: Hash of the query for identification
        """
        async with self._lock:
            metrics = DatabaseQueryMetrics(
                query_type=query_type,
                table_name=table_name,
                execution_time=execution_time,
                timestamp=datetime.utcnow(),
                rows_affected=rows_affected,
                query_hash=query_hash,
            )

            self.db_query_history.append(metrics)

            # Track slow queries
            if execution_time > self.slow_query_threshold:
                self.slow_queries.append(metrics)
                logger.warning(
                    f"Slow database query detected: {query_type} on {table_name} - "
                    f"{execution_time:.4f}s"
                )

                # Keep only last 100 slow queries
                if len(self.slow_queries) > 100:
                    self.slow_queries = self.slow_queries[-100:]

    def get_endpoint_metrics(self, path: Optional[str] = None) -> Dict[str, Any]:
        """
        Get metrics for a specific endpoint or all endpoints.

        Args:
            path: Endpoint path (optional)

        Returns:
            Dictionary containing endpoint metrics
        """
        if path:
            if path not in self.endpoint_metrics:
                return {"error": f"No metrics found for endpoint: {path}"}

            metrics = self.endpoint_metrics[path]
            return {
                "path": path,
                "total_requests": metrics.total_requests,
                "total_errors": metrics.total_errors,
                "error_rate": f"{metrics.get_error_rate():.2f}%",
                "response_times": {
                    "average": f"{metrics.get_average_response_time():.4f}s",
                    "median": f"{metrics.get_median_response_time():.4f}s",
                    "min": f"{metrics.min_response_time:.4f}s",
                    "max": f"{metrics.max_response_time:.4f}s",
                    "p95": f"{metrics.get_p95_response_time():.4f}s",
                    "p99": f"{metrics.get_p99_response_time():.4f}s",
                },
            }

        # Return all endpoint metrics
        return {
            endpoint: {
                "total_requests": metrics.total_requests,
                "total_errors": metrics.total_errors,
                "error_rate": f"{metrics.get_error_rate():.2f}%",
                "avg_response_time": f"{metrics.get_average_response_time():.4f}s",
                "p95_response_time": f"{metrics.get_p95_response_time():.4f}s",
            }
            for endpoint, metrics in self.endpoint_metrics.items()
        }

    def get_overall_metrics(self) -> Dict[str, Any]:
        """
        Get overall system metrics.

        Returns:
            Dictionary containing overall metrics
        """
        total_requests = sum(m.total_requests for m in self.endpoint_metrics.values())
        total_errors = sum(m.total_errors for m in self.endpoint_metrics.values())

        all_response_times = []
        for metrics in self.endpoint_metrics.values():
            all_response_times.extend(metrics.response_times)

        return {
            "total_requests": total_requests,
            "total_errors": total_errors,
            "error_rate": f"{(total_errors / total_requests * 100) if total_requests > 0 else 0:.2f}%",
            "total_endpoints": len(self.endpoint_metrics),
            "response_times": {
                "average": (
                    f"{statistics.mean(all_response_times):.4f}s"
                    if all_response_times
                    else "0.0000s"
                ),
                "median": (
                    f"{statistics.median(all_response_times):.4f}s"
                    if all_response_times
                    else "0.0000s"
                ),
                "p95": f"{sorted(all_response_times)[int(len(all_response_times) * 0.95)] if all_response_times else 0:.4f}s",
                "p99": f"{sorted(all_response_times)[int(len(all_response_times) * 0.99)] if all_response_times else 0:.4f}s",
            },
        }

    def get_slow_requests(
        self, threshold: float = 3.0, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get slow requests above a threshold.

        Args:
            threshold: Response time threshold in seconds
            limit: Maximum number of results

        Returns:
            List of slow requests
        """
        slow_requests = [
            {
                "request_id": m.request_id,
                "method": m.method,
                "path": m.path,
                "status_code": m.status_code,
                "response_time": f"{m.response_time:.4f}s",
                "timestamp": m.timestamp.isoformat(),
                "error": m.error,
            }
            for m in self.request_history
            if m.response_time > threshold
        ]

        # Sort by response time descending
        slow_requests.sort(
            key=lambda x: float(x["response_time"].rstrip("s")), reverse=True
        )

        return slow_requests[:limit]

    def get_db_query_metrics(self) -> Dict[str, Any]:
        """
        Get database query metrics.

        Returns:
            Dictionary containing database query metrics
        """
        if not self.db_query_history:
            return {
                "total_queries": 0,
                "average_execution_time": "0.0000s",
                "slow_queries_count": 0,
            }

        execution_times = [q.execution_time for q in self.db_query_history]

        # Group by query type
        query_type_metrics = defaultdict(lambda: {"count": 0, "total_time": 0.0})
        for query in self.db_query_history:
            query_type_metrics[query.query_type]["count"] += 1
            query_type_metrics[query.query_type]["total_time"] += query.execution_time

        return {
            "total_queries": len(self.db_query_history),
            "average_execution_time": f"{statistics.mean(execution_times):.4f}s",
            "median_execution_time": f"{statistics.median(execution_times):.4f}s",
            "p95_execution_time": f"{sorted(execution_times)[int(len(execution_times) * 0.95)]:.4f}s",
            "slow_queries_count": len(self.slow_queries),
            "by_query_type": {
                qtype: {
                    "count": metrics["count"],
                    "avg_time": f"{metrics['total_time'] / metrics['count']:.4f}s",
                }
                for qtype, metrics in query_type_metrics.items()
            },
        }

    def get_slow_queries(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get slow database queries.

        Args:
            limit: Maximum number of results

        Returns:
            List of slow queries
        """
        slow_queries = [
            {
                "query_type": q.query_type,
                "table_name": q.table_name,
                "execution_time": f"{q.execution_time:.4f}s",
                "rows_affected": q.rows_affected,
                "timestamp": q.timestamp.isoformat(),
            }
            for q in self.slow_queries
        ]

        # Sort by execution time descending
        slow_queries.sort(
            key=lambda x: float(x["execution_time"].rstrip("s")), reverse=True
        )

        return slow_queries[:limit]

    def get_time_series_metrics(self, minutes: int = 60) -> Dict[str, Any]:
        """
        Get time series metrics for the last N minutes.

        Args:
            minutes: Number of minutes to look back

        Returns:
            Time series data
        """
        cutoff_time = datetime.utcnow() - timedelta(minutes=minutes)

        # Filter recent requests
        recent_requests = [
            m for m in self.request_history if m.timestamp >= cutoff_time
        ]

        if not recent_requests:
            return {
                "time_window_minutes": minutes,
                "total_requests": 0,
                "requests_per_minute": 0.0,
            }

        # Group by minute
        requests_by_minute = defaultdict(int)
        errors_by_minute = defaultdict(int)

        for request in recent_requests:
            minute_key = request.timestamp.replace(second=0, microsecond=0)
            requests_by_minute[minute_key] += 1
            if request.status_code >= 400:
                errors_by_minute[minute_key] += 1

        return {
            "time_window_minutes": minutes,
            "total_requests": len(recent_requests),
            "requests_per_minute": len(recent_requests) / minutes,
            "time_series": [
                {
                    "timestamp": minute.isoformat(),
                    "requests": count,
                    "errors": errors_by_minute.get(minute, 0),
                }
                for minute, count in sorted(requests_by_minute.items())
            ],
        }

    async def clear_old_metrics(self, hours: int = 24):
        """
        Clear metrics older than specified hours.

        Args:
            hours: Number of hours to keep
        """
        async with self._lock:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)

            # Clear old request history
            self.request_history = deque(
                (m for m in self.request_history if m.timestamp >= cutoff_time),
                maxlen=self.max_history,
            )

            # Clear old db query history
            self.db_query_history = deque(
                (q for q in self.db_query_history if q.timestamp >= cutoff_time),
                maxlen=self.max_history,
            )

            # Clear old slow queries
            self.slow_queries = [
                q for q in self.slow_queries if q.timestamp >= cutoff_time
            ]

            logger.info(f"Cleared metrics older than {hours} hours")

    def reset_metrics(self):
        """Reset all metrics."""
        self.request_history.clear()
        self.endpoint_metrics.clear()
        self.db_query_history.clear()
        self.slow_queries.clear()
        logger.info("All performance metrics reset")


# Global performance monitor instance
performance_monitor = PerformanceMonitor()
