"""
Tests for the RAG (Retrieval-Augmented Generation) engine.
"""

import pytest
from unittest.mock import Mock, patch
from datetime import datetime

from app.services.rag_engine import RAGEngine


@pytest.fixture
def mock_rag_engine():
    """Create a mock RAG engine for testing."""
    with (
        patch(
            "app.services.rag_engine.DocumentEmbeddingService"
        ) as mock_embedding_service,
        patch("app.services.rag_engine.get_vector_db") as mock_get_vector_db,
    ):

        mock_vector_db = Mock()
        mock_get_vector_db.return_value = mock_vector_db

        mock_embedding_service_instance = Mock()
        mock_embedding_service.return_value = mock_embedding_service_instance

        rag_engine = RAGEngine()
        rag_engine.vector_db = mock_vector_db
        rag_engine.embedding_service = mock_embedding_service_instance

        yield rag_engine


def test_retrieve_documents(mock_rag_engine):
    """Test document retrieval functionality."""
    query = "wheat cultivation techniques"

    # Mock vector database response
    mock_results = {
        "documents": [["Document about wheat cultivation", "Another wheat document"]],
        "metadatas": [
            [
                {"source": "agri_guide", "crop": "wheat"},
                {"source": "extension", "crop": "wheat"},
            ]
        ],
        "distances": [[0.1, 0.2]],
        "ids": [["doc1", "doc2"]],
    }

    mock_rag_engine.vector_db.query_documents.return_value = mock_results
    mock_rag_engine.embedding_service._format_search_results.return_value = [
        {
            "id": "doc1",
            "content": "Document about wheat cultivation",
            "metadata": {"source": "agri_guide", "crop": "wheat"},
            "similarity_score": 0.9,
        },
        {
            "id": "doc2",
            "content": "Another wheat document",
            "metadata": {"source": "extension", "crop": "wheat"},
            "similarity_score": 0.8,
        },
    ]

    results = mock_rag_engine.retrieve_documents(query, top_k=2)

    assert len(results) == 2
    assert results[0]["similarity_score"] == 0.9
    # The collection is added by the retrieve_documents method, check if it exists
    assert "collection" in results[0]["metadata"]
    assert results[0]["metadata"]["retrieval_query"] == query


def test_retrieve_documents_with_filters(mock_rag_engine):
    """Test document retrieval with metadata filters."""
    query = "rice disease management"
    filters = {"crop": "rice"}

    mock_results = {
        "documents": [["Rice blast disease information"]],
        "metadatas": [[{"source": "pathology", "crop": "rice", "disease": "blast"}]],
        "distances": [[0.15]],
        "ids": [["rice_doc1"]],
    }

    mock_rag_engine.vector_db.query_documents.return_value = mock_results
    mock_rag_engine.embedding_service._format_search_results.return_value = [
        {
            "id": "rice_doc1",
            "content": "Rice blast disease information",
            "metadata": {"source": "pathology", "crop": "rice", "disease": "blast"},
            "similarity_score": 0.85,
        }
    ]

    results = mock_rag_engine.retrieve_documents(query, filters=filters, top_k=1)

    assert len(results) == 1
    assert results[0]["metadata"]["crop"] == "rice"
    mock_rag_engine.vector_db.query_documents.assert_called()


@pytest.mark.asyncio
async def test_generate_grounded_response(mock_rag_engine):
    """Test grounded response generation."""
    query = "How to treat wheat rust disease?"
    retrieved_docs = [
        {
            "id": "wheat_rust_doc",
            "content": "Wheat rust can be controlled using fungicides like Propiconazole. Apply at first sign of infection.",
            "metadata": {
                "source": "plant_pathology",
                "crop": "wheat",
                "disease": "rust",
                "category": "disease_management",  # Add this to trigger disease response
            },
            "similarity_score": 0.9,
        }
    ]

    response_data = await mock_rag_engine.generate_grounded_response(
        query, retrieved_docs
    )

    assert "response" in response_data
    assert "sources" in response_data
    assert "grounding_score" in response_data
    assert len(response_data["sources"]) == 1
    assert response_data["sources"][0]["source"] == "plant_pathology"
    assert "[Source 1]" in response_data["response"]


@pytest.mark.asyncio
async def test_generate_grounded_response_empty_docs(mock_rag_engine):
    """Test response generation with no retrieved documents."""
    query = "Unknown agricultural query"
    retrieved_docs = []

    response_data = await mock_rag_engine.generate_grounded_response(
        query, retrieved_docs
    )

    assert response_data["response_type"] == "fallback"
    assert response_data["num_sources"] == 0
    assert response_data["grounding_score"] == 0.0
    assert not response_data["is_well_grounded"]


def test_validate_source_grounding(mock_rag_engine):
    """Test source grounding validation."""
    response = "Based on plant pathology [Source 1], wheat rust treatment information is available."
    retrieved_docs = [
        {
            "id": "doc1",
            "content": "wheat rust treatment information is available for farmers",
            "metadata": {"source": "plant_pathology"},
        }
    ]

    validation = mock_rag_engine._validate_source_grounding(response, retrieved_docs)

    assert validation["grounding_score"] == 1.0  # 1 reference out of 1 source
    assert validation["referenced_sources"] == 1
    assert validation["total_sources"] == 1
    assert validation["is_well_grounded"] == True
    assert len(validation["source_references"]) == 1


def test_detect_hallucination_indicators(mock_rag_engine):
    """Test hallucination detection."""
    response = "Apply Carbendazim 50% WP at 2.5g/liter for best results."
    retrieved_docs = [
        {
            "content": "Use fungicides for disease control",
            "metadata": {"source": "guide"},
        }
    ]

    indicators = mock_rag_engine._detect_hallucination_indicators(
        response, retrieved_docs
    )

    # Should detect unsupported chemical mention
    assert len(indicators) > 0
    assert any("Carbendazim" in indicator for indicator in indicators)


def test_ingest_document_batch(mock_rag_engine):
    """Test document batch ingestion."""
    documents = [
        {
            "content": "Tomato cultivation requires well-drained soil",
            "metadata": {"source": "vegetable_guide", "crop": "tomato"},
        },
        {
            "content": "Tomato blight prevention strategies",
            "metadata": {"source": "disease_guide", "crop": "tomato"},
        },
    ]

    mock_rag_engine.embedding_service.bulk_add_documents.return_value = ["doc1", "doc2"]

    results = mock_rag_engine.ingest_document_batch(documents, "crop_diseases")

    assert results["total_documents"] == 2
    assert results["processed_documents"] == 2
    assert results["failed_documents"] == 0
    assert results["success_rate"] == 1.0
    assert results["collection_name"] == "crop_diseases"


def test_validate_document(mock_rag_engine):
    """Test document validation."""
    # Valid document
    valid_doc = {
        "content": "This is a valid agricultural document with sufficient content.",
        "metadata": {"source": "test_source", "category": "general"},
    }

    assert mock_rag_engine._validate_document(valid_doc) == True

    # Invalid document - missing content
    invalid_doc1 = {"metadata": {"source": "test_source"}}

    assert mock_rag_engine._validate_document(invalid_doc1) == False

    # Invalid document - content too short
    invalid_doc2 = {"content": "Short", "metadata": {"source": "test_source"}}

    assert mock_rag_engine._validate_document(invalid_doc2) == False

    # Invalid document - missing source
    invalid_doc3 = {
        "content": "Valid content but missing source information",
        "metadata": {"category": "general"},
    }

    assert mock_rag_engine._validate_document(invalid_doc3) == False


@pytest.mark.asyncio
async def test_search_and_generate(mock_rag_engine):
    """Test complete RAG pipeline."""
    query = "wheat disease management"

    # Mock retrieve_documents
    mock_retrieved_docs = [
        {
            "id": "wheat_disease_doc",
            "content": "Wheat diseases can be managed through integrated approach",
            "metadata": {"source": "ipm_guide", "crop": "wheat"},
            "similarity_score": 0.85,
        }
    ]

    with (
        patch.object(
            mock_rag_engine, "retrieve_documents", return_value=mock_retrieved_docs
        ),
        patch.object(mock_rag_engine, "generate_grounded_response") as mock_generate,
    ):

        # Mock the async method to return a coroutine that resolves to the expected value
        async def mock_generate_response(*args, **kwargs):
            return {
                "response": "Based on IPM guide [Source 1], wheat diseases can be managed through integrated approach",
                "sources": [{"source": "imp_guide", "crop": "wheat"}],
                "grounding_score": 1.0,
                "is_well_grounded": True,
            }

        mock_generate.side_effect = mock_generate_response

        result = await mock_rag_engine.search_and_generate(query)

        assert "response" in result
        assert "sources" in result
        assert result["is_well_grounded"] == True
        mock_rag_engine.retrieve_documents.assert_called_once()
        mock_generate.assert_called_once()


def test_get_knowledge_base_stats(mock_rag_engine):
    """Test knowledge base statistics retrieval."""
    mock_collection_stats = {
        "agricultural_knowledge": {"count": 100, "name": "agricultural_knowledge"},
        "government_schemes": {"count": 50, "name": "government_schemes"},
    }

    mock_db_health = {"status": "healthy", "client_connected": True}

    mock_rag_engine.embedding_service.get_collection_stats.return_value = (
        mock_collection_stats
    )
    mock_rag_engine.vector_db.health_check.return_value = mock_db_health

    stats = mock_rag_engine.get_knowledge_base_stats()

    assert stats["total_documents"] == 150
    assert stats["collections"] == mock_collection_stats
    assert stats["vector_db_health"] == mock_db_health


def test_prepare_context(mock_rag_engine):
    """Test context preparation from documents."""
    documents = [
        {
            "content": "First document content",
            "metadata": {"source": "source1", "crop": "wheat"},
        },
        {
            "content": "Second document content",
            "metadata": {"source": "source2", "category": "disease"},
        },
    ]

    context = mock_rag_engine._prepare_context(documents)

    assert "[Source 1]" in context
    assert "[Source 2]" in context
    assert "First document content" in context
    assert "Second document content" in context
    assert "Source: source1" in context
    assert "Crop: wheat" in context


def test_generate_disease_response(mock_rag_engine):
    """Test disease-specific response generation."""
    documents = [
        {
            "content": "Rice blast disease causes diamond-shaped lesions",
            "metadata": {
                "source": "pathology_guide",
                "category": "disease_management",
                "crop": "rice",
            },
        }
    ]

    response = mock_rag_engine._generate_disease_response(documents)

    assert "pathology_guide" in response
    assert "[Source 1]" in response
    assert "Rice blast disease" in response


def test_generate_market_response(mock_rag_engine):
    """Test market-specific response generation."""
    documents = [
        {
            "content": "Current wheat prices are Rs. 2100 per quintal",
            "metadata": {
                "source": "market_data",
                "category": "market_intelligence",
                "crop": "wheat",
            },
        }
    ]

    response = mock_rag_engine._generate_market_response(documents)

    assert "market_data" in response
    assert "[Source 1]" in response
    assert "wheat prices" in response


def test_generate_scheme_response(mock_rag_engine):
    """Test government scheme response generation."""
    documents = [
        {
            "content": "PM-KISAN provides Rs. 6000 annual income support",
            "metadata": {
                "source": "government_portal",
                "category": "government_scheme",
                "scheme_name": "PM-KISAN",
            },
        }
    ]

    response = mock_rag_engine._generate_scheme_response(documents)

    assert "PM-KISAN" in response
    assert "[Source 1]" in response
    assert "income support" in response
