"""
Speech-to-Text API endpoints for the AI-Driven Agri-Civic Intelligence Platform.

This module provides FastAPI endpoints for speech recognition services including
audio file upload, transcription, batch processing, and service health checks.
"""

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

from app.services.speech_service import (
    speech_service,
    tts_service,
    SpeechError,
    AudioValidationError,
    UnsupportedAudioFormatError,
)
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()


# Response models
class TranscriptionResponse(BaseModel):
    """Response model for transcription."""

    transcribed_text: str = Field(..., description="Transcribed text from audio")
    detected_language: Optional[str] = Field(None, description="Detected language code")
    confidence: float = Field(..., description="Confidence score (0-1)")
    provider: str = Field(..., description="Speech recognition provider used")
    cached: bool = Field(..., description="Whether result was from cache")
    response_time: float = Field(..., description="Response time in seconds")
    audio_duration: Optional[float] = Field(
        None, description="Audio duration in seconds"
    )
    timestamp: datetime = Field(..., description="Timestamp of transcription")


class BatchTranscriptionResponse(BaseModel):
    """Response model for batch transcription."""

    results: List[TranscriptionResponse] = Field(
        ..., description="List of transcription results"
    )
    total_files: int = Field(..., description="Total number of files processed")
    successful: int = Field(..., description="Number of successful transcriptions")
    failed: int = Field(..., description="Number of failed transcriptions")


class SupportedFormatsResponse(BaseModel):
    """Response model for supported formats."""

    formats: List[str] = Field(..., description="List of supported audio formats")
    max_file_size_mb: float = Field(..., description="Maximum file size in MB")


class SupportedLanguagesResponse(BaseModel):
    """Response model for supported languages."""

    languages: List[str] = Field(..., description="List of supported language codes")


class SpeechMetricsResponse(BaseModel):
    """Response model for speech service metrics."""

    total_requests: int
    successful_requests: int
    failed_requests: int
    success_rate: float
    cache_hits: int
    cache_misses: int
    cache_hit_rate: float
    average_response_time: float
    total_audio_duration: float


@router.post(
    "/speech/transcribe",
    response_model=TranscriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="Transcribe audio to text",
    description="Upload an audio file and get the transcribed text with language detection",
)
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file to transcribe"),
    language: Optional[str] = Form(
        None,
        description="Language code hint (e.g., 'hi' for Hindi, 'en' for English). Auto-detected if not provided",
    ),
    use_cache: bool = Form(
        True, description="Whether to use cached transcriptions if available"
    ),
) -> TranscriptionResponse:
    """
    Transcribe audio file to text.

    Supports multiple audio formats including mp3, wav, m4a, flac, ogg, and webm.
    Automatically detects language if not specified.

    Args:
        audio: Audio file to transcribe
        language: Optional language code hint
        use_cache: Whether to use cached results

    Returns:
        TranscriptionResponse with transcribed text and metadata

    Raises:
        HTTPException: If transcription fails or audio is invalid
    """
    try:
        # Read audio file
        audio_data = await audio.read()

        if not audio_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empty audio file provided",
            )

        # Extract audio format from filename
        audio_format = None
        if audio.filename:
            audio_format = audio.filename.split(".")[-1].lower()

        # Transcribe audio
        result = await speech_service.transcribe(
            audio_data=audio_data,
            language=language,
            audio_format=audio_format,
            use_cache=use_cache,
            metadata={"filename": audio.filename, "content_type": audio.content_type},
        )

        return TranscriptionResponse(
            transcribed_text=result.transcribed_text,
            detected_language=result.detected_language,
            confidence=result.confidence,
            provider=result.provider,
            cached=result.cached,
            response_time=result.response_time,
            audio_duration=result.audio_duration,
            timestamp=result.timestamp,
        )

    except AudioValidationError as e:
        logger.warning(f"Audio validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Audio validation failed: {str(e)}",
        )

    except UnsupportedAudioFormatError as e:
        logger.warning(f"Unsupported audio format: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format: {str(e)}",
        )

    except SpeechError as e:
        logger.error(f"Speech recognition failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Speech recognition failed: {str(e)}",
        )

    except Exception as e:
        logger.error(f"Unexpected error during transcription: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during transcription",
        )


@router.post(
    "/speech/transcribe/batch",
    response_model=BatchTranscriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch transcribe multiple audio files",
    description="Upload multiple audio files and get transcriptions for all of them",
)
async def batch_transcribe_audio(
    audio_files: List[UploadFile] = File(
        ..., description="List of audio files to transcribe"
    ),
    language: Optional[str] = Form(
        None, description="Language code hint for all files"
    ),
    use_cache: bool = Form(True, description="Whether to use cached transcriptions"),
) -> BatchTranscriptionResponse:
    """
    Transcribe multiple audio files in batch.

    Processes multiple audio files concurrently for improved performance.

    Args:
        audio_files: List of audio files to transcribe
        language: Optional language code hint for all files
        use_cache: Whether to use cached results

    Returns:
        BatchTranscriptionResponse with results for all files

    Raises:
        HTTPException: If batch processing fails
    """
    try:
        if not audio_files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No audio files provided",
            )

        # Read all audio files
        audio_data_list = []
        for audio_file in audio_files:
            audio_data = await audio_file.read()
            audio_data_list.append(audio_data)

        # Batch transcribe
        results = await speech_service.batch_transcribe(
            audio_files=audio_data_list,
            language=language,
            use_cache=use_cache,
        )

        # Convert to response models
        transcription_responses = []
        successful = 0
        failed = 0

        for result in results:
            if result.transcribed_text or result.provider != "error":
                successful += 1
            else:
                failed += 1

            transcription_responses.append(
                TranscriptionResponse(
                    transcribed_text=result.transcribed_text,
                    detected_language=result.detected_language,
                    confidence=result.confidence,
                    provider=result.provider,
                    cached=result.cached,
                    response_time=result.response_time,
                    audio_duration=result.audio_duration,
                    timestamp=result.timestamp,
                )
            )

        return BatchTranscriptionResponse(
            results=transcription_responses,
            total_files=len(audio_files),
            successful=successful,
            failed=failed,
        )

    except SpeechError as e:
        logger.error(f"Batch transcription failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch transcription failed: {str(e)}",
        )

    except Exception as e:
        logger.error(f"Unexpected error during batch transcription: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during batch transcription",
        )


@router.get(
    "/speech/formats",
    response_model=SupportedFormatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get supported audio formats",
    description="Get list of supported audio formats and file size limits",
)
async def get_supported_formats() -> SupportedFormatsResponse:
    """
    Get supported audio formats.

    Returns:
        SupportedFormatsResponse with list of formats and size limits
    """
    formats = speech_service.get_supported_formats()
    return SupportedFormatsResponse(
        formats=formats,
        max_file_size_mb=25.0,  # Whisper API limit
    )


@router.get(
    "/speech/languages",
    response_model=SupportedLanguagesResponse,
    status_code=status.HTTP_200_OK,
    summary="Get supported languages",
    description="Get list of supported language codes for speech recognition",
)
async def get_supported_languages() -> SupportedLanguagesResponse:
    """
    Get supported languages.

    Returns:
        SupportedLanguagesResponse with list of language codes
    """
    languages = speech_service.get_supported_languages()
    return SupportedLanguagesResponse(languages=languages)


@router.get(
    "/speech/metrics",
    response_model=SpeechMetricsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get speech service metrics",
    description="Get current metrics and statistics for the speech service",
)
async def get_speech_metrics() -> SpeechMetricsResponse:
    """
    Get speech service metrics.

    Returns:
        SpeechMetricsResponse with current service metrics
    """
    metrics = speech_service.get_metrics()
    return SpeechMetricsResponse(
        total_requests=metrics["total_requests"],
        successful_requests=metrics["successful_requests"],
        failed_requests=metrics["failed_requests"],
        success_rate=metrics["success_rate"],
        cache_hits=metrics["cache_hits"],
        cache_misses=metrics["cache_misses"],
        cache_hit_rate=metrics["cache_hit_rate"],
        average_response_time=metrics["average_response_time"],
        total_audio_duration=metrics["total_audio_duration"],
    )


@router.post(
    "/speech/metrics/reset",
    status_code=status.HTTP_200_OK,
    summary="Reset speech service metrics",
    description="Reset all metrics counters to zero",
)
async def reset_speech_metrics():
    """
    Reset speech service metrics.

    Returns:
        Success message
    """
    speech_service.reset_metrics()
    return {"message": "Speech service metrics reset successfully"}


@router.get(
    "/speech/health",
    status_code=status.HTTP_200_OK,
    summary="Speech service health check",
    description="Check health status of speech recognition service and providers",
)
async def speech_health_check():
    """
    Perform health check on speech service.

    Returns:
        Health status of speech service and providers
    """
    try:
        health_status = await speech_service.health_check()
        return health_status

    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Health check failed: {str(e)}",
        )


# Text-to-Speech Response models
class TTSResponse(BaseModel):
    """Response model for text-to-speech synthesis."""

    audio_format: str = Field(..., description="Audio format of the generated speech")
    language: str = Field(..., description="Language code used")
    voice: str = Field(..., description="Voice used for synthesis")
    provider: str = Field(..., description="TTS provider used")
    cached: bool = Field(..., description="Whether result was from cache")
    response_time: float = Field(..., description="Response time in seconds")
    text_length: int = Field(..., description="Length of input text in characters")
    timestamp: datetime = Field(..., description="Timestamp of synthesis")


class BatchTTSResponse(BaseModel):
    """Response model for batch text-to-speech synthesis."""

    results: List[TTSResponse] = Field(..., description="List of TTS results")
    total_texts: int = Field(..., description="Total number of texts processed")
    successful: int = Field(..., description="Number of successful syntheses")
    failed: int = Field(..., description="Number of failed syntheses")


class SupportedVoicesResponse(BaseModel):
    """Response model for supported voices."""

    voices: List[str] = Field(..., description="List of supported voice names")


class TTSMetricsResponse(BaseModel):
    """Response model for TTS service metrics."""

    total_requests: int
    successful_requests: int
    failed_requests: int
    success_rate: float
    cache_hits: int
    cache_misses: int
    cache_hit_rate: float
    average_response_time: float
    total_characters_processed: int


@router.post(
    "/speech/synthesize",
    status_code=status.HTTP_200_OK,
    summary="Synthesize speech from text",
    description="Convert text to speech audio in regional languages",
    response_class=Response,
)
async def synthesize_speech(
    text: str = Form(..., description="Text to convert to speech"),
    language: Optional[str] = Form(
        "en",
        description="Language code (e.g., 'hi' for Hindi, 'en' for English)",
    ),
    voice: Optional[str] = Form(
        None,
        description="Voice name (e.g., 'alloy', 'nova'). Auto-selected if not provided",
    ),
    speed: float = Form(
        1.0, description="Speech speed (0.25 to 4.0). Default is 1.0", ge=0.25, le=4.0
    ),
    audio_format: str = Form(
        "mp3",
        description="Audio format (mp3, opus, aac, flac). Default is mp3",
    ),
    use_cache: bool = Form(
        True, description="Whether to use cached audio if available"
    ),
) -> Response:
    """
    Synthesize speech from text.

    Supports multiple languages and voices with quality optimization.
    Returns audio file directly for playback or download.

    Args:
        text: Text to convert to speech
        language: Language code
        voice: Voice name (auto-selected if not provided)
        speed: Speech speed
        audio_format: Output audio format
        use_cache: Whether to use cached results

    Returns:
        Audio file in the specified format

    Raises:
        HTTPException: If synthesis fails or parameters are invalid
    """
    try:
        # Synthesize speech
        result = await tts_service.synthesize(
            text=text,
            language=language,
            voice=voice,
            speed=speed,
            audio_format=audio_format,
            use_cache=use_cache,
            metadata={"endpoint": "synthesize"},
        )

        # Return audio data with appropriate content type
        content_type_map = {
            "mp3": "audio/mpeg",
            "opus": "audio/opus",
            "aac": "audio/aac",
            "flac": "audio/flac",
        }

        return Response(
            content=result.audio_data,
            media_type=content_type_map.get(audio_format, "audio/mpeg"),
            headers={
                "Content-Disposition": f'attachment; filename="speech.{audio_format}"',
                "X-Language": result.language,
                "X-Voice": result.voice,
                "X-Provider": result.provider,
                "X-Cached": str(result.cached),
                "X-Response-Time": str(result.response_time),
            },
        )

    except AudioValidationError as e:
        logger.warning(f"Audio validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Audio validation failed: {str(e)}",
        )

    except UnsupportedAudioFormatError as e:
        logger.warning(f"Unsupported audio format: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format: {str(e)}",
        )

    except SpeechError as e:
        logger.error(f"Text-to-speech synthesis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Text-to-speech synthesis failed: {str(e)}",
        )

    except Exception as e:
        logger.error(f"Unexpected error during synthesis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during synthesis",
        )


@router.post(
    "/speech/synthesize/metadata",
    response_model=TTSResponse,
    status_code=status.HTTP_200_OK,
    summary="Synthesize speech and get metadata",
    description="Convert text to speech and return metadata without audio data",
)
async def synthesize_speech_metadata(
    text: str = Form(..., description="Text to convert to speech"),
    language: Optional[str] = Form("en", description="Language code"),
    voice: Optional[str] = Form(None, description="Voice name"),
    speed: float = Form(1.0, description="Speech speed", ge=0.25, le=4.0),
    audio_format: str = Form("mp3", description="Audio format"),
    use_cache: bool = Form(True, description="Whether to use cached audio"),
) -> TTSResponse:
    """
    Synthesize speech and return metadata only.

    Useful for getting synthesis information without downloading audio.

    Args:
        text: Text to convert to speech
        language: Language code
        voice: Voice name
        speed: Speech speed
        audio_format: Output audio format
        use_cache: Whether to use cached results

    Returns:
        TTSResponse with metadata (no audio data)

    Raises:
        HTTPException: If synthesis fails
    """
    try:
        result = await tts_service.synthesize(
            text=text,
            language=language,
            voice=voice,
            speed=speed,
            audio_format=audio_format,
            use_cache=use_cache,
            metadata={"endpoint": "synthesize_metadata"},
        )

        return TTSResponse(
            audio_format=result.audio_format,
            language=result.language,
            voice=result.voice,
            provider=result.provider,
            cached=result.cached,
            response_time=result.response_time,
            text_length=result.text_length,
            timestamp=result.timestamp,
        )

    except (AudioValidationError, UnsupportedAudioFormatError) as e:
        logger.warning(f"Validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except SpeechError as e:
        logger.error(f"TTS synthesis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"TTS synthesis failed: {str(e)}",
        )

    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred",
        )


@router.post(
    "/speech/synthesize/batch",
    response_model=BatchTTSResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch synthesize speech from multiple texts",
    description="Convert multiple texts to speech in batch",
)
async def batch_synthesize_speech(
    texts: List[str] = Form(..., description="List of texts to convert to speech"),
    language: Optional[str] = Form("en", description="Language code for all texts"),
    voice: Optional[str] = Form(None, description="Voice name for all texts"),
    speed: float = Form(1.0, description="Speech speed for all", ge=0.25, le=4.0),
    audio_format: str = Form("mp3", description="Audio format for all"),
    use_cache: bool = Form(True, description="Whether to use cached audio"),
) -> BatchTTSResponse:
    """
    Synthesize speech for multiple texts in batch.

    Processes multiple texts concurrently for improved performance.

    Args:
        texts: List of texts to convert to speech
        language: Language code for all texts
        voice: Voice name for all texts
        speed: Speech speed for all texts
        audio_format: Output audio format for all
        use_cache: Whether to use cached results

    Returns:
        BatchTTSResponse with results for all texts

    Raises:
        HTTPException: If batch processing fails
    """
    try:
        if not texts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No texts provided",
            )

        # Batch synthesize
        results = await tts_service.batch_synthesize(
            texts=texts,
            language=language,
            voice=voice,
            speed=speed,
            audio_format=audio_format,
            use_cache=use_cache,
        )

        # Convert to response models
        tts_responses = []
        successful = 0
        failed = 0

        for result in results:
            if result.audio_data and result.provider != "error":
                successful += 1
            else:
                failed += 1

            tts_responses.append(
                TTSResponse(
                    audio_format=result.audio_format,
                    language=result.language,
                    voice=result.voice,
                    provider=result.provider,
                    cached=result.cached,
                    response_time=result.response_time,
                    text_length=result.text_length,
                    timestamp=result.timestamp,
                )
            )

        return BatchTTSResponse(
            results=tts_responses,
            total_texts=len(texts),
            successful=successful,
            failed=failed,
        )

    except SpeechError as e:
        logger.error(f"Batch synthesis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch synthesis failed: {str(e)}",
        )

    except Exception as e:
        logger.error(f"Unexpected error during batch synthesis: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during batch synthesis",
        )


@router.get(
    "/speech/tts/voices",
    response_model=SupportedVoicesResponse,
    status_code=status.HTTP_200_OK,
    summary="Get supported voices",
    description="Get list of supported voice names for text-to-speech",
)
async def get_supported_voices() -> SupportedVoicesResponse:
    """
    Get supported voices.

    Returns:
        SupportedVoicesResponse with list of voice names
    """
    voices = tts_service.get_supported_voices()
    return SupportedVoicesResponse(voices=voices)


@router.get(
    "/speech/tts/formats",
    response_model=SupportedFormatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get supported TTS audio formats",
    description="Get list of supported audio formats for text-to-speech output",
)
async def get_tts_supported_formats() -> SupportedFormatsResponse:
    """
    Get supported TTS audio formats.

    Returns:
        SupportedFormatsResponse with list of formats
    """
    formats = tts_service.get_supported_formats()
    return SupportedFormatsResponse(
        formats=formats,
        max_file_size_mb=0.0,  # Not applicable for TTS output
    )


@router.get(
    "/speech/tts/metrics",
    response_model=TTSMetricsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get TTS service metrics",
    description="Get current metrics and statistics for the TTS service",
)
async def get_tts_metrics() -> TTSMetricsResponse:
    """
    Get TTS service metrics.

    Returns:
        TTSMetricsResponse with current service metrics
    """
    metrics = tts_service.get_metrics()
    return TTSMetricsResponse(
        total_requests=metrics["total_requests"],
        successful_requests=metrics["successful_requests"],
        failed_requests=metrics["failed_requests"],
        success_rate=metrics["success_rate"],
        cache_hits=metrics["cache_hits"],
        cache_misses=metrics["cache_misses"],
        cache_hit_rate=metrics["cache_hit_rate"],
        average_response_time=metrics["average_response_time"],
        total_characters_processed=metrics["total_characters_processed"],
    )


@router.post(
    "/speech/tts/metrics/reset",
    status_code=status.HTTP_200_OK,
    summary="Reset TTS service metrics",
    description="Reset all TTS metrics counters to zero",
)
async def reset_tts_metrics():
    """
    Reset TTS service metrics.

    Returns:
        Success message
    """
    tts_service.reset_metrics()
    return {"message": "TTS service metrics reset successfully"}


@router.get(
    "/speech/tts/health",
    status_code=status.HTTP_200_OK,
    summary="TTS service health check",
    description="Check health status of text-to-speech service and providers",
)
async def tts_health_check():
    """
    Perform health check on TTS service.

    Returns:
        Health status of TTS service and providers
    """
    try:
        health_status = await tts_service.health_check()
        return health_status

    except Exception as e:
        logger.error(f"TTS health check failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"TTS health check failed: {str(e)}",
        )
