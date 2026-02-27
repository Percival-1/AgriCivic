#!/usr/bin/env python3
"""Test FastAPI vector database endpoints."""

import sys
import os
from pathlib import Path
import asyncio
import json

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


async def test_vector_db_endpoints():
    """Test vector database API endpoints."""
    try:
        print("🧪 Testing vector database API endpoints...")

        # Import the API functions directly
        from app.api.vector_db import (
            vector_db_health,
            list_collections,
            search_collection,
        )

        # Test health endpoint
        health_result = await vector_db_health()
        print(f"✅ Health check: {health_result['status']}")
        print(f"   Embedding type: {health_result.get('embedding_type', 'unknown')}")

        # Test list collections
        collections_result = await list_collections()
        print(
            f"✅ Collections listed: {len(collections_result['collections'])} collections"
        )

        for name, info in collections_result["collections"].items():
            if "count" in info:
                print(f"   {name}: {info['count']} documents")

        # Test search in agricultural knowledge
        search_result = await search_collection(
            collection_name="agricultural_knowledge",
            query="wheat cultivation",
            n_results=3,
        )
        print(f"✅ Search successful: {search_result['total_results']} results found")

        if search_result["results"]:
            best_result = search_result["results"][0]
            print(f"   Best match: {best_result['content'][:50]}...")
            print(f"   Similarity: {best_result['similarity_score']:.3f}")

        return True

    except Exception as e:
        print(f"❌ API endpoints test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


async def main():
    """Run the API endpoints test."""
    print("🚀 Testing Vector Database API Endpoints\n")

    if await test_vector_db_endpoints():
        print("\n🎉 API endpoints test passed!")
        return 0
    else:
        print("\n❌ API endpoints test failed!")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
