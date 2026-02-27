"""
Vision API endpoints for crop disease identification.
"""

import logging
from typing import Dict, Any, Optional
from io import BytesIO

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.services.vision_service import (
    vision_service,
    VisionError,
    ImageValidationError,
    DiseaseIdentificationError,
    CropDiseaseAnalysis,
    ImageValidationResult,
)
from app.services.treatment_recommendation_service import treatment_service
from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vision", tags=["Vision & Disease Identification"])


# Request/Response Models
class DiseaseAnalysisRequest(BaseModel):
    """Request model for disease analysis with base64 image."""

    image_base64: str = Field(..., description="Base64 encoded image data")
    crop_hint: Optional[str] = Field(None, description="Optional hint about crop type")
    location_context: Optional[str] = Field(
        None, description="Location context for regional diseases"
    )
    additional_context: Optional[str] = Field(
        None, description="Additional context from user"
    )


class DiseaseAnalysisResponse(BaseModel):
    """Response model for disease analysis."""

    success: bool
    analysis: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    processing_time: Optional[float] = None


class ImageValidationResponse(BaseModel):
    """Response model for image validation."""

    is_valid: bool
    error_message: Optional[str] = None
    format: Optional[str] = None
    size: Optional[tuple] = None
    file_size_mb: Optional[float] = None


class TreatmentInfoRequest(BaseModel):
    """Request model for detailed treatment information."""

    disease_name: str = Field(..., description="Name of the disease")
    crop_type: Optional[str] = Field(None, description="Type of crop")


class VisionHealthResponse(BaseModel):
    """Response model for vision service health check."""

    status: str
    model: str
    response_time: Optional[str] = None
    test_response: Optional[str] = None
    error: Optional[str] = None


@router.post("/analyze/upload", response_model=DiseaseAnalysisResponse)
async def analyze_crop_image_upload(
    image: UploadFile = File(..., description="Crop image file"),
    crop_hint: Optional[str] = Form(None, description="Optional hint about crop type"),
    location_context: Optional[str] = Form(None, description="Location context"),
    additional_context: Optional[str] = Form(None, description="Additional context"),
):
    """
    Analyze crop image for disease identification via file upload.

    Supports JPEG, PNG, and WebP formats up to 10MB.
    Returns comprehensive disease analysis with treatment recommendations.
    """
    try:
        # Validate file type
        if not image.content_type or not image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {image.content_type}. Please upload an image file.",
            )

        # Read image data
        image_data = await image.read()

        if len(image_data) == 0:
            raise HTTPException(status_code=400, detail="Empty image file")

        logger.info(
            f"Analyzing uploaded image: {image.filename}, "
            f"size: {len(image_data)} bytes, "
            f"type: {image.content_type}"
        )

        # Perform disease analysis
        analysis = await vision_service.identify_disease(
            image_data=image_data,
            crop_hint=crop_hint,
            location_context=location_context,
            additional_context=additional_context,
        )

        # Convert analysis to dict for JSON response
        analysis_dict = {
            "image_id": analysis.image_id,
            "timestamp": analysis.timestamp.isoformat(),
            "crop_type": analysis.crop_type,
            "diseases": [
                {
                    "disease_name": d.disease_name,
                    "confidence_score": d.confidence_score,
                    "confidence_level": d.confidence_level.value,
                    "crop_type": d.crop_type,
                    "affected_parts": d.affected_parts,
                    "severity": d.severity,
                    "description": d.description,
                }
                for d in analysis.diseases
            ],
            "primary_disease": (
                {
                    "disease_name": analysis.primary_disease.disease_name,
                    "confidence_score": analysis.primary_disease.confidence_score,
                    "confidence_level": analysis.primary_disease.confidence_level.value,
                    "severity": analysis.primary_disease.severity,
                    "description": analysis.primary_disease.description,
                }
                if analysis.primary_disease
                else None
            ),
            "treatment_recommendations": [
                {
                    "treatment_type": t.treatment_type,
                    "active_ingredients": t.active_ingredients,
                    "dosage": t.dosage,
                    "application_method": t.application_method,
                    "timing": t.timing,
                    "precautions": t.precautions,
                    "cost_estimate": t.cost_estimate,
                }
                for t in analysis.treatment_recommendations
            ],
            "prevention_strategies": analysis.prevention_strategies,
            "confidence_summary": analysis.confidence_summary,
            "processing_time": analysis.processing_time,
            "model_used": analysis.model_used,
            "metadata": analysis.metadata,
        }

        return DiseaseAnalysisResponse(
            success=True,
            analysis=analysis_dict,
            processing_time=analysis.processing_time,
        )

    except ImageValidationError as e:
        logger.warning(f"Image validation failed: {e}")
        return DiseaseAnalysisResponse(
            success=False, error=f"Image validation failed: {str(e)}"
        )
    except DiseaseIdentificationError as e:
        logger.error(f"Disease identification failed: {e}")
        return DiseaseAnalysisResponse(
            success=False, error=f"Disease identification failed: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in image analysis: {e}")
        return DiseaseAnalysisResponse(
            success=False, error="Internal server error during analysis"
        )


@router.post("/analyze/base64", response_model=DiseaseAnalysisResponse)
async def analyze_crop_image_base64(request: DiseaseAnalysisRequest):
    """
    Analyze crop image for disease identification via base64 encoded data.

    Alternative endpoint for applications that prefer base64 encoding.
    """
    try:
        import base64

        # Decode base64 image
        try:
            # Handle data URL format (data:image/jpeg;base64,...)
            if request.image_base64.startswith("data:"):
                header, encoded = request.image_base64.split(",", 1)
                image_data = base64.b64decode(encoded)
            else:
                image_data = base64.b64decode(request.image_base64)
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid base64 image data: {str(e)}"
            )

        logger.info(f"Analyzing base64 image, size: {len(image_data)} bytes")

        # Perform disease analysis
        analysis = await vision_service.identify_disease(
            image_data=image_data,
            crop_hint=request.crop_hint,
            location_context=request.location_context,
            additional_context=request.additional_context,
        )

        # Convert analysis to dict (same as upload endpoint)
        analysis_dict = {
            "image_id": analysis.image_id,
            "timestamp": analysis.timestamp.isoformat(),
            "crop_type": analysis.crop_type,
            "diseases": [
                {
                    "disease_name": d.disease_name,
                    "confidence_score": d.confidence_score,
                    "confidence_level": d.confidence_level.value,
                    "crop_type": d.crop_type,
                    "affected_parts": d.affected_parts,
                    "severity": d.severity,
                    "description": d.description,
                }
                for d in analysis.diseases
            ],
            "primary_disease": (
                {
                    "disease_name": analysis.primary_disease.disease_name,
                    "confidence_score": analysis.primary_disease.confidence_score,
                    "confidence_level": analysis.primary_disease.confidence_level.value,
                    "severity": analysis.primary_disease.severity,
                    "description": analysis.primary_disease.description,
                }
                if analysis.primary_disease
                else None
            ),
            "treatment_recommendations": [
                {
                    "treatment_type": t.treatment_type,
                    "active_ingredients": t.active_ingredients,
                    "dosage": t.dosage,
                    "application_method": t.application_method,
                    "timing": t.timing,
                    "precautions": t.precautions,
                    "cost_estimate": t.cost_estimate,
                }
                for t in analysis.treatment_recommendations
            ],
            "prevention_strategies": analysis.prevention_strategies,
            "confidence_summary": analysis.confidence_summary,
            "processing_time": analysis.processing_time,
            "model_used": analysis.model_used,
            "metadata": analysis.metadata,
        }

        return DiseaseAnalysisResponse(
            success=True,
            analysis=analysis_dict,
            processing_time=analysis.processing_time,
        )

    except ImageValidationError as e:
        logger.warning(f"Image validation failed: {e}")
        return DiseaseAnalysisResponse(
            success=False, error=f"Image validation failed: {str(e)}"
        )
    except DiseaseIdentificationError as e:
        logger.error(f"Disease identification failed: {e}")
        return DiseaseAnalysisResponse(
            success=False, error=f"Disease identification failed: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in base64 analysis: {e}")
        return DiseaseAnalysisResponse(
            success=False, error="Internal server error during analysis"
        )


@router.post("/validate", response_model=ImageValidationResponse)
async def validate_image(image: UploadFile = File(...)):
    """
    Validate image file for crop disease analysis.

    Checks format, size, and basic content validation without performing analysis.
    Useful for pre-upload validation in client applications.
    """
    try:
        # Read image data
        image_data = await image.read()

        if len(image_data) == 0:
            return ImageValidationResponse(
                is_valid=False, error_message="Empty image file"
            )

        # Validate image
        validation = vision_service.validate_image(image_data)

        return ImageValidationResponse(
            is_valid=validation.is_valid,
            error_message=validation.error_message,
            format=validation.format,
            size=validation.size,
            file_size_mb=validation.file_size_mb,
        )

    except Exception as e:
        logger.error(f"Image validation error: {e}")
        return ImageValidationResponse(
            is_valid=False, error_message=f"Validation failed: {str(e)}"
        )


@router.post("/treatment/detailed")
async def get_detailed_treatment_info(request: TreatmentInfoRequest):
    """
    Get detailed treatment information for a specific disease.

    Integrates with RAG engine to provide comprehensive treatment data
    from the agricultural knowledge base.
    """
    try:
        logger.info(f"Getting detailed treatment info for: {request.disease_name}")

        treatment_info = await vision_service.get_detailed_treatment_info(
            disease_name=request.disease_name, crop_type=request.crop_type
        )

        return {
            "success": True,
            "disease_name": request.disease_name,
            "crop_type": request.crop_type,
            "treatment_info": treatment_info,
        }

    except Exception as e:
        logger.error(f"Failed to get detailed treatment info: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve treatment information: {str(e)}",
        )


@router.get("/health", response_model=VisionHealthResponse)
async def vision_health_check():
    """
    Perform health check on vision service.

    Tests connectivity to vision-language model and basic functionality.
    """
    try:
        health_status = await vision_service.health_check()

        return VisionHealthResponse(**health_status)

    except Exception as e:
        logger.error(f"Vision health check failed: {e}")
        return VisionHealthResponse(status="unhealthy", model="gpt-4o", error=str(e))


@router.get("/supported-formats")
async def get_supported_formats():
    """
    Get list of supported image formats and constraints.

    Returns information about supported formats, size limits, and recommendations.
    """
    return {
        "supported_formats": ["jpeg", "png", "webp"],
        "max_file_size_mb": 10,
        "max_dimensions": [1024, 1024],
        "recommendations": [
            "Use high-quality images with clear disease symptoms",
            "Ensure good lighting and focus on affected plant parts",
            "Include multiple angles if symptoms are unclear",
            "Avoid heavily compressed or low-resolution images",
        ],
        "optimal_conditions": [
            "Natural daylight or bright artificial lighting",
            "Close-up shots of affected areas",
            "Minimal background distractions",
            "Sharp focus on disease symptoms",
        ],
    }


@router.post("/analyze/comprehensive")
async def analyze_with_comprehensive_treatment(
    image: UploadFile = File(..., description="Crop image file"),
    crop_hint: Optional[str] = Form(None, description="Optional hint about crop type"),
    location_context: Optional[str] = Form(None, description="Location context"),
    additional_context: Optional[str] = Form(None, description="Additional context"),
    user_location: Optional[str] = Form(
        None, description="User location for treatment recommendations"
    ),
):
    """
    Comprehensive disease analysis with detailed treatment recommendations.

    This endpoint combines disease identification with RAG-powered treatment
    recommendations, providing dosage information, prevention strategies,
    and source citations from the agricultural knowledge base.
    """
    try:
        # Validate file type
        if not image.content_type or not image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {image.content_type}. Please upload an image file.",
            )

        # Read image data
        image_data = await image.read()

        if len(image_data) == 0:
            raise HTTPException(status_code=400, detail="Empty image file")

        logger.info(
            f"Performing comprehensive analysis for: {image.filename}, "
            f"size: {len(image_data)} bytes"
        )

        # Step 1: Perform disease analysis
        disease_analysis = await vision_service.identify_disease(
            image_data=image_data,
            crop_hint=crop_hint,
            location_context=location_context,
            additional_context=additional_context,
        )

        # Step 2: Generate comprehensive treatment plan using RAG engine
        user_context = None
        if user_location:
            user_context = {"location": {"state": user_location}}

        treatment_plan = await treatment_service.generate_treatment_plan(
            disease_analysis=disease_analysis, user_context=user_context
        )

        # Convert to response format
        response_data = {
            "success": True,
            "disease_analysis": {
                "image_id": disease_analysis.image_id,
                "timestamp": disease_analysis.timestamp.isoformat(),
                "crop_type": disease_analysis.crop_type,
                "primary_disease": (
                    {
                        "disease_name": disease_analysis.primary_disease.disease_name,
                        "confidence_score": disease_analysis.primary_disease.confidence_score,
                        "confidence_level": disease_analysis.primary_disease.confidence_level.value,
                        "severity": disease_analysis.primary_disease.severity,
                        "description": disease_analysis.primary_disease.description,
                        "affected_parts": disease_analysis.primary_disease.affected_parts,
                    }
                    if disease_analysis.primary_disease
                    else None
                ),
                "all_diseases": [
                    {
                        "disease_name": d.disease_name,
                        "confidence_score": d.confidence_score,
                        "confidence_level": d.confidence_level.value,
                    }
                    for d in disease_analysis.diseases
                ],
                "processing_time": disease_analysis.processing_time,
                "model_used": disease_analysis.model_used,
            },
            "treatment_plan": treatment_plan.to_dict(),
        }

        return response_data

    except ImageValidationError as e:
        logger.warning(f"Image validation failed: {e}")
        raise HTTPException(
            status_code=400, detail=f"Image validation failed: {str(e)}"
        )
    except DiseaseIdentificationError as e:
        logger.error(f"Disease identification failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Disease identification failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Comprehensive analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/treatment/plan")
async def generate_treatment_plan_for_disease(
    disease_name: str = Form(..., description="Name of the disease"),
    crop_type: Optional[str] = Form(None, description="Type of crop"),
    severity: Optional[str] = Form(
        None, description="Disease severity (mild/moderate/severe)"
    ),
    user_location: Optional[str] = Form(None, description="User location"),
):
    """
    Generate a comprehensive treatment plan for a known disease.

    This endpoint allows users to get treatment recommendations without
    uploading an image, useful when the disease is already identified.
    """
    try:
        from app.services.vision_service import (
            DiseaseIdentification,
            DiseaseConfidence,
            CropDiseaseAnalysis,
        )
        from datetime import datetime

        # Create a mock disease identification
        disease_id = DiseaseIdentification(
            disease_name=disease_name,
            confidence_score=0.9,  # High confidence for user-provided disease
            confidence_level=DiseaseConfidence.HIGH,
            crop_type=crop_type,
            severity=severity or "moderate",
            description=f"User-reported {disease_name}",
        )

        # Create mock analysis
        mock_analysis = CropDiseaseAnalysis(
            image_id=f"manual_{int(datetime.now().timestamp() * 1000)}",
            timestamp=datetime.now(),
            crop_type=crop_type,
            diseases=[disease_id],
            primary_disease=disease_id,
            treatment_recommendations=[],
            prevention_strategies=[],
            confidence_summary="User-provided disease identification",
            processing_time=0.0,
            model_used="manual_input",
        )

        # Generate treatment plan
        user_context = None
        if user_location:
            user_context = {"location": {"state": user_location}}

        treatment_plan = await treatment_service.generate_treatment_plan(
            disease_analysis=mock_analysis, user_context=user_context
        )

        return {
            "success": True,
            "disease_name": disease_name,
            "crop_type": crop_type,
            "treatment_plan": treatment_plan.to_dict(),
        }

    except Exception as e:
        logger.error(f"Failed to generate treatment plan: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to generate treatment plan: {str(e)}"
        )


@router.get("/disease-categories")
async def get_disease_categories():
    """
    Get information about disease categories and common symptoms.

    Provides educational information about different types of crop diseases.
    """
    return {
        "disease_categories": {
            "fungal": {
                "description": "Diseases caused by fungi",
                "common_symptoms": [
                    "Spots or lesions on leaves",
                    "Powdery or fuzzy growth",
                    "Wilting or yellowing",
                    "Root rot",
                ],
                "examples": ["Rust", "Blight", "Mildew", "Anthracnose"],
            },
            "bacterial": {
                "description": "Diseases caused by bacteria",
                "common_symptoms": [
                    "Water-soaked lesions",
                    "Yellowing or browning",
                    "Soft rot",
                    "Oozing or exudates",
                ],
                "examples": ["Bacterial wilt", "Fire blight", "Soft rot"],
            },
            "viral": {
                "description": "Diseases caused by viruses",
                "common_symptoms": [
                    "Mosaic patterns",
                    "Stunted growth",
                    "Leaf curling",
                    "Color changes",
                ],
                "examples": ["Mosaic virus", "Leaf curl", "Yellows"],
            },
            "nutritional": {
                "description": "Disorders caused by nutrient deficiencies",
                "common_symptoms": [
                    "Chlorosis (yellowing)",
                    "Necrosis (browning)",
                    "Stunted growth",
                    "Poor fruit development",
                ],
                "examples": [
                    "Nitrogen deficiency",
                    "Iron chlorosis",
                    "Potassium deficiency",
                ],
            },
        },
        "identification_tips": [
            "Look for patterns in symptom distribution",
            "Consider environmental conditions",
            "Note the progression of symptoms",
            "Check multiple plants if possible",
        ],
    }
