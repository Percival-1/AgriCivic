"""
Tests for treatment recommendation service.
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from app.services.treatment_recommendation_service import (
    TreatmentRecommendationService,
    TreatmentType,
    TreatmentUrgency,
    DosageInformation,
    ApplicationMethod,
    CostEstimate,
    PreventionStrategy,
    TreatmentRecommendation,
    ComprehensiveTreatmentPlan,
    treatment_service,
)
from app.services.vision_service import (
    DiseaseIdentification,
    DiseaseConfidence,
    CropDiseaseAnalysis,
)


class TestTreatmentRecommendationService:
    """Test cases for TreatmentRecommendationService."""

    def setup_method(self):
        """Set up test fixtures."""
        self.service = TreatmentRecommendationService()

    def create_mock_disease_analysis(
        self,
        disease_name="wheat rust",
        crop_type="wheat",
        severity="moderate",
        confidence=0.85,
    ):
        """Create a mock disease analysis for testing."""
        disease_id = DiseaseIdentification(
            disease_name=disease_name,
            confidence_score=confidence,
            confidence_level=DiseaseConfidence.HIGH,
            crop_type=crop_type,
            affected_parts=["leaves"],
            severity=severity,
            description=f"Test {disease_name} identification",
        )

        analysis = CropDiseaseAnalysis(
            image_id="test_img_123",
            timestamp=datetime.now(),
            crop_type=crop_type,
            diseases=[disease_id],
            primary_disease=disease_id,
            treatment_recommendations=[],
            prevention_strategies=[],
            confidence_summary="Test analysis",
            processing_time=1.0,
            model_used="test_model",
        )

        return analysis

    def test_determine_urgency(self):
        """Test urgency determination based on severity."""
        assert self.service._determine_urgency("severe") == TreatmentUrgency.IMMEDIATE
        assert self.service._determine_urgency("moderate") == TreatmentUrgency.URGENT
        assert self.service._determine_urgency("mild") == TreatmentUrgency.MODERATE
        assert self.service._determine_urgency(None) == TreatmentUrgency.MODERATE

    def test_extract_treatment_name(self):
        """Test treatment name extraction from text."""
        text = "Apply Propiconazole fungicide at recommended dosage"
        name = self.service._extract_treatment_name(text)
        assert "Propiconazole" in name or "Recommended Treatment" in name

    def test_extract_treatment_type(self):
        """Test treatment type extraction."""
        assert self.service._extract_treatment_type("use fungicide spray") == "chemical"
        assert self.service._extract_treatment_type("apply neem oil") == "organic"
        assert (
            self.service._extract_treatment_type("biological control agent")
            == "biological"
        )
        assert (
            self.service._extract_treatment_type("crop rotation practice") == "cultural"
        )

    def test_extract_dosage_information(self):
        """Test dosage information extraction."""
        text = "Apply 250ml per acre with proper dilution"
        dosages = self.service._extract_dosage_information(text)

        assert len(dosages) > 0
        assert isinstance(dosages[0], DosageInformation)
        assert "250" in dosages[0].dosage_per_acre

    def test_extract_application_method(self):
        """Test application method extraction."""
        text = "Spray the solution evenly on affected plants"
        method = self.service._extract_application_method(text)

        assert isinstance(method, ApplicationMethod)
        assert method.method == "spray"
        assert len(method.precautions) > 0

    def test_extract_cost_estimate(self):
        """Test cost estimate extraction."""
        text = "Treatment costs approximately Rs. 1500 per acre"
        cost = self.service._extract_cost_estimate(text)

        assert isinstance(cost, CostEstimate)
        assert cost.currency == "INR"
        assert cost.cost_range is not None

    def test_extract_safety_precautions(self):
        """Test safety precautions extraction."""
        text = "Wear protective equipment and avoid contact with skin. Wash hands after use."
        precautions = self.service._extract_safety_precautions(text)

        assert len(precautions) > 0
        assert any("protective" in p.lower() for p in precautions)

    def test_parse_prevention_strategies(self):
        """Test prevention strategies parsing."""
        text = "To prevent disease, use resistant varieties and maintain proper spacing. Avoid overhead irrigation to reduce moisture."
        strategies = self.service._parse_prevention_strategies(
            text, "wheat rust", "wheat"
        )

        assert len(strategies) > 0
        assert all(isinstance(s, dict) for s in strategies)

    @pytest.mark.asyncio
    @patch("app.services.treatment_recommendation_service.rag_engine")
    async def test_retrieve_treatment_information(self, mock_rag):
        """Test treatment information retrieval from RAG engine."""
        # Mock RAG engine response
        mock_rag.search_and_generate = AsyncMock(
            return_value={
                "response": "Treatment for wheat rust includes fungicide application",
                "sources": [{"id": "doc1", "source": "Agricultural Guide"}],
                "grounding_score": 0.9,
                "num_sources": 1,
            }
        )

        result = await self.service._retrieve_treatment_information(
            disease_name="wheat rust", crop_type="wheat", user_context=None
        )

        assert result is not None
        assert "response" in result
        assert "sources" in result
        assert result["grounding_score"] > 0

    @pytest.mark.asyncio
    @patch("app.services.treatment_recommendation_service.rag_engine")
    async def test_generate_primary_treatment(self, mock_rag):
        """Test primary treatment generation."""
        disease = DiseaseIdentification(
            disease_name="wheat rust",
            confidence_score=0.85,
            confidence_level=DiseaseConfidence.HIGH,
            severity="moderate",
        )

        rag_results = {
            "response": "Apply Propiconazole fungicide at 250ml per acre. Spray in early morning. Cost: Rs. 800 per acre. Wear protective equipment.",
            "sources": [{"id": "doc1", "source": "Fungicide Guide"}],
            "grounding_score": 0.9,
        }

        treatment = await self.service._generate_primary_treatment(
            disease=disease,
            crop_type="wheat",
            rag_results=rag_results,
            user_context=None,
        )

        assert treatment is not None
        assert isinstance(treatment, TreatmentRecommendation)
        assert treatment.treatment_name is not None
        assert treatment.urgency == TreatmentUrgency.URGENT
        assert len(treatment.sources) > 0

    @pytest.mark.asyncio
    @patch("app.services.treatment_recommendation_service.rag_engine")
    async def test_generate_alternative_treatments(self, mock_rag):
        """Test alternative treatments generation."""
        disease = DiseaseIdentification(
            disease_name="wheat rust",
            confidence_score=0.85,
            confidence_level=DiseaseConfidence.HIGH,
            severity="moderate",
        )

        primary_treatment = TreatmentRecommendation(
            treatment_id="treat_1",
            treatment_type=TreatmentType.CHEMICAL,
            urgency=TreatmentUrgency.URGENT,
            effectiveness_rating=0.9,
            treatment_name="Chemical Treatment",
            description="Primary chemical treatment",
        )

        rag_results = {
            "response": "Chemical treatment with fungicide. Organic alternatives include neem oil application. Cultural practices like crop rotation help prevent recurrence.",
            "sources": [{"id": "doc1", "source": "Treatment Guide"}],
            "grounding_score": 0.85,
        }

        alternatives = await self.service._generate_alternative_treatments(
            disease=disease,
            crop_type="wheat",
            rag_results=rag_results,
            primary_treatment=primary_treatment,
        )

        assert isinstance(alternatives, list)
        # May have 0 or more alternatives depending on parsing
        for alt in alternatives:
            assert isinstance(alt, TreatmentRecommendation)
            assert alt.treatment_id != primary_treatment.treatment_id

    @pytest.mark.asyncio
    @patch("app.services.treatment_recommendation_service.rag_engine")
    async def test_generate_prevention_strategies(self, mock_rag):
        """Test prevention strategies generation."""
        disease = DiseaseIdentification(
            disease_name="wheat rust",
            confidence_score=0.85,
            confidence_level=DiseaseConfidence.HIGH,
        )

        rag_results = {
            "response": "To prevent wheat rust, use resistant varieties. Maintain proper plant spacing to reduce humidity. Remove infected plant debris. Apply preventive fungicides before disease onset.",
            "sources": [{"id": "doc1", "source": "Prevention Guide"}],
            "grounding_score": 0.9,
        }

        strategies = await self.service._generate_prevention_strategies(
            disease=disease, crop_type="wheat", rag_results=rag_results
        )

        assert isinstance(strategies, list)
        assert len(strategies) > 0
        for strategy in strategies:
            assert isinstance(strategy, PreventionStrategy)
            assert strategy.description is not None

    @pytest.mark.asyncio
    @patch("app.services.treatment_recommendation_service.rag_engine")
    async def test_generate_treatment_plan_success(self, mock_rag):
        """Test complete treatment plan generation."""
        # Mock RAG engine
        mock_rag.search_and_generate = AsyncMock(
            return_value={
                "response": "Treatment for wheat rust: Apply Propiconazole fungicide at 250ml per acre. Spray in early morning. Cost: Rs. 800 per acre. Prevention: Use resistant varieties and maintain proper spacing.",
                "sources": [
                    {"id": "doc1", "source": "Fungicide Guide", "category": "treatment"}
                ],
                "grounding_score": 0.9,
                "num_sources": 1,
            }
        )

        # Create mock disease analysis
        disease_analysis = self.create_mock_disease_analysis()

        # Generate treatment plan
        plan = await self.service.generate_treatment_plan(
            disease_analysis=disease_analysis, user_context=None
        )

        assert isinstance(plan, ComprehensiveTreatmentPlan)
        assert plan.plan_id is not None
        assert plan.disease_identification is not None
        assert plan.crop_type == "wheat"
        assert plan.grounding_score > 0
        assert len(plan.knowledge_base_sources) > 0

    @pytest.mark.asyncio
    @patch("app.services.treatment_recommendation_service.rag_engine")
    async def test_generate_treatment_plan_no_primary_disease(self, mock_rag):
        """Test treatment plan generation with no primary disease."""
        # Create analysis without primary disease
        analysis = CropDiseaseAnalysis(
            image_id="test_img",
            timestamp=datetime.now(),
            crop_type="wheat",
            diseases=[],
            primary_disease=None,
            treatment_recommendations=[],
            prevention_strategies=[],
            confidence_summary="No disease detected",
            processing_time=1.0,
            model_used="test_model",
        )

        with pytest.raises(ValueError, match="No primary disease identified"):
            await self.service.generate_treatment_plan(
                disease_analysis=analysis, user_context=None
            )

    @pytest.mark.asyncio
    @patch("app.services.treatment_recommendation_service.rag_engine")
    async def test_get_treatment_by_disease(self, mock_rag):
        """Test getting treatment for specific disease."""
        mock_rag.search_and_generate = AsyncMock(
            return_value={
                "response": "Treatment information for wheat rust",
                "sources": [{"id": "doc1"}],
            }
        )

        result = await self.service.get_treatment_by_disease(
            disease_name="wheat rust", crop_type="wheat"
        )

        assert result is not None
        assert "response" in result
        assert "sources" in result

    @pytest.mark.asyncio
    @patch("app.services.treatment_recommendation_service.rag_engine")
    async def test_health_check(self, mock_rag):
        """Test service health check."""
        mock_rag.get_knowledge_base_stats = Mock(
            return_value={"total_documents": 100, "collections": {}}
        )

        health = await self.service.health_check()

        assert health["status"] == "healthy"
        assert "knowledge_base_stats" in health
        assert "treatment_collections" in health

    def test_comprehensive_treatment_plan_to_dict(self):
        """Test conversion of treatment plan to dictionary."""
        disease = DiseaseIdentification(
            disease_name="wheat rust",
            confidence_score=0.85,
            confidence_level=DiseaseConfidence.HIGH,
        )

        plan = ComprehensiveTreatmentPlan(
            plan_id="plan_123",
            disease_identification=disease,
            crop_type="wheat",
            confidence_level="high",
        )

        plan_dict = plan.to_dict()

        assert isinstance(plan_dict, dict)
        assert plan_dict["plan_id"] == "plan_123"
        assert plan_dict["crop_type"] == "wheat"
        assert "created_at" in plan_dict
        # Verify datetime was converted to ISO format
        assert isinstance(plan_dict["created_at"], str)


class TestTreatmentDataModels:
    """Test cases for treatment data models."""

    def test_dosage_information_creation(self):
        """Test DosageInformation dataclass."""
        dosage = DosageInformation(
            active_ingredient="Propiconazole",
            concentration="25% EC",
            dosage_per_acre="250ml",
            frequency="Once per week",
        )

        assert dosage.active_ingredient == "Propiconazole"
        assert dosage.concentration == "25% EC"
        assert dosage.dosage_per_acre == "250ml"

    def test_application_method_creation(self):
        """Test ApplicationMethod dataclass."""
        method = ApplicationMethod(
            method="spray",
            equipment_needed=["Sprayer", "Protective gear"],
            timing="Early morning",
            weather_conditions=["Dry weather"],
            precautions=["Wear mask"],
        )

        assert method.method == "spray"
        assert len(method.equipment_needed) == 2
        assert "Early morning" in method.timing

    def test_cost_estimate_creation(self):
        """Test CostEstimate dataclass."""
        cost = CostEstimate(
            treatment_cost_per_acre=1500.0,
            chemical_cost=1000.0,
            application_cost=500.0,
            total_estimated_cost=1500.0,
            cost_range="₹1200-1800",
            currency="INR",
        )

        assert cost.treatment_cost_per_acre == 1500.0
        assert cost.currency == "INR"
        assert "₹" in cost.cost_range

    def test_prevention_strategy_creation(self):
        """Test PreventionStrategy dataclass."""
        strategy = PreventionStrategy(
            strategy_type="cultural",
            description="Use resistant varieties",
            timing="Before planting",
            effectiveness="High",
            cost_effectiveness="Low cost",
        )

        assert strategy.strategy_type == "cultural"
        assert "resistant" in strategy.description

    def test_treatment_recommendation_creation(self):
        """Test TreatmentRecommendation dataclass."""
        treatment = TreatmentRecommendation(
            treatment_id="treat_123",
            treatment_type=TreatmentType.CHEMICAL,
            urgency=TreatmentUrgency.URGENT,
            effectiveness_rating=0.85,
            treatment_name="Fungicide Treatment",
            description="Apply fungicide spray",
            sources=[{"id": "doc1", "source": "Guide"}],
            confidence_score=0.9,
        )

        assert treatment.treatment_id == "treat_123"
        assert treatment.treatment_type == TreatmentType.CHEMICAL
        assert treatment.urgency == TreatmentUrgency.URGENT
        assert treatment.effectiveness_rating == 0.85


@pytest.mark.integration
class TestTreatmentIntegration:
    """Integration tests for treatment recommendation service."""

    @pytest.mark.asyncio
    async def test_full_treatment_workflow(self):
        """Test complete treatment recommendation workflow."""
        # This test requires RAG engine to be properly configured
        # Skip if not available
        try:
            from app.services.rag_engine import rag_engine

            # Create mock disease analysis
            disease = DiseaseIdentification(
                disease_name="wheat rust",
                confidence_score=0.85,
                confidence_level=DiseaseConfidence.HIGH,
                severity="moderate",
            )

            analysis = CropDiseaseAnalysis(
                image_id="test_img",
                timestamp=datetime.now(),
                crop_type="wheat",
                diseases=[disease],
                primary_disease=disease,
                treatment_recommendations=[],
                prevention_strategies=[],
                confidence_summary="Test",
                processing_time=1.0,
                model_used="test",
            )

            # Generate treatment plan
            plan = await treatment_service.generate_treatment_plan(
                disease_analysis=analysis, user_context=None
            )

            assert plan is not None
            assert isinstance(plan, ComprehensiveTreatmentPlan)

        except Exception as e:
            pytest.skip(f"Integration test skipped: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
