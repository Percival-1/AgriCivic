"""
Integration tests for the Government Scheme API.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from app.main import app
from app.services.scheme_service import SchemeRecommendation

client = TestClient(app)


@pytest.fixture
def sample_user_profile_request():
    """Sample user profile for API requests."""
    return {
        "user_id": "test_user_123",
        "location": {
            "state": "punjab",
            "district": "ludhiana",
            "latitude": 30.9,
            "longitude": 75.8,
        },
        "crops": ["wheat", "rice"],
        "land_size_hectares": 1.5,
        "farmer_category": "small",
        "annual_income": 80000,
        "age": 35,
        "gender": "male",
        "caste_category": "general",
        "has_bank_account": True,
        "has_aadhaar": True,
    }


@pytest.fixture
def sample_scheme_recommendation():
    """Sample scheme recommendation for mocking."""
    return SchemeRecommendation(
        scheme_id="scheme_001",
        scheme_name="PM-KISAN",
        scheme_type="financial_assistance",
        description="Direct income support of ₹6000 per year to small and marginal farmers",
        eligibility_score=0.9,
        is_eligible=True,
        eligibility_reasons=["Eligible as small farmer", "Land size within limit"],
        ineligibility_reasons=[],
        benefits=["₹6000 per year in three installments", "Direct bank transfer"],
        application_procedure="Apply online through PM-KISAN portal or visit nearest CSC",
        required_documents=["Aadhaar Card", "Bank Account Details", "Land Records"],
        application_deadline=None,
        contact_information="PM-KISAN Helpline: 155261",
        source_document="Ministry of Agriculture and Farmers Welfare",
        location_specific=False,
        priority_score=0.87,
    )


def test_search_schemes_endpoint(
    sample_user_profile_request, sample_scheme_recommendation
):
    """Test the scheme search endpoint."""
    with patch("app.api.scheme.scheme_service.search_schemes") as mock_search:
        mock_search.return_value = [sample_scheme_recommendation]

        response = client.post(
            "/api/v1/schemes/search",
            json={
                "query": "financial assistance for small farmers",
                "user_profile": sample_user_profile_request,
                "top_k": 10,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "recommendations" in data
        assert len(data["recommendations"]) > 0
        assert data["recommendations"][0]["scheme_name"] == "PM-KISAN"


def test_personalized_recommendations_endpoint(
    sample_user_profile_request, sample_scheme_recommendation
):
    """Test the personalized recommendations endpoint."""
    with patch(
        "app.api.scheme.scheme_service.get_personalized_recommendations"
    ) as mock_recommend:
        mock_recommend.return_value = [sample_scheme_recommendation]

        response = client.post(
            "/api/v1/schemes/recommendations",
            json={
                "user_profile": sample_user_profile_request,
                "limit": 5,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "recommendations" in data
        assert len(data["recommendations"]) > 0
        assert data["recommendations"][0]["is_eligible"] is True


def test_scheme_details_endpoint(
    sample_user_profile_request, sample_scheme_recommendation
):
    """Test the scheme details endpoint."""
    with patch("app.api.scheme.scheme_service.get_scheme_details") as mock_details:
        mock_details.return_value = sample_scheme_recommendation

        response = client.post(
            "/api/v1/schemes/details",
            json={
                "scheme_name": "PM-KISAN",
                "user_profile": sample_user_profile_request,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "scheme" in data
        assert data["scheme"]["scheme_name"] == "PM-KISAN"


def test_scheme_details_not_found():
    """Test scheme details endpoint with non-existent scheme."""
    with patch("app.api.scheme.scheme_service.get_scheme_details") as mock_details:
        mock_details.return_value = None

        response = client.post(
            "/api/v1/schemes/details",
            json={
                "scheme_name": "NonExistent Scheme",
            },
        )

        assert response.status_code == 404
        data = response.json()
        # The global exception handler wraps errors in an "error" object
        assert "error" in data or "detail" in data


def test_simple_scheme_search_endpoint(sample_scheme_recommendation):
    """Test the simple scheme search endpoint."""
    with patch("app.api.scheme.scheme_service.search_schemes") as mock_search:
        mock_search.return_value = [sample_scheme_recommendation]

        response = client.get(
            "/api/v1/schemes/search/simple",
            params={
                "query": "financial assistance",
                "limit": 10,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "schemes" in data
        assert len(data["schemes"]) > 0


def test_get_scheme_types_endpoint():
    """Test the scheme types endpoint."""
    response = client.get("/api/v1/schemes/types")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "scheme_types" in data
    assert isinstance(data["scheme_types"], list)
    assert "financial_assistance" in data["scheme_types"]


def test_get_farmer_categories_endpoint():
    """Test the farmer categories endpoint."""
    response = client.get("/api/v1/schemes/categories")

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "categories" in data
    assert "farmer_categories" in data["categories"]
    assert "caste_categories" in data["categories"]


def test_check_eligibility_endpoint(
    sample_user_profile_request, sample_scheme_recommendation
):
    """Test the eligibility check endpoint."""
    with patch("app.api.scheme.scheme_service.get_scheme_details") as mock_details:
        mock_details.return_value = sample_scheme_recommendation

        response = client.post(
            "/api/v1/schemes/eligibility/check",
            json={
                "scheme_name": "PM-KISAN",
                "user_profile": sample_user_profile_request,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "is_eligible" in data
        assert "eligibility_score" in data
        assert "eligibility_reasons" in data


def test_search_schemes_with_filters(
    sample_user_profile_request, sample_scheme_recommendation
):
    """Test scheme search with type filters."""
    with patch("app.api.scheme.scheme_service.search_schemes") as mock_search:
        mock_search.return_value = [sample_scheme_recommendation]

        response = client.post(
            "/api/v1/schemes/search",
            json={
                "query": "farmer schemes",
                "user_profile": sample_user_profile_request,
                "scheme_types": ["financial_assistance", "subsidy"],
                "top_k": 5,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["recommendations"]) > 0


def test_search_schemes_without_profile(sample_scheme_recommendation):
    """Test scheme search without user profile."""
    with patch("app.api.scheme.scheme_service.search_schemes") as mock_search:
        mock_search.return_value = [sample_scheme_recommendation]

        response = client.post(
            "/api/v1/schemes/search",
            json={
                "query": "agricultural schemes",
                "top_k": 10,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "recommendations" in data


def test_api_error_handling():
    """Test API error handling."""
    with patch("app.api.scheme.scheme_service.search_schemes") as mock_search:
        mock_search.side_effect = Exception("Test error")

        response = client.post(
            "/api/v1/schemes/search",
            json={
                "query": "test query",
                "top_k": 5,
            },
        )

        assert response.status_code == 500
        data = response.json()
        # The global exception handler wraps errors in an "error" object
        assert "error" in data or "detail" in data


def test_invalid_request_data():
    """Test API with invalid request data."""
    response = client.post(
        "/api/v1/schemes/search",
        json={
            "query": "test",
            "top_k": -1,  # Invalid value
        },
    )

    assert response.status_code == 422  # Validation error


def test_simple_search_with_scheme_type(sample_scheme_recommendation):
    """Test simple search with scheme type filter."""
    with patch("app.api.scheme.scheme_service.search_schemes") as mock_search:
        mock_search.return_value = [sample_scheme_recommendation]

        response = client.get(
            "/api/v1/schemes/search/simple",
            params={
                "query": "subsidy schemes",
                "scheme_type": "subsidy",
                "limit": 5,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
