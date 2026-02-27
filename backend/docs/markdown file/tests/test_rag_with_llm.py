"""
Test script to demonstrate RAG engine with LLM integration.
"""

import asyncio
import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.rag_engine import rag_engine
from app.services.embedding_service import embedding_service


async def test_rag_with_llm():
    """Test the RAG engine with LLM integration."""
    print("🧠 Testing RAG Engine with LLM Integration")
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

        # Add government scheme information
        scheme_id = embedding_service.add_government_scheme(
            content="PM-KISAN scheme provides direct income support of ₹6000 per year to small and marginal farmers. "
            "Eligible farmers are those with landholding up to 2 hectares. "
            "Payment is made in three equal installments of ₹2000 each every four months. "
            "Farmers can apply online through PM-KISAN portal or visit nearest Common Service Center.",
            scheme_name="PM-KISAN",
            scheme_type="financial_assistance",
            eligibility="Small and marginal farmers with up to 2 hectares land",
            benefits="₹6000 per year in three installments",
            source="Ministry of Agriculture and Farmers Welfare",
        )
        print(f"✅ Added PM-KISAN scheme: {scheme_id}")

        print("\n🔍 Testing RAG queries with LLM...")

        # Test 1: Disease query
        print("\n--- Test 1: Disease Query ---")
        disease_query = "My wheat plants have orange spots on leaves. What should I do?"

        print(f"Query: {disease_query}")
        print("Processing with RAG + LLM...")

        disease_response = await rag_engine.search_and_generate(
            query=disease_query,
            collections=["crop_diseases"],
            top_k=3,
            response_type="comprehensive",
            language="en",
        )

        print(f"Response: {disease_response['response']}")
        print(f"Sources used: {len(disease_response['sources'])}")
        if "llm_metadata" in disease_response:
            print(f"LLM Provider: {disease_response['llm_metadata']['provider']}")
            print(f"Tokens used: {disease_response['llm_metadata']['tokens_used']}")

        # Test 2: Government scheme query
        print("\n--- Test 2: Government Scheme Query ---")
        scheme_query = "What financial help is available for small farmers?"

        print(f"Query: {scheme_query}")
        print("Processing with RAG + LLM...")

        scheme_response = await rag_engine.search_and_generate(
            query=scheme_query,
            collections=["government_schemes"],
            top_k=3,
            response_type="comprehensive",
            language="en",
        )

        print(f"Response: {scheme_response['response']}")
        print(f"Sources used: {len(scheme_response['sources'])}")
        if "llm_metadata" in scheme_response:
            print(f"LLM Provider: {scheme_response['llm_metadata']['provider']}")
            print(f"Tokens used: {scheme_response['llm_metadata']['tokens_used']}")

        # Test 3: Hindi language query
        print("\n--- Test 3: Hindi Language Query ---")
        hindi_query = "गेहूं की बीमारी का इलाज क्या है?"

        print(f"Query: {hindi_query}")
        print("Processing with RAG + LLM in Hindi...")

        hindi_response = await rag_engine.search_and_generate(
            query=hindi_query,
            collections=["crop_diseases"],
            top_k=3,
            response_type="comprehensive",
            language="hi",
        )

        print(f"Response: {hindi_response['response']}")
        print(f"Sources used: {len(hindi_response['sources'])}")
        if "llm_metadata" in hindi_response:
            print(f"LLM Provider: {hindi_response['llm_metadata']['provider']}")
            print(f"Tokens used: {hindi_response['llm_metadata']['tokens_used']}")

        # Test 4: Concise response type
        print("\n--- Test 4: Concise Response Type ---")
        concise_query = "How much does wheat rust treatment cost?"

        print(f"Query: {concise_query}")
        print("Processing with RAG + LLM (concise response)...")

        concise_response = await rag_engine.search_and_generate(
            query=concise_query,
            collections=["crop_diseases"],
            top_k=2,
            response_type="concise",
            language="en",
        )

        print(f"Response: {concise_response['response']}")
        print(f"Sources used: {len(concise_response['sources'])}")
        if "llm_metadata" in concise_response:
            print(f"LLM Provider: {concise_response['llm_metadata']['provider']}")
            print(f"Tokens used: {concise_response['llm_metadata']['tokens_used']}")

        print("\n✅ All RAG + LLM tests completed successfully!")

        # Show the difference between old and new approach
        print("\n" + "=" * 50)
        print("🔄 COMPARISON: Before vs After LLM Integration")
        print("=" * 50)

        print("\n❌ OLD APPROACH (without LLM):")
        print("   - Simple text concatenation")
        print("   - No intelligent synthesis")
        print("   - Generic responses")
        print("   - No source citation")

        print("\n✅ NEW APPROACH (with LLM):")
        print("   - Intelligent response generation")
        print("   - Context-aware synthesis")
        print("   - Proper source citations")
        print("   - Language-specific responses")
        print("   - Response type customization")

    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_rag_with_llm())
