#!/usr/bin/env python3
"""
Simple test script to verify vector database setup.
"""

import sys
import os
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent))


def test_imports():
    """Test if all imports work correctly."""
    try:
        print("Testing imports...")

        # Test config
        from app.config import get_settings

        settings = get_settings()
        print(f"✅ Config loaded - Vector DB type: {settings.vector_db_type}")

        # Test vector database factory
        from app.services.vector_db_factory import VectorDBFactory

        print("✅ Vector DB factory imported")

        # Test ChromaDB service
        from app.services.vector_db import ChromaDBService

        print("✅ ChromaDB service imported")

        # Test embedding service
        from app.services.embedding_service import DocumentEmbeddingService

        print("✅ Embedding service imported")

        return True

    except Exception as e:
        print(f"❌ Import failed: {e}")
        return False


def test_vector_db_creation():
    """Test vector database creation."""
    try:
        print("\nTesting vector database creation...")

        from app.services.vector_db_factory import VectorDBFactory

        # Create vector database instance
        vector_db = VectorDBFactory.create_vector_db()
        print(f"✅ Vector database instance created: {type(vector_db).__name__}")

        # Test health check
        health = vector_db.health_check()
        print(f"✅ Health check: {health['status']}")

        return True

    except Exception as e:
        print(f"❌ Vector DB creation failed: {e}")
        return False


def test_embedding_service():
    """Test embedding service."""
    try:
        print("\nTesting embedding service...")

        from app.services.embedding_service import DocumentEmbeddingService

        # Create embedding service
        service = DocumentEmbeddingService()
        print("✅ Embedding service created")

        # Test document ID generation
        doc_id = service._generate_document_id("test content", {"source": "test"})
        print(f"✅ Document ID generated: {doc_id}")

        return True

    except Exception as e:
        print(f"❌ Embedding service test failed: {e}")
        return False


def main():
    """Run all tests."""
    print("🧪 Testing Vector Database Setup\n")

    tests = [test_imports, test_vector_db_creation, test_embedding_service]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1
        print()

    print(f"📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Vector database setup is working.")
        return 0
    else:
        print("❌ Some tests failed. Check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
