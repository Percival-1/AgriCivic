"""
Tests for fallback service.
"""

import pytest

from app.services.fallback_service import fallback_service, ServiceType


def test_weather_fallback():
    """Test weather fallback response."""
    fallback = fallback_service.get_weather_fallback(
        season="monsoon", reason="API unavailable"
    )

    assert fallback.service_type == ServiceType.WEATHER
    assert fallback.is_fallback is True
    assert "advice" in fallback.response_data
    assert len(fallback.response_data["advice"]) > 0


def test_translation_fallback():
    """Test translation fallback response."""
    fallback = fallback_service.get_translation_fallback(
        phrase_type="greeting", target_language="hi", reason="API unavailable"
    )

    assert fallback.service_type == ServiceType.TRANSLATION
    assert fallback.is_fallback is True


def test_market_fallback():
    """Test market fallback response."""
    fallback = fallback_service.get_market_fallback(reason="API unavailable")

    assert fallback.service_type == ServiceType.MARKET
    assert fallback.is_fallback is True
    assert "general_advice" in fallback.response_data
    assert "selling_tips" in fallback.response_data


def test_scheme_fallback():
    """Test scheme fallback response."""
    fallback = fallback_service.get_scheme_fallback(reason="API unavailable")

    assert fallback.service_type == ServiceType.SCHEME
    assert fallback.is_fallback is True
    assert "general_info" in fallback.response_data
    assert "common_schemes" in fallback.response_data


def test_llm_fallback():
    """Test LLM fallback response."""
    fallback = fallback_service.get_llm_fallback(
        query_type="weather", reason="API unavailable"
    )

    assert fallback.service_type == ServiceType.LLM
    assert fallback.is_fallback is True
    assert "message" in fallback.response_data


def test_maps_fallback():
    """Test maps fallback response."""
    fallback = fallback_service.get_maps_fallback(reason="API unavailable")

    assert fallback.service_type == ServiceType.MAPS
    assert fallback.is_fallback is True
    assert "advice" in fallback.response_data


def test_vision_fallback():
    """Test vision fallback response."""
    fallback = fallback_service.get_vision_fallback(reason="API unavailable")

    assert fallback.service_type == ServiceType.VISION
    assert fallback.is_fallback is True
    assert "advice" in fallback.response_data
    assert "general_tips" in fallback.response_data


def test_rag_fallback():
    """Test RAG fallback response."""
    fallback = fallback_service.get_rag_fallback(
        query_topic="agriculture", reason="API unavailable"
    )

    assert fallback.service_type == ServiceType.RAG
    assert fallback.is_fallback is True
    assert "advice" in fallback.response_data


def test_generic_fallback():
    """Test generic fallback response."""
    fallback = fallback_service.get_generic_fallback(
        service_type=ServiceType.WEATHER, reason="API unavailable"
    )

    assert fallback.service_type == ServiceType.WEATHER
    assert fallback.is_fallback is True
    assert "message" in fallback.response_data


def test_fallback_metrics():
    """Test fallback metrics tracking."""
    # Reset metrics
    fallback_service.reset_metrics()

    # Trigger some fallbacks
    fallback_service.get_weather_fallback()
    fallback_service.get_weather_fallback()
    fallback_service.get_translation_fallback()

    # Get metrics
    metrics = fallback_service.get_metrics()

    assert metrics["total_fallbacks"] == 3
    assert metrics["fallback_by_service"]["weather"] == 2
    assert metrics["fallback_by_service"]["translation"] == 1
    assert metrics["most_used_fallback"] == "weather"


def test_fallback_metrics_reset():
    """Test fallback metrics reset."""
    # Trigger fallback
    fallback_service.get_weather_fallback()

    # Reset metrics
    fallback_service.reset_metrics()

    # Metrics should be empty
    metrics = fallback_service.get_metrics()
    assert metrics["total_fallbacks"] == 0
    assert len(metrics["fallback_by_service"]) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
