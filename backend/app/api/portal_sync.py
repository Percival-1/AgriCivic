"""
Government Portal Synchronization API endpoints.
Provides endpoints for triggering and monitoring portal synchronization.
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from app.services.government_portal_sync import government_portal_sync, SyncStatus
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/portal-sync", tags=["Portal Synchronization"])


# Request/Response Models
class SyncRequest(BaseModel):
    """Request model for triggering synchronization."""

    force_sync: bool = Field(
        False, description="Force synchronization even if recently synced"
    )


class SyncStatusResponse(BaseModel):
    """Response model for sync status."""

    last_sync_time: str | None
    total_synced_documents: int
    sync_interval_hours: int
    next_sync_due: str
    configured_portals: int
    enabled_portals: int


class SyncResultResponse(BaseModel):
    """Response model for sync results."""

    status: str
    total_documents: int
    new_documents: int
    updated_documents: int
    failed_documents: int
    skipped_documents: int
    sync_duration_seconds: float
    errors: list[str]
    warnings: list[str]
    timestamp: str


# API Endpoints
@router.post("/trigger", summary="Trigger portal synchronization")
async def trigger_sync(
    request: SyncRequest,
    background_tasks: BackgroundTasks,
):
    """
    Trigger synchronization of government portal data.

    Can be run in foreground (blocking) or background (non-blocking).
    """
    try:
        logger.info(f"Triggering portal sync (force={request.force_sync})")

        # Run sync in foreground for immediate results
        result = await government_portal_sync.sync_all_portals(
            force_sync=request.force_sync
        )

        return {
            "success": True,
            "message": "Portal synchronization completed",
            "result": SyncResultResponse(
                status=result.status.value,
                total_documents=result.total_documents,
                new_documents=result.new_documents,
                updated_documents=result.updated_documents,
                failed_documents=result.failed_documents,
                skipped_documents=result.skipped_documents,
                sync_duration_seconds=result.sync_duration_seconds,
                errors=result.errors,
                warnings=result.warnings,
                timestamp=result.timestamp.isoformat(),
            ),
        }

    except Exception as e:
        logger.error(f"Failed to trigger portal sync: {e}")
        raise HTTPException(
            status_code=500, detail=f"Portal synchronization failed: {str(e)}"
        )


@router.post("/trigger-background", summary="Trigger background synchronization")
async def trigger_background_sync(
    request: SyncRequest,
    background_tasks: BackgroundTasks,
):
    """
    Trigger synchronization in background (non-blocking).

    Returns immediately while sync runs in background.
    """
    try:
        logger.info(f"Triggering background portal sync (force={request.force_sync})")

        # Add sync task to background
        background_tasks.add_task(
            government_portal_sync.sync_all_portals,
            force_sync=request.force_sync,
        )

        return {
            "success": True,
            "message": "Portal synchronization started in background",
            "status": "in_progress",
        }

    except Exception as e:
        logger.error(f"Failed to trigger background sync: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to start background sync: {str(e)}"
        )


@router.get("/status", summary="Get synchronization status")
async def get_sync_status():
    """
    Get current synchronization status and statistics.
    """
    try:
        status = government_portal_sync.get_sync_status()

        return {
            "success": True,
            "status": SyncStatusResponse(**status),
        }

    except Exception as e:
        logger.error(f"Failed to get sync status: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get sync status: {str(e)}"
        )


@router.get("/portals", summary="Get configured portals")
async def get_configured_portals():
    """
    Get list of configured government portals.
    """
    try:
        portals = government_portal_sync.portal_configs

        return {
            "success": True,
            "total_portals": len(portals),
            "portals": [
                {
                    "name": p["name"],
                    "url": p["url"],
                    "scheme_type": p.get("scheme_type", "general"),
                    "enabled": p.get("enabled", True),
                }
                for p in portals
            ],
        }

    except Exception as e:
        logger.error(f"Failed to get portal list: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get portal list: {str(e)}"
        )


@router.get("/documents", summary="Get synced documents")
async def get_synced_documents(
    limit: int = 50,
    offset: int = 0,
):
    """
    Get list of synchronized documents.
    """
    try:
        all_docs = list(government_portal_sync.synced_documents.values())

        # Paginate
        paginated_docs = all_docs[offset : offset + limit]

        return {
            "success": True,
            "total_documents": len(all_docs),
            "limit": limit,
            "offset": offset,
            "documents": [
                {
                    "scheme_id": doc.scheme_id,
                    "scheme_name": doc.scheme_name,
                    "source_url": doc.source_url,
                    "last_updated": (
                        doc.last_updated.isoformat() if doc.last_updated else None
                    ),
                    "content_hash": doc.content_hash,
                    "metadata": doc.metadata,
                }
                for doc in paginated_docs
            ],
        }

    except Exception as e:
        logger.error(f"Failed to get synced documents: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get synced documents: {str(e)}"
        )


@router.get("/health", summary="Check sync service health")
async def check_sync_health():
    """
    Check health of synchronization service.
    """
    try:
        status = government_portal_sync.get_sync_status()

        # Determine health status
        health_status = "healthy"
        issues = []

        if status["enabled_portals"] == 0:
            health_status = "degraded"
            issues.append("No portals enabled")

        if status["last_sync_time"] is None:
            health_status = "warning"
            issues.append("No synchronization performed yet")

        return {
            "success": True,
            "health_status": health_status,
            "issues": issues,
            "service_info": {
                "total_synced_documents": status["total_synced_documents"],
                "enabled_portals": status["enabled_portals"],
                "last_sync_time": status["last_sync_time"],
            },
        }

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "success": False,
            "health_status": "unhealthy",
            "issues": [str(e)],
        }
