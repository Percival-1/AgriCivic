"""
Vision service for crop disease identification using vision-language models.

This service integrates with GPT-4V and similar vision-language models to analyze
crop images and identify diseases with confidence scoring and treatment recommendations.
"""

import asyncio
import base64
import io
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List, Union, Tuple
from pathlib import Path

import openai
from openai import AsyncOpenAI
from PIL import Image, ImageOps
import numpy as np

from app.config import get_settings
from app.services.llm_service import LLMError, LLMProviderError, LLMTimeoutError


# Configure logging
logger = logging.getLogger(__name__)


class ImageFormat(str, Enum):
    """Supported image formats."""

    JPEG = "jpeg"
    PNG = "png"
    WEBP = "webp"


class DiseaseConfidence(str, Enum):
    """Disease identification confidence levels."""

    HIGH = "high"  # 80-100%
    MEDIUM = "medium"  # 60-79%
    LOW = "low"  # 40-59%
    UNCERTAIN = "uncertain"  # <40%


@dataclass
class ImageValidationResult:
    """Result of image validation."""

    is_valid: bool
    error_message: Optional[str] = None
    format: Optional[str] = None
    size: Optional[Tuple[int, int]] = None
    file_size_mb: Optional[float] = None


@dataclass
class DiseaseIdentification:
    """Disease identification result."""

    disease_name: str
    confidence_score: float
    confidence_level: DiseaseConfidence
    crop_type: Optional[str] = None
    affected_parts: List[str] = field(default_factory=list)
    severity: Optional[str] = None
    description: Optional[str] = None


@dataclass
class TreatmentRecommendation:
    """Treatment recommendation for identified disease."""

    treatment_type: str  # chemical, organic, cultural, biological
    active_ingredients: List[str] = field(default_factory=list)
    dosage: Optional[str] = None
    application_method: Optional[str] = None
    timing: Optional[str] = None
    precautions: List[str] = field(default_factory=list)
    cost_estimate: Optional[str] = None


@dataclass
class CropDiseaseAnalysis:
    """Complete crop disease analysis result."""

    image_id: str
    timestamp: datetime
    crop_type: Optional[str]
    diseases: List[DiseaseIdentification]
    primary_disease: Optional[DiseaseIdentification]
    treatment_recommendations: List[TreatmentRecommendation]
    prevention_strategies: List[str]
    confidence_summary: str
    processing_time: float
    model_used: str
    metadata: Dict[str, Any] = field(default_factory=dict)


class VisionError(Exception):
    """Base exception for vision service errors."""

    pass


class ImageValidationError(VisionError):
    """Exception raised when image validation fails."""

    pass


class DiseaseIdentificationError(VisionError):
    """Exception raised when disease identification fails."""

    pass


class VisionService:
    """
    Vision service for crop disease identification using vision-language models.

    Features:
    - Image validation and preprocessing
    - Disease identification with confidence scoring
    - Treatment recommendations
    - Prevention strategies
    - Integration with RAG engine for detailed information
    """

    def __init__(self):
        self.settings = get_settings()
        self.client = AsyncOpenAI(
            api_key=self.settings.openai_api_key,
            timeout=self.settings.llm_timeout_seconds,
        )

        # Image processing settings
        self.max_image_size = (1024, 1024)  # Max dimensions for processing
        self.max_file_size_mb = 10  # Max file size in MB
        self.supported_formats = {ImageFormat.JPEG, ImageFormat.PNG, ImageFormat.WEBP}

        # Disease identification settings
        self.confidence_thresholds = {
            DiseaseConfidence.HIGH: 0.8,
            DiseaseConfidence.MEDIUM: 0.6,
            DiseaseConfidence.LOW: 0.4,
        }

    def validate_image(self, image_data: bytes) -> ImageValidationResult:
        """
        Validate image data for processing.

        Args:
            image_data: Raw image bytes

        Returns:
            ImageValidationResult with validation status and metadata
        """
        try:
            # Check file size
            file_size_mb = len(image_data) / (1024 * 1024)
            if file_size_mb > self.max_file_size_mb:
                return ImageValidationResult(
                    is_valid=False,
                    error_message=f"Image too large: {file_size_mb:.1f}MB (max: {self.max_file_size_mb}MB)",
                )

            # Try to open and validate image
            try:
                image = Image.open(io.BytesIO(image_data))
                image.verify()  # Verify image integrity

                # Reopen for further processing (verify() closes the image)
                image = Image.open(io.BytesIO(image_data))

                # Check format
                image_format = image.format.lower() if image.format else None
                if image_format not in [fmt.value for fmt in self.supported_formats]:
                    return ImageValidationResult(
                        is_valid=False,
                        error_message=f"Unsupported format: {image_format}. Supported: {[fmt.value for fmt in self.supported_formats]}",
                    )

                # Check if image appears to be a crop/plant image
                if not self._is_likely_crop_image(image):
                    logger.warning("Image may not contain crop/plant content")

                return ImageValidationResult(
                    is_valid=True,
                    format=image_format,
                    size=image.size,
                    file_size_mb=file_size_mb,
                )

            except Exception as e:
                return ImageValidationResult(
                    is_valid=False, error_message=f"Invalid image data: {str(e)}"
                )

        except Exception as e:
            logger.error(f"Image validation error: {e}")
            return ImageValidationResult(
                is_valid=False, error_message=f"Validation failed: {str(e)}"
            )

    def _is_likely_crop_image(self, image: Image.Image) -> bool:
        """
        Basic heuristic to check if image likely contains crop/plant content.
        This is a simple check based on color distribution.
        """
        try:
            # Convert to RGB if necessary
            if image.mode != "RGB":
                image = image.convert("RGB")

            # Resize for faster processing
            image = image.resize((100, 100))

            # Convert to numpy array
            img_array = np.array(image)

            # Calculate green channel dominance (plants are typically green)
            r, g, b = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]

            # Check if green channel is dominant in significant portion of image
            green_dominant = (g > r) & (g > b)
            green_ratio = np.sum(green_dominant) / (
                img_array.shape[0] * img_array.shape[1]
            )

            # If more than 20% of pixels have green dominance, likely a plant image
            return green_ratio > 0.2

        except Exception as e:
            logger.warning(f"Could not analyze image content: {e}")
            return True  # Assume valid if analysis fails

    def preprocess_image(self, image_data: bytes) -> bytes:
        """
        Preprocess image for optimal vision model analysis.

        Args:
            image_data: Raw image bytes

        Returns:
            Preprocessed image bytes
        """
        try:
            image = Image.open(io.BytesIO(image_data))

            # Convert to RGB if necessary
            if image.mode != "RGB":
                image = image.convert("RGB")

            # Resize if too large while maintaining aspect ratio
            if (
                image.size[0] > self.max_image_size[0]
                or image.size[1] > self.max_image_size[1]
            ):
                image.thumbnail(self.max_image_size, Image.Resampling.LANCZOS)

            # Auto-orient based on EXIF data
            image = ImageOps.exif_transpose(image)

            # Enhance contrast slightly for better analysis
            image = ImageOps.autocontrast(image, cutoff=1)

            # Save to bytes
            output = io.BytesIO()
            image.save(output, format="JPEG", quality=85, optimize=True)
            return output.getvalue()

        except Exception as e:
            logger.error(f"Image preprocessing error: {e}")
            # Return original if preprocessing fails
            return image_data

    def _encode_image_base64(self, image_data: bytes) -> str:
        """Encode image data to base64 for API transmission."""
        return base64.b64encode(image_data).decode("utf-8")

    def _determine_confidence_level(self, score: float) -> DiseaseConfidence:
        """Determine confidence level based on score."""
        if score >= self.confidence_thresholds[DiseaseConfidence.HIGH]:
            return DiseaseConfidence.HIGH
        elif score >= self.confidence_thresholds[DiseaseConfidence.MEDIUM]:
            return DiseaseConfidence.MEDIUM
        elif score >= self.confidence_thresholds[DiseaseConfidence.LOW]:
            return DiseaseConfidence.LOW
        else:
            return DiseaseConfidence.UNCERTAIN

    async def identify_disease(
        self,
        image_data: bytes,
        crop_hint: Optional[str] = None,
        location_context: Optional[str] = None,
        additional_context: Optional[str] = None,
    ) -> CropDiseaseAnalysis:
        """
        Identify crop diseases from image using vision-language model.

        Args:
            image_data: Image bytes
            crop_hint: Optional hint about crop type
            location_context: Optional location context for regional diseases
            additional_context: Optional additional context from user

        Returns:
            CropDiseaseAnalysis with complete analysis results
        """
        start_time = time.time()
        image_id = f"img_{int(time.time() * 1000)}"

        try:
            # Validate image
            validation = self.validate_image(image_data)
            if not validation.is_valid:
                raise ImageValidationError(validation.error_message)

            # Preprocess image
            processed_image = self.preprocess_image(image_data)
            base64_image = self._encode_image_base64(processed_image)

            # Construct analysis prompt
            prompt = self._build_disease_analysis_prompt(
                crop_hint, location_context, additional_context
            )

            # Call vision-language model
            response = await self._call_vision_model(base64_image, prompt)

            # Parse response
            analysis = self._parse_disease_analysis(response, image_id, start_time)

            # Add metadata
            analysis.metadata.update(
                {
                    "image_validation": validation.__dict__,
                    "original_size": validation.size,
                    "processed_size": Image.open(io.BytesIO(processed_image)).size,
                    "crop_hint": crop_hint,
                    "location_context": location_context,
                    "additional_context": additional_context,
                }
            )

            logger.info(
                f"Disease identification completed for {image_id}. "
                f"Found {len(analysis.diseases)} potential diseases. "
                f"Processing time: {analysis.processing_time:.2f}s"
            )

            return analysis

        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Disease identification failed for {image_id}: {e}")

            if isinstance(e, (ImageValidationError, DiseaseIdentificationError)):
                raise e
            else:
                raise DiseaseIdentificationError(f"Analysis failed: {str(e)}")

    def _build_disease_analysis_prompt(
        self,
        crop_hint: Optional[str] = None,
        location_context: Optional[str] = None,
        additional_context: Optional[str] = None,
    ) -> str:
        """Build comprehensive prompt for disease analysis."""

        base_prompt = """You are an expert agricultural pathologist analyzing a crop image for disease identification. 

Please analyze this image and provide a detailed assessment in the following JSON format:

{
  "crop_type": "identified crop type or null if uncertain",
  "diseases": [
    {
      "disease_name": "specific disease name",
      "confidence_score": 0.85,
      "affected_parts": ["leaves", "stems", "fruits"],
      "severity": "mild/moderate/severe",
      "description": "detailed description of symptoms observed"
    }
  ],
  "treatment_recommendations": [
    {
      "treatment_type": "chemical/organic/cultural/biological",
      "active_ingredients": ["ingredient1", "ingredient2"],
      "dosage": "specific dosage instructions",
      "application_method": "spray/soil application/etc",
      "timing": "when to apply",
      "precautions": ["safety precaution 1", "precaution 2"],
      "cost_estimate": "approximate cost range"
    }
  ],
  "prevention_strategies": [
    "prevention strategy 1",
    "prevention strategy 2"
  ],
  "confidence_summary": "overall assessment of identification confidence"
}

Analysis Guidelines:
1. Examine the image carefully for disease symptoms like spots, discoloration, wilting, lesions, or abnormal growth
2. Consider common diseases for the identified crop type
3. Provide confidence scores between 0.0 and 1.0 based on symptom clarity
4. Include multiple disease possibilities if symptoms are ambiguous
5. Recommend both immediate treatment and long-term prevention
6. Consider organic and chemical treatment options
7. Be honest about uncertainty - it's better to suggest consulting an expert than to guess"""

        # Add context if provided
        if crop_hint:
            base_prompt += f"\n\nCrop Context: The user indicates this is likely a {crop_hint} plant."

        if location_context:
            base_prompt += f"\n\nLocation Context: {location_context}"

        if additional_context:
            base_prompt += f"\n\nAdditional Context: {additional_context}"

        base_prompt += (
            "\n\nPlease analyze the image and respond with the JSON format above."
        )

        return base_prompt

    async def _call_vision_model(self, base64_image: str, prompt: str) -> str:
        """Call GPT-4V or similar vision model for analysis."""
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",  # Use GPT-4o which supports vision
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "high",  # High detail for better disease identification
                                },
                            },
                        ],
                    }
                ],
                max_tokens=2000,
                temperature=0.1,  # Low temperature for consistent analysis
            )

            return response.choices[0].message.content

        except openai.RateLimitError as e:
            raise LLMProviderError("openai", f"Rate limit exceeded: {str(e)}", e)
        except openai.APITimeoutError as e:
            raise LLMTimeoutError(f"Vision model request timeout: {str(e)}")
        except Exception as e:
            raise LLMProviderError("openai", f"Vision model error: {str(e)}", e)

    def _parse_disease_analysis(
        self, response: str, image_id: str, start_time: float
    ) -> CropDiseaseAnalysis:
        """Parse vision model response into structured analysis."""
        try:
            import json

            # Extract JSON from response (handle potential markdown formatting)
            response_clean = response.strip()
            if response_clean.startswith("```json"):
                response_clean = response_clean[7:]
            if response_clean.endswith("```"):
                response_clean = response_clean[:-3]

            data = json.loads(response_clean)

            # Parse diseases
            diseases = []
            for disease_data in data.get("diseases", []):
                disease = DiseaseIdentification(
                    disease_name=disease_data.get("disease_name", "Unknown"),
                    confidence_score=float(disease_data.get("confidence_score", 0.0)),
                    confidence_level=self._determine_confidence_level(
                        float(disease_data.get("confidence_score", 0.0))
                    ),
                    crop_type=data.get("crop_type"),
                    affected_parts=disease_data.get("affected_parts", []),
                    severity=disease_data.get("severity"),
                    description=disease_data.get("description"),
                )
                diseases.append(disease)

            # Parse treatment recommendations
            treatments = []
            for treatment_data in data.get("treatment_recommendations", []):
                treatment = TreatmentRecommendation(
                    treatment_type=treatment_data.get("treatment_type", "unknown"),
                    active_ingredients=treatment_data.get("active_ingredients", []),
                    dosage=treatment_data.get("dosage"),
                    application_method=treatment_data.get("application_method"),
                    timing=treatment_data.get("timing"),
                    precautions=treatment_data.get("precautions", []),
                    cost_estimate=treatment_data.get("cost_estimate"),
                )
                treatments.append(treatment)

            # Determine primary disease (highest confidence)
            primary_disease = None
            if diseases:
                primary_disease = max(diseases, key=lambda d: d.confidence_score)

            processing_time = time.time() - start_time

            return CropDiseaseAnalysis(
                image_id=image_id,
                timestamp=datetime.now(),
                crop_type=data.get("crop_type"),
                diseases=diseases,
                primary_disease=primary_disease,
                treatment_recommendations=treatments,
                prevention_strategies=data.get("prevention_strategies", []),
                confidence_summary=data.get("confidence_summary", "Analysis completed"),
                processing_time=processing_time,
                model_used="gpt-4o",
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse vision model response as JSON: {e}")
            logger.debug(f"Raw response: {response}")
            raise DiseaseIdentificationError(
                f"Invalid response format from vision model: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Error parsing disease analysis: {e}")
            raise DiseaseIdentificationError(f"Failed to parse analysis: {str(e)}")

    async def get_detailed_treatment_info(
        self, disease_name: str, crop_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get detailed treatment information from RAG engine.
        This method integrates with the RAG system for comprehensive treatment data.
        """
        try:
            # Import here to avoid circular imports
            from app.services.rag_engine import rag_engine

            # Construct query for RAG system
            query = f"treatment for {disease_name}"
            if crop_type:
                query += f" in {crop_type}"

            # Search disease information
            results = await rag_engine.search_and_generate(
                query=query,
                collections=["crop_diseases"],
                top_k=5,
                response_type="comprehensive",
            )

            return {
                "detailed_treatment": results.get("response", ""),
                "sources": results.get("sources", []),
                "confidence": results.get("confidence", 0.0),
            }

        except Exception as e:
            logger.error(f"Failed to get detailed treatment info: {e}")
            return {
                "detailed_treatment": "Detailed treatment information not available. Please consult an agricultural expert.",
                "sources": [],
                "confidence": 0.0,
            }

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on vision service."""
        try:
            # Test with a simple prompt
            test_response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Health check. Please respond with 'OK'.",
                            }
                        ],
                    }
                ],
                max_tokens=10,
                temperature=0.0,
            )

            return {
                "status": "healthy",
                "model": "gpt-4o",
                "response_time": "< 1s",
                "test_response": test_response.choices[0].message.content,
            }

        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "model": "gpt-4o",
            }


# Global instance
vision_service = VisionService()
