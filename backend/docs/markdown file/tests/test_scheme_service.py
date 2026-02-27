"""
Unit tests for the Government Scheme Service.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from app.services.scheme_service import (
    SchemeService,
    UserProfile,
    SchemeRecommendation,
)


@pytest.fixture
def scheme_service():
    """Create a scheme service instance for testing."""
    return SchemeService()


@pytest.fixture
def sample_user_profile():
    """Create a sample user profile for testing."""
    return UserProfile(
        user_id="test_user_123",
        location={
            "state": "punjab",
            "district": "ludhiana",
            "latitude": 30.9,
            "longitude": 75.8,
        },
        crops=["wheat", "rice"],
        land_size_hectares=1.5,
        farmer_category="small",
        annual_income=80000,
        age=35,
        gender="male",
        caste_category="general",
        has_bank_account=True,
        has_aadhaar=True,
    )


@pytest.fixture
def sample_scheme_document():
    """Create a sample scheme document for testing."""
    return {
        "id": "scheme_001",
        "content": "PM-KISAN scheme provides direct income support of ₹6000 per year to small and marginal farmers. "
        "Eligible farmers are those with landholding up to 2 hectares. "
        "Payment is made in three equal installments of ₹2000 each every four months. "
        "Farmers can apply online through PM-KISAN portal or visit nearest Common Service Center.",
        "metadata": {
            "scheme_name": "PM-KISAN",
            "scheme_type": "financial_assistance",
            "source": "Ministry of Agriculture",
            "eligibility": "Small and marginal farmers with up to 2 hectares land",
            "benefits": "₹6000 per year in three installments",
        },
        "similarity_score": 0.85,
    }


@pytest.mark.asyncio
async def test_search_schemes_basic(scheme_service, sample_user_profile):
    """Test basic scheme search functionality."""
    with patch.object(scheme_service.rag_engine, "retrieve_documents") as mock_retrieve:
        # Mock document retrieval
        mock_retrieve.return_value = [
            {
                "id": "scheme_001",
                "content": "PM-KISAN scheme for small farmers",
                "metadata": {
                    "scheme_name": "PM-KISAN",
                    "scheme_type": "financial_assistance",
                },
                "similarity_score": 0.85,
            }
        ]

        with patch.object(
            scheme_service, "_extract_scheme_information"
        ) as mock_extract:
            mock_extract.return_value = {
                "scheme_name": "PM-KISAN",
                "scheme_type": "financial_assistance",
                "description": "Direct income support scheme",
                "benefits": ["₹6000 per year"],
                "eligibility_criteria": ["Small farmers", "Up to 2 hectares"],
                "application_procedure": "Apply online",
                "required_documents": ["Aadhaar", "Bank account"],
                "application_deadline": None,
                "contact_information": None,
                "location_specific": False,
            }

            results = await scheme_service.search_schemes(
                query="financial assistance for farmers",
                user_profile=sample_user_profile,
                top_k=5,
            )

            assert len(results) > 0
            assert isinstance(results[0], SchemeRecommendation)
            assert results[0].scheme_name == "PM-KISAN"


@pytest.mark.asyncio
async def test_get_personalized_recommendations(scheme_service, sample_user_profile):
    """Test personalized scheme recommendations."""
    with patch.object(scheme_service, "search_schemes") as mock_search:
        mock_search.return_value = [
            SchemeRecommendation(
                scheme_id="scheme_001",
                scheme_name="PM-KISAN",
                scheme_type="financial_assistance",
                description="Direct income support",
                eligibility_score=0.9,
                is_eligible=True,
                eligibility_reasons=["Eligible as small farmer"],
                ineligibility_reasons=[],
                benefits=["₹6000 per year"],
                application_procedure="Apply online",
                required_documents=["Aadhaar", "Bank account"],
                source_document="Ministry of Agriculture",
                location_specific=False,
                priority_score=0.85,
            )
        ]

        results = await scheme_service.get_personalized_recommendations(
            user_profile=sample_user_profile,
            limit=5,
        )

        assert len(results) > 0
        assert results[0].is_eligible
        assert results[0].eligibility_score >= 0.6


@pytest.mark.asyncio
async def test_get_scheme_details(scheme_service, sample_user_profile):
    """Test getting detailed scheme information."""
    with patch.object(scheme_service.rag_engine, "retrieve_documents") as mock_retrieve:
        mock_retrieve.return_value = [
            {
                "id": "scheme_001",
                "content": "PM-KISAN scheme details",
                "metadata": {
                    "scheme_name": "PM-KISAN",
                    "scheme_type": "financial_assistance",
                },
                "similarity_score": 0.95,
            }
        ]

        with patch.object(
            scheme_service, "_extract_scheme_information"
        ) as mock_extract:
            mock_extract.return_value = {
                "scheme_name": "PM-KISAN",
                "scheme_type": "financial_assistance",
                "description": "Direct income support scheme",
                "benefits": ["₹6000 per year"],
                "eligibility_criteria": ["Small farmers"],
                "application_procedure": "Apply online",
                "required_documents": ["Aadhaar"],
                "application_deadline": None,
                "contact_information": None,
                "location_specific": False,
            }

            result = await scheme_service.get_scheme_details(
                scheme_name="PM-KISAN",
                user_profile=sample_user_profile,
            )

            assert result is not None
            assert result.scheme_name == "PM-KISAN"
            assert isinstance(result, SchemeRecommendation)


def test_check_location_eligibility(scheme_service, sample_user_profile):
    """Test location-based eligibility checking."""
    eligible = []
    ineligible = []

    # Test nationwide scheme
    criteria = "all india scheme for farmers"
    score = scheme_service._check_location_eligibility(
        criteria, sample_user_profile, eligible, ineligible
    )
    assert score == 1.0
    assert len(eligible) > 0

    # Test state-specific scheme
    eligible.clear()
    ineligible.clear()
    criteria = "scheme for punjab farmers"
    score = scheme_service._check_location_eligibility(
        criteria, sample_user_profile, eligible, ineligible
    )
    assert score == 1.0
    assert len(eligible) > 0


def test_check_crop_eligibility(scheme_service, sample_user_profile):
    """Test crop-based eligibility checking."""
    eligible = []
    ineligible = []

    # Test matching crop
    criteria = "scheme for wheat farmers"
    score = scheme_service._check_crop_eligibility(
        criteria, sample_user_profile, eligible, ineligible
    )
    assert score == 1.0
    assert len(eligible) > 0

    # Test all crops
    eligible.clear()
    ineligible.clear()
    criteria = "scheme for all crops"
    score = scheme_service._check_crop_eligibility(
        criteria, sample_user_profile, eligible, ineligible
    )
    assert score == 1.0


def test_check_land_size_eligibility(scheme_service, sample_user_profile):
    """Test land size eligibility checking."""
    eligible = []
    ineligible = []

    # Test small farmer criteria (user has 1.5 hectares)
    criteria = "scheme for small and marginal farmers with up to 2 hectares"
    score = scheme_service._check_land_size_eligibility(
        criteria, sample_user_profile, eligible, ineligible
    )
    assert score == 1.0
    assert len(eligible) > 0

    # Test exceeding land size
    eligible.clear()
    ineligible.clear()
    criteria = "scheme for farmers with up to 1 hectare"
    score = scheme_service._check_land_size_eligibility(
        criteria, sample_user_profile, eligible, ineligible
    )
    assert score == 0.0
    assert len(ineligible) > 0


def test_check_income_eligibility(scheme_service, sample_user_profile):
    """Test income-based eligibility checking."""
    eligible = []
    ineligible = []

    # Test BPL criteria (user has 80000 income)
    criteria = "scheme for bpl farmers below poverty line"
    score = scheme_service._check_income_eligibility(
        criteria, sample_user_profile, eligible, ineligible
    )
    assert score == 1.0
    assert len(eligible) > 0


def test_check_category_eligibility(scheme_service, sample_user_profile):
    """Test category-based eligibility checking."""
    eligible = []
    ineligible = []

    # Test with no specific category requirements - should return neutral score
    # The profile has farmer_category="small" but criteria doesn't mention it
    # So it should return at least 0.5 (neutral)
    criteria = "government scheme for farmers"
    score = scheme_service._check_category_eligibility(
        criteria, sample_user_profile, eligible, ineligible
    )
    # With no matches but no disqualifications, should return at least neutral (0.5)
    assert score == 0.5

    # Test gender-specific scheme (user is male)
    eligible.clear()
    ineligible.clear()
    criteria = "scheme for women farmers"
    score = scheme_service._check_category_eligibility(
        criteria, sample_user_profile, eligible, ineligible
    )
    assert score == 0.0
    assert len(ineligible) > 0


def test_check_document_eligibility(scheme_service, sample_user_profile):
    """Test document requirement checking."""
    eligible = []
    ineligible = []

    # Test with required documents user has
    required_docs = ["Aadhaar Card", "Bank Account Details"]
    score = scheme_service._check_document_eligibility(
        required_docs, sample_user_profile, eligible, ineligible
    )
    assert score >= 0.8
    assert len(eligible) > 0

    # Test with missing Aadhaar
    eligible.clear()
    ineligible.clear()
    profile_no_aadhaar = UserProfile(
        user_id="test_user",
        has_aadhaar=False,
        has_bank_account=True,
    )
    score = scheme_service._check_document_eligibility(
        required_docs, profile_no_aadhaar, eligible, ineligible
    )
    assert len(ineligible) > 0


def test_assess_eligibility(scheme_service, sample_user_profile):
    """Test comprehensive eligibility assessment."""
    scheme_info = {
        "scheme_name": "PM-KISAN",
        "scheme_type": "financial_assistance",
        "eligibility_criteria": [
            "Small and marginal farmers",
            "Up to 2 hectares land",
            "All India scheme",
        ],
        "required_documents": ["Aadhaar Card", "Bank Account"],
    }

    result = scheme_service._assess_eligibility(scheme_info, sample_user_profile)

    assert "eligibility_score" in result
    assert "is_eligible" in result
    assert "eligibility_reasons" in result
    assert "ineligibility_reasons" in result
    assert isinstance(result["eligibility_score"], float)
    assert 0.0 <= result["eligibility_score"] <= 1.0


def test_build_profile_query(scheme_service, sample_user_profile):
    """Test building search query from user profile."""
    query = scheme_service._build_profile_query(sample_user_profile)

    assert isinstance(query, str)
    assert len(query) > 0
    assert "wheat" in query.lower() or "rice" in query.lower()
    assert "small" in query.lower()


def test_fallback_extraction(scheme_service):
    """Test fallback information extraction."""
    content = "Sample scheme content"
    metadata = {
        "scheme_name": "Test Scheme",
        "scheme_type": "subsidy",
        "benefits": "Test benefits",
    }

    result = scheme_service._fallback_extraction(content, metadata)

    assert result["scheme_name"] == "Test Scheme"
    assert result["scheme_type"] == "subsidy"
    assert "description" in result
    assert "benefits" in result
    assert "application_procedure" in result


@pytest.mark.asyncio
async def test_search_schemes_no_results(scheme_service):
    """Test scheme search with no results."""
    with patch.object(scheme_service.rag_engine, "retrieve_documents") as mock_retrieve:
        mock_retrieve.return_value = []

        results = await scheme_service.search_schemes(
            query="nonexistent scheme",
            top_k=5,
        )

        assert len(results) == 0


@pytest.mark.asyncio
async def test_get_scheme_details_not_found(scheme_service):
    """Test getting details for non-existent scheme."""
    with patch.object(scheme_service.rag_engine, "retrieve_documents") as mock_retrieve:
        mock_retrieve.return_value = []

        result = await scheme_service.get_scheme_details(
            scheme_name="NonExistent Scheme",
        )

        assert result is None


def test_eligibility_with_partial_profile(scheme_service):
    """Test eligibility assessment with incomplete user profile."""
    partial_profile = UserProfile(
        user_id="test_user",
        crops=["wheat"],
        # Missing other fields
    )

    scheme_info = {
        "scheme_name": "Test Scheme",
        "eligibility_criteria": ["All farmers"],
        "required_documents": ["Aadhaar"],
    }

    result = scheme_service._assess_eligibility(scheme_info, partial_profile)

    assert "eligibility_score" in result
    assert isinstance(result["eligibility_score"], float)
    # Should still provide some assessment even with partial data
    assert 0.0 <= result["eligibility_score"] <= 1.0
