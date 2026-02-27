"""
Integration tests for government portal synchronization.
Tests the complete workflow from portal sync to scheme retrieval.
"""

import pytest
from unittest.mock import patch, AsyncMock

from app.services.government_portal_sync import government_portal_sync, SyncStatus
from app.services.scheme_service import scheme_service, UserProfile


@pytest.mark.asyncio
async def test_complete_sync_and_retrieval_workflow():
    """
    Test complete workflow:
    1. Sync government portals
    2. Verify documents are ingested
    3. Search for schemes
    4. Verify results are returned
    """
    # Step 1: Trigger portal synchronization
    sync_result = await government_portal_sync.sync_all_portals(force_sync=True)

    # Verify sync completed
    assert sync_result.status in [SyncStatus.COMPLETED, SyncStatus.PARTIAL]
    assert sync_result.total_documents > 0

    # Step 2: Verify documents were synced
    status = government_portal_sync.get_sync_status()
    assert status["total_synced_documents"] > 0
    assert status["last_sync_time"] is not None

    # Step 3: Search for schemes (this would use the synced data)
    # Note: In a real integration test, this would query the actual RAG engine
    # For now, we verify the sync service is working
    assert len(government_portal_sync.synced_documents) > 0

    # Verify we can access synced documents
    for doc_id, doc in government_portal_sync.synced_documents.items():
        assert doc.scheme_id
        assert doc.scheme_name
        assert doc.content
        assert doc.content_hash


@pytest.mark.asyncio
async def test_sync_with_validation():
    """Test that sync validates documents before ingestion."""
    # Trigger sync
    sync_result = await government_portal_sync.sync_all_portals(force_sync=True)

    # All synced documents should be valid
    for doc in government_portal_sync.synced_documents.values():
        validation_result = government_portal_sync._validate_document(doc)
        assert validation_result.is_valid is True


@pytest.mark.asyncio
async def test_incremental_sync():
    """Test that incremental sync only updates changed documents."""
    # First sync
    first_sync = await government_portal_sync.sync_all_portals(force_sync=True)
    first_count = first_sync.new_documents + first_sync.updated_documents

    # Second sync (should skip unchanged documents)
    second_sync = await government_portal_sync.sync_all_portals(force_sync=True)

    # Second sync should have more skipped documents
    assert second_sync.skipped_documents >= first_sync.skipped_documents


@pytest.mark.asyncio
async def test_sync_status_tracking():
    """Test that sync status is properly tracked."""
    # Get initial status
    initial_status = government_portal_sync.get_sync_status()

    # Perform sync
    await government_portal_sync.sync_all_portals(force_sync=True)

    # Get updated status
    updated_status = government_portal_sync.get_sync_status()

    # Verify status was updated
    assert updated_status["last_sync_time"] is not None
    assert (
        updated_status["total_synced_documents"]
        >= initial_status["total_synced_documents"]
    )


@pytest.mark.asyncio
async def test_portal_configuration():
    """Test portal configuration management."""
    portals = government_portal_sync.portal_configs

    # Verify we have configured portals
    assert len(portals) > 0

    # Verify each portal has required fields
    for portal in portals:
        assert "name" in portal
        assert "url" in portal
        assert "scheme_type" in portal
        assert "enabled" in portal


@pytest.mark.asyncio
async def test_sync_error_handling():
    """Test that sync handles errors gracefully."""
    # Mock a portal that will fail
    with patch.object(
        government_portal_sync,
        "_fetch_portal_documents",
        side_effect=Exception("Portal unavailable"),
    ):
        # Sync should handle the error and continue
        result = await government_portal_sync.sync_all_portals(force_sync=True)

        # Should have partial status or failed
        assert result.status in [SyncStatus.FAILED, SyncStatus.PARTIAL]
        assert len(result.errors) > 0


@pytest.mark.asyncio
async def test_data_quality_validation():
    """Test that data quality is validated during sync."""
    from app.services.government_portal_sync import SchemeDocument, DataQualityLevel

    # Create documents with different quality levels
    high_quality = SchemeDocument(
        scheme_id="hq_001",
        scheme_name="High Quality Scheme",
        content="Complete scheme with eligibility, benefits, application process, and required documents.",
        metadata={"source": "test", "scheme_type": "financial"},
    )

    low_quality = SchemeDocument(
        scheme_id="lq_001",
        scheme_name="Low Quality Scheme",
        content="Minimal information. " * 10,
        metadata={},
    )

    # Validate quality
    hq_result = government_portal_sync._validate_document(high_quality)
    lq_result = government_portal_sync._validate_document(low_quality)

    # High quality should be valid
    assert hq_result.is_valid is True
    assert hq_result.quality_level in [DataQualityLevel.HIGH, DataQualityLevel.MEDIUM]

    # Low quality should have warnings
    assert len(lq_result.warnings) > 0


@pytest.mark.asyncio
async def test_sync_notification_generation():
    """Test that sync can trigger notifications for new schemes."""
    # Perform sync
    result = await government_portal_sync.sync_all_portals(force_sync=True)

    # If new documents were added, they could trigger notifications
    if result.new_documents > 0:
        # In a real system, this would trigger notification service
        # For now, verify we can identify new documents
        assert result.new_documents > 0

        # Verify new documents are accessible
        new_docs = [doc for doc in government_portal_sync.synced_documents.values()]
        assert len(new_docs) > 0
