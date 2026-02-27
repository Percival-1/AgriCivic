"""
Monitoring and observability endpoints for the AI-Driven Agri-Civic Intelligence Platform.

This module provides endpoints for:
- Circuit breaker status and metrics
- Error tracking and statistics
- Service health checks
- System metrics collection
- Alerting for critical failures
"""

import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.core.error_handling import circuit_breaker_registry, error_tracker
from app.services.llm_service import llm_service
from app.services.weather_service import get_weather_service
from app.services.maps_service import get_maps_service
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


class MetricsResponse(BaseModel):
    """System metrics response model."""

    timestamp: datetime
    uptime_seconds: float
    services: Dict[str, Any]
    circuit_breakers: Dict[str, Any]
    errors: Dict[str, Any]
    cache: Dict[str, Any]


class AlertRule(BaseModel):
    """Alert rule configuration."""

    name: str
    condition: str
    threshold: float
    severity: str  # critical, warning, info
    enabled: bool = True


class Alert(BaseModel):
    """Alert model."""

    id: str
    rule_name: str
    severity: str
    message: str
    timestamp: datetime
    resolved: bool = False
    details: Optional[Dict[str, Any]] = None


# In-memory alert storage (in production, use a database)
active_alerts: Dict[str, Alert] = {}
alert_history: List[Alert] = []

# Application start time for uptime calculation
app_start_time = time.time()


def check_alert_conditions() -> List[Alert]:
    """Check all alert conditions and generate alerts."""
    new_alerts = []

    try:
        # Check error rate
        error_summary = error_tracker.get_error_summary(300)  # Last 5 minutes
        error_rate = error_summary["total_errors"] / 300  # Errors per second

        if error_rate > 0.5:  # More than 0.5 errors per second
            alert = Alert(
                id=f"error_rate_{int(time.time())}",
                rule_name="high_error_rate",
                severity="critical" if error_rate > 1.0 else "warning",
                message=f"High error rate detected: {error_rate:.2f} errors/second",
                timestamp=datetime.utcnow(),
                details={
                    "error_rate": error_rate,
                    "total_errors": error_summary["total_errors"],
                },
            )
            new_alerts.append(alert)

        # Check circuit breakers
        breaker_metrics = circuit_breaker_registry.get_all_metrics()
        open_breakers = [
            name
            for name, metrics in breaker_metrics.items()
            if metrics["state"] == "open"
        ]

        if open_breakers:
            alert = Alert(
                id=f"circuit_breaker_{int(time.time())}",
                rule_name="circuit_breaker_open",
                severity="critical",
                message=f"Circuit breakers open: {', '.join(open_breakers)}",
                timestamp=datetime.utcnow(),
                details={"open_breakers": open_breakers},
            )
            new_alerts.append(alert)

        # Check cache health
        from app.services.cache_service import cache_service

        cache_metrics = cache_service.get_metrics()
        if cache_metrics["hit_rate"] < 0.3 and cache_metrics["total_requests"] > 100:
            alert = Alert(
                id=f"cache_hit_rate_{int(time.time())}",
                rule_name="low_cache_hit_rate",
                severity="warning",
                message=f"Low cache hit rate: {cache_metrics['hit_rate']:.2%}",
                timestamp=datetime.utcnow(),
                details={"hit_rate": cache_metrics["hit_rate"]},
            )
            new_alerts.append(alert)

    except Exception as e:
        logger.error(f"Error checking alert conditions: {e}")

    return new_alerts


def process_alerts(new_alerts: List[Alert]):
    """Process new alerts and update active alerts."""
    for alert in new_alerts:
        # Check if similar alert already exists
        existing_alert = active_alerts.get(alert.rule_name)

        if not existing_alert:
            # New alert
            active_alerts[alert.rule_name] = alert
            alert_history.append(alert)
            logger.warning(f"New alert: {alert.message}")

            # In production, send notifications here (email, Slack, PagerDuty, etc.)
            # send_alert_notification(alert)


@router.get("/circuit-breakers")
async def get_circuit_breaker_status() -> Dict[str, Any]:
    """
    Get status and metrics for all circuit breakers.

    Returns:
        Dictionary containing circuit breaker metrics for all services
    """
    try:
        metrics = circuit_breaker_registry.get_all_metrics()
        return {
            "status": "success",
            "circuit_breakers": metrics,
            "total_breakers": len(metrics),
        }
    except Exception as e:
        logger.error(f"Failed to get circuit breaker status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/circuit-breakers/{breaker_name}")
async def get_circuit_breaker_details(breaker_name: str) -> Dict[str, Any]:
    """
    Get detailed metrics for a specific circuit breaker.

    Args:
        breaker_name: Name of the circuit breaker

    Returns:
        Detailed metrics for the specified circuit breaker
    """
    try:
        breaker = circuit_breaker_registry.get(breaker_name)
        if not breaker:
            raise HTTPException(
                status_code=404, detail=f"Circuit breaker '{breaker_name}' not found"
            )

        return {"status": "success", "breaker": breaker.get_metrics()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get circuit breaker details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/circuit-breakers/{breaker_name}/reset")
async def reset_circuit_breaker(breaker_name: str) -> Dict[str, Any]:
    """
    Manually reset a circuit breaker to closed state.

    Args:
        breaker_name: Name of the circuit breaker to reset

    Returns:
        Success message
    """
    try:
        breaker = circuit_breaker_registry.get(breaker_name)
        if not breaker:
            raise HTTPException(
                status_code=404, detail=f"Circuit breaker '{breaker_name}' not found"
            )

        breaker.reset()
        logger.info(f"Circuit breaker '{breaker_name}' manually reset")

        return {
            "status": "success",
            "message": f"Circuit breaker '{breaker_name}' reset to closed state",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to reset circuit breaker: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/circuit-breakers/reset-all")
async def reset_all_circuit_breakers() -> Dict[str, Any]:
    """
    Reset all circuit breakers to closed state.

    Returns:
        Success message
    """
    try:
        circuit_breaker_registry.reset_all()
        logger.info("All circuit breakers manually reset")

        return {
            "status": "success",
            "message": "All circuit breakers reset to closed state",
        }
    except Exception as e:
        logger.error(f"Failed to reset all circuit breakers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/errors")
async def get_error_summary(time_window_seconds: int = 3600) -> Dict[str, Any]:
    """
    Get error summary and statistics.

    Args:
        time_window_seconds: Time window for error aggregation (default: 1 hour)

    Returns:
        Error summary including counts, rates, and severity distribution
    """
    try:
        summary = error_tracker.get_error_summary(time_window_seconds)
        return {"status": "success", "error_summary": summary}
    except Exception as e:
        logger.error(f"Failed to get error summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics", response_model=MetricsResponse)
async def get_system_metrics() -> MetricsResponse:
    """
    Get comprehensive system metrics.

    Returns:
        System-wide metrics including services, circuit breakers, errors, and cache
    """
    try:
        # Calculate uptime
        uptime = time.time() - app_start_time

        # Collect service metrics
        service_metrics = {
            "llm_service": llm_service.get_metrics(),
        }

        # Get weather service metrics if available
        try:
            weather_service = await get_weather_service()
            service_metrics["weather_service"] = {
                "circuit_breaker": weather_service.circuit_breaker.get_metrics()
            }
        except Exception as e:
            logger.warning(f"Failed to get weather service metrics: {e}")
            service_metrics["weather_service"] = {"error": str(e)}

        # Get maps service metrics if available
        try:
            maps_service = await get_maps_service()
            service_metrics["maps_service"] = {
                "circuit_breaker": maps_service.circuit_breaker.get_metrics()
            }
        except Exception as e:
            logger.warning(f"Failed to get maps service metrics: {e}")
            service_metrics["maps_service"] = {"error": str(e)}

        # Get circuit breaker metrics
        breaker_metrics = circuit_breaker_registry.get_all_metrics()

        # Get error metrics
        error_summary = error_tracker.get_error_summary(3600)

        # Get cache metrics
        from app.services.cache_service import cache_service

        cache_metrics = cache_service.get_metrics()

        return MetricsResponse(
            timestamp=datetime.utcnow(),
            uptime_seconds=uptime,
            services=service_metrics,
            circuit_breakers=breaker_metrics,
            errors=error_summary,
            cache=cache_metrics,
        )
    except Exception as e:
        logger.error(f"Failed to get system metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/service-metrics")
async def get_service_metrics() -> Dict[str, Any]:
    """
    Get comprehensive metrics for all services.

    Returns:
        Metrics for LLM, weather, and maps services
    """
    try:
        metrics = {
            "llm_service": llm_service.get_metrics(),
        }

        # Get weather service metrics if available
        try:
            weather_service = await get_weather_service()
            metrics["weather_service"] = {
                "circuit_breaker": weather_service.circuit_breaker.get_metrics()
            }
        except Exception as e:
            logger.warning(f"Failed to get weather service metrics: {e}")
            metrics["weather_service"] = {"error": str(e)}

        # Get maps service metrics if available
        try:
            maps_service = await get_maps_service()
            metrics["maps_service"] = {
                "circuit_breaker": maps_service.circuit_breaker.get_metrics()
            }
        except Exception as e:
            logger.warning(f"Failed to get maps service metrics: {e}")
            metrics["maps_service"] = {"error": str(e)}

        return {"status": "success", "metrics": metrics}
    except Exception as e:
        logger.error(f"Failed to get service metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Comprehensive health check for all services.

    Returns:
        Health status for all services including circuit breaker states
    """
    try:
        health_status = {
            "status": "healthy",
            "services": {},
            "circuit_breakers": {},
        }

        # Check LLM service
        try:
            llm_health = await llm_service.health_check()
            health_status["services"]["llm"] = llm_health
        except Exception as e:
            health_status["services"]["llm"] = {"status": "unhealthy", "error": str(e)}
            health_status["status"] = "degraded"

        # Check circuit breakers
        breaker_metrics = circuit_breaker_registry.get_all_metrics()
        for name, metrics in breaker_metrics.items():
            health_status["circuit_breakers"][name] = {
                "state": metrics["state"],
                "healthy": metrics["state"] != "open",
            }
            if metrics["state"] == "open":
                health_status["status"] = "degraded"

        # Check error rates
        error_summary = error_tracker.get_error_summary(300)  # Last 5 minutes
        if error_summary["total_errors"] > 50:  # More than 50 errors in 5 minutes
            health_status["status"] = "degraded"
            health_status["warning"] = "High error rate detected"

        return health_status
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
        }


@router.get("/alerts")
async def get_active_alerts(background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """
    Get active alerts.

    Returns:
        List of active alerts
    """
    try:
        # Check for new alerts in background
        background_tasks.add_task(check_and_process_alerts)

        return {
            "status": "success",
            "active_alerts": list(active_alerts.values()),
            "total_active": len(active_alerts),
        }
    except Exception as e:
        logger.error(f"Failed to get active alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/history")
async def get_alert_history(limit: int = 100) -> Dict[str, Any]:
    """
    Get alert history.

    Args:
        limit: Maximum number of alerts to return

    Returns:
        List of historical alerts
    """
    try:
        return {
            "status": "success",
            "alerts": alert_history[-limit:],
            "total": len(alert_history),
        }
    except Exception as e:
        logger.error(f"Failed to get alert history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str) -> Dict[str, Any]:
    """
    Resolve an active alert.

    Args:
        alert_id: Alert ID to resolve

    Returns:
        Success message
    """
    try:
        # Find alert by rule name (using rule_name as key)
        alert = None
        for rule_name, active_alert in active_alerts.items():
            if active_alert.id == alert_id:
                alert = active_alert
                del active_alerts[rule_name]
                break

        if not alert:
            raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found")

        alert.resolved = True
        logger.info(f"Alert resolved: {alert.message}")

        return {
            "status": "success",
            "message": f"Alert '{alert_id}' resolved",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to resolve alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/check")
async def check_and_process_alerts() -> Dict[str, Any]:
    """
    Manually trigger alert condition checks.

    Returns:
        List of new alerts generated
    """
    try:
        new_alerts = check_alert_conditions()
        process_alerts(new_alerts)

        return {
            "status": "success",
            "new_alerts": len(new_alerts),
            "alerts": new_alerts,
        }
    except Exception as e:
        logger.error(f"Failed to check alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/errors/clear")
async def clear_old_errors(max_age_seconds: int = 86400) -> Dict[str, Any]:
    """
    Clear old error records.

    Args:
        max_age_seconds: Maximum age of errors to keep (default: 24 hours)

    Returns:
        Success message
    """
    try:
        error_tracker.clear_old_errors(max_age_seconds)
        logger.info(f"Cleared errors older than {max_age_seconds} seconds")

        return {
            "status": "success",
            "message": f"Cleared errors older than {max_age_seconds} seconds",
        }
    except Exception as e:
        logger.error(f"Failed to clear old errors: {e}")
        raise HTTPException(status_code=500, detail=str(e))
