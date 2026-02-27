"""
Test script to debug RAG document retrieval.
"""

import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.rag_engine import rag_engine
from app.services.embedding_service import embedding_service


def test_document_retrieval():
    """Test document retrieval without LLM."""
    print("🔍 Testing RAG Document Retrieval")
    print("=" * 50)

    try:
        # First, add some sample knowledge to test with
        print("📚 Adding sample agricultural knowledge...")

        # Add wheat disease information
        wheat_disease_id = embedding_service.add_disease_information(
            content="Wheat rust appears as orange-red pustules on leaves and stems. "
            "It spreads rapidly in humid conditions with temperatures between 15-25°C. "
            "For control, apply Propiconazole 25% EC at 0.1% concentration (1ml per liter water). "
            "Spray every 15 days during infection period. Cost is approximately ₹200-300 per acre. "
            "Available at all Krishi Kendras and agricultural stores.",
            crop="wheat",
            disease_name="wheat_rust",
            symptoms="Orange-red pustules on leaves and stems",
            treatment="Propiconazole 25% EC at 0.1% concentration",
            prevention="Use resistant varieties, proper spacing, avoid excess nitrogen",
            source="Indian Agricultural Research Institute",
        )
        print(f"✅ Added wheat rust information: {wheat_disease_id}")

        # Check collection stats
        print("\n📊 Checking collection stats...")
        stats = embedding_service.get_collection_stats()
        print(f"Collection stats: {stats}")

        # Test direct vector DB query
        print("\n🔍 Testing direct vector DB query...")
        direct_results = rag_engine.vector_db.query_documents(
            collection_name="crop_diseases",
            query_text="wheat rust orange spots",
            n_results=5,
        )
        print(f"Direct query results: {direct_results}")

        # Test RAG engine retrieval
        print("\n🔍 Testing RAG engine retrieval...")
        retrieved_docs = rag_engine.retrieve_documents(
            query="wheat rust orange spots",
            collections=["crop_diseases"],
            top_k=5,
            similarity_threshold=0.1,  # Lower threshold for testing
        )
        print(f"RAG engine retrieved {len(retrieved_docs)} documents")
        for i, doc in enumerate(retrieved_docs):
            print(
                f"  Doc {i+1}: {doc.get('id', 'unknown')} (score: {doc.get('similarity_score', 0):.3f})"
            )
            print(f"    Content: {doc.get('content', '')[:100]}...")

        # Test with different query
        print("\n🔍 Testing with different query...")
        retrieved_docs2 = rag_engine.retrieve_documents(
            query="orange pustules on wheat leaves",
            collections=["crop_diseases"],
            top_k=5,
            similarity_threshold=0.1,
        )
        print(f"Second query retrieved {len(retrieved_docs2)} documents")

        # Test with all collections
        print("\n🔍 Testing with all collections...")
        retrieved_docs3 = rag_engine.retrieve_documents(
            query="wheat disease treatment",
            collections=None,  # All collections
            top_k=5,
            similarity_threshold=0.1,
        )
        print(f"All collections query retrieved {len(retrieved_docs3)} documents")

        print("\n✅ Document retrieval test completed!")

    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    test_document_retrieval()
