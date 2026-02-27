"""
Unit tests for the translation service.
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from datetime import datetime

from app.services.translation import (
    TranslationService,
    OpenAITranslateClient,
    TranslationRequest,
    TranslationResponse,
    LanguageDetectionResponse,
    TranslationError,
    LanguageDetectionError,
    UnsupportedLanguageError,
    TranslationProvider,
)


class TestOpenAITranslateClient:
    """Test OpenAI Translate client."""

    @pytest.fixture
    def mock_openai_client(self):
        """Mock OpenAI client."""
        mock_client = AsyncMock()

        # Mock chat completion response structure
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "hi"

        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

        return mock_client

    @pytest.fixture
    def openai_translate_client(self, mock_openai_client):
        """Create OpenAI Translate client with mocked dependencies."""
        with patch("app.services.translation.AsyncOpenAI") as mock_openai_class:
            mock_openai_class.return_value = mock_openai_client
            with patch("app.services.translation.get_settings") as mock_settings:
                mock_settings.return_value.openai_api_key = "test_key"
                client = OpenAITranslateClient()
                client.client = mock_openai_client
                return client

    @pytest.mark.asyncio
    async def test_detect_language_success(
        self, openai_translate_client, mock_openai_client
    ):
        """Test successful language detection."""
        # Mock response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "hi"
        mock_openai_client.chat.completions.create.return_value = mock_response

        response = await openai_translate_client.detect_language("नमस्ते")

        assert response.detected_language == "hi"
        assert response.confidence == 0.95
        assert response.provider == TranslationProvider.OPENAI.value

    @pytest.mark.asyncio
    async def test_translate_text_success(
        self, openai_translate_client, mock_openai_client
    ):
        """Test successful text translation."""
        # Mock response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "नमस्ते"
        mock_openai_client.chat.completions.create.return_value = mock_response

        request = TranslationRequest(
            text="hello", target_language="hi", source_language="en"
        )

        response = await openai_translate_client.translate_text(request)

        assert response.translated_text == "नमस्ते"
        assert response.source_language == "en"
        assert response.target_language == "hi"
        assert response.provider == TranslationProvider.OPENAI.value
        assert not response.cached


class TestTranslationService:
    """Test Translation Service."""

    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client."""
        return AsyncMock()

    @pytest.fixture
    def translation_service(self, mock_redis):
        """Create translation service with mocked dependencies."""
        with patch("app.services.translation.get_settings") as mock_settings:
            mock_settings.return_value.openai_api_key = "test_key"
            mock_settings.return_value.redis_url = "redis://localhost:6379/0"
            mock_settings.return_value.supported_languages = ["en", "hi", "bn", "te"]

            service = TranslationService()
            service.redis_client = mock_redis
            return service

    @pytest.mark.asyncio
    async def test_fallback_translation(self, translation_service):
        """Test fallback translation for common phrases."""
        response = await translation_service.translate(
            text="hello", target_language="hi", source_language="en"
        )

        assert response.translated_text == "नमस्ते"
        assert response.provider == "fallback"
        assert response.confidence == 0.9

    @pytest.mark.asyncio
    async def test_same_language_passthrough(self, translation_service):
        """Test passthrough when source and target languages are the same."""
        response = await translation_service.translate(
            text="Hello world", target_language="en", source_language="en"
        )

        assert response.translated_text == "Hello world"
        assert response.provider == "passthrough"
        assert response.confidence == 1.0

    @pytest.mark.asyncio
    async def test_unsupported_language_error(self, translation_service):
        """Test error handling for unsupported languages."""
        with pytest.raises(UnsupportedLanguageError):
            await translation_service.translate(
                text="Hello",
                target_language="xyz",  # Unsupported language
                source_language="en",
            )

    @pytest.mark.asyncio
    async def test_empty_text_error(self, translation_service):
        """Test error handling for empty text."""
        with pytest.raises(TranslationError):
            await translation_service.translate(
                text="", target_language="hi", source_language="en"
            )

    @pytest.mark.asyncio
    async def test_cached_translation(self, translation_service, mock_redis):
        """Test cached translation retrieval."""
        # Mock cached response
        cached_data = {
            "translated_text": "नमस्ते",
            "source_language": "en",
            "target_language": "hi",
            "confidence": 0.95,
            "provider": "openai",
            "timestamp": datetime.now().isoformat(),
            "metadata": {},
        }

        import json

        mock_redis.get.return_value = json.dumps(cached_data)

        response = await translation_service.translate(
            text="hello", target_language="hi", source_language="en"
        )

        assert response.cached == True
        assert response.translated_text == "नमस्ते"

    def test_supported_languages(self, translation_service):
        """Test getting supported languages."""
        languages = translation_service.get_supported_languages()
        assert "en" in languages
        assert "hi" in languages
        assert isinstance(languages, list)

    def test_metrics(self, translation_service):
        """Test metrics collection."""
        metrics = translation_service.get_metrics()

        assert "total_requests" in metrics
        assert "successful_requests" in metrics
        assert "failed_requests" in metrics
        assert "cache_hits" in metrics
        assert "cache_misses" in metrics
        assert isinstance(metrics, dict)

    @pytest.mark.asyncio
    async def test_batch_translate(self, translation_service):
        """Test batch translation."""
        texts = ["hello", "thank you", "yes"]

        responses = await translation_service.batch_translate(
            texts=texts, target_language="hi", source_language="en"
        )

        assert len(responses) == 3
        assert all(isinstance(r, TranslationResponse) for r in responses)
        assert responses[0].translated_text == "नमस्ते"
        assert responses[1].translated_text == "धन्यवाद"
        assert responses[2].translated_text == "हाँ"
