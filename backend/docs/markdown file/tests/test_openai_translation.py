"""
Quick test script to verify OpenAI translation service.
"""

import asyncio
from app.services.translation import translation_service


async def test_translation():
    """Test OpenAI translation service."""
    print("Testing OpenAI Translation Service\n")
    print("=" * 50)

    # Initialize cache
    await translation_service.initialize_cache()

    # Test 1: English to Hindi
    print("\n1. Testing English to Hindi translation:")
    try:
        result = await translation_service.translate_text(
            text="Hello, how are you?",
            source_lang="en",
            target_lang="hi",
        )
        print(f"   Original: Hello, how are you?")
        print(f"   Translated: {result}")
    except Exception as e:
        print(f"   Error: {e}")

    # Test 2: English to Tamil
    print("\n2. Testing English to Tamil translation:")
    try:
        result = await translation_service.translate_text(
            text="What is the weather today?",
            source_lang="en",
            target_lang="ta",
        )
        print(f"   Original: What is the weather today?")
        print(f"   Translated: {result}")
    except Exception as e:
        print(f"   Error: {e}")

    # Test 3: Language detection
    print("\n3. Testing language detection:")
    try:
        detection = await translation_service.detect_language("नमस्ते, आप कैसे हैं?")
        print(f"   Text: नमस्ते, आप कैसे हैं?")
        print(f"   Detected language: {detection.detected_language}")
        print(f"   Confidence: {detection.confidence}")
    except Exception as e:
        print(f"   Error: {e}")

    # Test 4: Hindi to English
    print("\n4. Testing Hindi to English translation:")
    try:
        result = await translation_service.translate_text(
            text="मौसम कैसा है?",
            source_lang="hi",
            target_lang="en",
        )
        print(f"   Original: मौसम कैसा है?")
        print(f"   Translated: {result}")
    except Exception as e:
        print(f"   Error: {e}")

    # Test 5: Check metrics
    print("\n5. Translation service metrics:")
    metrics = translation_service.get_metrics()
    print(f"   Total requests: {metrics['total_requests']}")
    print(f"   Successful requests: {metrics['successful_requests']}")
    print(f"   Failed requests: {metrics['failed_requests']}")
    print(f"   Success rate: {metrics['success_rate']:.2%}")
    print(f"   Average response time: {metrics['average_response_time']:.2f}s")
    print(f"   Available providers: {metrics['available_providers']}")

    print("\n" + "=" * 50)
    print("Translation test completed!")


if __name__ == "__main__":
    asyncio.run(test_translation())
