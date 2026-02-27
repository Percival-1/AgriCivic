"""
Treatment Recommendation Service for the agri-civic intelligence platform.

This service connects disease identification with the RAG engine to provide
comprehensive treatment recommendations with dosage information, prevention
strategies, and source citations.
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
import json
import re

from app.services.rag_engine import rag_engine
from app.services.vision_service import DiseaseIdentification, CropDiseaseAnalysis
from app.config import get_settings
from app.core.logging import get_logger

settings = get_settings()
logger = get_logger(__name__)


class TreatmentType(str, Enum):
    """Types of treatment approaches."""

    CHEMICAL = "chemical"
    ORGANIC = "organic"
    BIOLOGICAL = "biological"
    CULTURAL = "cultural"
    INTEGRATED = "integrated"


class TreatmentUrgency(str, Enum):
    """Treatment urgency levels."""

    IMMEDIATE = "immediate"  # Apply within 24-48 hours
    URGENT = "urgent"  # Apply within 3-7 days
    MODERATE = "moderate"  # Apply within 1-2 weeks
    PREVENTIVE = "preventive"  # For future prevention


@dataclass
class DosageInformation:
    """Detailed dosage information for treatments."""

    active_ingredient: str
    concentration: str
    dosage_per_acre: str
    dosage_per_liter_water: Optional[str] = None
    application_rate: Optional[str] = None
    frequency: Optional[str] = None
    total_applications: Optional[int] = None
    interval_days: Optional[int] = None


@dataclass
class ApplicationMethod:
    """Application method details."""

    method: str  # spray, soil_application, seed_treatment, etc.
    equipment_needed: List[str] = field(default_factory=list)
    timing: str = ""
    weather_conditions: List[str] = field(default_factory=list)
    precautions: List[str] = field(default_factory=list)


@dataclass
class CostEstimate:
    """Cost estimation for treatment."""

    treatment_cost_per_acre: Optional[float] = None
    chemical_cost: Optional[float] = None
    application_cost: Optional[float] = None
    total_estimated_cost: Optional[float] = None
    cost_range: Optional[str] = None
    currency: str = "INR"


@dataclass
class PreventionStrategy:
    """Prevention strategy details."""

    strategy_type: str  # cultural, chemical, biological
    description: str
    timing: str
    effectiveness: Optional[str] = None
    cost_effectiveness: Optional[str] = None
    implementation_difficulty: Optional[str] = None


@dataclass
class TreatmentRecommendation:
    """Enhanced treatment recommendation with comprehensive details."""

    treatment_id: str
    treatment_type: TreatmentType
    urgency: TreatmentUrgency
    effectiveness_rating: float  # 0.0 to 1.0

    # Core treatment information
    treatment_name: str
    description: str
    dosage_info: List[DosageInformation] = field(default_factory=list)
    application_method: Optional[ApplicationMethod] = None

    # Cost and availability
    cost_estimate: Optional[CostEstimate] = None
    availability: Optional[str] = None
    local_suppliers: List[str] = field(default_factory=list)

    # Safety and precautions
    safety_precautions: List[str] = field(default_factory=list)
    environmental_impact: Optional[str] = None
    resistance_management: List[str] = field(default_factory=list)

    # Source information
    sources: List[Dict[str, Any]] = field(default_factory=list)
    confidence_score: float = 0.0
    last_updated: Optional[datetime] = None


@dataclass
class ComprehensiveTreatmentPlan:
    """Complete treatment plan for identified disease."""

    plan_id: str
    disease_identification: DiseaseIdentification
    crop_type: Optional[str]

    # Treatment recommendations
    primary_treatment: Optional[TreatmentRecommendation] = None
    alternative_treatments: List[TreatmentRecommendation] = field(default_factory=list)

    # Prevention strategies
    prevention_strategies: List[PreventionStrategy] = field(default_factory=list)

    # Additional information
    disease_progression: Optional[str] = None
    expected_recovery_time: Optional[str] = None
    monitoring_guidelines: List[str] = field(default_factory=list)

    # Source grounding
    knowledge_base_sources: List[Dict[str, Any]] = field(default_factory=list)
    grounding_score: float = 0.0

    # Metadata
    created_at: datetime = field(default_factory=datetime.now)
    confidence_level: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = asdict(self)
        # Convert datetime to ISO format
        result["created_at"] = self.created_at.isoformat()
        if self.primary_treatment and self.primary_treatment.last_updated:
            result["primary_treatment"][
                "last_updated"
            ] = self.primary_treatment.last_updated.isoformat()
        return result


class TreatmentRecommendationService:
    """
    Service for generating comprehensive treatment recommendations.

    This service integrates disease identification from vision models with
    the RAG engine to provide detailed, source-grounded treatment plans.
    """

    def __init__(self):
        """Initialize the treatment recommendation service."""
        self.rag_engine = rag_engine

        # Configuration
        self.treatment_collections = ["crop_diseases", "agricultural_knowledge"]
        self.top_k_sources = 10
        self.min_confidence_threshold = 0.6

    async def generate_treatment_plan(
        self,
        disease_analysis: CropDiseaseAnalysis,
        user_context: Optional[Dict[str, Any]] = None,
    ) -> ComprehensiveTreatmentPlan:
        """
        Generate comprehensive treatment plan from disease analysis.

        Args:
            disease_analysis: Disease analysis from vision service
            user_context: Optional user context (location, preferences, etc.)

        Returns:
            ComprehensiveTreatmentPlan with detailed recommendations
        """
        try:
            if not disease_analysis.primary_disease:
                raise ValueError("No primary disease identified in analysis")

            plan_id = f"plan_{int(datetime.now().timestamp() * 1000)}"
            primary_disease = disease_analysis.primary_disease

            logger.info(
                f"Generating treatment plan for {primary_disease.disease_name} "
                f"(confidence: {primary_disease.confidence_score:.2f})"
            )

            # Step 1: Retrieve treatment information from RAG engine
            treatment_info = await self._retrieve_treatment_information(
                disease_name=primary_disease.disease_name,
                crop_type=disease_analysis.crop_type,
                user_context=user_context,
            )

            # Step 2: Generate primary treatment recommendation
            primary_treatment = await self._generate_primary_treatment(
                disease=primary_disease,
                crop_type=disease_analysis.crop_type,
                rag_results=treatment_info,
                user_context=user_context,
            )

            # Step 3: Generate alternative treatments
            alternative_treatments = await self._generate_alternative_treatments(
                disease=primary_disease,
                crop_type=disease_analysis.crop_type,
                rag_results=treatment_info,
                primary_treatment=primary_treatment,
            )

            # Step 4: Generate prevention strategies
            prevention_strategies = await self._generate_prevention_strategies(
                disease=primary_disease,
                crop_type=disease_analysis.crop_type,
                rag_results=treatment_info,
            )

            # Step 5: Extract monitoring guidelines
            monitoring_guidelines = self._extract_monitoring_guidelines(treatment_info)

            # Create comprehensive treatment plan
            treatment_plan = ComprehensiveTreatmentPlan(
                plan_id=plan_id,
                disease_identification=primary_disease,
                crop_type=disease_analysis.crop_type,
                primary_treatment=primary_treatment,
                alternative_treatments=alternative_treatments,
                prevention_strategies=prevention_strategies,
                disease_progression=self._extract_disease_progression(treatment_info),
                expected_recovery_time=self._extract_recovery_time(treatment_info),
                monitoring_guidelines=monitoring_guidelines,
                knowledge_base_sources=treatment_info.get("sources", []),
                grounding_score=treatment_info.get("grounding_score", 0.0),
                confidence_level=primary_disease.confidence_level.value,
            )

            logger.info(
                f"Treatment plan {plan_id} generated successfully. "
                f"Primary treatment: {primary_treatment.treatment_name if primary_treatment else 'None'}, "
                f"Alternatives: {len(alternative_treatments)}, "
                f"Prevention strategies: {len(prevention_strategies)}"
            )

            return treatment_plan

        except Exception as e:
            logger.error(f"Failed to generate treatment plan: {e}")
            raise

    async def _retrieve_treatment_information(
        self,
        disease_name: str,
        crop_type: Optional[str],
        user_context: Optional[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Retrieve treatment information from RAG engine."""
        try:
            # Construct comprehensive query
            query_parts = [f"treatment for {disease_name}"]

            if crop_type:
                query_parts.append(f"in {crop_type}")

            query_parts.extend(
                [
                    "including dosage information",
                    "application methods",
                    "prevention strategies",
                    "and cost estimates",
                ]
            )

            query = " ".join(query_parts)

            # Add location filter if available
            filters = None
            if user_context and user_context.get("location"):
                filters = {"region": user_context["location"].get("state")}

            # Search RAG engine
            results = await self.rag_engine.search_and_generate(
                query=query,
                collections=self.treatment_collections,
                top_k=self.top_k_sources,
                response_type="comprehensive",
                language="en",
                filters=filters,
            )

            logger.info(
                f"Retrieved {results.get('num_sources', 0)} sources for {disease_name}"
            )

            return results

        except Exception as e:
            logger.error(f"Failed to retrieve treatment information: {e}")
            return {"response": "", "sources": [], "grounding_score": 0.0}

    async def _generate_primary_treatment(
        self,
        disease: DiseaseIdentification,
        crop_type: Optional[str],
        rag_results: Dict[str, Any],
        user_context: Optional[Dict[str, Any]],
    ) -> Optional[TreatmentRecommendation]:
        """Generate primary treatment recommendation."""
        try:
            response_text = rag_results.get("response", "")
            sources = rag_results.get("sources", [])

            if not response_text:
                logger.warning("No RAG response available for primary treatment")
                return None

            # Parse treatment information from RAG response
            treatment_data = self._parse_treatment_from_response(
                response_text, disease.disease_name, crop_type
            )

            if not treatment_data:
                return None

            # Determine urgency based on disease severity
            urgency = self._determine_urgency(disease.severity)

            # Create treatment recommendation
            treatment_id = f"treat_{int(datetime.now().timestamp() * 1000)}"

            treatment = TreatmentRecommendation(
                treatment_id=treatment_id,
                treatment_type=TreatmentType(treatment_data.get("type", "chemical")),
                urgency=urgency,
                effectiveness_rating=treatment_data.get("effectiveness", 0.8),
                treatment_name=treatment_data.get(
                    "name", f"Treatment for {disease.disease_name}"
                ),
                description=treatment_data.get("description", ""),
                dosage_info=treatment_data.get("dosage_info", []),
                application_method=treatment_data.get("application_method"),
                cost_estimate=treatment_data.get("cost_estimate"),
                availability=treatment_data.get("availability", "Widely available"),
                local_suppliers=treatment_data.get("local_suppliers", []),
                safety_precautions=treatment_data.get("safety_precautions", []),
                environmental_impact=treatment_data.get("environmental_impact"),
                resistance_management=treatment_data.get("resistance_management", []),
                sources=sources,
                confidence_score=rag_results.get("grounding_score", 0.0),
                last_updated=datetime.now(),
            )

            return treatment

        except Exception as e:
            logger.error(f"Failed to generate primary treatment: {e}")
            return None

    async def _generate_alternative_treatments(
        self,
        disease: DiseaseIdentification,
        crop_type: Optional[str],
        rag_results: Dict[str, Any],
        primary_treatment: Optional[TreatmentRecommendation],
    ) -> List[TreatmentRecommendation]:
        """Generate alternative treatment options."""
        try:
            alternatives = []
            response_text = rag_results.get("response", "")
            sources = rag_results.get("sources", [])

            # Parse alternative treatments from response
            alt_treatments_data = self._parse_alternative_treatments(
                response_text, disease.disease_name, crop_type
            )

            for idx, alt_data in enumerate(alt_treatments_data):
                # Skip if similar to primary treatment
                if (
                    primary_treatment
                    and alt_data.get("name") == primary_treatment.treatment_name
                ):
                    continue

                treatment_id = (
                    f"treat_alt_{int(datetime.now().timestamp() * 1000)}_{idx}"
                )

                alt_treatment = TreatmentRecommendation(
                    treatment_id=treatment_id,
                    treatment_type=TreatmentType(alt_data.get("type", "organic")),
                    urgency=self._determine_urgency(disease.severity),
                    effectiveness_rating=alt_data.get("effectiveness", 0.7),
                    treatment_name=alt_data.get(
                        "name", f"Alternative treatment {idx+1}"
                    ),
                    description=alt_data.get("description", ""),
                    dosage_info=alt_data.get("dosage_info", []),
                    application_method=alt_data.get("application_method"),
                    cost_estimate=alt_data.get("cost_estimate"),
                    availability=alt_data.get("availability", "Available"),
                    safety_precautions=alt_data.get("safety_precautions", []),
                    sources=sources,
                    confidence_score=rag_results.get("grounding_score", 0.0) * 0.9,
                    last_updated=datetime.now(),
                )

                alternatives.append(alt_treatment)

            logger.info(f"Generated {len(alternatives)} alternative treatments")
            return alternatives[:3]  # Limit to top 3 alternatives

        except Exception as e:
            logger.error(f"Failed to generate alternative treatments: {e}")
            return []

    async def _generate_prevention_strategies(
        self,
        disease: DiseaseIdentification,
        crop_type: Optional[str],
        rag_results: Dict[str, Any],
    ) -> List[PreventionStrategy]:
        """Generate prevention strategies."""
        try:
            strategies = []
            response_text = rag_results.get("response", "")

            # Parse prevention strategies from response
            prevention_data = self._parse_prevention_strategies(
                response_text, disease.disease_name, crop_type
            )

            for prev_data in prevention_data:
                strategy = PreventionStrategy(
                    strategy_type=prev_data.get("type", "cultural"),
                    description=prev_data.get("description", ""),
                    timing=prev_data.get("timing", ""),
                    effectiveness=prev_data.get("effectiveness"),
                    cost_effectiveness=prev_data.get("cost_effectiveness"),
                    implementation_difficulty=prev_data.get("difficulty"),
                )
                strategies.append(strategy)

            logger.info(f"Generated {len(strategies)} prevention strategies")
            return strategies

        except Exception as e:
            logger.error(f"Failed to generate prevention strategies: {e}")
            return []

    def _parse_treatment_from_response(
        self, response_text: str, disease_name: str, crop_type: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        """Parse treatment information from RAG response."""
        try:
            # Extract treatment sections
            treatment_data = {
                "name": self._extract_treatment_name(response_text),
                "type": self._extract_treatment_type(response_text),
                "description": self._extract_treatment_description(response_text),
                "dosage_info": self._extract_dosage_information(response_text),
                "application_method": self._extract_application_method(response_text),
                "cost_estimate": self._extract_cost_estimate(response_text),
                "safety_precautions": self._extract_safety_precautions(response_text),
                "effectiveness": 0.8,  # Default effectiveness
            }

            return treatment_data

        except Exception as e:
            logger.error(f"Failed to parse treatment from response: {e}")
            return None

    def _parse_alternative_treatments(
        self, response_text: str, disease_name: str, crop_type: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Parse alternative treatments from response."""
        alternatives = []

        # Look for organic/biological alternatives
        if "organic" in response_text.lower() or "biological" in response_text.lower():
            alternatives.append(
                {
                    "name": "Organic Treatment Option",
                    "type": "organic",
                    "description": self._extract_organic_treatment(response_text),
                    "dosage_info": [],
                    "effectiveness": 0.7,
                }
            )

        # Look for cultural practices
        if "cultural" in response_text.lower() or "practice" in response_text.lower():
            alternatives.append(
                {
                    "name": "Cultural Management",
                    "type": "cultural",
                    "description": self._extract_cultural_practices(response_text),
                    "dosage_info": [],
                    "effectiveness": 0.6,
                }
            )

        return alternatives

    def _parse_prevention_strategies(
        self, response_text: str, disease_name: str, crop_type: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Parse prevention strategies from response."""
        strategies = []

        # Extract prevention-related content
        prevention_keywords = ["prevent", "prevention", "avoid", "reduce risk"]

        for keyword in prevention_keywords:
            if keyword in response_text.lower():
                # Extract sentences containing prevention information
                sentences = response_text.split(".")
                for sentence in sentences:
                    if keyword in sentence.lower():
                        strategies.append(
                            {
                                "type": "cultural",
                                "description": sentence.strip(),
                                "timing": "Before disease onset",
                                "effectiveness": "High",
                            }
                        )

        return strategies[:5]  # Limit to top 5 strategies

    def _extract_treatment_name(self, text: str) -> str:
        """Extract treatment name from text."""
        # Look for chemical names or treatment mentions
        patterns = [
            r"(?:use|apply|spray)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)",
            r"([A-Z][a-z]+azole|[A-Z][a-z]+mycin)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)

        return "Recommended Treatment"

    def _extract_treatment_type(self, text: str) -> str:
        """Extract treatment type from text."""
        text_lower = text.lower()

        if any(word in text_lower for word in ["fungicide", "pesticide", "chemical"]):
            return "chemical"
        elif any(word in text_lower for word in ["organic", "neem", "natural"]):
            return "organic"
        elif any(word in text_lower for word in ["biological", "biocontrol"]):
            return "biological"
        elif any(word in text_lower for word in ["cultural", "practice", "management"]):
            return "cultural"

        return "chemical"

    def _extract_treatment_description(self, text: str) -> str:
        """Extract treatment description from text."""
        # Take first few sentences as description
        sentences = text.split(".")[:3]
        return ". ".join(sentences).strip() + "."

    def _extract_dosage_information(self, text: str) -> List[DosageInformation]:
        """Extract dosage information from text."""
        dosages = []

        # Look for dosage patterns
        dosage_pattern = r"(\d+(?:\.\d+)?)\s*(?:ml|g|kg|l)(?:/(?:acre|hectare|liter))?"
        matches = re.findall(dosage_pattern, text.lower())

        if matches:
            dosages.append(
                DosageInformation(
                    active_ingredient="Active ingredient",
                    concentration="As per label",
                    dosage_per_acre=f"{matches[0]} per acre",
                    frequency="As needed",
                )
            )

        return dosages

    def _extract_application_method(self, text: str) -> Optional[ApplicationMethod]:
        """Extract application method from text."""
        text_lower = text.lower()

        method = "spray"
        if "soil" in text_lower:
            method = "soil_application"
        elif "seed" in text_lower:
            method = "seed_treatment"

        return ApplicationMethod(
            method=method,
            equipment_needed=["Sprayer"] if method == "spray" else [],
            timing="Early morning or evening",
            weather_conditions=["Dry weather", "No rain expected for 24 hours"],
            precautions=["Wear protective equipment", "Follow label instructions"],
        )

    def _extract_cost_estimate(self, text: str) -> Optional[CostEstimate]:
        """Extract cost estimate from text."""
        # Look for cost mentions
        cost_pattern = r"(?:rs|rupees|inr)\.?\s*(\d+(?:,\d+)*(?:\.\d+)?)"
        match = re.search(cost_pattern, text.lower())

        if match:
            cost_value = float(match.group(1).replace(",", ""))
            return CostEstimate(
                treatment_cost_per_acre=cost_value,
                cost_range=f"₹{cost_value:.0f} - ₹{cost_value*1.5:.0f}",
                currency="INR",
            )

        return CostEstimate(cost_range="₹500 - ₹2000 per acre", currency="INR")

    def _extract_safety_precautions(self, text: str) -> List[str]:
        """Extract safety precautions from text."""
        precautions = []

        safety_keywords = ["wear", "protective", "avoid", "wash", "safety"]
        sentences = text.split(".")

        for sentence in sentences:
            if any(keyword in sentence.lower() for keyword in safety_keywords):
                precautions.append(sentence.strip())

        if not precautions:
            precautions = [
                "Wear protective equipment during application",
                "Avoid contact with skin and eyes",
                "Wash hands thoroughly after handling",
                "Keep away from children and pets",
            ]

        return precautions[:5]

    def _extract_organic_treatment(self, text: str) -> str:
        """Extract organic treatment information."""
        sentences = text.split(".")
        for sentence in sentences:
            if "organic" in sentence.lower() or "neem" in sentence.lower():
                return sentence.strip()
        return "Organic alternatives available - consult local agricultural expert"

    def _extract_cultural_practices(self, text: str) -> str:
        """Extract cultural practice information."""
        sentences = text.split(".")
        for sentence in sentences:
            if "cultural" in sentence.lower() or "practice" in sentence.lower():
                return sentence.strip()
        return "Implement good cultural practices for disease management"

    def _extract_monitoring_guidelines(self, rag_results: Dict[str, Any]) -> List[str]:
        """Extract monitoring guidelines from RAG results."""
        guidelines = [
            "Monitor crop regularly for disease symptoms",
            "Check treated areas after 7-10 days",
            "Repeat treatment if symptoms persist",
            "Maintain field hygiene and sanitation",
        ]
        return guidelines

    def _extract_disease_progression(
        self, rag_results: Dict[str, Any]
    ) -> Optional[str]:
        """Extract disease progression information."""
        response = rag_results.get("response", "")
        if "progress" in response.lower() or "spread" in response.lower():
            sentences = response.split(".")
            for sentence in sentences:
                if "progress" in sentence.lower() or "spread" in sentence.lower():
                    return sentence.strip()
        return None

    def _extract_recovery_time(self, rag_results: Dict[str, Any]) -> Optional[str]:
        """Extract expected recovery time."""
        response = rag_results.get("response", "")

        # Look for time mentions
        time_pattern = r"(\d+)\s*(?:days?|weeks?|months?)"
        match = re.search(time_pattern, response.lower())

        if match:
            return f"{match.group(0)} for visible improvement"

        return "7-14 days for visible improvement"

    def _determine_urgency(self, severity: Optional[str]) -> TreatmentUrgency:
        """Determine treatment urgency based on disease severity."""
        if not severity:
            return TreatmentUrgency.MODERATE

        severity_lower = severity.lower()

        if severity_lower == "severe":
            return TreatmentUrgency.IMMEDIATE
        elif severity_lower == "moderate":
            return TreatmentUrgency.URGENT
        elif severity_lower == "mild":
            return TreatmentUrgency.MODERATE
        else:
            return TreatmentUrgency.MODERATE

    async def get_treatment_by_disease(
        self, disease_name: str, crop_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get treatment information for a specific disease.

        Args:
            disease_name: Name of the disease
            crop_type: Optional crop type

        Returns:
            Treatment information dictionary
        """
        try:
            # Query RAG engine for disease treatment
            query = f"treatment for {disease_name}"
            if crop_type:
                query += f" in {crop_type}"

            results = await self.rag_engine.search_and_generate(
                query=query,
                collections=self.treatment_collections,
                top_k=5,
                response_type="comprehensive",
            )

            return results

        except Exception as e:
            logger.error(f"Failed to get treatment for disease: {e}")
            return {
                "response": "Treatment information not available",
                "sources": [],
                "error": str(e),
            }

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on treatment recommendation service."""
        try:
            # Check RAG engine connectivity
            rag_health = self.rag_engine.get_knowledge_base_stats()

            return {
                "status": "healthy",
                "rag_engine_status": "connected",
                "knowledge_base_stats": rag_health,
                "treatment_collections": self.treatment_collections,
            }

        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}


# Global instance
treatment_service = TreatmentRecommendationService()
