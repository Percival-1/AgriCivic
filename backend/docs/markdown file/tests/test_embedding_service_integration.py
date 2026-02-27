#!/usr/bin/env python3
"""Test embedding service integration with ChromaDB."""

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


def test_embedding_service():
    """Test embedding service with ChromaDB."""
    try:
        print("🧪 Testing embedding service integration...")

        from app.services.embedding_service import DocumentEmbeddingService

        # Create embedding service
        service = DocumentEmbeddingService()
        print("✅ Embedding service created")

        # Test adding agricultural knowledge
        doc_id = service.add_agricultural_knowledge(
            content="Tomato blight is a fungal disease that affects tomato plants during humid conditions",
            crop="tomato",
            category="disease_management",
            source="agricultural_extension",
        )
        print(f"✅ Added agricultural knowledge: {doc_id}")

        # Test adding government scheme
        scheme_id = service.add_government_scheme(
            content="Soil Health Card provides farmers with nutrient analysis and fertilizer recommendations",
            scheme_name="Soil Health Card",
            scheme_type="advisory",
            source="government_portal",
        )
        print(f"✅ Added government scheme: {scheme_id}")

        # Test searching agricultural knowledge
        results = service.search_agricultural_knowledge("tomato disease", n_results=3)
        print(f"✅ Agricultural search successful - found {len(results)} results")

        if results:
            print(f"   Best match: {results[0]['content'][:60]}...")
            print(f"   Similarity: {results[0]['similarity_score']:.3f}")

        # Test searching government schemes
        scheme_results = service.search_government_schemes("soil health", n_results=2)
        print(f"✅ Scheme search successful - found {len(scheme_results)} results")

        if scheme_results:
            print(f"   Best match: {scheme_results[0]['content'][:60]}...")

        # Test hybrid search
        hybrid_results = service.hybrid_search(
            "farming advice", n_results_per_collection=2
        )
        print(
            f"✅ Hybrid search successful - searched {len(hybrid_results)} collections"
        )

        for collection, results in hybrid_results.items():
            if results:
                print(f"   {collection}: {len(results)} results")

        # Test collection stats
        stats = service.get_collection_stats()
        print(f"✅ Collection stats retrieved for {len(stats)} collections")

        for collection, info in stats.items():
            if "count" in info:
                print(f"   {collection}: {info['count']} documents")

        return True

    except Exception as e:
        print(f"❌ Embedding service test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def main():
    """Run the embedding service test."""
    print("🚀 Testing Embedding Service Integration\n")

    if test_embedding_service():
        print("\n🎉 Embedding service integration test passed!")
        return 0
    else:
        print("\n❌ Embedding service integration test failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
