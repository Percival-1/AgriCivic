"""
Tests for the document ingestion pipeline.
"""

import pytest
import json
import csv
import tempfile
import os
from unittest.mock import Mock, patch

from app.services.document_ingestion import DocumentIngestionPipeline


@pytest.fixture
def mock_ingestion_pipeline():
    """Create a mock document ingestion pipeline for testing."""
    with patch("app.services.document_ingestion.RAGEngine") as mock_rag_engine:
        mock_rag_instance = Mock()
        mock_rag_engine.return_value = mock_rag_instance

        pipeline = DocumentIngestionPipeline()
        pipeline.rag_engine = mock_rag_instance

        yield pipeline


@pytest.fixture
def sample_json_file():
    """Create a temporary JSON file with sample documents."""
    documents = [
        {
            "content": "Wheat requires well-drained soil for optimal growth",
            "metadata": {
                "source": "agri_guide",
                "crop": "wheat",
                "category": "cultivation",
            },
        },
        {
            "content": "Rice blast disease appears as diamond-shaped lesions",
            "metadata": {"source": "pathology", "crop": "rice", "category": "disease"},
        },
    ]

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(documents, f)
        temp_file = f.name

    yield temp_file

    # Cleanup
    os.unlink(temp_file)


@pytest.fixture
def sample_csv_file():
    """Create a temporary CSV file with sample documents."""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".csv", delete=False, newline=""
    ) as f:
        writer = csv.writer(f)
        writer.writerow(["content", "source", "crop", "category"])
        writer.writerow(
            ["Tomato cultivation guide", "vegetable_guide", "tomato", "cultivation"]
        )
        writer.writerow(
            ["Potato blight management", "disease_guide", "potato", "disease"]
        )
        temp_file = f.name

    yield temp_file

    # Cleanup
    os.unlink(temp_file)


@pytest.fixture
def sample_txt_file():
    """Create a temporary text file."""
    content = (
        "This is a sample agricultural document about sustainable farming practices."
    )

    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
        f.write(content)
        temp_file = f.name

    yield temp_file

    # Cleanup
    os.unlink(temp_file)


def test_ingest_from_json_file(mock_ingestion_pipeline, sample_json_file):
    """Test ingesting documents from JSON file."""
    mock_ingestion_pipeline.rag_engine.ingest_document_batch.return_value = {
        "total_documents": 2,
        "processed_documents": 2,
        "failed_documents": 0,
        "success_rate": 1.0,
        "ingested_ids": ["doc1", "doc2"],
    }

    results = mock_ingestion_pipeline.ingest_from_file(
        file_path=sample_json_file,
        collection_name="test_collection",
        file_format="json",
    )

    assert results["total_documents"] == 2
    assert results["processed_documents"] == 2
    assert results["success_rate"] == 1.0
    assert results["source_file"] == sample_json_file
    assert results["file_format"] == "json"

    # Verify RAG engine was called
    mock_ingestion_pipeline.rag_engine.ingest_document_batch.assert_called_once()


def test_ingest_from_csv_file(mock_ingestion_pipeline, sample_csv_file):
    """Test ingesting documents from CSV file."""
    mock_ingestion_pipeline.rag_engine.ingest_document_batch.return_value = {
        "total_documents": 2,
        "processed_documents": 2,
        "failed_documents": 0,
        "success_rate": 1.0,
        "ingested_ids": ["csv_doc1", "csv_doc2"],
    }

    results = mock_ingestion_pipeline.ingest_from_file(
        file_path=sample_csv_file, collection_name="test_collection", file_format="csv"
    )

    assert results["total_documents"] == 2
    assert results["processed_documents"] == 2
    assert results["file_format"] == "csv"

    # Check that the call was made with proper document structure
    call_args = mock_ingestion_pipeline.rag_engine.ingest_document_batch.call_args
    documents = call_args[1]["documents"]  # keyword arguments

    assert len(documents) == 2
    assert documents[0]["content"] == "Tomato cultivation guide"
    assert documents[0]["metadata"]["source"] == "vegetable_guide"
    assert documents[0]["metadata"]["crop"] == "tomato"


def test_ingest_from_txt_file(mock_ingestion_pipeline, sample_txt_file):
    """Test ingesting documents from text file."""
    mock_ingestion_pipeline.rag_engine.ingest_document_batch.return_value = {
        "total_documents": 1,
        "processed_documents": 1,
        "failed_documents": 0,
        "success_rate": 1.0,
        "ingested_ids": ["txt_doc1"],
    }

    results = mock_ingestion_pipeline.ingest_from_file(
        file_path=sample_txt_file, collection_name="test_collection", file_format="txt"
    )

    assert results["total_documents"] == 1
    assert results["processed_documents"] == 1
    assert results["file_format"] == "txt"


def test_ingest_with_metadata_overrides(mock_ingestion_pipeline, sample_json_file):
    """Test ingesting with metadata overrides."""
    metadata_overrides = {"language": "en", "region": "north_india", "verified": True}

    mock_ingestion_pipeline.rag_engine.ingest_document_batch.return_value = {
        "total_documents": 2,
        "processed_documents": 2,
        "failed_documents": 0,
        "success_rate": 1.0,
        "ingested_ids": ["doc1", "doc2"],
    }

    results = mock_ingestion_pipeline.ingest_from_file(
        file_path=sample_json_file,
        collection_name="test_collection",
        metadata_overrides=metadata_overrides,
    )

    # Check that metadata overrides were applied
    call_args = mock_ingestion_pipeline.rag_engine.ingest_document_batch.call_args
    documents = call_args[1]["documents"]

    for doc in documents:
        assert doc["metadata"]["language"] == "en"
        assert doc["metadata"]["region"] == "north_india"
        assert doc["metadata"]["verified"] == True


def test_ingest_nonexistent_file(mock_ingestion_pipeline):
    """Test ingesting from non-existent file."""
    with pytest.raises(FileNotFoundError):
        mock_ingestion_pipeline.ingest_from_file(
            file_path="/nonexistent/file.json", collection_name="test_collection"
        )


def test_ingest_unsupported_format(mock_ingestion_pipeline, sample_txt_file):
    """Test ingesting unsupported file format."""
    with pytest.raises(ValueError, match="Unsupported file format"):
        mock_ingestion_pipeline.ingest_from_file(
            file_path=sample_txt_file,
            collection_name="test_collection",
            file_format="xml",
        )


def test_normalize_document(mock_ingestion_pipeline):
    """Test document normalization."""
    raw_doc = {
        "content": "Test document content",
        "source": "test_source",
        "crop": "wheat",
        "category": "cultivation",
    }

    normalized = mock_ingestion_pipeline._normalize_document(raw_doc)

    assert normalized["content"] == "Test document content"
    assert normalized["metadata"]["source"] == "test_source"
    assert normalized["metadata"]["crop"] == "wheat"
    assert normalized["metadata"]["category"] == "cultivation"
    assert "added_at" in normalized["metadata"]


def test_normalize_document_missing_content(mock_ingestion_pipeline):
    """Test normalizing document without content."""
    raw_doc = {"source": "test_source", "category": "test"}

    normalized = mock_ingestion_pipeline._normalize_document(raw_doc)

    assert normalized is None


def test_ingest_agricultural_knowledge_samples(mock_ingestion_pipeline):
    """Test ingesting sample agricultural knowledge."""

    # Mock the ingest_document_batch method for different collections
    def mock_ingest_batch(documents, collection_name, **kwargs):
        return {
            "total_documents": len(documents),
            "processed_documents": len(documents),
            "failed_documents": 0,
            "success_rate": 1.0,
            "ingested_ids": [
                f"{collection_name}_doc_{i}" for i in range(len(documents))
            ],
        }

    mock_ingestion_pipeline.rag_engine.ingest_document_batch.side_effect = (
        mock_ingest_batch
    )

    results = mock_ingestion_pipeline.ingest_agricultural_knowledge_samples()

    assert results["total_documents"] == 5  # Sample has 5 documents
    assert results["processed_documents"] == 5
    assert results["success_rate"] == 1.0
    assert len(results["collections_updated"]) > 0
    assert "collection_results" in results

    # Verify multiple collections were updated
    assert len(results["collection_results"]) > 1


def test_validate_knowledge_base(mock_ingestion_pipeline):
    """Test knowledge base validation."""
    mock_kb_stats = {
        "total_documents": 150,
        "collections": {
            "agricultural_knowledge": {"count": 100, "name": "agricultural_knowledge"},
            "government_schemes": {"count": 50, "name": "government_schemes"},
        },
        "vector_db_health": {"status": "healthy", "client_connected": True},
    }

    mock_ingestion_pipeline.rag_engine.get_knowledge_base_stats.return_value = (
        mock_kb_stats
    )

    validation_results = mock_ingestion_pipeline.validate_knowledge_base()

    assert validation_results["total_documents"] == 150
    assert validation_results["overall_status"] == "pass"
    assert len(validation_results["validation_checks"]) > 0

    # Check that validation checks were performed
    check_types = [check["check"] for check in validation_results["validation_checks"]]
    assert "minimum_documents" in check_types
    assert "vector_db_health" in check_types


def test_validate_knowledge_base_with_warnings(mock_ingestion_pipeline):
    """Test knowledge base validation with warnings."""
    mock_kb_stats = {
        "total_documents": 0,
        "collections": {
            "agricultural_knowledge": {"count": 0, "name": "agricultural_knowledge"}
        },
        "vector_db_health": {"status": "healthy", "client_connected": True},
    }

    mock_ingestion_pipeline.rag_engine.get_knowledge_base_stats.return_value = (
        mock_kb_stats
    )

    validation_results = mock_ingestion_pipeline.validate_knowledge_base()

    assert validation_results["overall_status"] == "warning"

    # Should have warning about minimum documents
    warning_checks = [
        c for c in validation_results["validation_checks"] if c["status"] == "warning"
    ]
    assert len(warning_checks) > 0


def test_validate_knowledge_base_with_failures(mock_ingestion_pipeline):
    """Test knowledge base validation with failures."""
    mock_kb_stats = {
        "total_documents": 50,
        "collections": {
            "agricultural_knowledge": {"count": 50, "name": "agricultural_knowledge"}
        },
        "vector_db_health": {"status": "unhealthy", "error": "Connection failed"},
    }

    mock_ingestion_pipeline.rag_engine.get_knowledge_base_stats.return_value = (
        mock_kb_stats
    )

    validation_results = mock_ingestion_pipeline.validate_knowledge_base()

    assert validation_results["overall_status"] == "fail"

    # Should have failure about vector DB health
    failed_checks = [
        c for c in validation_results["validation_checks"] if c["status"] == "fail"
    ]
    assert len(failed_checks) > 0


def test_parse_json_file_with_documents_key(mock_ingestion_pipeline):
    """Test parsing JSON file with documents key."""
    data = {
        "documents": [
            {"content": "Document 1", "source": "source1"},
            {"content": "Document 2", "source": "source2"},
        ],
        "metadata": {"collection": "test"},
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(data, f)
        temp_file = f.name

    try:
        documents = list(mock_ingestion_pipeline._parse_json_file(temp_file))

        assert len(documents) == 2
        assert documents[0]["content"] == "Document 1"
        assert documents[1]["content"] == "Document 2"

    finally:
        os.unlink(temp_file)


def test_parse_json_file_single_document(mock_ingestion_pipeline):
    """Test parsing JSON file with single document object."""
    data = {
        "content": "Single document content",
        "source": "single_source",
        "category": "test",
    }

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(data, f)
        temp_file = f.name

    try:
        documents = list(mock_ingestion_pipeline._parse_json_file(temp_file))

        assert len(documents) == 1
        assert documents[0]["content"] == "Single document content"
        assert documents[0]["metadata"]["source"] == "single_source"

    finally:
        os.unlink(temp_file)
