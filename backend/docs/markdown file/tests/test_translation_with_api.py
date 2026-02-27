"""
Test OpenAI translation with actual API calls.
"""

import asyncio
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from app.services.translation import translation_service


async def main():
    """Test translation with real API."""
    print("🔧 Testing OpenAI Translation Service with Real API")
    print("=" * 70)

    try:
        # Initialize cache
        print("\n1. Initializing service...")
        await translation_service.initialize_cache()

        # Check if OpenAI client is available
        if "openai" not in translation_service.clients:
            print("   ❌ OpenAI client not initialized")
            print("   Please check OPENAI_API_KEY in .env file")
            return False

        print("   ✅ Service initialized with OpenAI client")

        # Test 1: Simple translation
        print("\n2. Testing English to Hindi translation...")
        print("   Input: 'Hello, how are you?'")

        result = await translation_service.translate_text(
            text="Hello, how are you?",
            source_lang="en",
            target_lang="hi",
        )

        print(f"   Output: '{result}'")
        print("   ✅ Translation successful")

        # Test 2: Another translation
        print("\n3. Testing English to Tamil translation...")
        print("   Input: 'Good morning'")

        result = await translation_service.translate_text(
            text="Good morning",
            source_lang="en",
            target_lang="ta",
        )

        print(f"   Output: '{result}'")
        print("   ✅ Translation successful")

        # Test 3: Language detection
        print("\n4. Testing language detection...")
        print("   Input: 'नमस्ते'")

        detection = await translation_service.detect_language("नमस्ते")

        print(f"   Detected language: {detection.detected_language}")
        print(f"   Confidence: {detection.confidence}")
        print(f"   Response time: {detection.response_time:.2f}s")
        print("   ✅ Detection successful")

        # Test 4: Reverse translation
        print("\n5. Testing Hindi to English translation...")
        print("   Input: 'मौसम कैसा है?'")

        result = await translation_service.translate_text(
            text="मौसम कैसा है?",
            source_lang="hi",
            target_lang="en",
        )

        print(f"   Output: '{result}'")
        print("   ✅ Translation successful")

        # Show metrics
        print("\n6. Service Metrics:")
        metrics = translation_service.get_metrics()
        print(f"   Total requests: {metrics['total_requests']}")
        print(f"   Successful: {metrics['successful_requests']}")
        print(f"   Failed: {metrics['failed_requests']}")
        print(f"   Success rate: {metrics['success_rate']:.1%}")
        print(f"   Cache hits: {metrics['cache_hits']}")
        print(f"   Cache misses: {metrics['cache_misses']}")
        print(f"   Avg response time: {metrics['average_response_time']:.2f}s")
        print(f"   Providers: {metrics['available_providers']}")

        print("\n" + "=" * 70)
        print("✅ All tests passed! OpenAI translation is working correctly.")
        print("\nThe translation service is ready to use in the chat interface.")
        return True

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        print(f"   Error type: {type(e).__name__}")

        # Show more details for common errors
        if "API key" in str(e):
            print("\n   💡 Tip: Make sure OPENAI_API_KEY is set in your .env file")
        elif "rate limit" in str(e).lower():
            print(
                "\n   💡 Tip: You may have hit OpenAI rate limits. Wait a moment and try again."
            )

        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
