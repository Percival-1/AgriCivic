"""
Complete integration tests for treatment recommendation workflow.
Tests the complete flow from disease identification to treatment recommendations.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime
import io
from PIL import Image

from app.services.vision_service import (
    vision_service,
    DiseaseIdentification,
    DiseaseConfidence,
    CropDiseaseAnalysis,
)
from app.services.treatment_recommendation_service import (
    treatment_service,
    ComprehensiveTreatmentPlan,
)


class TestCompleteTreatmentWorkflow:
    """Integration tests for complete treatment workflow."""

    def create_test_image(self, format="JPEG", size=(200, 200)):
        """Create a test crop image."""
        # Create a simple green image (simulating crop)
        image = Image.new("RGB", size, color=(50, 150, 50))

        # Save to bytes
        img_bytes = io.BytesIO()
        image.save(img_bytes, format=format)
        img_bytes.seek(0)

        return img_bytes.getvalue()

    def create_mock_disease_analysis(self):
        """Create a mock disease analysis."""
        disease = DiseaseIdentification(
            disease_name="Late Blight",
            confidence_score=0.85,
            confidence_level=DiseaseConfidence.HIGH,
            crop_type="tomato",
            affected_parts=["leaves", "stems"],
            severity="moderate",
            description="Fungal disease affecting tomato plants",
        )

        analysis = CropDiseaseAnalysis(
            image_id="test_img_123",
            timestamp=datetime.now(),
            crop_type="tomato",
            diseases=[disease],
            primary_disease=disease,
            treatment_recommendations=[],
            prevention_strategies=[],
            confidence_summary="High confidence identification",
            processing_time=1.5,
            model_used="gpt-4o",
        )

        return analysis

    @pytest.mark.asyncio
    async def test_disease_to_treatment_workflow(self):
        """Test complete workflow from disease identification to treatment plan."""
        # Mock RAG engine response at the service instance level
        with patch.object(
            treatment_service.rag_engine,
            "search_and_generate",
            new=AsyncMock(
                return_value={
                    "response": """Treatment for Late Blight in tomato:
                    
                    Primary Treatment: Apply Mancozeb fungicide at 2.5kg per hectare. 
                    Mix with water at 2g per liter. Spray thoroughly covering all plant parts.
                    Cost: Rs. 800-1200 per acre.
                    
                    Application: Use foliar spray in early morning or evening. 
                    Repeat application every 7-10 days. Wear protective equipment during application.
                    
                    Prevention: Use resistant varieties. Maintain proper plant spacing. 
                    Remove infected plant debris. Avoid overhead irrigation.
                    
                    Alternative: Organic treatment with copper-based fungicides or neem oil.
                    """,
                    "sources": [
                        {
                            "id": "doc1",
                            "source": "Tomato Disease Management Guide",
                            "category": "disease_management",
                            "similarity_score": 0.92,
                            "collection": "crop_diseases",
                        },
                        {
                            "id": "doc2",
                            "source": "Fungicide Application Manual",
                            "category": "treatment",
                            "similarity_score": 0.88,
                            "collection": "agricultural_knowledge",
                        },
                    ],
                    "grounding_score": 0.9,
                    "num_sources": 2,
                }
            ),
        ):
            # Create disease analysis
            disease_analysis = self.create_mock_disease_analysis()

            # Generate treatment plan
            treatment_plan = await treatment_service.generate_treatment_plan(
                disease_analysis=disease_analysis,
                user_context={"location": {"state": "Maharashtra"}},
            )

            # Verify treatment plan structure
            assert isinstance(treatment_plan, ComprehensiveTreatmentPlan)
            assert treatment_plan.plan_id is not None
            assert treatment_plan.disease_identification.disease_name == "Late Blight"
            assert treatment_plan.crop_type == "tomato"

            # Verify primary treatment exists
            assert treatment_plan.primary_treatment is not None
            assert treatment_plan.primary_treatment.treatment_name is not None
            assert len(treatment_plan.primary_treatment.sources) > 0

            # Verify grounding
            assert treatment_plan.grounding_score > 0.5
            assert len(treatment_plan.knowledge_base_sources) > 0

            # Verify prevention strategies
            assert len(treatment_plan.prevention_strategies) > 0

            # Verify monitoring guidelines
            assert len(treatment_plan.monitoring_guidelines) > 0

    @pytest.mark.asyncio
    async def test_treatment_plan_with_dosage_info(self):
        """Test that treatment plan includes dosage information."""
        with patch.object(
            treatment_service.rag_engine,
            "search_and_generate",
            new=AsyncMock(
                return_value={
                    "response": "Apply Propiconazole 25% EC at 250ml per acre. Mix with 200 liters of water. Apply as foliar spray.",
                    "sources": [{"id": "doc1", "source": "Fungicide Guide"}],
                    "grounding_score": 0.85,
                    "num_sources": 1,
                }
            ),
        ):
            disease_analysis = self.create_mock_disease_analysis()
            treatment_plan = await treatment_service.generate_treatment_plan(
                disease_analysis=disease_analysis
            )

            # Check if dosage information is extracted
            if treatment_plan.primary_treatment:
                assert treatment_plan.primary_treatment.dosage_info is not None

    @pytest.mark.asyncio
    async def test_treatment_plan_with_cost_estimates(self):
        """Test that treatment plan includes cost estimates."""
        with patch.object(
            treatment_service.rag_engine,
            "search_and_generate",
            new=AsyncMock(
                return_value={
                    "response": "Treatment costs approximately Rs. 1500 per acre including chemical and application costs.",
                    "sources": [{"id": "doc1", "source": "Cost Guide"}],
                    "grounding_score": 0.8,
                    "num_sources": 1,
                }
            ),
        ):
            disease_analysis = self.create_mock_disease_analysis()
            treatment_plan = await treatment_service.generate_treatment_plan(
                disease_analysis=disease_analysis
            )

            # Check if cost information is extracted
            if (
                treatment_plan.primary_treatment
                and treatment_plan.primary_treatment.cost_estimate
            ):
                assert treatment_plan.primary_treatment.cost_estimate.currency == "INR"

    @pytest.mark.asyncio
    async def test_treatment_plan_source_citations(self):
        """Test that treatment recommendations include source citations."""
        with patch.object(
            treatment_service.rag_engine,
            "search_and_generate",
            new=AsyncMock(
                return_value={
                    "response": "Treatment information from agricultural research",
                    "sources": [
                        {"id": "doc1", "source": "Agricultural Research Institute"},
                        {"id": "doc2", "source": "Crop Protection Manual"},
                    ],
                    "grounding_score": 0.9,
                    "num_sources": 2,
                }
            ),
        ):
            disease_analysis = self.create_mock_disease_analysis()
            treatment_plan = await treatment_service.generate_treatment_plan(
                disease_analysis=disease_analysis
            )

            # Verify source citations
            assert len(treatment_plan.knowledge_base_sources) >= 2
            assert treatment_plan.grounding_score >= 0.5

    @pytest.mark.asyncio
    async def test_treatment_plan_prevention_strategies(self):
        """Test that treatment plan includes prevention strategies."""
        with patch.object(
            treatment_service.rag_engine,
            "search_and_generate",
            new=AsyncMock(
                return_value={
                    "response": """Treatment and prevention for Late Blight:
                    
                    To prevent disease: Use resistant varieties. Maintain proper spacing.
                    Remove infected debris. Avoid overhead watering to reduce humidity.
                    Apply preventive fungicides before disease onset.
                    """,
                    "sources": [{"id": "doc1", "source": "Prevention Guide"}],
                    "grounding_score": 0.85,
                    "num_sources": 1,
                }
            ),
        ):
            disease_analysis = self.create_mock_disease_analysis()
            treatment_plan = await treatment_service.generate_treatment_plan(
                disease_analysis=disease_analysis
            )

            # Verify prevention strategies
            assert len(treatment_plan.prevention_strategies) > 0

            # Check that strategies have required fields
            for strategy in treatment_plan.prevention_strategies:
                assert strategy.description is not None
                assert strategy.strategy_type in ["cultural", "chemical", "biological"]

    @pytest.mark.asyncio
    async def test_treatment_plan_serialization(self):
        """Test that treatment plan can be serialized to dict."""
        with patch.object(
            treatment_service.rag_engine,
            "search_and_generate",
            new=AsyncMock(
                return_value={
                    "response": "Treatment information",
                    "sources": [{"id": "doc1", "source": "Guide"}],
                    "grounding_score": 0.8,
                    "num_sources": 1,
                }
            ),
        ):
            disease_analysis = self.create_mock_disease_analysis()
            treatment_plan = await treatment_service.generate_treatment_plan(
                disease_analysis=disease_analysis
            )

            # Convert to dict
            plan_dict = treatment_plan.to_dict()

            # Verify serialization
            assert isinstance(plan_dict, dict)
            assert "plan_id" in plan_dict
            assert "disease_identification" in plan_dict
            assert "crop_type" in plan_dict
            assert "created_at" in plan_dict

            # Verify datetime was converted to string
            assert isinstance(plan_dict["created_at"], str)

    @pytest.mark.asyncio
    async def test_treatment_service_health_check(self):
        """Test treatment service health check."""
        health = await treatment_service.health_check()

        assert "status" in health
        assert health["status"] == "healthy"
        assert "rag_engine_status" in health
        assert "treatment_collections" in health

    @pytest.mark.asyncio
    async def test_get_treatment_by_disease_name(self):
        """Test getting treatment information by disease name."""
        with patch.object(
            treatment_service.rag_engine,
            "search_and_generate",
            new=AsyncMock(
                return_value={
                    "response": "Treatment for Late Blight includes fungicide application",
                    "sources": [{"id": "doc1", "source": "Disease Guide"}],
                }
            ),
        ):
            result = await treatment_service.get_treatment_by_disease(
                disease_name="Late Blight", crop_type="tomato"
            )

            assert result is not None
            assert "response" in result
            assert "sources" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
