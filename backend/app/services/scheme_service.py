"""
Government Scheme Search and Recommendation Service.
Provides eligibility-based filtering, personalized recommendations, and application information.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass

from app.services.rag_engine import rag_engine
from app.services.llm_service import llm_service
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class UserProfile:
    """User profile for scheme eligibility assessment."""

    user_id: str
    location: Optional[Dict[str, Any]] = None  # {district, state, latitude, longitude}
    crops: Optional[List[str]] = None
    land_size_hectares: Optional[float] = None
    farmer_category: Optional[str] = None  # small, marginal, medium, large
    annual_income: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    caste_category: Optional[str] = None  # general, obc, sc, st
    has_bank_account: bool = True
    has_aadhaar: bool = True
    additional_attributes: Optional[Dict[str, Any]] = None


@dataclass
class SchemeRecommendation:
    """Scheme recommendation with eligibility and application details."""

    scheme_id: str
    scheme_name: str
    scheme_type: str
    description: str
    eligibility_score: float  # 0.0 to 1.0
    is_eligible: bool
    eligibility_reasons: List[str]
    ineligibility_reasons: List[str]
    benefits: List[str]
    application_procedure: str
    required_documents: List[str]
    application_deadline: Optional[str] = None
    contact_information: Optional[str] = None
    source_document: str = ""
    location_specific: bool = False
    priority_score: float = 0.0  # Combined score for ranking


class SchemeService:
    """Service for government scheme search and personalized recommendations."""

    def __init__(self):
        """Initialize the scheme service."""
        self.rag_engine = rag_engine
        self.llm_service = llm_service

        # Eligibility criteria weights
        self.eligibility_weights = {
            "location_match": 0.25,
            "crop_match": 0.20,
            "land_size_match": 0.20,
            "income_match": 0.15,
            "category_match": 0.10,
            "document_match": 0.10,
        }

    async def search_schemes(
        self,
        query: str,
        user_profile: Optional[UserProfile] = None,
        scheme_types: Optional[List[str]] = None,
        top_k: int = 10,
    ) -> List[SchemeRecommendation]:
        """
        Search for government schemes with optional user profile for personalization.

        Args:
            query: Search query describing scheme needs
            user_profile: User profile for eligibility filtering
            scheme_types: Filter by scheme types
            top_k: Number of schemes to return

        Returns:
            List of scheme recommendations sorted by relevance and eligibility
        """
        try:
            logger.info(f"Searching schemes for query: {query[:50]}...")

            # Build search filters
            filters = {}
            if scheme_types:
                filters["scheme_type"] = {"$in": scheme_types}

            # Retrieve relevant scheme documents
            scheme_documents = self.rag_engine.retrieve_documents(
                query=query,
                collections=["government_schemes"],
                top_k=top_k * 2,  # Retrieve more for filtering
                filters=filters if filters else None,
            )

            if not scheme_documents:
                logger.warning(f"No schemes found for query: {query}")
                return []

            # Process and rank schemes
            recommendations = []
            for doc in scheme_documents:
                recommendation = await self._process_scheme_document(
                    doc, user_profile, query
                )
                if recommendation:
                    recommendations.append(recommendation)

            # Sort by priority score (relevance + eligibility)
            recommendations.sort(key=lambda x: x.priority_score, reverse=True)

            # Return top k recommendations
            result = recommendations[:top_k]
            logger.info(f"Found {len(result)} scheme recommendations")
            return result

        except Exception as e:
            logger.error(f"Failed to search schemes: {e}")
            raise

    async def get_personalized_recommendations(
        self,
        user_profile: UserProfile,
        limit: int = 5,
    ) -> List[SchemeRecommendation]:
        """
        Get personalized scheme recommendations based on user profile.

        Args:
            user_profile: User profile for eligibility assessment
            limit: Maximum number of recommendations

        Returns:
            List of personalized scheme recommendations
        """
        try:
            logger.info(
                f"Getting personalized recommendations for user: {user_profile.user_id}"
            )

            # Build query from user profile
            query = self._build_profile_query(user_profile)

            # Search schemes with user profile
            recommendations = await self.search_schemes(
                query=query,
                user_profile=user_profile,
                top_k=limit * 2,  # Get more for better filtering
            )

            # Filter to only eligible schemes
            eligible_schemes = [r for r in recommendations if r.is_eligible]

            # If not enough eligible schemes, include partially eligible ones
            if len(eligible_schemes) < limit:
                partially_eligible = [
                    r
                    for r in recommendations
                    if not r.is_eligible and r.eligibility_score >= 0.5
                ]
                eligible_schemes.extend(
                    partially_eligible[: limit - len(eligible_schemes)]
                )

            result = eligible_schemes[:limit]
            logger.info(f"Generated {len(result)} personalized recommendations")
            return result

        except Exception as e:
            logger.error(f"Failed to get personalized recommendations: {e}")
            raise

    async def get_scheme_details(
        self,
        scheme_name: str,
        user_profile: Optional[UserProfile] = None,
    ) -> Optional[SchemeRecommendation]:
        """
        Get detailed information about a specific scheme.

        Args:
            scheme_name: Name of the scheme
            user_profile: Optional user profile for eligibility check

        Returns:
            Detailed scheme recommendation or None if not found
        """
        try:
            logger.info(f"Getting details for scheme: {scheme_name}")

            # Search for specific scheme
            filters = {"scheme_name": scheme_name}

            scheme_documents = self.rag_engine.retrieve_documents(
                query=scheme_name,
                collections=["government_schemes"],
                top_k=1,
                filters=filters,
            )

            if not scheme_documents:
                logger.warning(f"Scheme not found: {scheme_name}")
                return None

            # Process the scheme document
            recommendation = await self._process_scheme_document(
                scheme_documents[0], user_profile, scheme_name
            )

            return recommendation

        except Exception as e:
            logger.error(f"Failed to get scheme details: {e}")
            raise

    async def _process_scheme_document(
        self,
        document: Dict[str, Any],
        user_profile: Optional[UserProfile],
        query: str,
    ) -> Optional[SchemeRecommendation]:
        """Process a scheme document and create recommendation."""
        try:
            content = document.get("content", "")
            metadata = document.get("metadata", {})
            similarity_score = document.get("similarity_score", 0.0)

            # Extract scheme information using LLM
            scheme_info = await self._extract_scheme_information(content, metadata)

            # Calculate eligibility if user profile provided
            eligibility_result = None
            if user_profile:
                eligibility_result = self._assess_eligibility(scheme_info, user_profile)
            else:
                # Default eligibility when no profile
                eligibility_result = {
                    "eligibility_score": 0.5,
                    "is_eligible": True,
                    "eligibility_reasons": ["Profile not provided for assessment"],
                    "ineligibility_reasons": [],
                }

            # Calculate priority score (relevance + eligibility)
            priority_score = (similarity_score * 0.6) + (
                eligibility_result["eligibility_score"] * 0.4
            )

            # Create recommendation
            recommendation = SchemeRecommendation(
                scheme_id=document.get("id", ""),
                scheme_name=scheme_info.get(
                    "scheme_name", metadata.get("scheme_name", "Unknown")
                ),
                scheme_type=scheme_info.get(
                    "scheme_type", metadata.get("scheme_type", "general")
                ),
                description=scheme_info.get("description", content[:200]),
                eligibility_score=eligibility_result["eligibility_score"],
                is_eligible=eligibility_result["is_eligible"],
                eligibility_reasons=eligibility_result["eligibility_reasons"],
                ineligibility_reasons=eligibility_result["ineligibility_reasons"],
                benefits=scheme_info.get("benefits", []),
                application_procedure=self._format_application_procedure(
                    scheme_info.get("application_procedure", "")
                ),
                required_documents=scheme_info.get("required_documents", []),
                application_deadline=scheme_info.get("application_deadline"),
                contact_information=self._format_contact_information(
                    scheme_info.get("contact_information")
                ),
                source_document=metadata.get("source", ""),
                location_specific=scheme_info.get("location_specific", False),
                priority_score=priority_score,
            )

            return recommendation

        except Exception as e:
            logger.error(f"Failed to process scheme document: {e}")
            return None

    async def _extract_scheme_information(
        self,
        content: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Extract structured scheme information using LLM."""
        try:
            # Create prompt for information extraction
            system_message = """You are an expert at extracting structured information from government scheme documents.
Extract the following information in JSON format:
- scheme_name: Official name of the scheme
- scheme_type: Type (financial_assistance, subsidy, insurance, training, etc.)
- description: Brief description (2-3 sentences)
- benefits: List of benefits provided
- eligibility_criteria: List of eligibility requirements
- application_procedure: Step-by-step application process
- required_documents: List of required documents
- application_deadline: Deadline if mentioned (or null)
- contact_information: Contact details if provided
- location_specific: true if scheme is location-specific, false otherwise

Return ONLY valid JSON, no additional text."""

            user_prompt = f"""Extract information from this government scheme document:

{content}

Additional metadata: {metadata}

Return the extracted information as JSON."""

            # Call LLM for extraction
            response = await self.llm_service.generate_response(
                prompt=user_prompt,
                system_message=system_message,
                max_tokens=800,
                temperature=0.1,  # Low temperature for factual extraction
            )

            # Parse JSON response
            import json

            try:
                scheme_info = json.loads(response.content)
                return scheme_info
            except json.JSONDecodeError:
                # Fallback to basic extraction
                logger.warning("Failed to parse LLM JSON response, using fallback")
                return self._fallback_extraction(content, metadata)

        except Exception as e:
            logger.error(f"Failed to extract scheme information: {e}")
            return self._fallback_extraction(content, metadata)

    def _fallback_extraction(
        self,
        content: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Fallback extraction when LLM fails."""
        return {
            "scheme_name": metadata.get("scheme_name", "Unknown Scheme"),
            "scheme_type": metadata.get("scheme_type", "general"),
            "description": content[:200] + "...",
            "benefits": [
                metadata.get(
                    "benefits", "Benefits information available in full document"
                )
            ],
            "eligibility_criteria": [
                metadata.get("eligibility", "See full document for eligibility")
            ],
            "application_procedure": "Please refer to the official scheme portal or contact local authorities",
            "required_documents": [
                "Aadhaar Card",
                "Bank Account Details",
                "Land Records (if applicable)",
            ],
            "application_deadline": None,
            "contact_information": None,
            "location_specific": False,
        }

    def _format_contact_information(self, contact_info: Any) -> Optional[str]:
        """
        Format contact information to string.

        Args:
            contact_info: Contact information (can be string, dict, or None)

        Returns:
            Formatted contact information string or None
        """
        if contact_info is None:
            return None

        if isinstance(contact_info, str):
            return contact_info

        if isinstance(contact_info, dict):
            # Convert dict to formatted string
            parts = []
            if "source" in contact_info:
                parts.append(f"Source: {contact_info['source']}")
            if "helpline" in contact_info:
                parts.append(f"Helpline: {contact_info['helpline']}")
            if "email" in contact_info:
                parts.append(f"Email: {contact_info['email']}")
            if "website" in contact_info:
                parts.append(f"Website: {contact_info['website']}")
            if "address" in contact_info:
                parts.append(f"Address: {contact_info['address']}")

            # If no known fields, just stringify the dict
            if not parts:
                return str(contact_info)

            return " | ".join(parts)

        # For any other type, convert to string
        return str(contact_info)

    def _format_application_procedure(self, procedure: Any) -> str:
        """
        Format application procedure to string.

        Args:
            procedure: Application procedure (can be string, list, or other)

        Returns:
            Formatted application procedure string
        """
        if procedure is None or procedure == "":
            return "Application procedure not specified"

        if isinstance(procedure, str):
            return procedure

        if isinstance(procedure, list):
            # Convert list to numbered steps
            if not procedure:
                return "Application procedure not specified"

            # If list items are already numbered, just join them
            if any(
                item.strip().startswith(("1.", "2.", "3.", "Step 1", "Step 2"))
                for item in procedure
                if isinstance(item, str)
            ):
                return " ".join(str(item) for item in procedure)

            # Otherwise, number them
            steps = [f"{i+1}. {step}" for i, step in enumerate(procedure)]
            return " ".join(steps)

        # For any other type, convert to string
        return str(procedure)

    def _assess_eligibility(
        self,
        scheme_info: Dict[str, Any],
        user_profile: UserProfile,
    ) -> Dict[str, Any]:
        """Assess user eligibility for a scheme."""
        try:
            eligibility_scores = {}
            eligibility_reasons = []
            ineligibility_reasons = []

            # Extract eligibility criteria
            criteria = scheme_info.get("eligibility_criteria", [])
            criteria_text = " ".join(criteria).lower() if criteria else ""

            # Location matching
            location_score = self._check_location_eligibility(
                criteria_text, user_profile, eligibility_reasons, ineligibility_reasons
            )
            eligibility_scores["location"] = location_score

            # Crop matching
            crop_score = self._check_crop_eligibility(
                criteria_text, user_profile, eligibility_reasons, ineligibility_reasons
            )
            eligibility_scores["crop"] = crop_score

            # Land size matching
            land_score = self._check_land_size_eligibility(
                criteria_text, user_profile, eligibility_reasons, ineligibility_reasons
            )
            eligibility_scores["land_size"] = land_score

            # Income matching
            income_score = self._check_income_eligibility(
                criteria_text, user_profile, eligibility_reasons, ineligibility_reasons
            )
            eligibility_scores["income"] = income_score

            # Category matching (farmer type, caste, etc.)
            category_score = self._check_category_eligibility(
                criteria_text, user_profile, eligibility_reasons, ineligibility_reasons
            )
            eligibility_scores["category"] = category_score

            # Document requirements
            document_score = self._check_document_eligibility(
                scheme_info.get("required_documents", []),
                user_profile,
                eligibility_reasons,
                ineligibility_reasons,
            )
            eligibility_scores["documents"] = document_score

            # Calculate weighted eligibility score
            total_score = sum(
                eligibility_scores.get(key.replace("_match", ""), 0.5) * weight
                for key, weight in self.eligibility_weights.items()
            )

            # Determine if eligible (threshold: 0.6)
            is_eligible = total_score >= 0.6 and len(ineligibility_reasons) == 0

            return {
                "eligibility_score": total_score,
                "is_eligible": is_eligible,
                "eligibility_reasons": eligibility_reasons,
                "ineligibility_reasons": ineligibility_reasons,
                "detailed_scores": eligibility_scores,
            }

        except Exception as e:
            logger.error(f"Failed to assess eligibility: {e}")
            return {
                "eligibility_score": 0.5,
                "is_eligible": False,
                "eligibility_reasons": [],
                "ineligibility_reasons": ["Unable to assess eligibility"],
                "detailed_scores": {},
            }

    def _check_location_eligibility(
        self,
        criteria: str,
        profile: UserProfile,
        eligible: List[str],
        ineligible: List[str],
    ) -> float:
        """Check location-based eligibility."""
        if not profile.location or not isinstance(profile.location, dict):
            return 0.5  # Neutral score

        state = profile.location.get("state", "")
        district = profile.location.get("district", "")

        # Convert to lowercase only if not empty
        state_lower = state.lower() if state else ""
        district_lower = district.lower() if district else ""

        # Check if scheme mentions specific locations
        if (
            "all india" in criteria
            or "nationwide" in criteria
            or "pan india" in criteria
        ):
            eligible.append("Scheme available nationwide")
            return 1.0

        if state_lower and state_lower in criteria:
            eligible.append(f"Scheme available in {state.title()}")
            return 1.0

        if district_lower and district_lower in criteria:
            eligible.append(f"Scheme available in {district.title()} district")
            return 1.0

        # If location mentioned but doesn't match
        if any(word in criteria for word in ["state", "district", "region"]):
            if state_lower not in criteria and district_lower not in criteria:
                ineligible.append("Scheme not available in your location")
                return 0.0

        return 0.7  # Default: likely eligible if no location restriction

    def _check_crop_eligibility(
        self,
        criteria: str,
        profile: UserProfile,
        eligible: List[str],
        ineligible: List[str],
    ) -> float:
        """Check crop-based eligibility."""
        if not profile.crops:
            return 0.5  # Neutral score

        user_crops = [c.lower() for c in profile.crops]

        # Check if any user crop is mentioned
        for crop in user_crops:
            if crop in criteria:
                eligible.append(f"Scheme applicable for {crop} cultivation")
                return 1.0

        # Check for general crop mentions
        if any(word in criteria for word in ["all crops", "any crop", "farmers"]):
            eligible.append("Scheme applicable for all crops")
            return 1.0

        # If specific crops mentioned but user's crops not included
        crop_keywords = ["wheat", "rice", "cotton", "sugarcane", "pulses", "oilseeds"]
        if any(crop in criteria for crop in crop_keywords):
            if not any(crop in criteria for crop in user_crops):
                ineligible.append("Scheme not applicable for your crops")
                return 0.2

        return 0.6  # Default: likely eligible

    def _check_land_size_eligibility(
        self,
        criteria: str,
        profile: UserProfile,
        eligible: List[str],
        ineligible: List[str],
    ) -> float:
        """Check land size eligibility."""
        if not profile.land_size_hectares:
            return 0.5  # Neutral score

        land_size = profile.land_size_hectares

        # Check for small/marginal farmer criteria
        if "small" in criteria or "marginal" in criteria:
            if land_size <= 2.0:
                eligible.append("Eligible as small/marginal farmer")
                return 1.0
            else:
                ineligible.append(
                    "Scheme only for small/marginal farmers (up to 2 hectares)"
                )
                return 0.0

        # Check for landless criteria
        if "landless" in criteria:
            if land_size == 0:
                eligible.append("Eligible as landless farmer")
                return 1.0
            else:
                ineligible.append("Scheme only for landless farmers")
                return 0.0

        # Check for specific land size mentions
        import re

        land_patterns = re.findall(r"(\d+(?:\.\d+)?)\s*(?:hectare|ha|acre)", criteria)
        if land_patterns:
            # Extract numeric values and check
            for pattern in land_patterns:
                threshold = float(pattern)
                if (
                    "up to" in criteria
                    or "below" in criteria
                    or "less than" in criteria
                ):
                    if land_size <= threshold:
                        eligible.append(
                            f"Land size within limit ({threshold} hectares)"
                        )
                        return 1.0
                    else:
                        ineligible.append(
                            f"Land size exceeds limit ({threshold} hectares)"
                        )
                        return 0.0

        return 0.7  # Default: likely eligible

    def _check_income_eligibility(
        self,
        criteria: str,
        profile: UserProfile,
        eligible: List[str],
        ineligible: List[str],
    ) -> float:
        """Check income-based eligibility."""
        if not profile.annual_income:
            return 0.5  # Neutral score

        income = profile.annual_income

        # Check for BPL/APL mentions
        if "bpl" in criteria or "below poverty" in criteria:
            if income < 100000:  # Approximate BPL threshold
                eligible.append("Eligible based on income (BPL)")
                return 1.0
            else:
                ineligible.append("Income exceeds BPL threshold")
                return 0.3

        # Check for specific income thresholds
        import re

        income_patterns = re.findall(
            r"(?:rs\.?|rupees?|₹)\s*(\d+(?:,\d+)*(?:\.\d+)?)", criteria.lower()
        )
        if income_patterns:
            for pattern in income_patterns:
                threshold = float(pattern.replace(",", ""))
                if (
                    "below" in criteria
                    or "less than" in criteria
                    or "up to" in criteria
                ):
                    if income <= threshold:
                        eligible.append(f"Income within limit (₹{threshold:,.0f})")
                        return 1.0
                    else:
                        ineligible.append(f"Income exceeds limit (₹{threshold:,.0f})")
                        return 0.0

        return 0.7  # Default: likely eligible

    def _check_category_eligibility(
        self,
        criteria: str,
        profile: UserProfile,
        eligible: List[str],
        ineligible: List[str],
    ) -> float:
        """Check category-based eligibility (farmer type, caste, gender, age)."""
        score = 0.5
        matches = 0
        total_checks = 0

        # Check farmer category
        if profile.farmer_category:
            total_checks += 1
            category = profile.farmer_category.lower()
            if category in criteria:
                eligible.append(f"Eligible as {category} farmer")
                matches += 1

        # Check caste category
        if profile.caste_category:
            total_checks += 1
            caste = profile.caste_category.lower()
            if caste in criteria or "all categories" in criteria:
                eligible.append(f"Eligible under {caste.upper()} category")
                matches += 1
            elif any(
                f" {cat} " in f" {criteria} " or f"/{cat}/" in criteria
                for cat in ["sc", "st", "obc"]
            ):
                # Check for caste-specific schemes using word boundaries
                if caste not in criteria:
                    ineligible.append(
                        f"Scheme not applicable for {caste.upper()} category"
                    )
                    return 0.0

        # Check gender
        if profile.gender:
            total_checks += 1
            gender = profile.gender.lower()
            if "women" in criteria or "female" in criteria:
                if gender == "female":
                    eligible.append("Eligible as woman farmer")
                    matches += 1
                else:
                    ineligible.append("Scheme only for women farmers")
                    return 0.0

        # Check age
        if profile.age:
            total_checks += 1
            age = profile.age
            if "youth" in criteria or "young" in criteria:
                if age <= 40:
                    eligible.append("Eligible as young farmer")
                    matches += 1
            elif "senior" in criteria or "elderly" in criteria:
                if age >= 60:
                    eligible.append("Eligible as senior farmer")
                    matches += 1

        if total_checks > 0:
            score = matches / total_checks

        return max(score, 0.5)  # At least neutral

    def _check_document_eligibility(
        self,
        required_docs: List[str],
        profile: UserProfile,
        eligible: List[str],
        ineligible: List[str],
    ) -> float:
        """Check if user has required documents."""
        if not required_docs:
            return 1.0  # No specific requirements

        docs_lower = [doc.lower() for doc in required_docs]
        has_docs = 0
        total_docs = len(docs_lower)

        # Check Aadhaar
        if any("aadhaar" in doc or "aadhar" in doc for doc in docs_lower):
            if profile.has_aadhaar:
                has_docs += 1
                eligible.append("Has Aadhaar card")
            else:
                ineligible.append("Aadhaar card required")

        # Check bank account
        if any("bank" in doc for doc in docs_lower):
            if profile.has_bank_account:
                has_docs += 1
                eligible.append("Has bank account")
            else:
                ineligible.append("Bank account required")

        # For other documents, assume available
        other_docs = total_docs - 2  # Excluding aadhaar and bank
        if other_docs > 0:
            has_docs += other_docs * 0.8  # Assume 80% availability

        score = has_docs / max(total_docs, 1) if total_docs > 0 else 1.0
        return score

    def _build_profile_query(self, profile: UserProfile) -> str:
        """Build search query from user profile."""
        query_parts = []

        if profile.crops:
            query_parts.append(f"schemes for {', '.join(profile.crops)} farmers")

        if profile.farmer_category:
            query_parts.append(f"{profile.farmer_category} farmer schemes")

        if profile.location and profile.location.get("state"):
            query_parts.append(f"schemes in {profile.location['state']}")

        if profile.land_size_hectares and profile.land_size_hectares <= 2.0:
            query_parts.append("small and marginal farmer schemes")

        if not query_parts:
            query_parts.append("government schemes for farmers")

        return " ".join(query_parts)


# Global instance
scheme_service = SchemeService()
