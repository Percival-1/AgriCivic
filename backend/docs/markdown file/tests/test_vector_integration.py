#!/usr/bin/env python3
"""Test complete vector database integration."""

import sys
import os
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent))

# Apply NumPy compatibility fix
import numpy as np

if not hasattr(np, "float_"):
    np.float_ = np.float64
if not hasattr(np, "int_"):
    np.int_ = np.int64
if not hasattr(np, "uint"):
    np.uint = np.uint64


def test_vector_db_factory():
    """Test vector database factory."""
    try:
        print("🧪 Testing vector database factory...")

        from app.services.vector_db_factory import VectorDBFactory

        # Create vector database instance
        vector_db = VectorDBFactory.create_vector_db()
        print(f"✅ Vector database created: {type(vector_db).__name__}")

        # Test health check
        health = vector_db.health_check()
        print(f"✅ Health check: {health['status']}")

        return True

    except Exception as e:
        print(f"❌ Vector DB factory test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_embedding_service():
    """Test embedding service."""
    try:
        print("\n🧪 Testing embedding service...")

        from app.services.embedding_service import DocumentEmbeddingService

        # Create embedding service
        service = DocumentEmbeddingService()
        print("✅ Embedding service created")

        # Test adding agricultural knowledge
        doc_id = service.add_agricultural_knowledge(
            content="Wheat requires well-drained soil with pH 6.0-7.5",
            crop="wheat",
            category="cultivation",
            source="test",
        )
        print(f"✅ Added agricultural knowledge: {doc_id}")

        # Test searching
        results = service.search_agricultural_knowledge("wheat cultivation")
        print(f"✅ Search successful - found {len(results)} results")

        if results:
            print(f"   First result: {results[0]['content'][:50]}...")

        return True

    except Exception as e:
        print(f"❌ Embedding service test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_collection_operations():
    """Test collection operations."""
    try:
        print("\n🧪 Testing collection operations...")

        from app.services.vector_db_factory import vector_db

        # Test collection creation
        collection_name = "test_integration"
        collection = vector_db.get_or_create_collection(collection_name)
        print(f"✅ Collection created: {collection_name}")

        # Test adding documents
        documents = ["Test document 1", "Test document 2"]
        metadatas = [{"source": "test1"}, {"source": "test2"}]
        ids = ["test1", "test2"]

        vector_db.add_documents(collection_name, documents, metadatas, ids)
        print(f"✅ Added {len(documents)} documents")

        # Test querying
        results = vector_db.query_documents(
            collection_name, "test document", n_results=2
        )
        print(f"✅ Query successful - found {len(results['documents'][0])} results")

        # Test collection info
        info = vector_db.get_collection_info(collection_name)
        print(f"✅ Collection info: {info['count']} documents")

        # Clean up
        vector_db.reset_collection(collection_name)
        print("✅ Collection reset")

        return True

    except Exception as e:
        print(f"❌ Collection operations test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def main():
    """Run all integration tests."""
    print("🚀 Testing Vector Database Integration\n")

    tests = [test_vector_db_factory, test_embedding_service, test_collection_operations]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1

    print(f"\n📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All integration tests passed!")
        return 0
    else:
        print("❌ Some tests failed.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
