"""
Integration tests for IVR service - testing real functionality.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock

from app.main import app

client = TestClient(app)


class TestIVRIntegration:
    """Integration tests for IVR system."""

    def test_ivr_welcome_generates_valid_twiml(self):
        """Test that welcome endpoint generates valid TwiML."""
        response = client.post(
            "/api/v1/ivr/welcome",
            data={"From": "+919876543210", "CallSid": "test_call_sid"},
        )

        assert response.status_code == 200
        assert "application/xml" in response.headers["content-type"]
        assert "<?xml" in response.text
        assert "<Response>" in response.text
        assert "<Say" in response.text
        assert "</Response>" in response.text
        # Should contain language selection prompt
        assert "Gather" in response.text or "gather" in response.text.lower()

    def test_language_selection_generates_main_menu(self):
        """Test that language selection leads to main menu."""
        response = client.post(
            "/api/v1/ivr/language-selection",
            data={"Digits": "1", "CallSid": "test_call_sid"},
        )

        assert response.status_code == 200
        assert "<?xml" in response.text
        assert "<Response>" in response.text
        # Should contain menu options
        assert "<Say" in response.text

    def test_main_menu_in_different_languages(self):
        """Test main menu generation in different languages."""
        languages = ["hi", "en", "bn", "te", "ta"]

        for lang in languages:
            response = client.post(
                f"/api/v1/ivr/main-menu?lang={lang}",
                data={"CallSid": "test_call_sid"},
            )

            assert response.status_code == 200
            assert "<?xml" in response.text
            assert "<Response>" in response.text
            assert "<Say" in response.text
            assert (
                f'language="{lang}-IN"' in response.text
                or 'language="en-IN"' in response.text
            )

    def test_menu_selection_weather(self):
        """Test weather menu selection."""
        response = client.post(
            "/api/v1/ivr/menu-selection?lang=hi",
            data={"Digits": "1", "CallSid": "test_call_sid"},
        )

        assert response.status_code == 200
        assert "<?xml" in response.text
        # Should prompt for recording
        assert "Record" in response.text or "record" in response.text.lower()

    def test_menu_selection_disease(self):
        """Test disease menu selection."""
        response = client.post(
            "/api/v1/ivr/menu-selection?lang=hi",
            data={"Digits": "2", "CallSid": "test_call_sid"},
        )

        assert response.status_code == 200
        assert "<?xml" in response.text
        assert "Record" in response.text or "record" in response.text.lower()

    def test_menu_selection_schemes(self):
        """Test schemes menu selection."""
        response = client.post(
            "/api/v1/ivr/menu-selection?lang=hi",
            data={"Digits": "3", "CallSid": "test_call_sid"},
        )

        assert response.status_code == 200
        assert "<?xml" in response.text
        assert "Record" in response.text or "record" in response.text.lower()

    def test_menu_selection_market(self):
        """Test market menu selection."""
        response = client.post(
            "/api/v1/ivr/menu-selection?lang=hi",
            data={"Digits": "4", "CallSid": "test_call_sid"},
        )

        assert response.status_code == 200
        assert "<?xml" in response.text
        assert "Record" in response.text or "record" in response.text.lower()

    def test_invalid_menu_selection(self):
        """Test invalid menu selection."""
        response = client.post(
            "/api/v1/ivr/menu-selection?lang=hi",
            data={"Digits": "9", "CallSid": "test_call_sid"},
        )

        assert response.status_code == 200
        assert "<?xml" in response.text
        # Should redirect to main menu or show error
        assert "<Say" in response.text

    @patch("app.services.ivr_service.ivr_service.translation_service")
    @patch("app.services.ivr_service.ivr_service.llm_service")
    def test_weather_transcription_processing(self, mock_llm, mock_translation):
        """Test weather transcription processing with mocked services."""
        # Mock translation service
        mock_translation_response = Mock()
        mock_translation_response.translated_text = "Delhi weather forecast"
        mock_translation.translate = AsyncMock(return_value=mock_translation_response)

        # Mock LLM service
        mock_llm.generate_response.return_value = (
            "The weather in Delhi is sunny with temperature around 25 degrees."
        )

        response = client.post(
            "/api/v1/ivr/weather-transcription?lang=en",
            data={
                "TranscriptionText": "Delhi weather forecast",
                "TranscriptionStatus": "completed",
                "CallSid": "test_call_sid",
            },
        )

        assert response.status_code == 200
        assert "<?xml" in response.text
        assert "<Say" in response.text

    def test_post_response_repeat(self):
        """Test repeat option after response."""
        response = client.post(
            "/api/v1/ivr/post-response?lang=hi",
            data={"Digits": "1", "CallSid": "test_call_sid"},
        )

        assert response.status_code == 200
        assert "<?xml" in response.text
        assert "<Say" in response.text

    def test_post_response_main_menu(self):
        """Test main menu option after response."""
        response = client.post(
            "/api/v1/ivr/post-response?lang=hi",
            data={"Digits": "2", "CallSid": "test_call_sid"},
        )

        assert response.status_code == 200
        assert "<?xml" in response.text
        assert "<Say" in response.text

    def test_post_response_end_call(self):
        """Test end call option."""
        response = client.post(
            "/api/v1/ivr/post-response?lang=hi",
            data={"Digits": "9", "CallSid": "test_call_sid"},
        )

        assert response.status_code == 200
        assert "<?xml" in response.text
        assert "<Hangup" in response.text or "hangup" in response.text.lower()

    def test_ivr_status_endpoint(self):
        """Test IVR status endpoint."""
        response = client.get("/api/v1/ivr/status")

        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "IVR"
        assert "status" in data
        assert "supported_languages" in data
        assert len(data["supported_languages"]) >= 5  # At least 5 languages supported

    def test_error_handling_with_invalid_transcription_status(self):
        """Test error handling with invalid transcription status."""
        response = client.post(
            "/api/v1/ivr/weather-transcription?lang=hi",
            data={
                "TranscriptionText": "test",
                "TranscriptionStatus": "failed",
                "CallSid": "test_call_sid",
            },
        )

        assert response.status_code == 200
        assert "<?xml" in response.text
        # Should return error response
        assert "<Say" in response.text

    def test_all_service_endpoints_return_valid_xml(self):
        """Test that all service endpoints return valid XML."""
        endpoints = [
            (
                "/api/v1/ivr/process-weather?lang=hi",
                {"TranscriptionText": "Delhi", "CallSid": "test"},
            ),
            (
                "/api/v1/ivr/process-disease?lang=hi",
                {"TranscriptionText": "wheat disease", "CallSid": "test"},
            ),
            (
                "/api/v1/ivr/process-schemes?lang=hi",
                {"TranscriptionText": "farmer schemes", "CallSid": "test"},
            ),
            (
                "/api/v1/ivr/process-market?lang=hi",
                {"TranscriptionText": "wheat price", "CallSid": "test"},
            ),
        ]

        for endpoint, data in endpoints:
            response = client.post(endpoint, data=data)
            assert response.status_code == 200
            assert "<?xml" in response.text
            assert "<Response>" in response.text


class TestIVRServiceMethods:
    """Test IVR service methods directly."""

    def test_voice_optimization(self):
        """Test voice response optimization."""
        from app.services.ivr_service import ivr_service

        # Test markdown removal
        text = "**Bold text** and *italic text*"
        optimized = ivr_service._optimize_for_voice(text)
        assert "**" not in optimized
        assert "*" not in optimized

        # Test source citation removal
        text = "This is information [Source 1] from documents [Source 2]."
        optimized = ivr_service._optimize_for_voice(text)
        assert "[Source" not in optimized

        # Test length limiting
        long_text = "A" * 600
        optimized = ivr_service._optimize_for_voice(long_text)
        assert len(optimized) <= 510  # Should be truncated

    def test_get_voice_for_language(self):
        """Test voice selection for different languages."""
        from app.services.ivr_service import ivr_service

        assert ivr_service._get_voice_for_language("hi") == "Polly.Aditi"
        assert ivr_service._get_voice_for_language("en") == "Polly.Raveena"
        assert ivr_service._get_voice_for_language("bn") == "Polly.Aditi"
        assert ivr_service._get_voice_for_language("unknown") == "Polly.Aditi"

    def test_generate_welcome_response_structure(self):
        """Test welcome response structure."""
        from app.services.ivr_service import ivr_service

        response = ivr_service.generate_welcome_response("hi")

        assert "<?xml" in response
        assert "<Response>" in response
        assert "<Say" in response
        assert "<Gather" in response
        assert "language=" in response
        assert "</Response>" in response

    def test_generate_main_menu_structure(self):
        """Test main menu structure."""
        from app.services.ivr_service import ivr_service

        response = ivr_service.generate_main_menu("hi")

        assert "<?xml" in response
        assert "<Response>" in response
        assert "<Say" in response
        assert "<Gather" in response
        assert "</Response>" in response

    def test_error_response_generation(self):
        """Test error response generation."""
        from app.services.ivr_service import ivr_service

        for lang in ["hi", "en", "bn", "te", "ta"]:
            response = ivr_service._generate_error_response(lang)

            assert "<?xml" in response
            assert "<Response>" in response
            assert "<Say" in response
            assert "<Hangup" in response
            assert "</Response>" in response


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
