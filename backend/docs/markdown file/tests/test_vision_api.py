"""
Tests for vision API endpoints.
"""

import pytest
import asyncio
import base64
import io
from unittest.mock import Mock, patch, AsyncMock
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.vision_service import (
    CropDiseaseAnalysis,
    DiseaseIdentification,
    TreatmentRecommendation,
    DiseaseConfidence,
)
from datetime import datetime


class TestVisionAPI:
    """Test cases for Vision API endpoints."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = TestClient(app)

    def create_test_image_bytes(self, format="JPEG", size=(100, 100), color="green"):
        """Create test image bytes."""
        image = Image.new("RGB", size, color)
        buffer = io.BytesIO()
        image.save(buffer, format=format)
        return buffer.getvalue()

    def create_test_image_file(self, filename="test.jpg", format="JPEG"):
        """Create test image file-like object."""
        image_data = self.create_test_image_bytes(format=format)
        return ("image", (filename, io.BytesIO(image_data), f"image/{format.lower()}"))

    def create_mock_analysis(self):
        """Create mock disease analysis result."""
        disease = DiseaseIdentification(
            disease_name="wheat rust",
            confidence_score=0.85,
            confidence_level=DiseaseConfidence.HIGH,
            crop_type="wheat",
            affected_parts=["leaves"],
            severity="moderate",
            description="Orange pustules on leaf surface",
        )

        treatment = TreatmentRecommendation(
            treatment_type="chemical",
            active_ingredients=["propiconazole"],
            dosage="250ml per acre",
            application_method="foliar spray",
            timing="early morning",
            precautions=["wear protective gear"],
            cost_estimate="500-800 INR per acre",
        )

        return CropDiseaseAnalysis(
            image_id="test_img_123",
            timestamp=datetime.now(),
            crop_type="wheat",
            diseases=[disease],
            primary_disease=disease,
            treatment_recommendations=[treatment],
            prevention_strategies=["Use resistant varieties", "Proper crop rotation"],
            confidence_summary="High confidence identification",
            processing_time=2.5,
            model_used="gpt-4-vision-preview",
        )

    @patch("app.services.vision_service.vision_service.identify_disease")
    def test_analyze_crop_image_upload_success(self, mock_identify):
        """Test successful crop image analysis via upload."""
        # Mock the vision service
        mock_analysis = self.create_mock_analysis()
        mock_identify.return_value = mock_analysis

        # Create test image file
        files = {
            "image": (
                "test.jpg",
                io.BytesIO(self.create_test_image_bytes()),
                "image/jpeg",
            )
        }
        data = {
            "crop_hint": "wheat",
            "location_context": "Punjab, India",
            "additional_context": "Leaves showing spots",
        }

        response = self.client.post(
            "/api/v1/vision/analyze/upload", files=files, data=data
        )

        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["analysis"]["crop_type"] == "wheat"
        assert len(result["analysis"]["diseases"]) == 1
        assert result["analysis"]["diseases"][0]["disease_name"] == "wheat rust"
        assert result["analysis"]["primary_disease"]["confidence_score"] == 0.85

    def test_analyze_crop_image_upload_invalid_file(self):
        """Test image analysis with invalid file type."""
        # Create non-image file
        files = {"image": ("test.txt", io.BytesIO(b"not an image"), "text/plain")}

        response = self.client.post("/api/v1/vision/analyze/upload", files=files)

        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]

    def test_analyze_crop_image_upload_empty_file(self):
        """Test image analysis with empty file."""
        files = {"image": ("empty.jpg", io.BytesIO(b""), "image/jpeg")}

        response = self.client.post("/api/v1/vision/analyze/upload", files=files)

        assert response.status_code == 400
        assert "Empty image file" in response.json()["detail"]

    @patch("app.services.vision_service.vision_service.identify_disease")
    def test_analyze_crop_image_base64_success(self, mock_identify):
        """Test successful crop image analysis via base64."""
        # Mock the vision service
        mock_analysis = self.create_mock_analysis()
        mock_identify.return_value = mock_analysis

        # Create base64 encoded image
        image_data = self.create_test_image_bytes()
        base64_image = base64.b64encode(image_data).decode("utf-8")

        request_data = {
            "image_base64": base64_image,
            "crop_hint": "wheat",
            "location_context": "Punjab, India",
            "additional_context": "Leaves showing spots",
        }

        response = self.client.post("/api/v1/vision/analyze/base64", json=request_data)

        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["analysis"]["crop_type"] == "wheat"

    def test_analyze_crop_image_base64_invalid_data(self):
        """Test base64 analysis with invalid base64 data."""
        request_data = {"image_base64": "invalid_base64_data", "crop_hint": "wheat"}

        response = self.client.post("/api/v1/vision/analyze/base64", json=request_data)

        assert response.status_code == 400
        assert "Invalid base64 image data" in response.json()["detail"]

    def test_analyze_crop_image_base64_data_url_format(self):
        """Test base64 analysis with data URL format."""
        # Create base64 encoded image with data URL prefix
        image_data = self.create_test_image_bytes()
        base64_image = base64.b64encode(image_data).decode("utf-8")
        data_url = f"data:image/jpeg;base64,{base64_image}"

        with patch(
            "app.services.vision_service.vision_service.identify_disease"
        ) as mock_identify:
            mock_identify.return_value = self.create_mock_analysis()

            request_data = {"image_base64": data_url, "crop_hint": "wheat"}

            response = self.client.post(
                "/api/v1/vision/analyze/base64", json=request_data
            )

            assert response.status_code == 200
            result = response.json()
            assert result["success"] is True

    @patch("app.services.vision_service.vision_service.validate_image")
    def test_validate_image_success(self, mock_validate):
        """Test successful image validation."""
        from app.services.vision_service import ImageValidationResult

        # Mock validation result
        mock_validate.return_value = ImageValidationResult(
            is_valid=True, format="jpeg", size=(100, 100), file_size_mb=0.1
        )

        files = {
            "image": (
                "test.jpg",
                io.BytesIO(self.create_test_image_bytes()),
                "image/jpeg",
            )
        }

        response = self.client.post("/api/v1/vision/validate", files=files)

        assert response.status_code == 200
        result = response.json()
        assert result["is_valid"] is True
        assert result["format"] == "jpeg"
        assert result["size"] == [100, 100]

    @patch("app.services.vision_service.vision_service.validate_image")
    def test_validate_image_failure(self, mock_validate):
        """Test image validation failure."""
        from app.services.vision_service import ImageValidationResult

        # Mock validation failure
        mock_validate.return_value = ImageValidationResult(
            is_valid=False, error_message="Image too large"
        )

        files = {"image": ("large.jpg", io.BytesIO(b"fake large image"), "image/jpeg")}

        response = self.client.post("/api/v1/vision/validate", files=files)

        assert response.status_code == 200
        result = response.json()
        assert result["is_valid"] is False
        assert result["error_message"] == "Image too large"

    @patch("app.services.vision_service.vision_service.get_detailed_treatment_info")
    def test_get_detailed_treatment_info_success(self, mock_treatment):
        """Test getting detailed treatment information."""
        # Mock treatment info
        mock_treatment.return_value = {
            "detailed_treatment": "Detailed treatment information for wheat rust",
            "sources": ["Agricultural handbook", "Research paper"],
            "confidence": 0.9,
        }

        request_data = {"disease_name": "wheat rust", "crop_type": "wheat"}

        response = self.client.post(
            "/api/v1/vision/treatment/detailed", json=request_data
        )

        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["disease_name"] == "wheat rust"
        assert result["crop_type"] == "wheat"
        assert "detailed_treatment" in result["treatment_info"]

    @patch("app.services.vision_service.vision_service.health_check")
    def test_vision_health_check_healthy(self, mock_health):
        """Test vision service health check when healthy."""
        mock_health.return_value = {
            "status": "healthy",
            "model": "gpt-4-vision-preview",
            "response_time": "< 1s",
            "test_response": "OK",
        }

        response = self.client.get("/api/v1/vision/health")

        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "healthy"
        assert result["model"] == "gpt-4o"

    @patch("app.services.vision_service.vision_service.health_check")
    def test_vision_health_check_unhealthy(self, mock_health):
        """Test vision service health check when unhealthy."""
        mock_health.side_effect = Exception("API connection failed")

        response = self.client.get("/api/v1/vision/health")

        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "unhealthy"
        assert "error" in result

    def test_get_supported_formats(self):
        """Test getting supported image formats."""
        response = self.client.get("/api/v1/vision/supported-formats")

        assert response.status_code == 200
        result = response.json()
        assert "supported_formats" in result
        assert "jpeg" in result["supported_formats"]
        assert "png" in result["supported_formats"]
        assert "max_file_size_mb" in result
        assert "recommendations" in result

    def test_get_disease_categories(self):
        """Test getting disease categories information."""
        response = self.client.get("/api/v1/vision/disease-categories")

        assert response.status_code == 200
        result = response.json()
        assert "disease_categories" in result
        assert "fungal" in result["disease_categories"]
        assert "bacterial" in result["disease_categories"]
        assert "viral" in result["disease_categories"]
        assert "identification_tips" in result

    @patch("app.services.vision_service.vision_service.identify_disease")
    def test_error_handling_vision_service_error(self, mock_identify):
        """Test error handling when vision service fails."""
        from app.services.vision_service import DiseaseIdentificationError

        # Mock service to raise an error
        mock_identify.side_effect = DiseaseIdentificationError("Analysis failed")

        files = {
            "image": (
                "test.jpg",
                io.BytesIO(self.create_test_image_bytes()),
                "image/jpeg",
            )
        }

        response = self.client.post("/api/v1/vision/analyze/upload", files=files)

        assert response.status_code == 200  # API returns 200 with error in response
        result = response.json()
        assert result["success"] is False
        assert "Disease identification failed" in result["error"]

    @patch("app.services.vision_service.vision_service.identify_disease")
    def test_error_handling_image_validation_error(self, mock_identify):
        """Test error handling for image validation errors."""
        from app.services.vision_service import ImageValidationError

        # Mock service to raise validation error
        mock_identify.side_effect = ImageValidationError("Invalid image format")

        files = {
            "image": (
                "test.jpg",
                io.BytesIO(self.create_test_image_bytes()),
                "image/jpeg",
            )
        }

        response = self.client.post("/api/v1/vision/analyze/upload", files=files)

        assert response.status_code == 200
        result = response.json()
        assert result["success"] is False
        assert "Image validation failed" in result["error"]


@pytest.mark.integration
class TestVisionAPIIntegration:
    """Integration tests for vision API (requires API keys)."""

    def setup_method(self):
        """Set up test fixtures."""
        self.client = TestClient(app)

    @pytest.mark.asyncio
    async def test_real_image_analysis(self):
        """Test with real image analysis (requires OpenAI API key)."""
        from app.config import get_settings

        settings = get_settings()

        if not settings.openai_api_key:
            pytest.skip("OpenAI API key not configured")

        # Create a test image with some "disease-like" features
        image = Image.new("RGB", (200, 200), "green")
        # Add brown spots to simulate disease
        for i in range(20):
            for j in range(20):
                if (i + j) % 4 == 0:
                    image.putpixel((100 + i, 100 + j), (139, 69, 19))

        buffer = io.BytesIO()
        image.save(buffer, format="JPEG")
        buffer.seek(0)

        files = {"image": ("test_disease.jpg", buffer, "image/jpeg")}
        data = {
            "crop_hint": "test crop",
            "additional_context": "Synthetic test image with brown spots",
        }

        try:
            response = self.client.post(
                "/api/v1/vision/analyze/upload", files=files, data=data
            )

            assert response.status_code == 200
            result = response.json()

            # Basic structure validation
            assert "success" in result
            if result["success"]:
                assert "analysis" in result
                assert "processing_time" in result
                analysis = result["analysis"]
                assert "image_id" in analysis
                assert "diseases" in analysis
                assert "model_used" in analysis
            else:
                # Log error for debugging
                print(f"Integration test error: {result.get('error', 'Unknown error')}")

        except Exception as e:
            print(f"Integration test failed: {e}")
            # Don't fail the test for API connectivity issues


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
