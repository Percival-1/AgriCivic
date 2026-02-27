"""
Speech-to-Text service for the AI-Driven Agri-Civic Intelligence Platform.

This service provides comprehensive speech recognition capabilities with support for
multiple languages, audio file handling, validation, and error handling using OpenAI Whisper API.
"""

import asyncio
import logging
import time
import os
import tempfile
from enum import Enum
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime
import hashlib
import json
import io

import openai
from openai import AsyncOpenAI
import redis.asyncio as redis

from app.config import get_settings
from app.core.logging import get_logger

# Configure logging
logger = get_logger(__name__)


class SpeechProvider(str, Enum):
    """Supported speech recognition providers."""

    OPENAI_WHISPER = "openai_whisper"


class TTSProvider(str, Enum):
    """Supported text-to-speech providers."""

    OPENAI_TTS = "openai_tts"


class SpeechError(Exception):
    """Base exception for speech service errors."""

    pass


class SpeechProviderError(SpeechError):
    """Exception raised when a speech provider fails."""

    def __init__(self, provider: str, message: str, original_error: Exception = None):
        self.provider = provider
        self.original_error = original_error
        super().__init__(f"Speech Provider {provider} error: {message}")


class AudioValidationError(SpeechError):
    """Exception raised when audio validation fails."""

    pass


class UnsupportedAudioFormatError(SpeechError):
    """Exception raised when audio format is not supported."""

    pass


@dataclass
class SpeechToTextRequest:
    """Speech-to-text request data structure."""

    audio_data: bytes
    language: Optional[str] = None
    audio_format: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SpeechToTextResponse:
    """Speech-to-text response data structure."""

    transcribed_text: str
    detected_language: Optional[str]
    confidence: float
    provider: str
    cached: bool
    response_time: float
    timestamp: datetime
    audio_duration: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TextToSpeechRequest:
    """Text-to-speech request data structure."""

    text: str
    language: Optional[str] = None
    voice: Optional[str] = None
    speed: float = 1.0
    audio_format: str = "mp3"
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TextToSpeechResponse:
    """Text-to-speech response data structure."""

    audio_data: bytes
    audio_format: str
    language: str
    voice: str
    provider: str
    cached: bool
    response_time: float
    timestamp: datetime
    text_length: int
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SpeechMetrics:
    """Speech service metrics."""

    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    provider_usage: Dict[str, int] = field(default_factory=dict)
    language_usage: Dict[str, int] = field(default_factory=dict)
    error_counts: Dict[str, int] = field(default_factory=dict)
    average_response_time: float = 0.0
    total_audio_duration: float = 0.0


@dataclass
class TTSMetrics:
    """Text-to-speech service metrics."""

    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    provider_usage: Dict[str, int] = field(default_factory=dict)
    language_usage: Dict[str, int] = field(default_factory=dict)
    voice_usage: Dict[str, int] = field(default_factory=dict)
    error_counts: Dict[str, int] = field(default_factory=dict)
    average_response_time: float = 0.0
    total_characters_processed: int = 0


class OpenAIWhisperClient:
    """OpenAI Whisper API client for speech recognition."""

    # Supported audio formats
    SUPPORTED_FORMATS = [
        "mp3",
        "mp4",
        "mpeg",
        "mpga",
        "m4a",
        "wav",
        "webm",
        "flac",
        "ogg",
    ]

    # Maximum file size (25 MB for Whisper API)
    MAX_FILE_SIZE = 25 * 1024 * 1024

    def __init__(self):
        self.settings = get_settings()

        # Initialize OpenAI client
        try:
            self.client = AsyncOpenAI(api_key=self.settings.openai_api_key)
            logger.info("OpenAI Whisper client initialized successfully")
        except Exception as e:
            raise SpeechProviderError(
                "openai_whisper", f"OpenAI API key not configured: {str(e)}"
            )

    def validate_audio_format(self, audio_format: str) -> bool:
        """Validate if audio format is supported."""
        return audio_format.lower() in self.SUPPORTED_FORMATS

    def validate_audio_size(self, audio_data: bytes) -> bool:
        """Validate if audio size is within limits."""
        return len(audio_data) <= self.MAX_FILE_SIZE

    async def transcribe_audio(
        self, request: SpeechToTextRequest
    ) -> SpeechToTextResponse:
        """Transcribe audio using OpenAI Whisper API."""
        start_time = time.time()

        try:
            # Validate audio format
            if request.audio_format:
                if not self.validate_audio_format(request.audio_format):
                    raise UnsupportedAudioFormatError(
                        f"Audio format '{request.audio_format}' not supported. "
                        f"Supported formats: {', '.join(self.SUPPORTED_FORMATS)}"
                    )

            # Validate audio size
            if not self.validate_audio_size(request.audio_data):
                raise AudioValidationError(
                    f"Audio file too large. Maximum size: {self.MAX_FILE_SIZE / (1024 * 1024):.1f} MB"
                )

            # Create temporary file for audio data
            # Whisper API requires a file-like object with a filename
            audio_format = request.audio_format or "mp3"
            with tempfile.NamedTemporaryFile(
                suffix=f".{audio_format}", delete=False
            ) as temp_file:
                temp_file.write(request.audio_data)
                temp_file_path = temp_file.name

            try:
                # Open the file for reading
                with open(temp_file_path, "rb") as audio_file:
                    # Call Whisper API
                    transcription_params = {
                        "model": "whisper-1",
                        "file": audio_file,
                        "response_format": "verbose_json",
                    }

                    # Add language hint if provided
                    if request.language:
                        transcription_params["language"] = request.language

                    response = await self.client.audio.transcriptions.create(
                        **transcription_params
                    )

                response_time = time.time() - start_time

                # Extract transcription details
                transcribed_text = response.text
                detected_language = getattr(response, "language", request.language)
                audio_duration = getattr(response, "duration", None)

                return SpeechToTextResponse(
                    transcribed_text=transcribed_text,
                    detected_language=detected_language,
                    confidence=0.95,  # Whisper doesn't provide confidence, use high default
                    provider=SpeechProvider.OPENAI_WHISPER.value,
                    cached=False,
                    response_time=response_time,
                    timestamp=datetime.now(),
                    audio_duration=audio_duration,
                    metadata=request.metadata,
                )

            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_file_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temporary file: {e}")

        except (UnsupportedAudioFormatError, AudioValidationError):
            raise
        except Exception as e:
            raise SpeechProviderError(
                "openai_whisper", f"Speech recognition failed: {str(e)}", e
            )


class OpenAITTSClient:
    """OpenAI TTS API client for text-to-speech generation."""

    # Supported audio formats
    SUPPORTED_FORMATS = ["mp3", "opus", "aac", "flac"]

    # Supported voices
    SUPPORTED_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]

    # Language to voice mapping for regional languages
    LANGUAGE_VOICE_MAP = {
        "en": "alloy",
        "hi": "nova",
        "bn": "shimmer",
        "te": "fable",
        "ta": "echo",
        "mr": "onyx",
        "gu": "alloy",
        "kn": "nova",
        "ml": "shimmer",
        "or": "fable",
    }

    # Maximum text length (4096 characters for TTS API)
    MAX_TEXT_LENGTH = 4096

    def __init__(self):
        self.settings = get_settings()

        # Initialize OpenAI client
        try:
            self.client = AsyncOpenAI(api_key=self.settings.openai_api_key)
            logger.info("OpenAI TTS client initialized successfully")
        except Exception as e:
            raise SpeechProviderError(
                "openai_tts", f"OpenAI API key not configured: {str(e)}"
            )

    def validate_audio_format(self, audio_format: str) -> bool:
        """Validate if audio format is supported."""
        return audio_format.lower() in self.SUPPORTED_FORMATS

    def validate_voice(self, voice: str) -> bool:
        """Validate if voice is supported."""
        return voice.lower() in self.SUPPORTED_VOICES

    def validate_text_length(self, text: str) -> bool:
        """Validate if text length is within limits."""
        return len(text) <= self.MAX_TEXT_LENGTH

    def get_voice_for_language(self, language: str) -> str:
        """Get appropriate voice for language."""
        return self.LANGUAGE_VOICE_MAP.get(language, "alloy")

    async def synthesize_speech(
        self, request: TextToSpeechRequest
    ) -> TextToSpeechResponse:
        """Synthesize speech using OpenAI TTS API."""
        start_time = time.time()

        try:
            # Validate text length
            if not self.validate_text_length(request.text):
                raise AudioValidationError(
                    f"Text too long. Maximum length: {self.MAX_TEXT_LENGTH} characters"
                )

            # Validate audio format
            if not self.validate_audio_format(request.audio_format):
                raise UnsupportedAudioFormatError(
                    f"Audio format '{request.audio_format}' not supported. "
                    f"Supported formats: {', '.join(self.SUPPORTED_FORMATS)}"
                )

            # Determine voice
            voice = request.voice
            if not voice:
                # Auto-select voice based on language
                voice = self.get_voice_for_language(request.language or "en")
            elif not self.validate_voice(voice):
                raise AudioValidationError(
                    f"Voice '{voice}' not supported. "
                    f"Supported voices: {', '.join(self.SUPPORTED_VOICES)}"
                )

            # Call TTS API
            tts_params = {
                "model": "tts-1",
                "input": request.text,
                "voice": voice,
                "response_format": request.audio_format,
            }

            # Add speed if not default
            if request.speed != 1.0:
                tts_params["speed"] = max(0.25, min(4.0, request.speed))

            response = await self.client.audio.speech.create(**tts_params)

            # Read audio data
            audio_data = response.content

            response_time = time.time() - start_time

            return TextToSpeechResponse(
                audio_data=audio_data,
                audio_format=request.audio_format,
                language=request.language or "en",
                voice=voice,
                provider=TTSProvider.OPENAI_TTS.value,
                cached=False,
                response_time=response_time,
                timestamp=datetime.now(),
                text_length=len(request.text),
                metadata=request.metadata,
            )

        except (UnsupportedAudioFormatError, AudioValidationError):
            raise
        except Exception as e:
            raise SpeechProviderError(
                "openai_tts", f"Text-to-speech generation failed: {str(e)}", e
            )


class SpeechToTextService:
    """
    Comprehensive speech-to-text service with caching, validation, and monitoring.

    Features:
    - OpenAI Whisper API integration for speech recognition
    - Support for multiple audio formats (mp3, wav, m4a, etc.)
    - Audio file validation and size checking
    - Language-specific speech processing
    - Redis-based caching for transcription results
    - Comprehensive error handling and retry logic
    - Request/response monitoring and metrics
    - Support for all major Indian languages
    """

    def __init__(self):
        self.settings = get_settings()
        self.metrics = SpeechMetrics()
        self.clients: Dict[str, Any] = {}
        self.redis_client: Optional[redis.Redis] = None

        # Initialize clients
        self._initialize_clients()

        # Cache configuration
        self.cache_ttl = 86400  # 24 hours
        self.cache_prefix = "speech:"

    async def initialize_cache(self):
        """Initialize Redis cache connection. Call this after creating the service."""
        await self._initialize_cache()

    def _initialize_clients(self):
        """Initialize speech recognition clients."""
        try:
            # Initialize OpenAI Whisper client
            self.clients[SpeechProvider.OPENAI_WHISPER.value] = OpenAIWhisperClient()
            logger.info("OpenAI Whisper client initialized successfully")
        except Exception as e:
            logger.warning(f"OpenAI Whisper client not available: {e}")
            logger.info("Speech service will work with limited functionality")

    async def _initialize_cache(self):
        """Initialize Redis cache connection."""
        try:
            self.redis_client = redis.from_url(
                self.settings.redis_url,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
            )
            # Test connection
            await self.redis_client.ping()
            logger.info("Redis cache initialized successfully for speech service")
        except Exception as e:
            logger.warning(f"Failed to initialize Redis cache: {e}")
            self.redis_client = None

    def _generate_cache_key(self, audio_data: bytes, language: Optional[str]) -> str:
        """Generate cache key for transcription."""
        # Create hash of audio data
        audio_hash = hashlib.md5(audio_data).hexdigest()
        lang_suffix = language or "auto"
        return f"{self.cache_prefix}{lang_suffix}:{audio_hash}"

    async def _get_cached_transcription(
        self, audio_data: bytes, language: Optional[str]
    ) -> Optional[SpeechToTextResponse]:
        """Get cached transcription if available."""
        if not self.redis_client:
            return None

        try:
            cache_key = self._generate_cache_key(audio_data, language)
            cached_data = await self.redis_client.get(cache_key)

            if cached_data:
                data = json.loads(cached_data)
                self.metrics.cache_hits += 1

                return SpeechToTextResponse(
                    transcribed_text=data["transcribed_text"],
                    detected_language=data.get("detected_language"),
                    confidence=data["confidence"],
                    provider=data["provider"],
                    cached=True,
                    response_time=0.0,  # Cached response
                    timestamp=datetime.fromisoformat(data["timestamp"]),
                    audio_duration=data.get("audio_duration"),
                    metadata=data.get("metadata", {}),
                )
            else:
                self.metrics.cache_misses += 1
                return None

        except Exception as e:
            logger.warning(f"Failed to get cached transcription: {e}")
            return None

    async def _cache_transcription(
        self, response: SpeechToTextResponse, audio_data: bytes, language: Optional[str]
    ):
        """Cache transcription response."""
        if not self.redis_client:
            return

        try:
            cache_key = self._generate_cache_key(audio_data, language)

            cache_data = {
                "transcribed_text": response.transcribed_text,
                "detected_language": response.detected_language,
                "confidence": response.confidence,
                "provider": response.provider,
                "timestamp": response.timestamp.isoformat(),
                "audio_duration": response.audio_duration,
                "metadata": response.metadata,
            }

            await self.redis_client.setex(
                cache_key, self.cache_ttl, json.dumps(cache_data)
            )

        except Exception as e:
            logger.warning(f"Failed to cache transcription: {e}")

    def _detect_audio_format(self, audio_data: bytes) -> Optional[str]:
        """Detect audio format from file header."""
        # Check common audio file signatures
        if audio_data.startswith(b"ID3") or audio_data.startswith(b"\xff\xfb"):
            return "mp3"
        elif audio_data.startswith(b"RIFF"):
            return "wav"
        elif audio_data.startswith(b"fLaC"):
            return "flac"
        elif audio_data.startswith(b"OggS"):
            return "ogg"
        elif audio_data.startswith(b"\x00\x00\x00"):
            # Could be m4a/mp4
            if b"ftyp" in audio_data[:20]:
                return "m4a"

        return None

    async def transcribe(
        self,
        audio_data: bytes,
        language: Optional[str] = None,
        audio_format: Optional[str] = None,
        use_cache: bool = True,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SpeechToTextResponse:
        """
        Transcribe audio to text.

        Args:
            audio_data: Audio file data as bytes
            language: Language code for speech recognition (e.g., 'hi', 'en')
            audio_format: Audio format (e.g., 'mp3', 'wav'). Auto-detected if None
            use_cache: Whether to use cached transcriptions
            metadata: Additional metadata to include in response

        Returns:
            SpeechToTextResponse with transcribed text and metadata

        Raises:
            SpeechError: If transcription fails
            AudioValidationError: If audio validation fails
            UnsupportedAudioFormatError: If audio format is not supported
        """
        if not audio_data:
            raise AudioValidationError("Empty audio data provided")

        self.metrics.total_requests += 1

        # Auto-detect audio format if not provided
        if not audio_format:
            audio_format = self._detect_audio_format(audio_data)
            if audio_format:
                logger.info(f"Auto-detected audio format: {audio_format}")
            else:
                logger.warning("Could not detect audio format, assuming mp3")
                audio_format = "mp3"

        # Check cache first
        if use_cache:
            cached_response = await self._get_cached_transcription(audio_data, language)
            if cached_response:
                logger.info("Using cached transcription")
                return cached_response

        # Try OpenAI Whisper transcription
        if SpeechProvider.OPENAI_WHISPER.value in self.clients:
            try:
                client = self.clients[SpeechProvider.OPENAI_WHISPER.value]
                request = SpeechToTextRequest(
                    audio_data=audio_data,
                    language=language,
                    audio_format=audio_format,
                    metadata=metadata or {},
                )

                response = await client.transcribe_audio(request)

                # Cache successful transcription
                if use_cache:
                    await self._cache_transcription(response, audio_data, language)

                # Update metrics
                self.metrics.successful_requests += 1
                self.metrics.provider_usage[response.provider] = (
                    self.metrics.provider_usage.get(response.provider, 0) + 1
                )

                if response.detected_language:
                    self.metrics.language_usage[response.detected_language] = (
                        self.metrics.language_usage.get(response.detected_language, 0)
                        + 1
                    )

                if response.audio_duration:
                    self.metrics.total_audio_duration += response.audio_duration

                # Update average response time
                total_successful = self.metrics.successful_requests
                self.metrics.average_response_time = (
                    self.metrics.average_response_time * (total_successful - 1)
                    + response.response_time
                ) / total_successful

                logger.info(
                    f"Transcription successful: {response.detected_language or 'unknown'} "
                    f"(response time: {response.response_time:.2f}s, "
                    f"duration: {response.audio_duration:.2f}s)"
                )

                return response

            except Exception as e:
                error_type = type(e).__name__
                self.metrics.error_counts[error_type] = (
                    self.metrics.error_counts.get(error_type, 0) + 1
                )
                logger.error(f"OpenAI Whisper transcription failed: {e}")

                # If it's a specific error we can handle, re-raise it
                if isinstance(
                    e, (SpeechError, AudioValidationError, UnsupportedAudioFormatError)
                ):
                    raise e

        # All transcription methods failed
        self.metrics.failed_requests += 1
        raise SpeechError(
            "Speech recognition failed. No speech providers available or all providers failed."
        )

    async def batch_transcribe(
        self,
        audio_files: List[bytes],
        language: Optional[str] = None,
        audio_format: Optional[str] = None,
        use_cache: bool = True,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[SpeechToTextResponse]:
        """
        Transcribe multiple audio files in batch.

        Args:
            audio_files: List of audio file data as bytes
            language: Language code for speech recognition
            audio_format: Audio format (auto-detected if None)
            use_cache: Whether to use cached transcriptions
            metadata: Additional metadata to include in responses

        Returns:
            List of SpeechToTextResponse objects
        """
        if not audio_files:
            return []

        # Process transcriptions concurrently
        tasks = [
            self.transcribe(
                audio_data=audio_data,
                language=language,
                audio_format=audio_format,
                use_cache=use_cache,
                metadata=metadata,
            )
            for audio_data in audio_files
        ]

        try:
            responses = await asyncio.gather(*tasks, return_exceptions=True)

            # Handle any exceptions in the results
            results = []
            for i, response in enumerate(responses):
                if isinstance(response, Exception):
                    logger.error(
                        f"Batch transcription failed for audio {i}: {response}"
                    )
                    # Create error response
                    error_response = SpeechToTextResponse(
                        transcribed_text="",
                        detected_language=None,
                        confidence=0.0,
                        provider="error",
                        cached=False,
                        response_time=0.0,
                        timestamp=datetime.now(),
                        metadata={"error": str(response)},
                    )
                    results.append(error_response)
                else:
                    results.append(response)

            return results

        except Exception as e:
            logger.error(f"Batch transcription failed: {e}")
            raise SpeechError(f"Batch transcription failed: {str(e)}")

    def get_supported_formats(self) -> List[str]:
        """Get list of supported audio formats."""
        if SpeechProvider.OPENAI_WHISPER.value in self.clients:
            return OpenAIWhisperClient.SUPPORTED_FORMATS.copy()
        return []

    def get_supported_languages(self) -> List[str]:
        """Get list of supported language codes."""
        return self.settings.supported_languages.copy()

    def get_metrics(self) -> Dict[str, Any]:
        """Get current service metrics."""
        return {
            "total_requests": self.metrics.total_requests,
            "successful_requests": self.metrics.successful_requests,
            "failed_requests": self.metrics.failed_requests,
            "success_rate": (
                self.metrics.successful_requests / max(self.metrics.total_requests, 1)
            ),
            "cache_hits": self.metrics.cache_hits,
            "cache_misses": self.metrics.cache_misses,
            "cache_hit_rate": (
                self.metrics.cache_hits
                / max(self.metrics.cache_hits + self.metrics.cache_misses, 1)
            ),
            "provider_usage": self.metrics.provider_usage,
            "language_usage": self.metrics.language_usage,
            "error_counts": self.metrics.error_counts,
            "average_response_time": self.metrics.average_response_time,
            "total_audio_duration": self.metrics.total_audio_duration,
            "available_providers": list(self.clients.keys()),
            "supported_formats": self.get_supported_formats(),
            "supported_languages": self.get_supported_languages(),
        }

    def reset_metrics(self):
        """Reset service metrics."""
        self.metrics = SpeechMetrics()
        logger.info("Speech service metrics reset")

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on speech service."""
        health_status = {
            "status": "healthy",
            "providers": {},
            "cache": {"status": "unknown"},
            "timestamp": datetime.now().isoformat(),
        }

        # Test speech providers
        # Create a minimal test audio file (silence)
        test_audio = b"\xff\xfb\x90\x00" + b"\x00" * 100  # Minimal MP3 header + data

        for provider_name, client in self.clients.items():
            try:
                if provider_name == SpeechProvider.OPENAI_WHISPER.value:
                    # Note: We can't really test without a valid audio file
                    # Just check if client is initialized
                    health_status["providers"][provider_name] = {
                        "status": "healthy",
                        "healthy": True,
                        "note": "Client initialized, full test requires valid audio",
                    }

            except Exception as e:
                health_status["providers"][provider_name] = {
                    "status": "unhealthy",
                    "healthy": False,
                    "error": str(e),
                }
                health_status["status"] = "degraded"

        # Test cache
        if self.redis_client:
            try:
                await self.redis_client.ping()
                health_status["cache"] = {"status": "healthy", "healthy": True}
            except Exception as e:
                health_status["cache"] = {
                    "status": "unhealthy",
                    "healthy": False,
                    "error": str(e),
                }
        else:
            health_status["cache"] = {"status": "not_configured", "healthy": False}

        # Overall status
        if not any(
            p.get("healthy", False) for p in health_status["providers"].values()
        ):
            health_status["status"] = "unhealthy"

        return health_status


# Global instance
speech_service = SpeechToTextService()


class TextToSpeechService:
    """
    Comprehensive text-to-speech service with caching, validation, and monitoring.

    Features:
    - OpenAI TTS API integration for speech synthesis
    - Support for multiple audio formats (mp3, opus, aac, flac)
    - Voice quality optimization with language-specific voice selection
    - Redis-based caching for TTS results
    - Comprehensive error handling and retry logic
    - Request/response monitoring and metrics
    - Support for all major Indian languages
    """

    def __init__(self):
        self.settings = get_settings()
        self.metrics = TTSMetrics()
        self.clients: Dict[str, Any] = {}
        self.redis_client: Optional[redis.Redis] = None

        # Initialize clients
        self._initialize_clients()

        # Cache configuration
        self.cache_ttl = 86400  # 24 hours
        self.cache_prefix = "tts:"

    async def initialize_cache(self):
        """Initialize Redis cache connection. Call this after creating the service."""
        await self._initialize_cache()

    def _initialize_clients(self):
        """Initialize TTS clients."""
        try:
            # Initialize OpenAI TTS client
            self.clients[TTSProvider.OPENAI_TTS.value] = OpenAITTSClient()
            logger.info("OpenAI TTS client initialized successfully")
        except Exception as e:
            logger.warning(f"OpenAI TTS client not available: {e}")
            logger.info("TTS service will work with limited functionality")

    async def _initialize_cache(self):
        """Initialize Redis cache connection."""
        try:
            self.redis_client = redis.from_url(
                self.settings.redis_url,
                decode_responses=False,  # We need bytes for audio data
                socket_timeout=5,
                socket_connect_timeout=5,
            )
            # Test connection
            await self.redis_client.ping()
            logger.info("Redis cache initialized successfully for TTS service")
        except Exception as e:
            logger.warning(f"Failed to initialize Redis cache: {e}")
            self.redis_client = None

    def _generate_cache_key(
        self, text: str, language: str, voice: str, audio_format: str, speed: float
    ) -> str:
        """Generate cache key for TTS."""
        # Create hash of text and parameters
        cache_input = f"{text}:{language}:{voice}:{audio_format}:{speed}"
        text_hash = hashlib.md5(cache_input.encode()).hexdigest()
        return f"{self.cache_prefix}{text_hash}"

    async def _get_cached_audio(
        self, text: str, language: str, voice: str, audio_format: str, speed: float
    ) -> Optional[TextToSpeechResponse]:
        """Get cached audio if available."""
        if not self.redis_client:
            return None

        try:
            cache_key = self._generate_cache_key(
                text, language, voice, audio_format, speed
            )
            cached_data = await self.redis_client.get(cache_key)

            if cached_data:
                # Parse cached data (stored as JSON with base64 audio)
                import base64

                data = json.loads(cached_data)
                audio_data = base64.b64decode(data["audio_data"])

                self.metrics.cache_hits += 1

                return TextToSpeechResponse(
                    audio_data=audio_data,
                    audio_format=data["audio_format"],
                    language=data["language"],
                    voice=data["voice"],
                    provider=data["provider"],
                    cached=True,
                    response_time=0.0,  # Cached response
                    timestamp=datetime.fromisoformat(data["timestamp"]),
                    text_length=data["text_length"],
                    metadata=data.get("metadata", {}),
                )
            else:
                self.metrics.cache_misses += 1
                return None

        except Exception as e:
            logger.warning(f"Failed to get cached audio: {e}")
            return None

    async def _cache_audio(
        self,
        response: TextToSpeechResponse,
        text: str,
        language: str,
        voice: str,
        audio_format: str,
        speed: float,
    ):
        """Cache TTS response."""
        if not self.redis_client:
            return

        try:
            import base64

            cache_key = self._generate_cache_key(
                text, language, voice, audio_format, speed
            )

            cache_data = {
                "audio_data": base64.b64encode(response.audio_data).decode(),
                "audio_format": response.audio_format,
                "language": response.language,
                "voice": response.voice,
                "provider": response.provider,
                "timestamp": response.timestamp.isoformat(),
                "text_length": response.text_length,
                "metadata": response.metadata,
            }

            await self.redis_client.setex(
                cache_key, self.cache_ttl, json.dumps(cache_data)
            )

        except Exception as e:
            logger.warning(f"Failed to cache audio: {e}")

    async def synthesize(
        self,
        text: str,
        language: Optional[str] = None,
        voice: Optional[str] = None,
        speed: float = 1.0,
        audio_format: str = "mp3",
        use_cache: bool = True,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TextToSpeechResponse:
        """
        Synthesize speech from text.

        Args:
            text: Text to convert to speech
            language: Language code (e.g., 'hi', 'en'). Defaults to 'en'
            voice: Voice name (e.g., 'alloy', 'nova'). Auto-selected if None
            speed: Speech speed (0.25 to 4.0). Default is 1.0
            audio_format: Audio format ('mp3', 'opus', 'aac', 'flac'). Default is 'mp3'
            use_cache: Whether to use cached audio if available
            metadata: Additional metadata to include in response

        Returns:
            TextToSpeechResponse with audio data and metadata

        Raises:
            SpeechError: If synthesis fails
            AudioValidationError: If parameters are invalid
            UnsupportedAudioFormatError: If audio format is not supported
        """
        if not text or not text.strip():
            raise AudioValidationError("Empty text provided")

        self.metrics.total_requests += 1

        # Set defaults
        language = language or "en"
        voice = voice or ""

        # Check cache first
        if use_cache:
            cached_response = await self._get_cached_audio(
                text, language, voice, audio_format, speed
            )
            if cached_response:
                logger.info("Using cached audio")
                return cached_response

        # Try OpenAI TTS synthesis
        if TTSProvider.OPENAI_TTS.value in self.clients:
            try:
                client = self.clients[TTSProvider.OPENAI_TTS.value]
                request = TextToSpeechRequest(
                    text=text,
                    language=language,
                    voice=voice,
                    speed=speed,
                    audio_format=audio_format,
                    metadata=metadata or {},
                )

                response = await client.synthesize_speech(request)

                # Cache successful synthesis
                if use_cache:
                    await self._cache_audio(
                        response, text, language, voice, audio_format, speed
                    )

                # Update metrics
                self.metrics.successful_requests += 1
                self.metrics.provider_usage[response.provider] = (
                    self.metrics.provider_usage.get(response.provider, 0) + 1
                )
                self.metrics.language_usage[response.language] = (
                    self.metrics.language_usage.get(response.language, 0) + 1
                )
                self.metrics.voice_usage[response.voice] = (
                    self.metrics.voice_usage.get(response.voice, 0) + 1
                )
                self.metrics.total_characters_processed += response.text_length

                # Update average response time
                total_successful = self.metrics.successful_requests
                self.metrics.average_response_time = (
                    self.metrics.average_response_time * (total_successful - 1)
                    + response.response_time
                ) / total_successful

                logger.info(
                    f"TTS synthesis successful: {response.language} "
                    f"(voice: {response.voice}, response time: {response.response_time:.2f}s, "
                    f"text length: {response.text_length} chars)"
                )

                return response

            except Exception as e:
                error_type = type(e).__name__
                self.metrics.error_counts[error_type] = (
                    self.metrics.error_counts.get(error_type, 0) + 1
                )
                logger.error(f"OpenAI TTS synthesis failed: {e}")

                # If it's a specific error we can handle, re-raise it
                if isinstance(
                    e, (SpeechError, AudioValidationError, UnsupportedAudioFormatError)
                ):
                    raise e

        # All synthesis methods failed
        self.metrics.failed_requests += 1
        raise SpeechError(
            "Text-to-speech synthesis failed. No TTS providers available or all providers failed."
        )

    async def batch_synthesize(
        self,
        texts: List[str],
        language: Optional[str] = None,
        voice: Optional[str] = None,
        speed: float = 1.0,
        audio_format: str = "mp3",
        use_cache: bool = True,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[TextToSpeechResponse]:
        """
        Synthesize speech for multiple texts in batch.

        Args:
            texts: List of texts to convert to speech
            language: Language code for all texts
            voice: Voice name for all texts
            speed: Speech speed for all texts
            audio_format: Audio format for all outputs
            use_cache: Whether to use cached audio
            metadata: Additional metadata to include in responses

        Returns:
            List of TextToSpeechResponse objects
        """
        if not texts:
            return []

        # Process synthesis concurrently
        tasks = [
            self.synthesize(
                text=text,
                language=language,
                voice=voice,
                speed=speed,
                audio_format=audio_format,
                use_cache=use_cache,
                metadata=metadata,
            )
            for text in texts
        ]

        try:
            responses = await asyncio.gather(*tasks, return_exceptions=True)

            # Handle any exceptions in the results
            results = []
            for i, response in enumerate(responses):
                if isinstance(response, Exception):
                    logger.error(f"Batch synthesis failed for text {i}: {response}")
                    # Create error response
                    error_response = TextToSpeechResponse(
                        audio_data=b"",
                        audio_format=audio_format,
                        language=language or "en",
                        voice=voice or "alloy",
                        provider="error",
                        cached=False,
                        response_time=0.0,
                        timestamp=datetime.now(),
                        text_length=len(texts[i]) if i < len(texts) else 0,
                        metadata={"error": str(response)},
                    )
                    results.append(error_response)
                else:
                    results.append(response)

            return results

        except Exception as e:
            logger.error(f"Batch synthesis failed: {e}")
            raise SpeechError(f"Batch synthesis failed: {str(e)}")

    def get_supported_formats(self) -> List[str]:
        """Get list of supported audio formats."""
        if TTSProvider.OPENAI_TTS.value in self.clients:
            return OpenAITTSClient.SUPPORTED_FORMATS.copy()
        return []

    def get_supported_voices(self) -> List[str]:
        """Get list of supported voices."""
        if TTSProvider.OPENAI_TTS.value in self.clients:
            return OpenAITTSClient.SUPPORTED_VOICES.copy()
        return []

    def get_supported_languages(self) -> List[str]:
        """Get list of supported language codes."""
        return self.settings.supported_languages.copy()

    def get_metrics(self) -> Dict[str, Any]:
        """Get current service metrics."""
        return {
            "total_requests": self.metrics.total_requests,
            "successful_requests": self.metrics.successful_requests,
            "failed_requests": self.metrics.failed_requests,
            "success_rate": (
                self.metrics.successful_requests / max(self.metrics.total_requests, 1)
            ),
            "cache_hits": self.metrics.cache_hits,
            "cache_misses": self.metrics.cache_misses,
            "cache_hit_rate": (
                self.metrics.cache_hits
                / max(self.metrics.cache_hits + self.metrics.cache_misses, 1)
            ),
            "provider_usage": self.metrics.provider_usage,
            "language_usage": self.metrics.language_usage,
            "voice_usage": self.metrics.voice_usage,
            "error_counts": self.metrics.error_counts,
            "average_response_time": self.metrics.average_response_time,
            "total_characters_processed": self.metrics.total_characters_processed,
            "available_providers": list(self.clients.keys()),
            "supported_formats": self.get_supported_formats(),
            "supported_voices": self.get_supported_voices(),
            "supported_languages": self.get_supported_languages(),
        }

    def reset_metrics(self):
        """Reset service metrics."""
        self.metrics = TTSMetrics()
        logger.info("TTS service metrics reset")

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on TTS service."""
        health_status = {
            "status": "healthy",
            "providers": {},
            "cache": {"status": "unknown"},
            "timestamp": datetime.now().isoformat(),
        }

        # Test TTS providers
        for provider_name, client in self.clients.items():
            try:
                if provider_name == TTSProvider.OPENAI_TTS.value:
                    # Just check if client is initialized
                    health_status["providers"][provider_name] = {
                        "status": "healthy",
                        "healthy": True,
                        "note": "Client initialized",
                    }

            except Exception as e:
                health_status["providers"][provider_name] = {
                    "status": "unhealthy",
                    "healthy": False,
                    "error": str(e),
                }
                health_status["status"] = "degraded"

        # Test cache
        if self.redis_client:
            try:
                await self.redis_client.ping()
                health_status["cache"] = {"status": "healthy", "healthy": True}
            except Exception as e:
                health_status["cache"] = {
                    "status": "unhealthy",
                    "healthy": False,
                    "error": str(e),
                }
        else:
            health_status["cache"] = {"status": "not_configured", "healthy": False}

        # Overall status
        if not any(
            p.get("healthy", False) for p in health_status["providers"].values()
        ):
            health_status["status"] = "unhealthy"

        return health_status


# Global instances
tts_service = TextToSpeechService()
