"""
Fallback service for the AI-Driven Agri-Civic Intelligence Platform.

This service provides fallback responses and graceful degradation when external
services are unavailable.
"""

import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from app.core.logging import get_logger

# Configure logging
logger = get_logger(__name__)


class ServiceType(str, Enum):
    """Types of services that can have fallbacks."""

    WEATHER = "weather"
    TRANSLATION = "translation"
    LLM = "llm"
    MARKET = "market"
    MAPS = "maps"
    VISION = "vision"
    SCHEME = "scheme"
    RAG = "rag"


@dataclass
class FallbackResponse:
    """Fallback response data structure."""

    service_type: ServiceType
    response_data: Any
    is_fallback: bool = True
    fallback_reason: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)


class FallbackService:
    """
    Service providing fallback responses for unavailable services.

    Features:
    - Predefined fallback responses for common scenarios
    - Generic fallback messages for different service types
    - Graceful degradation strategies
    - Fallback response tracking and metrics
    """

    def __init__(self):
        """Initialize fallback service."""
        self.fallback_count: Dict[str, int] = {}

        # Predefined fallback responses
        self._initialize_fallback_data()

    def _initialize_fallback_data(self):
        """Initialize predefined fallback data."""
        # Weather fallback advice
        self.weather_fallback = {
            "general_advice": [
                "Monitor local weather conditions regularly",
                "Ensure proper irrigation systems are in place",
                "Maintain good drainage in fields",
                "Keep emergency supplies ready for extreme weather",
            ],
            "seasonal_advice": {
                "monsoon": [
                    "Ensure proper drainage to prevent waterlogging",
                    "Protect crops from heavy rainfall",
                    "Monitor for fungal diseases in high humidity",
                ],
                "summer": [
                    "Increase irrigation frequency during hot weather",
                    "Provide shade for sensitive crops",
                    "Monitor soil moisture levels regularly",
                ],
                "winter": [
                    "Protect crops from frost damage",
                    "Reduce irrigation frequency in cool weather",
                    "Monitor for cold-sensitive crop stress",
                ],
            },
        }

        # Translation fallback phrases
        self.translation_fallback = {
            "common_phrases": {
                "en": {
                    "greeting": "Hello",
                    "thank_you": "Thank you",
                    "yes": "Yes",
                    "no": "No",
                    "help": "How can I help you?",
                    "error": "I'm sorry, I couldn't understand that.",
                },
                "hi": {
                    "greeting": "नमस्ते",
                    "thank_you": "धन्यवाद",
                    "yes": "हाँ",
                    "no": "नहीं",
                    "help": "मैं आपकी कैसे मदद कर सकता हूं?",
                    "error": "क्षमा करें, मैं समझ नहीं पाया।",
                },
            },
            "service_unavailable": {
                "en": "Translation service is temporarily unavailable. Please try again later.",
                "hi": "अनुवाद सेवा अस्थायी रूप से अनुपलब्ध है। कृपया बाद में पुनः प्रयास करें।",
            },
        }

        # Market fallback advice
        self.market_fallback = {
            "general_advice": [
                "Contact local mandi for current prices",
                "Compare prices across multiple buyers",
                "Consider transport costs when selling",
                "Check government MSP rates for your crops",
            ],
            "selling_tips": [
                "Negotiate prices based on crop quality",
                "Sell during peak demand periods",
                "Store produce properly to maintain quality",
                "Form farmer groups for better bargaining power",
            ],
        }

        # Scheme fallback information
        self.scheme_fallback = {
            "general_info": [
                "Visit your local agriculture office for scheme information",
                "Check government agriculture portal for latest schemes",
                "Contact your district agriculture officer",
                "Join farmer groups to stay informed about schemes",
            ],
            "common_schemes": [
                "PM-KISAN: Direct income support for farmers",
                "Crop Insurance: Protection against crop loss",
                "Soil Health Card: Free soil testing",
                "Kisan Credit Card: Easy credit access",
            ],
        }

        # LLM fallback responses
        self.llm_fallback = {
            "general_responses": {
                "weather": "For weather information, please check local weather forecasts or contact your agriculture extension office.",
                "market": "For market prices, please contact your local mandi or check government agriculture portals.",
                "disease": "For crop disease identification, please consult your local agriculture extension officer or visit a nearby Krishi Vigyan Kendra.",
                "scheme": "For government scheme information, please visit your district agriculture office or check official government portals.",
            },
            "error_message": "I'm currently unable to process your request. Please try again later or contact your local agriculture office for assistance.",
        }

    def get_weather_fallback(
        self, season: Optional[str] = None, reason: str = "Service unavailable"
    ) -> FallbackResponse:
        """
        Get fallback weather advice.

        Args:
            season: Current season (monsoon, summer, winter)
            reason: Reason for fallback

        Returns:
            FallbackResponse with weather advice
        """
        self._track_fallback(ServiceType.WEATHER)

        advice = self.weather_fallback["general_advice"].copy()

        if season and season.lower() in self.weather_fallback["seasonal_advice"]:
            advice.extend(self.weather_fallback["seasonal_advice"][season.lower()])

        response_data = {
            "message": "Weather service is temporarily unavailable. Here is general agricultural advice:",
            "advice": advice,
            "recommendation": "Please check local weather forecasts or contact your agriculture extension office for current weather information.",
        }

        logger.warning(f"Weather fallback triggered: {reason}")

        return FallbackResponse(
            service_type=ServiceType.WEATHER,
            response_data=response_data,
            fallback_reason=reason,
            metadata={"season": season},
        )

    def get_translation_fallback(
        self,
        phrase_type: Optional[str] = None,
        target_language: str = "en",
        reason: str = "Service unavailable",
    ) -> FallbackResponse:
        """
        Get fallback translation.

        Args:
            phrase_type: Type of phrase (greeting, thank_you, etc.)
            target_language: Target language code
            reason: Reason for fallback

        Returns:
            FallbackResponse with translation
        """
        self._track_fallback(ServiceType.TRANSLATION)

        # Try to get common phrase translation
        if (
            phrase_type
            and target_language in self.translation_fallback["common_phrases"]
        ):
            phrases = self.translation_fallback["common_phrases"][target_language]
            if phrase_type in phrases:
                response_data = {
                    "translated_text": phrases[phrase_type],
                    "source_language": "en",
                    "target_language": target_language,
                }

                return FallbackResponse(
                    service_type=ServiceType.TRANSLATION,
                    response_data=response_data,
                    fallback_reason=reason,
                )

        # Generic unavailable message
        message = self.translation_fallback["service_unavailable"].get(
            target_language,
            self.translation_fallback["service_unavailable"]["en"],
        )

        response_data = {
            "message": message,
            "recommendation": "Please try again later or use English for communication.",
        }

        logger.warning(f"Translation fallback triggered: {reason}")

        return FallbackResponse(
            service_type=ServiceType.TRANSLATION,
            response_data=response_data,
            fallback_reason=reason,
            metadata={"target_language": target_language},
        )

    def get_market_fallback(
        self, reason: str = "Service unavailable"
    ) -> FallbackResponse:
        """
        Get fallback market advice.

        Args:
            reason: Reason for fallback

        Returns:
            FallbackResponse with market advice
        """
        self._track_fallback(ServiceType.MARKET)

        response_data = {
            "message": "Market price service is temporarily unavailable. Here is general market advice:",
            "general_advice": self.market_fallback["general_advice"],
            "selling_tips": self.market_fallback["selling_tips"],
            "recommendation": "Please contact your local mandi for current prices or check government agriculture portals.",
        }

        logger.warning(f"Market fallback triggered: {reason}")

        return FallbackResponse(
            service_type=ServiceType.MARKET,
            response_data=response_data,
            fallback_reason=reason,
        )

    def get_scheme_fallback(
        self, reason: str = "Service unavailable"
    ) -> FallbackResponse:
        """
        Get fallback scheme information.

        Args:
            reason: Reason for fallback

        Returns:
            FallbackResponse with scheme information
        """
        self._track_fallback(ServiceType.SCHEME)

        response_data = {
            "message": "Government scheme service is temporarily unavailable. Here is general scheme information:",
            "general_info": self.scheme_fallback["general_info"],
            "common_schemes": self.scheme_fallback["common_schemes"],
            "recommendation": "Please visit your local agriculture office or check official government portals for detailed scheme information.",
        }

        logger.warning(f"Scheme fallback triggered: {reason}")

        return FallbackResponse(
            service_type=ServiceType.SCHEME,
            response_data=response_data,
            fallback_reason=reason,
        )

    def get_llm_fallback(
        self, query_type: Optional[str] = None, reason: str = "Service unavailable"
    ) -> FallbackResponse:
        """
        Get fallback LLM response.

        Args:
            query_type: Type of query (weather, market, disease, scheme)
            reason: Reason for fallback

        Returns:
            FallbackResponse with LLM response
        """
        self._track_fallback(ServiceType.LLM)

        # Try to get specific response for query type
        if query_type and query_type in self.llm_fallback["general_responses"]:
            message = self.llm_fallback["general_responses"][query_type]
        else:
            message = self.llm_fallback["error_message"]

        response_data = {
            "message": message,
            "recommendation": "Please try again later or contact your local agriculture office for assistance.",
        }

        logger.warning(f"LLM fallback triggered: {reason}")

        return FallbackResponse(
            service_type=ServiceType.LLM,
            response_data=response_data,
            fallback_reason=reason,
            metadata={"query_type": query_type},
        )

    def get_maps_fallback(
        self, reason: str = "Service unavailable"
    ) -> FallbackResponse:
        """
        Get fallback maps/location advice.

        Args:
            reason: Reason for fallback

        Returns:
            FallbackResponse with location advice
        """
        self._track_fallback(ServiceType.MAPS)

        response_data = {
            "message": "Location service is temporarily unavailable.",
            "advice": [
                "Contact your local agriculture office for nearby mandi information",
                "Ask fellow farmers about nearby markets",
                "Check local directories for mandi contact information",
            ],
            "recommendation": "Please try again later or contact local authorities for location information.",
        }

        logger.warning(f"Maps fallback triggered: {reason}")

        return FallbackResponse(
            service_type=ServiceType.MAPS,
            response_data=response_data,
            fallback_reason=reason,
        )

    def get_vision_fallback(
        self, reason: str = "Service unavailable"
    ) -> FallbackResponse:
        """
        Get fallback vision/disease identification advice.

        Args:
            reason: Reason for fallback

        Returns:
            FallbackResponse with disease identification advice
        """
        self._track_fallback(ServiceType.VISION)

        response_data = {
            "message": "Crop disease identification service is temporarily unavailable.",
            "advice": [
                "Consult your local agriculture extension officer",
                "Visit a nearby Krishi Vigyan Kendra (KVK)",
                "Take clear photos of affected plants for later analysis",
                "Isolate affected plants to prevent spread",
            ],
            "general_tips": [
                "Monitor crops regularly for disease symptoms",
                "Maintain good field hygiene",
                "Use disease-resistant varieties when possible",
                "Follow recommended crop rotation practices",
            ],
            "recommendation": "For accurate disease identification, please consult agricultural experts or try again later.",
        }

        logger.warning(f"Vision fallback triggered: {reason}")

        return FallbackResponse(
            service_type=ServiceType.VISION,
            response_data=response_data,
            fallback_reason=reason,
        )

    def get_rag_fallback(
        self, query_topic: Optional[str] = None, reason: str = "Service unavailable"
    ) -> FallbackResponse:
        """
        Get fallback RAG/knowledge base response.

        Args:
            query_topic: Topic of the query
            reason: Reason for fallback

        Returns:
            FallbackResponse with knowledge base advice
        """
        self._track_fallback(ServiceType.RAG)

        response_data = {
            "message": "Knowledge base service is temporarily unavailable.",
            "advice": [
                "Check government agriculture portals for information",
                "Contact your local agriculture extension office",
                "Visit nearby Krishi Vigyan Kendra for guidance",
                "Consult with experienced farmers in your area",
            ],
            "recommendation": "Please try again later or contact agricultural experts for detailed information.",
        }

        logger.warning(f"RAG fallback triggered: {reason}")

        return FallbackResponse(
            service_type=ServiceType.RAG,
            response_data=response_data,
            fallback_reason=reason,
            metadata={"query_topic": query_topic},
        )

    def get_generic_fallback(
        self, service_type: ServiceType, reason: str = "Service unavailable"
    ) -> FallbackResponse:
        """
        Get generic fallback response for any service type.

        Args:
            service_type: Type of service
            reason: Reason for fallback

        Returns:
            FallbackResponse with generic advice
        """
        self._track_fallback(service_type)

        response_data = {
            "message": f"{service_type.value.title()} service is temporarily unavailable.",
            "recommendation": "Please try again later or contact your local agriculture office for assistance.",
        }

        logger.warning(f"Generic fallback triggered for {service_type.value}: {reason}")

        return FallbackResponse(
            service_type=service_type,
            response_data=response_data,
            fallback_reason=reason,
        )

    def _track_fallback(self, service_type: ServiceType):
        """Track fallback usage for metrics."""
        service_key = service_type.value
        self.fallback_count[service_key] = self.fallback_count.get(service_key, 0) + 1

    def get_metrics(self) -> Dict[str, Any]:
        """Get fallback service metrics."""
        total_fallbacks = sum(self.fallback_count.values())

        return {
            "total_fallbacks": total_fallbacks,
            "fallback_by_service": self.fallback_count.copy(),
            "most_used_fallback": (
                max(self.fallback_count.items(), key=lambda x: x[1])[0]
                if self.fallback_count
                else None
            ),
        }

    def reset_metrics(self):
        """Reset fallback metrics."""
        self.fallback_count = {}
        logger.info("Fallback service metrics reset")


# Global fallback service instance
fallback_service = FallbackService()
