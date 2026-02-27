"""
Integration test for OpenAI translation service.
Run this to test actual OpenAI API calls.
"""

import asyncio
import os
from app.services.translation import translation_service


async def test_real_translation():
    """Test real OpenAI translation."""

    # Check if OpenAI API key is available
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not found in environment variables")
        print("   Please set OPENAI_API_KEY in your .env file")
        return False

    print("🔧 Testing OpenAI Translation Service")
    print("=" * 60)

    try:
        # Initialize cache
        print("\n1. Initializing cache...")
        await translation_service.initialize_cache()
        print("   ✅ Cache initialized")

        # Test 1: Simple English to Hindi translation
        print("\n2. Testing English to Hindi translation...")
        result = await translation_service.translate_text(
            text="Hello, how are you?",
            source_lang="en",
            target_lang="hi",
        )
        print(f"   Original: Hello, how are you?")
        print(f"   Translated: {result}")
        print("   ✅ Translation successful")

        # Test 2: Language detection
        print("\n3. Testing language detection...")
        detection = await translation_service.detect_language("नमस्ते")
        print(f"   Text: नमस्ते")
        print(f"   Detected: {detection.detected_language}")
        print(f"   Confidence: {detection.confidence}")
        print("   ✅ Detection successful")

        # Test 3: Hindi to English
        print("\n4. Testing Hindi to English translation...")
        result = await translation_service.translate_text(
            text="मौसम कैसा है?",
            source_lang="hi",
            target_lang="en",
        )
        print(f"   Original: मौसम कैसा है?")
        print(f"   Translated: {result}")
        print("   ✅ Translation successful")

        # Test 4: Check metrics
        print("\n5. Checking service metrics...")
        metrics = translation_service.get_metrics()
        print(f"   Total requests: {metrics['total_requests']}")
        print(f"   Successful: {metrics['successful_requests']}")
        print(f"   Failed: {metrics['failed_requests']}")
        print(f"   Success rate: {metrics['success_rate']:.1%}")
        print(f"   Avg response time: {metrics['average_response_time']:.2f}s")
        print(f"   Providers: {metrics['available_providers']}")
        print("   ✅ Metrics retrieved")

        print("\n" + "=" * 60)
        print("✅ All tests passed! OpenAI translation is working correctly.")
        return True

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        print(f"   Error type: {type(e).__name__}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_real_translation())
    exit(0 if success else 1)
