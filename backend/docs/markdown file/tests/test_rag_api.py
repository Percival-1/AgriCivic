"""
Test script to test RAG API endpoints.
"""

import asyncio
import sys
import os
import json

# Add the project root to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.api.rag import rag_query
from app.api.rag import RAGQueryRequest


async def test_rag_api():
    """Test the RAG API endpoints."""
    print("🌐 Testing RAG API Endpoints")
    print("=" * 50)

    try:
        # Test 1: Disease query via API
        print("\n--- Test 1: Disease Query via API ---")

        disease_request = RAGQueryRequest(
            query="My wheat plants have orange spots on leaves. What should I do?",
            collections=["crop_diseases"],
            top_k=3,
            response_type="comprehensive",
            language="en",
        )

        print(f"API Request: {disease_request.query}")
        print("Processing via RAG API...")

        disease_response = await rag_query(disease_request)

        print(f"API Response Success: {disease_response['success']}")
        if disease_response["success"]:
            data = disease_response["data"]
            print(f"Response: {data['response'][:200]}...")
            print(f"Sources used: {len(data['sources'])}")
            if "llm_metadata" in data:
                print(f"LLM Provider: {data['llm_metadata']['provider']}")
                print(f"Tokens used: {data['llm_metadata']['tokens_used']}")

        # Test 2: Government scheme query via API
        print("\n--- Test 2: Government Scheme Query via API ---")

        scheme_request = RAGQueryRequest(
            query="What financial help is available for small farmers?",
            collections=["government_schemes"],
            top_k=3,
            response_type="comprehensive",
            language="en",
        )

        print(f"API Request: {scheme_request.query}")
        print("Processing via RAG API...")

        scheme_response = await rag_query(scheme_request)

        print(f"API Response Success: {scheme_response['success']}")
        if scheme_response["success"]:
            data = scheme_response["data"]
            print(f"Response: {data['response'][:200]}...")
            print(f"Sources used: {len(data['sources'])}")
            if "llm_metadata" in data:
                print(f"LLM Provider: {data['llm_metadata']['provider']}")
                print(f"Tokens used: {data['llm_metadata']['tokens_used']}")

        # Test 3: Hindi query via API
        print("\n--- Test 3: Hindi Query via API ---")

        hindi_request = RAGQueryRequest(
            query="गेहूं की बीमारी का इलाज क्या है?",
            collections=["crop_diseases"],
            top_k=3,
            response_type="comprehensive",
            language="hi",
        )

        print(f"API Request: {hindi_request.query}")
        print("Processing via RAG API...")

        hindi_response = await rag_query(hindi_request)

        print(f"API Response Success: {hindi_response['success']}")
        if hindi_response["success"]:
            data = hindi_response["data"]
            print(f"Response: {data['response'][:200]}...")
            print(f"Sources used: {len(data['sources'])}")
            if "llm_metadata" in data:
                print(f"LLM Provider: {data['llm_metadata']['provider']}")
                print(f"Tokens used: {data['llm_metadata']['tokens_used']}")

        # Test 4: Concise response via API
        print("\n--- Test 4: Concise Response via API ---")

        concise_request = RAGQueryRequest(
            query="How much does wheat rust treatment cost?",
            collections=["crop_diseases"],
            top_k=2,
            response_type="concise",
            language="en",
        )

        print(f"API Request: {concise_request.query}")
        print("Processing via RAG API...")

        concise_response = await rag_query(concise_request)

        print(f"API Response Success: {concise_response['success']}")
        if concise_response["success"]:
            data = concise_response["data"]
            print(f"Response: {data['response']}")
            print(f"Sources used: {len(data['sources'])}")
            if "llm_metadata" in data:
                print(f"LLM Provider: {data['llm_metadata']['provider']}")
                print(f"Tokens used: {data['llm_metadata']['tokens_used']}")

        print("\n✅ All RAG API tests completed successfully!")

    except Exception as e:
        print(f"❌ API test failed with error: {str(e)}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_rag_api())
