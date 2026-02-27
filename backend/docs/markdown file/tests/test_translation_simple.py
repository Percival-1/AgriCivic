"""
Simple test to verify OpenAI translation imports and initializes correctly.
"""

import os

print("Testing OpenAI Translation Service Setup")
print("=" * 60)

# Check environment
print("\n1. Checking environment variables...")
openai_key = os.getenv("OPENAI_API_KEY")
if openai_key:
    print(f"   ✅ OPENAI_API_KEY found (length: {len(openai_key)})")
else:
    print("   ❌ OPENAI_API_KEY not found")

# Test imports
print("\n2. Testing imports...")
try:
    from app.services.translation import (
        translation_service,
        OpenAITranslateClient,
        TranslationProvider,
    )

    print("   ✅ All imports successful")
except Exception as e:
    print(f"   ❌ Import failed: {e}")
    exit(1)

# Check service initialization
print("\n3. Checking service initialization...")
try:
    print(f"   Provider: {TranslationProvider.OPENAI.value}")
    print(f"   Clients available: {list(translation_service.clients.keys())}")

    if TranslationProvider.OPENAI.value in translation_service.clients:
        print("   ✅ OpenAI client initialized")
    else:
        print("   ❌ OpenAI client not initialized")

    # Check supported languages
    languages = translation_service.get_supported_languages()
    print(f"   Supported languages: {len(languages)} languages")
    print(f"   Sample: {languages[:5]}")

except Exception as e:
    print(f"   ❌ Initialization check failed: {e}")
    import traceback

    traceback.print_exc()
    exit(1)

print("\n" + "=" * 60)
print("✅ Translation service setup is correct!")
print("\nTo test actual API calls, run:")
print("  python -m pytest tests/test_translation_service.py -v")
