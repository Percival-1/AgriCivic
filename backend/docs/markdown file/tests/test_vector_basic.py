#!/usr/bin/env python3
"""Test basic vector database functionality without OpenAI."""

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


def test_basic_vector_operations():
    """Test basic vector database operations without OpenAI."""
    try:
        print("🧪 Testing basic vector database operations...")

        # Import ChromaDB directly
        import chromadb
        from chromadb.utils import embedding_functions

        # Create client with default embeddings
        client = chromadb.Client()
        print("✅ ChromaDB client created")

        # Use default embedding function (sentence transformers)
        embedding_function = embedding_functions.DefaultEmbeddingFunction()
        print("✅ Default embedding function created")

        # Create collection
        collection = client.create_collection(
            name="test_collection", embedding_function=embedding_function
        )
        print("✅ Test collection created")

        # Add some test documents
        documents = [
            "Wheat cultivation requires proper soil preparation",
            "Rice blast disease affects rice crops",
            "Cotton bollworm is a major pest",
        ]

        metadatas = [
            {"crop": "wheat", "category": "cultivation"},
            {"crop": "rice", "category": "disease"},
            {"crop": "cotton", "category": "pest"},
        ]

        ids = ["doc1", "doc2", "doc3"]

        collection.add(documents=documents, metadatas=metadatas, ids=ids)
        print(f"✅ Added {len(documents)} test documents")

        # Query the collection
        results = collection.query(query_texts=["wheat farming"], n_results=2)

        print(f"✅ Query successful - found {len(results['documents'][0])} results")

        # Display results
        for i, doc in enumerate(results["documents"][0]):
            print(f"   Result {i+1}: {doc[:50]}...")

        # Clean up
        client.delete_collection("test_collection")
        print("✅ Test collection deleted")

        print("🎉 Basic vector database operations working!")
        return True

    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def main():
    """Run the test."""
    print("🚀 Testing Vector Database Basic Operations\n")

    if test_basic_vector_operations():
        print("\n✅ All tests passed!")
        return 0
    else:
        print("\n❌ Tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
