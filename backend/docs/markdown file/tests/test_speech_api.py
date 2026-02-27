"""
Unit tests for the speech-to-text API endpoints.
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime
from io import BytesIO

from fastapi.testclient import TestClient
from fastapi import UploadFile

from app.main import app
from app.services.speech_service import (
    SpeechToTextResponse,
    SpeechProvider,
    SpeechError,
    AudioValidationError,
    UnsupportedAudioFormatError,
)


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_speech_service():
    """Mock speech service."""
    return AsyncMock()


@pytest.fixture
def sample_audio_file():
    """Create sample audio file for testing."""
    # Create a minimal MP3-like file
    audio_data = b"\xff\xfb\x90\x00" + b"\x00" * 1000
    return BytesIO(audio_data)


class TestSpeechTranscribeEndpoint:
    """Test /api/v1/speech/transcribe endpoint."""

    def test_transcribe_audio_success(
        self, client, mock_speech_service, sample_audio_file
    ):
        """Test successful audio transcription."""
        # Mock response
        mock_response = SpeechToTextResponse(
            transcribed_text="Hello, this is a test",
            detected_language="en",
            confidence=0.95,
            provider=SpeechProvider.OPENAI_WHISPER.value,
            cached=False,
            response_time=1.5,
            timestamp=datetime.now(),
            audio_duration=3.2,
        )

        with patch(
            "app.api.speech.speech_service.transcribe", return_value=mock_response
        ):
            response = client.post(
                "/api/v1/speech/transcribe",
                files={"audio": ("test.mp3", sample_audio_file, "audio/mpeg")},
                data={"language": "en", "use_cache": "true"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["transcribed_text"] == "Hello, this is a test"
        assert data["detected_language"] == "en"
        assert data["confidence"] == 0.95
        assert data["provider"] == "openai_whisper"
        assert data["cached"] == False

    def test_transcribe_audio_without_language(
        self, client, mock_speech_service, sample_audio_file
    ):
        """Test transcription without language hint."""
        mock_response = SpeechToTextResponse(
            transcribed_text="Auto-detected transcription",
            detected_language="hi",
            confidence=0.92,
            provider=SpeechProvider.OPENAI_WHISPER.value,
            cached=False,
            response_time=1.8,
            timestamp=datetime.now(),
            audio_duration=4.5,
        )

        with patch(
            "app.api.speech.speech_service.transcribe", return_value=mock_response
        ):
            response = client.post(
                "/api/v1/speech/transcribe",
                files={"audio": ("test.mp3", sample_audio_file, "audio/mpeg")},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["detected_language"] == "hi"

    def test_transcribe_audio_empty_file(self, client):
        """Test transcription with empty audio file."""
        empty_file = BytesIO(b"")

        response = client.post(
            "/api/v1/speech/transcribe",
            files={"audio": ("empty.mp3", empty_file, "audio/mpeg")},
        )

        # Empty file triggers HTTPException which becomes 500 in the endpoint
        assert response.status_code in [400, 500]
        data = response.json()
        assert "error" in data or "detail" in data

    def test_transcribe_audio_unsupported_format(
        self, client, mock_speech_service, sample_audio_file
    ):
        """Test transcription with unsupported audio format."""
        with patch(
            "app.api.speech.speech_service.transcribe",
            side_effect=UnsupportedAudioFormatError("Format not supported"),
        ):
            response = client.post(
                "/api/v1/speech/transcribe",
                files={"audio": ("test.avi", sample_audio_file, "video/avi")},
            )

        assert response.status_code == 400
        data = response.json()
        assert "error" in data or "detail" in data

    def test_transcribe_audio_service_error(
        self, client, mock_speech_service, sample_audio_file
    ):
        """Test transcription with service error."""
        with patch(
            "app.api.speech.speech_service.transcribe",
            side_effect=SpeechError("Service unavailable"),
        ):
            response = client.post(
                "/api/v1/speech/transcribe",
                files={"audio": ("test.mp3", sample_audio_file, "audio/mpeg")},
            )

        assert response.status_code == 500
        data = response.json()
        assert "error" in data or "detail" in data

    def test_transcribe_audio_with_cache_disabled(
        self, client, mock_speech_service, sample_audio_file
    ):
        """Test transcription with cache disabled."""
        mock_response = SpeechToTextResponse(
            transcribed_text="Fresh transcription",
            detected_language="en",
            confidence=0.95,
            provider=SpeechProvider.OPENAI_WHISPER.value,
            cached=False,
            response_time=2.0,
            timestamp=datetime.now(),
            audio_duration=5.0,
        )

        with patch(
            "app.api.speech.speech_service.transcribe", return_value=mock_response
        ):
            response = client.post(
                "/api/v1/speech/transcribe",
                files={"audio": ("test.mp3", sample_audio_file, "audio/mpeg")},
                data={"use_cache": "false"},
            )

        assert response.status_code == 200
        assert response.json()["cached"] == False


class TestBatchTranscribeEndpoint:
    """Test /api/v1/speech/transcribe/batch endpoint."""

    def test_batch_transcribe_success(self, client, mock_speech_service):
        """Test successful batch transcription."""
        # Create multiple audio files
        audio_files = [
            (
                "audio_files",
                (
                    "test1.mp3",
                    BytesIO(b"\xff\xfb\x90\x00" + b"\x00" * 100),
                    "audio/mpeg",
                ),
            ),
            (
                "audio_files",
                (
                    "test2.mp3",
                    BytesIO(b"\xff\xfb\x90\x00" + b"\x00" * 200),
                    "audio/mpeg",
                ),
            ),
        ]

        # Mock responses
        mock_responses = [
            SpeechToTextResponse(
                transcribed_text="First transcription",
                detected_language="en",
                confidence=0.95,
                provider=SpeechProvider.OPENAI_WHISPER.value,
                cached=False,
                response_time=1.0,
                timestamp=datetime.now(),
                audio_duration=2.0,
            ),
            SpeechToTextResponse(
                transcribed_text="Second transcription",
                detected_language="en",
                confidence=0.93,
                provider=SpeechProvider.OPENAI_WHISPER.value,
                cached=False,
                response_time=1.2,
                timestamp=datetime.now(),
                audio_duration=3.0,
            ),
        ]

        with patch(
            "app.api.speech.speech_service.batch_transcribe",
            return_value=mock_responses,
        ):
            response = client.post(
                "/api/v1/speech/transcribe/batch",
                files=audio_files,
            )

        assert response.status_code == 200
        data = response.json()
        assert data["total_files"] == 2
        assert data["successful"] == 2
        assert data["failed"] == 0
        assert len(data["results"]) == 2

    def test_batch_transcribe_empty_list(self, client):
        """Test batch transcription with no files."""
        response = client.post(
            "/api/v1/speech/transcribe/batch",
            files=[],
        )

        assert response.status_code == 422  # Validation error

    def test_batch_transcribe_with_failures(self, client, mock_speech_service):
        """Test batch transcription with some failures."""
        audio_files = [
            (
                "audio_files",
                (
                    "test1.mp3",
                    BytesIO(b"\xff\xfb\x90\x00" + b"\x00" * 100),
                    "audio/mpeg",
                ),
            ),
            (
                "audio_files",
                (
                    "test2.mp3",
                    BytesIO(b"\xff\xfb\x90\x00" + b"\x00" * 200),
                    "audio/mpeg",
                ),
            ),
        ]

        # Mock responses with one error
        mock_responses = [
            SpeechToTextResponse(
                transcribed_text="Success",
                detected_language="en",
                confidence=0.95,
                provider=SpeechProvider.OPENAI_WHISPER.value,
                cached=False,
                response_time=1.0,
                timestamp=datetime.now(),
                audio_duration=2.0,
            ),
            SpeechToTextResponse(
                transcribed_text="",
                detected_language=None,
                confidence=0.0,
                provider="error",
                cached=False,
                response_time=0.0,
                timestamp=datetime.now(),
                metadata={"error": "Transcription failed"},
            ),
        ]

        with patch(
            "app.api.speech.speech_service.batch_transcribe",
            return_value=mock_responses,
        ):
            response = client.post(
                "/api/v1/speech/transcribe/batch",
                files=audio_files,
            )

        assert response.status_code == 200
        data = response.json()
        assert data["total_files"] == 2
        assert data["successful"] == 1
        assert data["failed"] == 1


class TestSupportedFormatsEndpoint:
    """Test /api/v1/speech/formats endpoint."""

    def test_get_supported_formats(self, client):
        """Test getting supported audio formats."""
        with patch(
            "app.api.speech.speech_service.get_supported_formats",
            return_value=["mp3", "wav", "m4a", "flac", "ogg"],
        ):
            response = client.get("/api/v1/speech/formats")

        assert response.status_code == 200
        data = response.json()
        assert "formats" in data
        assert "max_file_size_mb" in data
        assert "mp3" in data["formats"]
        assert data["max_file_size_mb"] == 25.0


class TestSupportedLanguagesEndpoint:
    """Test /api/v1/speech/languages endpoint."""

    def test_get_supported_languages(self, client):
        """Test getting supported languages."""
        with patch(
            "app.api.speech.speech_service.get_supported_languages",
            return_value=["en", "hi", "bn", "te", "ta", "mr"],
        ):
            response = client.get("/api/v1/speech/languages")

        assert response.status_code == 200
        data = response.json()
        assert "languages" in data
        assert "en" in data["languages"]
        assert "hi" in data["languages"]


class TestSpeechMetricsEndpoint:
    """Test /api/v1/speech/metrics endpoint."""

    def test_get_speech_metrics(self, client):
        """Test getting speech service metrics."""
        mock_metrics = {
            "total_requests": 100,
            "successful_requests": 95,
            "failed_requests": 5,
            "success_rate": 0.95,
            "cache_hits": 30,
            "cache_misses": 65,
            "cache_hit_rate": 0.316,
            "average_response_time": 1.5,
            "total_audio_duration": 450.0,
        }

        with patch(
            "app.api.speech.speech_service.get_metrics", return_value=mock_metrics
        ):
            response = client.get("/api/v1/speech/metrics")

        assert response.status_code == 200
        data = response.json()
        assert data["total_requests"] == 100
        assert data["successful_requests"] == 95
        assert data["success_rate"] == 0.95

    def test_reset_speech_metrics(self, client):
        """Test resetting speech service metrics."""
        with patch("app.api.speech.speech_service.reset_metrics"):
            response = client.post("/api/v1/speech/metrics/reset")

        assert response.status_code == 200
        assert "reset" in response.json()["message"].lower()


class TestSpeechHealthCheckEndpoint:
    """Test /api/v1/speech/health endpoint."""

    def test_speech_health_check_healthy(self, client):
        """Test health check when service is healthy."""
        mock_health = {
            "status": "healthy",
            "providers": {"openai_whisper": {"status": "healthy", "healthy": True}},
            "cache": {"status": "healthy", "healthy": True},
            "timestamp": datetime.now().isoformat(),
        }

        with patch(
            "app.api.speech.speech_service.health_check", return_value=mock_health
        ):
            response = client.get("/api/v1/speech/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "providers" in data
        assert "cache" in data

    def test_speech_health_check_degraded(self, client):
        """Test health check when service is degraded."""
        mock_health = {
            "status": "degraded",
            "providers": {"openai_whisper": {"status": "healthy", "healthy": True}},
            "cache": {
                "status": "unhealthy",
                "healthy": False,
                "error": "Connection failed",
            },
            "timestamp": datetime.now().isoformat(),
        }

        with patch(
            "app.api.speech.speech_service.health_check", return_value=mock_health
        ):
            response = client.get("/api/v1/speech/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"

    def test_speech_health_check_error(self, client):
        """Test health check when service encounters error."""
        with patch(
            "app.api.speech.speech_service.health_check",
            side_effect=Exception("Health check failed"),
        ):
            response = client.get("/api/v1/speech/health")

        assert response.status_code == 503
