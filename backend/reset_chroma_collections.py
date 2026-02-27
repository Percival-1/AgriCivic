"""
Reset ChromaDB collections to use OpenAI embeddings.
"""

import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from app.services.vector_db import chroma_service


def reset_collections():
    """Reset all collections to use new embedding function."""
    print("🔄 Resetting ChromaDB collections for OpenAI embeddings...")

    collections_to_reset = [
        "agricultural_knowledge",
        "government_schemes",
        "market_intelligence",
        "crop_diseases",
        "pest_management",
    ]

    for collection_name in collections_to_reset:
        try:
            print(f"Resetting collection: {collection_name}")
            chroma_service.reset_collection(collection_name)
            print(f"✅ Reset {collection_name}")
        except Exception as e:
            print(f"⚠️  Error resetting {collection_name}: {e}")

    print("\n✅ All collections reset successfully!")
    print("Now you can run the RAG test with OpenAI embeddings.")


if __name__ == "__main__":
    reset_collections()
