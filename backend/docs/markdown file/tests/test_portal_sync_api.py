"""
Tests for government portal synchronization API endpoints.
"""

import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from datetime import datetime

from app.main import app
from app.services.government_portal_sync import SyncResult, SyncStatus


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def mock_sync_result():
    """Create a mock sync result."""
    return SyncResult(
        status=SyncStatus.COMPLETED,
        total_documents=10,
        new_documents=5,
        updated_documents=3,
        failed_documents=0,
        skipped_documents=2,
        sync_duration_seconds=2.5,
        errors=[],
        warnings=["Some warning"],
        timestamp=datetime.now(),
    )


class TestPortalSyncAPI:
    """Test portal synchronization API endpoints."""

    @pytest.mark.asyncio
    async def test_trigger_sync(self, client, mock_sync_result):
        """Test triggering portal synchronization."""
        with patch(
            "app.api.portal_sync.government_portal_sync.sync_all_portals",
            new_callable=AsyncMock,
        ) as mock_sync:
            mock_sync.return_value = mock_sync_result

            response = client.post(
                "/api/v1/portal-sync/trigger", json={"force_sync": True}
            )

            assert response.status_code == 200
            data = response.json()

            assert data["success"] is True
            assert "result" in data
            assert data["result"]["status"] == "completed"
            assert data["result"]["new_documents"] == 5
            assert data["result"]["updated_documents"] == 3

    @pytest.mark.asyncio
    async def test_trigger_sync_without_force(self, client, mock_sync_result):
        """Test triggering sync without force flag."""
        with patch(
            "app.api.portal_sync.government_portal_sync.sync_all_portals",
            new_callable=AsyncMock,
        ) as mock_sync:
            mock_sync.return_value = mock_sync_result

            response = client.post(
                "/api/v1/portal-sync/trigger", json={"force_sync": False}
            )

            assert response.status_code == 200
            mock_sync.assert_called_once_with(force_sync=False)

    @pytest.mark.asyncio
    async def test_trigger_background_sync(self, client):
        """Test triggering background synchronization."""
        response = client.post(
            "/api/v1/portal-sync/trigger-background", json={"force_sync": True}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["status"] == "in_progress"
        assert "background" in data["message"].lower()

    def test_get_sync_status(self, client):
        """Test getting synchronization status."""
        with patch(
            "app.api.portal_sync.government_portal_sync.get_sync_status"
        ) as mock_status:
            mock_status.return_value = {
                "last_sync_time": datetime.now().isoformat(),
                "total_synced_documents": 25,
                "sync_interval_hours": 24,
                "next_sync_due": datetime.now().isoformat(),
                "configured_portals": 4,
                "enabled_portals": 4,
            }

            response = client.get("/api/v1/portal-sync/status")

            assert response.status_code == 200
            data = response.json()

            assert data["success"] is True
            assert "status" in data
            assert data["status"]["total_synced_documents"] == 25
            assert data["status"]["configured_portals"] == 4

    def test_get_configured_portals(self, client):
        """Test getting configured portals."""
        response = client.get("/api/v1/portal-sync/portals")

        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "portals" in data
        assert data["total_portals"] > 0
        assert all("name" in p for p in data["portals"])
        assert all("url" in p for p in data["portals"])

    def test_get_synced_documents(self, client):
        """Test getting synced documents."""
        from app.services.government_portal_sync import SchemeDocument

        with patch(
            "app.api.portal_sync.government_portal_sync.synced_documents"
        ) as mock_docs:
            mock_docs.values.return_value = [
                SchemeDocument(
                    scheme_id="test_001",
                    scheme_name="Test Scheme 1",
                    content="Content 1",
                    metadata={"source": "test"},
                    source_url="https://test.gov.in",
                    last_updated=datetime.now(),
                ),
                SchemeDocument(
                    scheme_id="test_002",
                    scheme_name="Test Scheme 2",
                    content="Content 2",
                    metadata={"source": "test"},
                    source_url="https://test.gov.in",
                    last_updated=datetime.now(),
                ),
            ]

            response = client.get("/api/v1/portal-sync/documents?limit=10&offset=0")

            assert response.status_code == 200
            data = response.json()

            assert data["success"] is True
            assert "documents" in data
            assert data["total_documents"] == 2
            assert data["limit"] == 10
            assert data["offset"] == 0

    def test_get_synced_documents_pagination(self, client):
        """Test pagination of synced documents."""
        response = client.get("/api/v1/portal-sync/documents?limit=5&offset=10")

        assert response.status_code == 200
        data = response.json()

        assert data["limit"] == 5
        assert data["offset"] == 10

    def test_check_sync_health(self, client):
        """Test sync service health check."""
        with patch(
            "app.api.portal_sync.government_portal_sync.get_sync_status"
        ) as mock_status:
            mock_status.return_value = {
                "last_sync_time": datetime.now().isoformat(),
                "total_synced_documents": 25,
                "sync_interval_hours": 24,
                "next_sync_due": datetime.now().isoformat(),
                "configured_portals": 4,
                "enabled_portals": 4,
            }

            response = client.get("/api/v1/portal-sync/health")

            assert response.status_code == 200
            data = response.json()

            assert data["success"] is True
            assert "health_status" in data
            assert data["health_status"] in [
                "healthy",
                "degraded",
                "warning",
                "unhealthy",
            ]

    def test_check_sync_health_no_portals(self, client):
        """Test health check when no portals enabled."""
        with patch(
            "app.api.portal_sync.government_portal_sync.get_sync_status"
        ) as mock_status:
            mock_status.return_value = {
                "last_sync_time": None,
                "total_synced_documents": 0,
                "sync_interval_hours": 24,
                "next_sync_due": "immediately",
                "configured_portals": 4,
                "enabled_portals": 0,
            }

            response = client.get("/api/v1/portal-sync/health")

            assert response.status_code == 200
            data = response.json()

            assert data["health_status"] in ["degraded", "warning"]
            assert len(data["issues"]) > 0

    @pytest.mark.asyncio
    async def test_trigger_sync_error(self, client):
        """Test error handling in sync trigger."""
        with patch(
            "app.api.portal_sync.government_portal_sync.sync_all_portals",
            new_callable=AsyncMock,
        ) as mock_sync:
            mock_sync.side_effect = Exception("Sync failed")

            response = client.post(
                "/api/v1/portal-sync/trigger", json={"force_sync": True}
            )

            assert response.status_code == 500
            data = response.json()
            # Check for error in either format (detail or error object)
            assert "detail" in data or "error" in data
            if "error" in data:
                assert "failed" in data["error"]["message"].lower()
            else:
                assert "failed" in data["detail"].lower()


class TestPortalSyncIntegration:
    """Integration tests for portal sync."""

    @pytest.mark.asyncio
    async def test_full_sync_workflow(self, client):
        """Test complete sync workflow."""
        # 1. Check initial status
        response = client.get("/api/v1/portal-sync/status")
        assert response.status_code == 200

        # 2. Get configured portals
        response = client.get("/api/v1/portal-sync/portals")
        assert response.status_code == 200
        assert response.json()["total_portals"] > 0

        # 3. Check health
        response = client.get("/api/v1/portal-sync/health")
        assert response.status_code == 200

        # 4. Trigger background sync
        response = client.post(
            "/api/v1/portal-sync/trigger-background", json={"force_sync": True}
        )
        assert response.status_code == 200
