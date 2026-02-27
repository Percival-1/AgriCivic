"""
Comprehensive demonstration of RAG Engine with LLM Integration.
This script shows the complete workflow from document ingestion to intelligent response generation.
"""

import asyncio
import sys
import os
import json

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

from app.services.rag_engine import rag_engine
from app.services.embedding_service import embedding_service
from app.services.llm_service import llm_service


async def demo_rag_llm_integration():
    """Comprehensive demonstration of RAG + LLM integration."""
    print("🚀 RAG Engine + LLM Integration Demonstration")
    print("=" * 60)

    try:
        # Step 1: Add comprehensive agricultural knowledge
        print("\n📚 Step 1: Adding Agricultural Knowledge Base")
        print("-" * 40)

        # Add multiple disease information documents
        diseases = [
            {
                "content": "Wheat rust appears as orange-red pustules on leaves and stems. "
                "It spreads rapidly in humid conditions with temperatures between 15-25°C. "
                "For control, apply Propiconazole 25% EC at 0.1% concentration (1ml per liter water). "
                "Spray every 15 days during infection period. Cost is approximately ₹200-300 per acre. "
                "Available at all Krishi Kendras and agricultural stores.",
                "crop": "wheat",
                "disease_name": "wheat_rust",
                "symptoms": "Orange-red pustules on leaves and stems",
                "treatment": "Propiconazole 25% EC at 0.1% concentration",
                "prevention": "Use resistant varieties, proper spacing, avoid excess nitrogen",
                "source": "Indian Agricultural Research Institute",
            },
            {
                "content": "Rice blast disease causes diamond-shaped lesions on leaves with gray centers and brown borders. "
                "It affects rice plants during humid weather conditions. "
                "Treatment involves application of Tricyclazole 75% WP at 0.6g per liter of water. "
                "Apply at early tillering and boot leaf stages. Cost ranges from ₹150-250 per acre. "
                "Preventive measures include using certified seeds and balanced fertilization.",
                "crop": "rice",
                "disease_name": "rice_blast",
                "symptoms": "Diamond-shaped lesions with gray centers and brown borders",
                "treatment": "Tricyclazole 75% WP at 0.6g per liter",
                "prevention": "Use certified seeds, balanced fertilization",
                "source": "Rice Research Institute",
            },
        ]

        for disease in diseases:
            doc_id = embedding_service.add_disease_information(**disease)
            print(f"✅ Added {disease['disease_name']}: {doc_id}")

        # Add government schemes
        schemes = [
            {
                "content": "PM-KISAN scheme provides direct income support of ₹6000 per year to small and marginal farmers. "
                "Eligible farmers are those with landholding up to 2 hectares. "
                "Payment is made in three equal installments of ₹2000 each every four months. "
                "Farmers can apply online through PM-KISAN portal or visit nearest Common Service Center.",
                "scheme_name": "PM-KISAN",
                "scheme_type": "financial_assistance",
                "eligibility": "Small and marginal farmers with up to 2 hectares land",
                "benefits": "₹6000 per year in three installments",
                "source": "Ministry of Agriculture and Farmers Welfare",
            },
            {
                "content": "Pradhan Mantri Fasal Bima Yojana (PMFBY) provides crop insurance coverage against natural calamities. "
                "Premium rates are 2% for Kharif crops, 1.5% for Rabi crops, and 5% for commercial/horticultural crops. "
                "Coverage includes prevented sowing, standing crop losses, and post-harvest losses. "
                "Claims are settled based on Crop Cutting Experiments (CCE) data.",
                "scheme_name": "PMFBY",
                "scheme_type": "crop_insurance",
                "eligibility": "All farmers including sharecroppers and tenant farmers",
                "benefits": "Crop insurance coverage against natural calamities",
                "source": "Ministry of Agriculture and Farmers Welfare",
            },
        ]

        for scheme in schemes:
            doc_id = embedding_service.add_government_scheme(**scheme)
            print(f"✅ Added {scheme['scheme_name']}: {doc_id}")

        # Add market intelligence
        market_data = {
            "content": "Current wheat prices in major mandis: Delhi - ₹2100/quintal, Punjab - ₹2050/quintal, "
            "Haryana - ₹2080/quintal, UP - ₹2070/quintal. "
            "Prices are expected to remain stable due to good harvest and adequate government procurement. "
            "MSP for wheat 2024-25 is ₹2125/quintal. "
            "Best time to sell is during April-May when demand is high.",
            "crop": "wheat",
            "region": "North India",
            "price_range": "₹2050-2125/quintal",
            "source": "Agricultural Marketing Division",
        }

        market_id = embedding_service.add_market_intelligence(**market_data)
        print(f"✅ Added market intelligence: {market_id}")

        # Step 2: Test LLM Service Health
        print("\n🔧 Step 2: Testing LLM Service Health")
        print("-" * 40)

        health_status = await llm_service.health_check()
        print(f"LLM Service Status: {health_status['status']}")
        for provider, status in health_status["providers"].items():
            print(
                f"  {provider}: {'✅' if status['healthy'] else '❌'} {status['status']}"
            )

        # Step 3: Demonstrate RAG + LLM Queries
        print("\n🤖 Step 3: RAG + LLM Query Demonstrations")
        print("-" * 40)

        test_queries = [
            {
                "query": "My wheat plants have orange spots on leaves. What should I do?",
                "collections": ["crop_diseases"],
                "response_type": "comprehensive",
                "language": "en",
                "description": "Disease Diagnosis & Treatment",
            },
            {
                "query": "What government schemes can help small farmers financially?",
                "collections": ["government_schemes"],
                "response_type": "comprehensive",
                "language": "en",
                "description": "Government Financial Assistance",
            },
            {
                "query": "What is the current wheat price and when should I sell?",
                "collections": ["market_intelligence"],
                "response_type": "comprehensive",
                "language": "en",
                "description": "Market Intelligence",
            },
            {
                "query": "धान की बीमारी का इलाज क्या है?",
                "collections": ["crop_diseases"],
                "response_type": "comprehensive",
                "language": "hi",
                "description": "Hindi Disease Query",
            },
            {
                "query": "How much does crop insurance cost?",
                "collections": ["government_schemes"],
                "response_type": "concise",
                "language": "en",
                "description": "Concise Insurance Information",
            },
        ]

        for i, test in enumerate(test_queries, 1):
            print(f"\n--- Test {i}: {test['description']} ---")
            print(f"Query: {test['query']}")
            print(f"Language: {test['language']}, Type: {test['response_type']}")
            print("Processing...")

            try:
                response_data = await rag_engine.search_and_generate(
                    query=test["query"],
                    collections=test["collections"],
                    top_k=3,
                    response_type=test["response_type"],
                    language=test["language"],
                )

                print(f"✅ Response Generated:")
                print(f"   {response_data['response']}")
                print(f"   Sources: {len(response_data['sources'])}")
                print(
                    f"   Grounding Score: {response_data.get('grounding_score', 'N/A')}"
                )

                if "llm_metadata" in response_data:
                    llm_meta = response_data["llm_metadata"]
                    print(f"   LLM: {llm_meta['provider']} ({llm_meta['model']})")
                    print(f"   Tokens: {llm_meta['tokens_used']}")
                    print(f"   Response Time: {llm_meta['response_time']:.2f}s")

            except Exception as e:
                print(f"❌ Query failed: {str(e)}")

        # Step 4: Show Knowledge Base Statistics
        print("\n📊 Step 4: Knowledge Base Statistics")
        print("-" * 40)

        stats = rag_engine.get_knowledge_base_stats()
        print(f"Total Documents: {stats['total_documents']}")
        print("Collections:")
        for collection, info in stats["collections"].items():
            if isinstance(info, dict) and "count" in info:
                print(f"  {collection}: {info['count']} documents")

        # Step 5: Show LLM Service Metrics
        print("\n📈 Step 5: LLM Service Metrics")
        print("-" * 40)

        metrics = llm_service.get_metrics()
        print(f"Total Requests: {metrics['total_requests']}")
        print(f"Success Rate: {metrics['success_rate']:.2%}")
        print(f"Total Tokens Used: {metrics['total_tokens_used']}")
        print(f"Average Response Time: {metrics['average_response_time']:.2f}s")
        print("Provider Usage:")
        for provider, count in metrics["provider_usage"].items():
            print(f"  {provider}: {count} requests")

        print("\n🎉 RAG + LLM Integration Demonstration Complete!")
        print("=" * 60)
        print("\n✨ Key Features Demonstrated:")
        print("  ✅ Document ingestion with OpenAI embeddings")
        print("  ✅ Semantic search across multiple collections")
        print("  ✅ Intelligent response generation with LLM")
        print("  ✅ Proper source citation and grounding")
        print("  ✅ Multi-language support (English/Hindi)")
        print("  ✅ Response type customization")
        print("  ✅ Comprehensive error handling")
        print("  ✅ Performance monitoring and metrics")

    except Exception as e:
        print(f"❌ Demonstration failed: {str(e)}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(demo_rag_llm_integration())
