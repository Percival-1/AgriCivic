"""
Unit tests for the speech-to-text service.
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from datetime import datetime
import json

from app.services.speech_service import (
    SpeechToTextService,
    OpenAIWhisperClient,
    SpeechToTextRequest,
    SpeechToTextResponse,
    SpeechError,
    SpeechProviderError,
    AudioValidationError,
    UnsupportedAudioFormatError,
    SpeechProvider,
)


class TestOpenAIWhisperClient:
    """Test OpenAI Whisper client."""

    @pytest.fixture
    def mock_openai_client(self):
        """Mock OpenAI client."""
        mock_client = AsyncMock()

        # Mock transcription response structure
        mock_response = MagicMock()
        mock_response.text = "Hello, this is a test transcription"
        mock_response.language = "en"
        mock_response.duration = 5.2

        mock_client.audio.transcriptions.create = AsyncMock(return_value=mock_response)

        return mock_client

    @pytest.fixture
    def whisper_client(self, mock_openai_client):
        """Create OpenAI Whisper client with mocked dependencies."""
        with patch("app.services.speech_service.AsyncOpenAI") as mock_openai_class:
            mock_openai_class.return_value = mock_openai_client
            with patch("app.services.speech_service.get_settings") as mock_settings:
                mock_settings.return_value.openai_api_key = "test_key"
                client = OpenAIWhisperClient()
                client.client = mock_openai_client
                return client

    def test_validate_audio_format_supported(self, whisper_client):
        """Test validation of supported audio formats."""
        assert whisper_client.validate_audio_format("mp3") == True
        assert whisper_client.validate_audio_format("wav") == True
        assert whisper_client.validate_audio_format("m4a") == True
        assert whisper_client.validate_audio_format("flac") == True

    def test_validate_audio_format_unsupported(self, whisper_client):
        """Test validation of unsupported audio formats."""
        assert whisper_client.validate_audio_format("avi") == False
        assert whisper_client.validate_audio_format("mkv") == False
        assert whisper_client.validate_audio_format("txt") == False

    def test_validate_audio_size_within_limit(self, whisper_client):
        """Test validation of audio size within limits."""
        # 1 MB audio
        audio_data = b"x" * (1024 * 1024)
        assert whisper_client.validate_audio_size(audio_data) == True

    def test_validate_audio_size_exceeds_limit(self, whisper_client):
        """Test validation of audio size exceeding limits."""
        # 26 MB audio (exceeds 25 MB limit)
        audio_data = b"x" * (26 * 1024 * 1024)
        assert whisper_client.validate_audio_size(audio_data) == False

    @pytest.mark.asyncio
    async def test_transcribe_audio_success(self, whisper_client, mock_openai_client):
        """Test successful audio transcription."""
        # Create minimal audio data
        audio_data = b"\xff\xfb\x90\x00" + b"\x00" * 1000

        request = SpeechToTextRequest(
            audio_data=audio_data, language="en", audio_format="mp3"
        )

        with patch("tempfile.NamedTemporaryFile") as mock_temp:
            mock_file = MagicMock()
            mock_file.name = "/tmp/test_audio.mp3"
            mock_temp.return_value.__enter__.return_value = mock_file

            with patch("builtins.open", create=True) as mock_open:
                mock_open.return_value.__enter__.return_value = MagicMock()

                with patch("os.unlink"):
                    response = await whisper_client.transcribe_audio(request)

        assert response.transcribed_text == "Hello, this is a test transcription"
        assert response.detected_language == "en"
        assert response.provider == SpeechProvider.OPENAI_WHISPER.value
        assert response.audio_duration == 5.2
        assert not response.cached

    @pytest.mark.asyncio
    async def test_transcribe_audio_unsupported_format(self, whisper_client):
        """Test transcription with unsupported audio format."""
        audio_data = b"test audio data"

        request = SpeechToTextRequest(
            audio_data=audio_data, language="en", audio_format="avi"
        )

        with pytest.raises(UnsupportedAudioFormatError):
            await whisper_client.transcribe_audio(request)

    @pytest.mark.asyncio
    async def test_transcribe_audio_too_large(self, whisper_client):
        """Test transcription with audio file too large."""
        # 26 MB audio
        audio_data = b"x" * (26 * 1024 * 1024)

        request = SpeechToTextRequest(
            audio_data=audio_data, language="en", audio_format="mp3"
        )

        with pytest.raises(AudioValidationError):
            await whisper_client.transcribe_audio(request)


class TestSpeechToTextService:
    """Test Speech-to-Text Service."""

    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client."""
        return AsyncMock()

    @pytest.fixture
    def speech_service(self, mock_redis):
        """Create speech service with mocked dependencies."""
        with patch("app.services.speech_service.get_settings") as mock_settings:
            mock_settings.return_value.openai_api_key = "test_key"
            mock_settings.return_value.redis_url = "redis://localhost:6379/0"
            mock_settings.return_value.supported_languages = [
                "en",
                "hi",
                "bn",
                "te",
                "ta",
                "mr",
            ]

            service = SpeechToTextService()
            service.redis_client = mock_redis
            return service

    def test_detect_audio_format_mp3(self, speech_service):
        """Test MP3 audio format detection."""
        # MP3 file signature
        audio_data = b"ID3" + b"\x00" * 100
        format = speech_service._detect_audio_format(audio_data)
        assert format == "mp3"

    def test_detect_audio_format_wav(self, speech_service):
        """Test WAV audio format detection."""
        # WAV file signature
        audio_data = b"RIFF" + b"\x00" * 100
        format = speech_service._detect_audio_format(audio_data)
        assert format == "wav"

    def test_detect_audio_format_flac(self, speech_service):
        """Test FLAC audio format detection."""
        # FLAC file signature
        audio_data = b"fLaC" + b"\x00" * 100
        format = speech_service._detect_audio_format(audio_data)
        assert format == "flac"

    def test_detect_audio_format_unknown(self, speech_service):
        """Test unknown audio format detection."""
        audio_data = b"UNKNOWN" + b"\x00" * 100
        format = speech_service._detect_audio_format(audio_data)
        assert format is None

    @pytest.mark.asyncio
    async def test_transcribe_empty_audio_error(self, speech_service):
        """Test error handling for empty audio data."""
        with pytest.raises(AudioValidationError):
            await speech_service.transcribe(audio_data=b"")

    @pytest.mark.asyncio
    async def test_transcribe_with_cache_hit(self, speech_service, mock_redis):
        """Test transcription with cache hit."""
        audio_data = b"\xff\xfb\x90\x00" + b"\x00" * 1000

        # Mock cached response
        cached_data = {
            "transcribed_text": "Cached transcription",
            "detected_language": "en",
            "confidence": 0.95,
            "provider": "openai_whisper",
            "timestamp": datetime.now().isoformat(),
            "audio_duration": 5.0,
            "metadata": {},
        }

        mock_redis.get.return_value = json.dumps(cached_data)

        response = await speech_service.transcribe(
            audio_data=audio_data, language="en", audio_format="mp3"
        )

        assert response.cached == True
        assert response.transcribed_text == "Cached transcription"
        assert response.detected_language == "en"

    @pytest.mark.asyncio
    async def test_transcribe_with_auto_format_detection(self, speech_service):
        """Test transcription with automatic format detection."""
        # MP3 audio data
        audio_data = b"ID3" + b"\x00" * 1000

        # Mock OpenAI client
        mock_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.text = "Auto-detected transcription"
        mock_response.language = "en"
        mock_response.duration = 3.5
        mock_client.transcribe_audio = AsyncMock(
            return_value=SpeechToTextResponse(
                transcribed_text="Auto-detected transcription",
                detected_language="en",
                confidence=0.95,
                provider=SpeechProvider.OPENAI_WHISPER.value,
                cached=False,
                response_time=1.2,
                timestamp=datetime.now(),
                audio_duration=3.5,
            )
        )

        speech_service.clients[SpeechProvider.OPENAI_WHISPER.value] = mock_client

        response = await speech_service.transcribe(
            audio_data=audio_data, language="en", use_cache=False
        )

        assert response.transcribed_text == "Auto-detected transcription"

    @pytest.mark.asyncio
    async def test_batch_transcribe_success(self, speech_service):
        """Test batch transcription of multiple audio files."""
        audio_files = [
            b"ID3" + b"\x00" * 100,
            b"ID3" + b"\x00" * 200,
            b"ID3" + b"\x00" * 300,
        ]

        # Mock OpenAI client
        mock_client = AsyncMock()

        async def mock_transcribe(audio_data, **kwargs):
            return SpeechToTextResponse(
                transcribed_text=f"Transcription {len(audio_data)}",
                detected_language="en",
                confidence=0.95,
                provider=SpeechProvider.OPENAI_WHISPER.value,
                cached=False,
                response_time=1.0,
                timestamp=datetime.now(),
                audio_duration=2.0,
            )

        mock_client.transcribe_audio = mock_transcribe

        speech_service.clients[SpeechProvider.OPENAI_WHISPER.value] = mock_client

        # Mock the transcribe method to avoid cache checks
        with patch.object(
            speech_service, "transcribe", side_effect=mock_transcribe
        ) as mock_transcribe_method:
            responses = await speech_service.batch_transcribe(
                audio_files=audio_files, language="en", use_cache=False
            )

        assert len(responses) == 3

    @pytest.mark.asyncio
    async def test_batch_transcribe_empty_list(self, speech_service):
        """Test batch transcription with empty list."""
        responses = await speech_service.batch_transcribe(audio_files=[])
        assert responses == []

    def test_get_supported_formats(self, speech_service):
        """Test getting supported audio formats."""
        formats = speech_service.get_supported_formats()
        assert "mp3" in formats
        assert "wav" in formats
        assert "m4a" in formats
        assert isinstance(formats, list)

    def test_get_supported_languages(self, speech_service):
        """Test getting supported languages."""
        languages = speech_service.get_supported_languages()
        assert "en" in languages
        assert "hi" in languages
        assert isinstance(languages, list)

    def test_get_metrics(self, speech_service):
        """Test getting service metrics."""
        metrics = speech_service.get_metrics()

        assert "total_requests" in metrics
        assert "successful_requests" in metrics
        assert "failed_requests" in metrics
        assert "success_rate" in metrics
        assert "cache_hits" in metrics
        assert "cache_misses" in metrics
        assert "average_response_time" in metrics
        assert "supported_formats" in metrics
        assert "supported_languages" in metrics
        assert isinstance(metrics, dict)

    def test_reset_metrics(self, speech_service):
        """Test resetting service metrics."""
        # Set some metrics
        speech_service.metrics.total_requests = 10
        speech_service.metrics.successful_requests = 8

        # Reset
        speech_service.reset_metrics()

        # Verify reset
        assert speech_service.metrics.total_requests == 0
        assert speech_service.metrics.successful_requests == 0

    @pytest.mark.asyncio
    async def test_health_check(self, speech_service):
        """Test health check."""
        health_status = await speech_service.health_check()

        assert "status" in health_status
        assert "providers" in health_status
        assert "cache" in health_status
        assert "timestamp" in health_status
        assert isinstance(health_status, dict)
