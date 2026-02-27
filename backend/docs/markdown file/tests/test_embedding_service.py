"""
Tests for the document embedding service.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime

from app.services.embedding_service import DocumentEmbeddingService


@pytest.fixture
def mock_embedding_service():
    """Create a mock embedding service for testing."""
    with patch("app.services.embedding_service.get_vector_db") as mock_get_vector_db:
        mock_vector_db = Mock()
        mock_get_vector_db.return_value = mock_vector_db

        service = DocumentEmbeddingService()
        service.vector_db = mock_vector_db
        yield service


def test_generate_document_id(mock_embedding_service):
    """Test document ID generation."""
    content = "Test document content"
    metadata = {"source": "test", "category": "general"}

    doc_id = mock_embedding_service._generate_document_id(content, metadata)

    assert isinstance(doc_id, str)
    assert len(doc_id) > 0
    assert "test_general" in doc_id


def test_add_agricultural_knowledge(mock_embedding_service):
    """Test adding agricultural knowledge document."""
    content = "Wheat cultivation requires proper soil preparation"
    crop = "wheat"
    category = "cultivation"
    source = "agricultural_guide"

    mock_embedding_service.vector_db.add_documents.return_value = None

    doc_id = mock_embedding_service.add_agricultural_knowledge(
        content=content, crop=crop, category=category, source=source
    )

    assert isinstance(doc_id, str)
    mock_embedding_service.vector_db.add_documents.assert_called_once()

    # Check the call arguments
    call_args = mock_embedding_service.vector_db.add_documents.call_args
    assert call_args[0][0] == "agricultural_knowledge"  # collection name
    assert call_args[0][1] == [content]  # documents
    assert call_args[0][3] == [doc_id]  # ids


def test_add_government_scheme(mock_embedding_service):
    """Test adding government scheme document."""
    content = "PM-KISAN provides income support to farmers"
    scheme_name = "PM-KISAN"
    scheme_type = "income_support"

    mock_embedding_service.vector_db.add_documents.return_value = None

    doc_id = mock_embedding_service.add_government_scheme(
        content=content, scheme_name=scheme_name, scheme_type=scheme_type
    )

    assert isinstance(doc_id, str)
    mock_embedding_service.vector_db.add_documents.assert_called_once()


def test_search_agricultural_knowledge(mock_embedding_service):
    """Test searching agricultural knowledge."""
    query = "wheat cultivation"
    mock_results = {
        "documents": [["Document 1", "Document 2"]],
        "metadatas": [[{"source": "test1"}, {"source": "test2"}]],
        "distances": [[0.1, 0.2]],
        "ids": [["id1", "id2"]],
    }

    mock_embedding_service.vector_db.query_documents.return_value = mock_results

    results = mock_embedding_service.search_agricultural_knowledge(query)

    assert len(results) == 2
    assert results[0]["content"] == "Document 1"
    assert results[0]["similarity_score"] == 0.9  # 1 - 0.1


def test_hybrid_search(mock_embedding_service):
    """Test hybrid search across multiple collections."""
    query = "farming techniques"
    mock_results = {
        "documents": [["Document 1"]],
        "metadatas": [[{"source": "test"}]],
        "distances": [[0.1]],
        "ids": [["id1"]],
    }

    mock_embedding_service.vector_db.query_documents.return_value = mock_results

    results = mock_embedding_service.hybrid_search(
        query, collections=["agricultural_knowledge"]
    )

    assert "agricultural_knowledge" in results
    assert len(results["agricultural_knowledge"]) == 1


def test_get_collection_stats(mock_embedding_service):
    """Test getting collection statistics."""
    mock_info = {"name": "test_collection", "count": 10, "metadata": {}}
    mock_embedding_service.vector_db.get_collection_info.return_value = mock_info

    stats = mock_embedding_service.get_collection_stats()

    assert isinstance(stats, dict)
    assert len(stats) > 0


def test_bulk_add_documents(mock_embedding_service):
    """Test bulk adding documents."""
    documents = [
        {"content": "Document 1", "metadata": {"source": "test1"}},
        {"content": "Document 2", "metadata": {"source": "test2"}},
    ]

    mock_embedding_service.vector_db.add_documents.return_value = None

    ids = mock_embedding_service.bulk_add_documents("test_collection", documents)

    assert len(ids) == 2
    mock_embedding_service.vector_db.add_documents.assert_called_once()


def test_format_search_results(mock_embedding_service):
    """Test formatting search results."""
    raw_results = {
        "documents": [["Document 1", "Document 2"]],
        "metadatas": [[{"source": "test1"}, {"source": "test2"}]],
        "distances": [[0.1, 0.2]],
        "ids": [["id1", "id2"]],
    }

    formatted = mock_embedding_service._format_search_results(raw_results)

    assert len(formatted) == 2
    assert formatted[0]["id"] == "id1"
    assert formatted[0]["content"] == "Document 1"
    assert formatted[0]["similarity_score"] == 0.9  # 1 - 0.1
    assert formatted[1]["similarity_score"] == 0.8  # 1 - 0.2


def test_format_search_results_empty(mock_embedding_service):
    """Test formatting empty search results."""
    raw_results = {"documents": [[]], "metadatas": [[]], "distances": [[]], "ids": [[]]}

    formatted = mock_embedding_service._format_search_results(raw_results)

    assert len(formatted) == 0
