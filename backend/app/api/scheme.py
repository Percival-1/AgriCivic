"""
Government Scheme API endpoints.
Provides scheme search, personalized recommendations, and detailed information.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field

from app.services.scheme_service import (
    scheme_service,
    UserProfile,
    SchemeRecommendation,
)
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/schemes", tags=["Government Schemes"])


# Request/Response Models
class UserProfileRequest(BaseModel):
    """User profile for eligibility assessment."""

    user_id: str = Field(..., description="User ID")
    location: Optional[Dict[str, Any]] = Field(None, description="Location details")
    crops: Optional[List[str]] = Field(None, description="Crops cultivated")
    land_size_hectares: Optional[float] = Field(
        None, description="Land size in hectares"
    )
    farmer_category: Optional[str] = Field(None, description="Farmer category")
    annual_income: Optional[float] = Field(None, description="Annual income")
    age: Optional[int] = Field(None, description="Age")
    gender: Optional[str] = Field(None, description="Gender")
    caste_category: Optional[str] = Field(None, description="Caste category")
    has_bank_account: bool = Field(True, description="Has bank account")
    has_aadhaar: bool = Field(True, description="Has Aadhaar card")
    additional_attributes: Optional[Dict[str, Any]] = Field(
        None, description="Additional attributes"
    )


class SchemeSearchRequest(BaseModel):
    """Request model for scheme search."""

    query: str = Field(..., description="Search query")
    user_profile: Optional[UserProfileRequest] = Field(
        None, description="User profile for personalization"
    )
    scheme_types: Optional[List[str]] = Field(
        None, description="Filter by scheme types"
    )
    top_k: int = Field(10, ge=1, le=50, description="Number of results")


class PersonalizedRecommendationRequest(BaseModel):
    """Request model for personalized recommendations."""

    user_profile: UserProfileRequest = Field(..., description="User profile")
    limit: int = Field(5, ge=1, le=20, description="Maximum recommendations")


class SchemeDetailsRequest(BaseModel):
    """Request model for scheme details."""

    scheme_name: str = Field(..., description="Scheme name")
    user_profile: Optional[UserProfileRequest] = Field(
        None, description="User profile for eligibility"
    )


class SchemeRecommendationResponse(BaseModel):
    """Response model for scheme recommendation."""

    scheme_id: str
    scheme_name: str
    scheme_type: str
    description: str
    eligibility_score: float
    is_eligible: bool
    eligibility_reasons: List[str]
    ineligibility_reasons: List[str]
    benefits: List[str]
    application_procedure: str
    required_documents: List[str]
    application_deadline: Optional[str] = None
    contact_information: Optional[str] = None
    source_document: str
    location_specific: bool
    priority_score: float


# Helper function to convert UserProfileRequest to UserProfile
def _convert_profile(profile_request: UserProfileRequest) -> UserProfile:
    """Convert API request model to service model."""
    return UserProfile(
        user_id=profile_request.user_id,
        location=profile_request.location,
        crops=profile_request.crops,
        land_size_hectares=profile_request.land_size_hectares,
        farmer_category=profile_request.farmer_category,
        annual_income=profile_request.annual_income,
        age=profile_request.age,
        gender=profile_request.gender,
        caste_category=profile_request.caste_category,
        has_bank_account=profile_request.has_bank_account,
        has_aadhaar=profile_request.has_aadhaar,
        additional_attributes=profile_request.additional_attributes,
    )


# API Endpoints
@router.post("/search", summary="Search government schemes")
async def search_schemes(request: SchemeSearchRequest):
    """
    Search for government schemes with optional user profile for personalization.

    Returns schemes sorted by relevance and eligibility score.
    """
    try:
        user_profile = None
        if request.user_profile:
            user_profile = _convert_profile(request.user_profile)

        recommendations = await scheme_service.search_schemes(
            query=request.query,
            user_profile=user_profile,
            scheme_types=request.scheme_types,
            top_k=request.top_k,
        )

        return {
            "success": True,
            "query": request.query,
            "num_results": len(recommendations),
            "recommendations": [
                SchemeRecommendationResponse(**rec.__dict__) for rec in recommendations
            ],
        }

    except Exception as e:
        logger.error(f"Scheme search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Scheme search failed: {str(e)}")


@router.post("/recommendations", summary="Get personalized scheme recommendations")
async def get_personalized_recommendations(request: PersonalizedRecommendationRequest):
    """
    Get personalized scheme recommendations based on user profile.

    Returns schemes filtered by eligibility and sorted by priority.
    """
    try:
        user_profile = _convert_profile(request.user_profile)

        recommendations = await scheme_service.get_personalized_recommendations(
            user_profile=user_profile,
            limit=request.limit,
        )

        return {
            "success": True,
            "user_id": user_profile.user_id,
            "num_recommendations": len(recommendations),
            "recommendations": [
                SchemeRecommendationResponse(**rec.__dict__) for rec in recommendations
            ],
        }

    except Exception as e:
        logger.error(f"Failed to get personalized recommendations: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get recommendations: {str(e)}"
        )


@router.post("/details", summary="Get detailed scheme information")
async def get_scheme_details(request: SchemeDetailsRequest):
    """
    Get detailed information about a specific scheme.

    Includes eligibility assessment if user profile is provided.
    """
    try:
        user_profile = None
        if request.user_profile:
            user_profile = _convert_profile(request.user_profile)

        recommendation = await scheme_service.get_scheme_details(
            scheme_name=request.scheme_name,
            user_profile=user_profile,
        )

        if not recommendation:
            raise HTTPException(
                status_code=404, detail=f"Scheme not found: {request.scheme_name}"
            )

        return {
            "success": True,
            "scheme": SchemeRecommendationResponse(**recommendation.__dict__),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get scheme details: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get scheme details: {str(e)}"
        )


@router.get("/search/simple", summary="Simple scheme search")
async def simple_scheme_search(
    query: str = Query(..., description="Search query"),
    scheme_type: Optional[str] = Query(None, description="Filter by scheme type"),
    limit: int = Query(10, ge=1, le=50, description="Number of results"),
):
    """
    Simple scheme search without user profile.

    Returns schemes sorted by relevance only.
    """
    try:
        scheme_types = [scheme_type] if scheme_type else None

        recommendations = await scheme_service.search_schemes(
            query=query,
            user_profile=None,
            scheme_types=scheme_types,
            top_k=limit,
        )

        return {
            "success": True,
            "query": query,
            "num_results": len(recommendations),
            "schemes": [
                {
                    "scheme_name": rec.scheme_name,
                    "scheme_type": rec.scheme_type,
                    "description": rec.description,
                    "benefits": rec.benefits,
                    "application_procedure": rec.application_procedure,
                    "required_documents": rec.required_documents,
                }
                for rec in recommendations
            ],
        }

    except Exception as e:
        logger.error(f"Simple scheme search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Scheme search failed: {str(e)}")


@router.get("/types", summary="Get available scheme types")
async def get_scheme_types():
    """
    Get list of available scheme types.
    """
    scheme_types = [
        "financial_assistance",
        "subsidy",
        "insurance",
        "training",
        "loan",
        "equipment",
        "marketing",
        "advisory",
        "infrastructure",
        "welfare",
    ]

    return {
        "success": True,
        "scheme_types": scheme_types,
    }


@router.get("/categories", summary="Get farmer categories")
async def get_farmer_categories():
    """
    Get list of farmer categories for profile creation.
    """
    categories = {
        "farmer_categories": ["small", "marginal", "medium", "large", "landless"],
        "caste_categories": ["general", "obc", "sc", "st"],
        "genders": ["male", "female", "other"],
    }

    return {
        "success": True,
        "categories": categories,
    }


@router.post("/eligibility/check", summary="Check eligibility for a scheme")
async def check_eligibility(
    scheme_name: str = Body(..., description="Scheme name"),
    user_profile: UserProfileRequest = Body(..., description="User profile"),
):
    """
    Check user eligibility for a specific scheme.

    Returns detailed eligibility assessment.
    """
    try:
        profile = _convert_profile(user_profile)

        recommendation = await scheme_service.get_scheme_details(
            scheme_name=scheme_name,
            user_profile=profile,
        )

        if not recommendation:
            raise HTTPException(
                status_code=404, detail=f"Scheme not found: {scheme_name}"
            )

        return {
            "success": True,
            "scheme_name": recommendation.scheme_name,
            "is_eligible": recommendation.is_eligible,
            "eligibility_score": recommendation.eligibility_score,
            "eligibility_reasons": recommendation.eligibility_reasons,
            "ineligibility_reasons": recommendation.ineligibility_reasons,
            "required_documents": recommendation.required_documents,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Eligibility check failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Eligibility check failed: {str(e)}"
        )
