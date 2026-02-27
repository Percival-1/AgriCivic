"""
Tests for government portal synchronization service.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock

from app.services.government_portal_sync import (
    GovernmentPortalSync,
    SchemeDocument,
    SyncStatus,
    DataQualityLevel,
    ValidationResult,
)


@pytest.fixture
def portal_sync():
    """Create a portal sync instance for testing."""
    return GovernmentPortalSync()


@pytest.fixture
def sample_scheme_document():
    """Create a sample scheme document."""
    return SchemeDocument(
        scheme_id="test_scheme_001",
        scheme_name="Test Agricultural Scheme",
        content="""This is a test agricultural scheme providing financial assistance to farmers.
        
        Eligibility: Small and marginal farmers with land up to 2 hectares.
        Benefits: Rs. 5000 per year as direct benefit transfer.
        Application: Online through government portal.
        Required Documents: Aadhaar card, Bank account details, Land records.
        """,
        metadata={
            "source": "test_portal",
            "scheme_type": "financial_assistance",
            "ministry": "Ministry of Agriculture",
        },
        source_url="https://test-portal.gov.in/scheme",
        last_updated=datetime.now(),
    )


class TestSchemeDocument:
    """Test SchemeDocument class."""

    def test_document_creation(self, sample_scheme_document):
        """Test creating a scheme document."""
        assert sample_scheme_document.scheme_id == "test_scheme_001"
        assert sample_scheme_document.scheme_name == "Test Agricultural Scheme"
        assert sample_scheme_document.content_hash is not None
        assert len(sample_scheme_document.content_hash) == 64  # SHA-256 hash

    def test_content_hash_calculation(self):
        """Test content hash is calculated correctly."""
        doc1 = SchemeDocument(
            scheme_id="test_001",
            scheme_name="Test Scheme",
            content="Same content",
            metadata={},
        )

        doc2 = SchemeDocument(
            scheme_id="test_002",
            scheme_name="Test Scheme 2",
            content="Same content",
            metadata={},
        )

        # Same content should produce same hash
        assert doc1.content_hash == doc2.content_hash

    def test_different_content_different_hash(self):
        """Test different content produces different hash."""
        doc1 = SchemeDocument(
            scheme_id="test_001",
            scheme_name="Test Scheme",
            content="Content A",
            metadata={},
        )

        doc2 = SchemeDocument(
            scheme_id="test_001",
            scheme_name="Test Scheme",
            content="Content B",
            metadata={},
        )

        assert doc1.content_hash != doc2.content_hash


class TestDocumentValidation:
    """Test document validation."""

    def test_validate_valid_document(self, portal_sync, sample_scheme_document):
        """Test validation of a valid document."""
        result = portal_sync._validate_document(sample_scheme_document)

        assert result.is_valid is True
        assert result.quality_level in [DataQualityLevel.HIGH, DataQualityLevel.MEDIUM]
        assert len(result.issues) == 0

    def test_validate_missing_scheme_id(self, portal_sync):
        """Test validation fails for missing scheme_id."""
        doc = SchemeDocument(
            scheme_id="",
            scheme_name="Test Scheme",
            content="Valid content with eligibility, benefits, application, and documents.",
            metadata={"source": "test"},
        )

        result = portal_sync._validate_document(doc)

        assert result.is_valid is False
        assert "Missing scheme_id" in result.issues

    def test_validate_missing_scheme_name(self, portal_sync):
        """Test validation fails for missing scheme_name."""
        doc = SchemeDocument(
            scheme_id="test_001",
            scheme_name="",
            content="Valid content with eligibility, benefits, application, and documents.",
            metadata={"source": "test"},
        )

        result = portal_sync._validate_document(doc)

        assert result.is_valid is False
        assert "Missing scheme_name" in result.issues

    def test_validate_short_content(self, portal_sync):
        """Test validation fails for too short content."""
        doc = SchemeDocument(
            scheme_id="test_001",
            scheme_name="Test Scheme",
            content="Too short",
            metadata={"source": "test"},
        )

        result = portal_sync._validate_document(doc)

        assert result.is_valid is False
        assert "Content too short or missing" in result.issues

    def test_validate_missing_key_terms(self, portal_sync):
        """Test validation warns about missing key terms."""
        doc = SchemeDocument(
            scheme_id="test_001",
            scheme_name="Test Scheme",
            content="This is a scheme description without key information fields. "
            * 10,
            metadata={"source": "test"},
        )

        result = portal_sync._validate_document(doc)

        # Should be valid but with warnings
        assert result.is_valid is True
        assert len(result.warnings) > 0
        assert any("Missing key information" in w for w in result.warnings)

    def test_validate_quality_levels(self, portal_sync):
        """Test quality level assessment."""
        # High quality document
        high_quality_doc = SchemeDocument(
            scheme_id="test_001",
            scheme_name="Test Scheme",
            content="Complete scheme with eligibility criteria, benefits, application process, and required documents.",
            metadata={"source": "test", "scheme_type": "financial"},
        )

        result = portal_sync._validate_document(high_quality_doc)
        assert result.quality_level in [DataQualityLevel.HIGH, DataQualityLevel.MEDIUM]

        # Low quality document (missing metadata)
        low_quality_doc = SchemeDocument(
            scheme_id="test_002",
            scheme_name="Test Scheme 2",
            content="Minimal scheme information without key details. " * 5,
            metadata={},
        )

        result = portal_sync._validate_document(low_quality_doc)
        assert result.quality_level in [DataQualityLevel.LOW, DataQualityLevel.MEDIUM]


class TestPortalSynchronization:
    """Test portal synchronization functionality."""

    @pytest.mark.asyncio
    async def test_fetch_portal_documents(self, portal_sync):
        """Test fetching documents from a portal."""
        portal_config = {
            "name": "PM-KISAN Portal",
            "url": "https://pmkisan.gov.in",
            "scheme_type": "income_support",
            "enabled": True,
        }

        documents = await portal_sync._fetch_portal_documents(portal_config)

        assert len(documents) > 0
        assert all(isinstance(doc, SchemeDocument) for doc in documents)
        assert all(doc.scheme_id for doc in documents)
        assert all(doc.content for doc in documents)

    @pytest.mark.asyncio
    async def test_process_documents_new(self, portal_sync, sample_scheme_document):
        """Test processing new documents."""
        portal_config = {"name": "Test Portal", "scheme_type": "test"}

        with patch.object(
            portal_sync, "_ingest_documents", new_callable=AsyncMock
        ) as mock_ingest:
            result = await portal_sync._process_documents(
                [sample_scheme_document],
                portal_config,
            )

            assert result["new_documents"] == 1
            assert result["updated_documents"] == 0
            assert result["failed_documents"] == 0
            assert result["skipped_documents"] == 0
            mock_ingest.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_documents_updated(self, portal_sync, sample_scheme_document):
        """Test processing updated documents."""
        portal_config = {"name": "Test Portal", "scheme_type": "test"}

        # First, add the document to synced_documents
        portal_sync.synced_documents[sample_scheme_document.scheme_id] = (
            sample_scheme_document
        )

        # Create an updated version with different content
        updated_doc = SchemeDocument(
            scheme_id=sample_scheme_document.scheme_id,
            scheme_name=sample_scheme_document.scheme_name,
            content=sample_scheme_document.content + " Updated information.",
            metadata=sample_scheme_document.metadata,
            source_url=sample_scheme_document.source_url,
        )

        with patch.object(
            portal_sync, "_ingest_documents", new_callable=AsyncMock
        ) as mock_ingest:
            result = await portal_sync._process_documents(
                [updated_doc],
                portal_config,
            )

            assert result["new_documents"] == 0
            assert result["updated_documents"] == 1
            assert result["failed_documents"] == 0
            mock_ingest.assert_called_once()

    @pytest.mark.asyncio
    async def test_process_documents_unchanged(
        self, portal_sync, sample_scheme_document
    ):
        """Test processing unchanged documents."""
        portal_config = {"name": "Test Portal", "scheme_type": "test"}

        # Add the document to synced_documents
        portal_sync.synced_documents[sample_scheme_document.scheme_id] = (
            sample_scheme_document
        )

        with patch.object(
            portal_sync, "_ingest_documents", new_callable=AsyncMock
        ) as mock_ingest:
            result = await portal_sync._process_documents(
                [sample_scheme_document],
                portal_config,
            )

            assert result["new_documents"] == 0
            assert result["updated_documents"] == 0
            assert result["skipped_documents"] == 1
            mock_ingest.assert_not_called()

    @pytest.mark.asyncio
    async def test_process_documents_invalid(self, portal_sync):
        """Test processing invalid documents."""
        portal_config = {"name": "Test Portal", "scheme_type": "test"}

        invalid_doc = SchemeDocument(
            scheme_id="",  # Missing scheme_id
            scheme_name="",  # Missing scheme_name
            content="Short",  # Too short
            metadata={},
        )

        with patch.object(
            portal_sync, "_ingest_documents", new_callable=AsyncMock
        ) as mock_ingest:
            result = await portal_sync._process_documents(
                [invalid_doc],
                portal_config,
            )

            assert result["failed_documents"] == 1
            assert len(result["errors"]) > 0
            mock_ingest.assert_not_called()

    @pytest.mark.asyncio
    async def test_sync_all_portals(self, portal_sync):
        """Test synchronizing all portals."""
        with patch.object(
            portal_sync, "_sync_portal", new_callable=AsyncMock
        ) as mock_sync:
            from app.services.government_portal_sync import SyncResult

            mock_sync.return_value = SyncResult(
                status=SyncStatus.COMPLETED,
                total_documents=5,
                new_documents=3,
                updated_documents=2,
                failed_documents=0,
                skipped_documents=0,
                sync_duration_seconds=1.5,
            )

            result = await portal_sync.sync_all_portals(force_sync=True)

            assert result.status in [SyncStatus.COMPLETED, SyncStatus.PARTIAL]
            assert result.total_documents >= 0
            assert mock_sync.call_count == len(
                [p for p in portal_sync.portal_configs if p.get("enabled", True)]
            )

    def test_should_sync_no_previous_sync(self, portal_sync):
        """Test should sync when no previous sync."""
        portal_sync.last_sync_time = None
        assert portal_sync._should_sync() is True

    def test_should_sync_recent_sync(self, portal_sync):
        """Test should not sync when recently synced."""
        portal_sync.last_sync_time = datetime.now() - timedelta(hours=1)
        portal_sync.sync_interval_hours = 24
        assert portal_sync._should_sync() is False

    def test_should_sync_old_sync(self, portal_sync):
        """Test should sync when sync is old."""
        portal_sync.last_sync_time = datetime.now() - timedelta(hours=25)
        portal_sync.sync_interval_hours = 24
        assert portal_sync._should_sync() is True

    def test_get_sync_status(self, portal_sync):
        """Test getting sync status."""
        portal_sync.last_sync_time = datetime.now()
        portal_sync.synced_documents = {"doc1": Mock(), "doc2": Mock()}

        status = portal_sync.get_sync_status()

        assert "last_sync_time" in status
        assert status["total_synced_documents"] == 2
        assert status["sync_interval_hours"] == portal_sync.sync_interval_hours
        assert "next_sync_due" in status
        assert status["configured_portals"] == len(portal_sync.portal_configs)


class TestSyncResultAggregation:
    """Test sync result aggregation."""

    def test_aggregate_empty_results(self, portal_sync):
        """Test aggregating empty results."""
        result = portal_sync._aggregate_results([])

        assert result.status == SyncStatus.COMPLETED
        assert result.total_documents == 0
        assert result.new_documents == 0

    def test_aggregate_all_completed(self, portal_sync):
        """Test aggregating all completed results."""
        from app.services.government_portal_sync import SyncResult

        results = [
            SyncResult(
                status=SyncStatus.COMPLETED,
                total_documents=5,
                new_documents=3,
                updated_documents=2,
                failed_documents=0,
                skipped_documents=0,
                sync_duration_seconds=1.0,
            ),
            SyncResult(
                status=SyncStatus.COMPLETED,
                total_documents=3,
                new_documents=2,
                updated_documents=1,
                failed_documents=0,
                skipped_documents=0,
                sync_duration_seconds=0.5,
            ),
        ]

        aggregated = portal_sync._aggregate_results(results)

        assert aggregated.status == SyncStatus.COMPLETED
        assert aggregated.total_documents == 8
        assert aggregated.new_documents == 5
        assert aggregated.updated_documents == 3

    def test_aggregate_with_failures(self, portal_sync):
        """Test aggregating results with failures."""
        from app.services.government_portal_sync import SyncResult

        results = [
            SyncResult(
                status=SyncStatus.COMPLETED,
                total_documents=5,
                new_documents=3,
                updated_documents=2,
                failed_documents=0,
                skipped_documents=0,
                sync_duration_seconds=1.0,
            ),
            SyncResult(
                status=SyncStatus.FAILED,
                total_documents=0,
                new_documents=0,
                updated_documents=0,
                failed_documents=5,
                skipped_documents=0,
                sync_duration_seconds=0.5,
                errors=["Connection failed"],
            ),
        ]

        aggregated = portal_sync._aggregate_results(results)

        assert aggregated.status == SyncStatus.PARTIAL
        assert aggregated.failed_documents == 5
        assert len(aggregated.errors) > 0


@pytest.mark.asyncio
async def test_ingest_documents(portal_sync, sample_scheme_document):
    """Test ingesting documents into RAG engine."""
    with patch.object(portal_sync.rag_engine, "ingest_document_batch") as mock_ingest:
        mock_ingest.return_value = {
            "processed_documents": 1,
            "failed_documents": 0,
        }

        await portal_sync._ingest_documents([sample_scheme_document])

        mock_ingest.assert_called_once()
        call_args = mock_ingest.call_args

        assert call_args[1]["collection_name"] == "government_schemes"
        assert len(call_args[1]["documents"]) == 1
        assert (
            call_args[1]["documents"][0]["metadata"]["scheme_id"]
            == sample_scheme_document.scheme_id
        )
