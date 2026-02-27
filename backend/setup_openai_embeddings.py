#!/usr/bin/env python3
"""
Setup script to switch to OpenAI embeddings.
"""

import os
from app.services.vector_db import chroma_service
from app.services.document_ingestion import document_ingestion_pipeline


def setup_openai_embeddings():
    """Setup OpenAI embeddings and reset collections."""

    print("🔧 Setting up OpenAI Embeddings")
    print("=" * 50)

    # Check if OpenAI API key is configured
    from app.config import get_settings

    settings = get_settings()

    if (
        not settings.openai_api_key
        or settings.openai_api_key == "your_openai_api_key_here"
    ):
        print("❌ OpenAI API key not configured!")
        print("Please set OPENAI_API_KEY in your .env file")
        print("Example: OPENAI_API_KEY=sk-your-actual-key-here")
        return False

    print("✅ OpenAI API key found")

    # Reset collections to handle dimension change
    collections_to_reset = [
        "agricultural_knowledge",
        "government_schemes",
        "market_intelligence",
        "crop_diseases",
    ]

    print("\n🔄 Resetting collections for OpenAI embeddings...")
    for collection_name in collections_to_reset:
        try:
            chroma_service.reset_collection(collection_name)
            print(f"✅ Reset {collection_name}")
        except Exception as e:
            print(f"⚠️  Warning: Could not reset {collection_name}: {e}")

    # Test embedding function
    print("\n🧪 Testing OpenAI embeddings...")
    try:
        test_embedding = chroma_service.embedding_function(["test document"])
        embedding_dim = len(test_embedding[0]) if test_embedding else 0
        print(f"✅ OpenAI embeddings working! Dimension: {embedding_dim}")

        if embedding_dim == 1536:
            print("✅ Using OpenAI text-embedding-ada-002 (1536 dimensions)")
        else:
            print(f"⚠️  Unexpected embedding dimension: {embedding_dim}")

    except Exception as e:
        print(f"❌ OpenAI embeddings test failed: {e}")
        return False

    # Ingest sample documents with OpenAI embeddings
    print("\n📚 Ingesting sample documents with OpenAI embeddings...")
    try:
        results = document_ingestion_pipeline.ingest_agricultural_knowledge_samples()
        print(
            f"✅ Ingested {results['processed_documents']}/{results['total_documents']} documents"
        )
        print(f"   Success rate: {results['success_rate']:.2%}")
    except Exception as e:
        print(f"❌ Sample ingestion failed: {e}")
        return False

    print("\n🎉 OpenAI embeddings setup completed successfully!")
    print("=" * 50)
    return True


if __name__ == "__main__":
    success = setup_openai_embeddings()
    if not success:
        exit(1)
