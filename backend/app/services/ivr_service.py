"""
IVR (Interactive Voice Response) service using Twilio for the AI-Driven Agri-Civic Intelligence Platform.
"""

import logging
from typing import Dict, Any, Optional
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse
from twilio.base.exceptions import TwilioException

from app.config import get_settings
from app.core.logging import get_logger
from app.services.translation import TranslationService
from app.services.llm_service import LLMService

settings = get_settings()
logger = get_logger(__name__)


class IVRService:
    """Service for handling IVR operations using Twilio."""

    def __init__(self):
        """Initialize IVR service with Twilio client."""
        self.client = None
        self.translation_service = TranslationService()
        self.llm_service = LLMService()

        # Import services for comprehensive IVR functionality
        from app.services.weather_service import WeatherService
        from app.services.market_service import MarketService
        from app.services.scheme_service import SchemeService
        from app.services.rag_engine import rag_engine

        self.weather_service = None  # Will be initialized async
        self.market_service = None  # Will be initialized async
        self.scheme_service = SchemeService()
        self.rag_engine = rag_engine

        self._initialize_client()

    def _initialize_client(self):
        """Initialize Twilio client."""
        try:
            if settings.twilio_account_sid and settings.twilio_auth_token:
                self.client = Client(
                    settings.twilio_account_sid, settings.twilio_auth_token
                )
                logger.info("Twilio IVR client initialized successfully")
            else:
                logger.warning("Twilio credentials not configured")
        except Exception as e:
            logger.error(f"Failed to initialize Twilio client: {e}")
            raise

    async def initialize_services(self):
        """Initialize async services for IVR."""
        try:
            from app.services.weather_service import get_weather_service
            from app.services.market_service import MarketService

            self.weather_service = await get_weather_service()
            self.market_service = MarketService()
            await self.market_service.initialize()

            logger.info("IVR services initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize IVR services: {e}")

    def generate_welcome_response(self, language: str = "hi") -> str:
        """Generate welcome IVR response."""
        response = VoiceResponse()

        # Welcome messages in different languages
        welcome_messages = {
            "hi": "नमस्ते! कृषि सहायता केंद्र में आपका स्वागत है। भाषा चुनने के लिए: हिंदी के लिए 1, अंग्रेजी के लिए 2 दबाएं।",
            "en": "Welcome to the Agricultural Assistance Center. To select language: Press 1 for Hindi, 2 for English.",
            "bn": "নমস্কার! কৃষি সহায়তা কেন্দ্রে আপনাকে স্বাগতম। ভাষা নির্বাচনের জন্য: বাংলার জন্য 3, হিন্দির জন্য 1 চাপুন।",
            "te": "నమస్కారం! వ్যవసాయ సహాయ కేంద్రానికి స్వాগతం। భాష ఎంచుకోవడానికి: తెలుగు కోసం 4, హిందీ కోసం 1 నొక్కండి।",
            "ta": "வணக்கம்! விவசாய உதவி மையத்திற்கு வரவேற்கிறோம்। மொழி தேர்வுக்கு: தமிழுக்கு 5, ஹிந்திக்கு 1 அழுத்தவும்।",
        }

        # Use Hindi as default
        message = welcome_messages.get(language, welcome_messages["hi"])

        response.say(
            message,
            language=f"{language}-IN" if language != "en" else "en-IN",
            voice="Polly.Aditi" if language == "hi" else "Polly.Raveena",
        )

        # Gather language selection
        gather = response.gather(
            num_digits=1,
            action="/api/v1/ivr/language-selection",
            method="POST",
            timeout=10,
        )

        # Fallback if no input
        response.say("कोई जवाब नहीं मिला। कॉल समाप्त की जा रही है।", language="hi-IN")
        response.hangup()

        return str(response)

    def handle_language_selection(self, digit: str) -> str:
        """Handle language selection from user input."""
        response = VoiceResponse()

        language_map = {
            "1": "hi",  # Hindi
            "2": "en",  # English
            "3": "bn",  # Bengali
            "4": "te",  # Telugu
            "5": "ta",  # Tamil
            "6": "mr",  # Marathi
            "7": "gu",  # Gujarati
            "8": "kn",  # Kannada
            "9": "ml",  # Malayalam
        }

        selected_language = language_map.get(digit, "hi")

        # Store language in session (you'd implement session storage)
        # session.language = selected_language

        return self.generate_main_menu(selected_language)

    def generate_main_menu(self, language: str = "hi") -> str:
        """Generate main menu IVR response."""
        response = VoiceResponse()

        menu_messages = {
            "hi": "मुख्य मेनू: मौसम की जानकारी के लिए 1, फसल की बीमारी के लिए 2, सरकारी योजनाओं के लिए 3, बाजार की कीमतों के लिए 4 दबाएं।",
            "en": "Main Menu: Press 1 for weather information, 2 for crop diseases, 3 for government schemes, 4 for market prices.",
            "bn": "প্রধান মেনু: আবহাওয়ার তথ্যের জন্য 1, ফসলের রোগের জন্য 2, সরকারি প্রকল্পের জন্য 3, বাজার দামের জন্য 4 চাপুন।",
            "te": "ప్రధాన మెనూ: వాతావరణ సమాచారం కోసం 1, పంట వ్యాధుల కోసం 2, ప్రభుత్వ పథకాల కోసం 3, మార్కెట్ ధరల కోసం 4 నొక్కండి।",
            "ta": "முதன்மை மெனு: வானிலை தகவலுக்கு 1, பயிர் நோய்களுக்கு 2, அரசு திட்டங்களுக்கு 3, சந்தை விலைகளுக்கு 4 அழுத்தவும்।",
        }

        message = menu_messages.get(language, menu_messages["hi"])

        response.say(
            message,
            language=f"{language}-IN" if language != "en" else "en-IN",
            voice=self._get_voice_for_language(language),
        )

        # Gather menu selection
        gather = response.gather(
            num_digits=1,
            action=f"/api/v1/ivr/menu-selection?lang={language}",
            method="POST",
            timeout=10,
        )

        # Fallback
        response.redirect(f"/api/v1/ivr/main-menu?lang={language}")

        return str(response)

    def handle_menu_selection(self, digit: str, language: str = "hi") -> str:
        """Handle main menu selection."""
        response = VoiceResponse()

        menu_actions = {
            "1": self._handle_weather_request,
            "2": self._handle_disease_request,
            "3": self._handle_schemes_request,
            "4": self._handle_market_request,
        }

        if digit in menu_actions:
            return menu_actions[digit](language)
        else:
            # Invalid selection
            error_messages = {
                "hi": "गलत विकल्प। कृपया फिर से कोशिश करें।",
                "en": "Invalid option. Please try again.",
                "bn": "ভুল বিকল্প। অনুগ্রহ করে আবার চেষ্টা করুন।",
                "te": "తప్పు ఎంపిక. దయచేసి మళ్లీ ప్రయత్నించండి।",
                "ta": "தவறான விருப்பம். தயவுசெய்து மீண்டும் முயற்சிக்கவும்।",
            }

            message = error_messages.get(language, error_messages["hi"])
            response.say(message, language=f"{language}-IN")
            response.redirect(f"/api/v1/ivr/main-menu?lang={language}")

            return str(response)

    def _handle_weather_request(self, language: str) -> str:
        """Handle weather information request."""
        response = VoiceResponse()

        prompts = {
            "hi": "मौसम की जानकारी के लिए अपना जिला बोलें। बोलना शुरू करने के लिए बीप की आवाज़ का इंतज़ार करें।",
            "en": "For weather information, please speak your district name. Wait for the beep to start speaking.",
            "bn": "আবহাওয়ার তথ্যের জন্য আপনার জেলার নাম বলুন। কথা বলা শুরু করতে বিপের জন্য অপেক্ষা করুন।",
            "te": "వాతావరణ సమాచారం కోసం మీ జిల్లా పేరు చెప్పండి. మాట్లాడటం ప్రారంభించడానికి బీప్ కోసం వేచి ఉండండి।",
            "ta": "வானிலை தகவலுக்கு உங்கள் மாவட்டத்தின் பெயரைச் சொல்லுங்கள். பேசத் தொடங்க பீப்பிற்காகக் காத்திருங்கள்.",
        }

        message = prompts.get(language, prompts["hi"])
        response.say(message, language=f"{language}-IN")

        # Record user input
        response.record(
            action=f"/api/v1/ivr/process-weather?lang={language}",
            method="POST",
            max_length=10,
            transcribe=True,
            transcribe_callback=f"/api/v1/ivr/weather-transcription?lang={language}",
        )

        return str(response)

    def _handle_disease_request(self, language: str) -> str:
        """Handle crop disease request."""
        response = VoiceResponse()

        prompts = {
            "hi": "फसल की बीमारी के बारे में बताने के लिए, अपनी फसल का नाम और समस्या बोलें।",
            "en": "To report crop disease, please speak your crop name and the problem you're facing.",
            "bn": "ফসলের রোগ সম্পর্কে জানাতে, আপনার ফসলের নাম এবং সমস্যা বলুন।",
            "te": "పంట వ్యాధి గురించి తెలియజేయడానికి, మీ పంట పేరు మరియు సమస్యను చెప్పండి।",
            "ta": "பயிர் நோய் பற்றி தெரிவிக்க, உங்கள் பயிரின் பெயரையும் பிரச்சனையையும் சொல்லுங்கள்.",
        }

        message = prompts.get(language, prompts["hi"])
        response.say(message, language=f"{language}-IN")

        response.record(
            action=f"/api/v1/ivr/process-disease?lang={language}",
            method="POST",
            max_length=20,
            transcribe=True,
            transcribe_callback=f"/api/v1/ivr/disease-transcription?lang={language}",
        )

        return str(response)

    def _handle_schemes_request(self, language: str) -> str:
        """Handle government schemes request."""
        response = VoiceResponse()

        prompts = {
            "hi": "सरकारी योजनाओं की जानकारी के लिए अपना राज्य और फसल का प्रकार बोलें।",
            "en": "For government schemes information, please speak your state and crop type.",
            "bn": "সরকারি প্রকল্পের তথ্যের জন্য আপনার রাজ্য এবং ফসলের ধরন বলুন।",
            "te": "ప్రభుత్వ పథకాల సమాచారం కోసం మీ రాష్ట్రం మరియు పంట రకాన్ని చెప్పండి।",
            "ta": "அரசு திட்டங்களின் தகவலுக்கு உங்கள் மாநிலம் மற்றும் பயிர் வகையைச் சொல்லுங்கள்.",
        }

        message = prompts.get(language, prompts["hi"])
        response.say(message, language=f"{language}-IN")

        response.record(
            action=f"/api/v1/ivr/process-schemes?lang={language}",
            method="POST",
            max_length=15,
            transcribe=True,
            transcribe_callback=f"/api/v1/ivr/schemes-transcription?lang={language}",
        )

        return str(response)

    def _handle_market_request(self, language: str) -> str:
        """Handle market prices request."""
        response = VoiceResponse()

        prompts = {
            "hi": "बाजार की कीमतों के लिए अपनी फसल का नाम और मंडी का स्थान बोलें।",
            "en": "For market prices, please speak your crop name and mandi location.",
            "bn": "বাজার দামের জন্য আপনার ফসলের নাম এবং মান্ডির অবস্থান বলুন।",
            "te": "మార్కెట్ ధరల కోసం మీ పంట పేరు మరియు మండి స్థానాన్ని చెప్పండి।",
            "ta": "சந்தை விலைகளுக்கு உங்கள் பயிரின் பெயரையும் மண்டி இடத்தையும் சொல்லுங்கள்.",
        }

        message = prompts.get(language, prompts["hi"])
        response.say(message, language=f"{language}-IN")

        response.record(
            action=f"/api/v1/ivr/process-market?lang={language}",
            method="POST",
            max_length=15,
            transcribe=True,
            transcribe_callback=f"/api/v1/ivr/market-transcription?lang={language}",
        )

        return str(response)

    def process_transcription(
        self, transcription: str, request_type: str, language: str
    ) -> str:
        """Process transcribed user input and generate AI response."""
        try:
            # Translate to English if needed (using sync wrapper for async translate)
            if language != "en":
                import asyncio

                loop = asyncio.get_event_loop()
                if loop.is_running():
                    import concurrent.futures

                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(
                            asyncio.run,
                            self.translation_service.translate(
                                text=transcription,
                                target_language="en",
                                source_language=language,
                            ),
                        )
                        translation_response = future.result(timeout=10)
                else:
                    translation_response = loop.run_until_complete(
                        self.translation_service.translate(
                            text=transcription,
                            target_language="en",
                            source_language=language,
                        )
                    )
                english_text = translation_response.translated_text
            else:
                english_text = transcription

            # Get AI response based on request type using appropriate service
            ai_response = self._get_service_response(english_text, request_type)

            # Translate response back to user's language
            if language != "en":
                import asyncio

                loop = asyncio.get_event_loop()
                if loop.is_running():
                    import concurrent.futures

                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        future = executor.submit(
                            asyncio.run,
                            self.translation_service.translate(
                                text=ai_response,
                                target_language=language,
                                source_language="en",
                            ),
                        )
                        translation_response = future.result(timeout=10)
                else:
                    translation_response = loop.run_until_complete(
                        self.translation_service.translate(
                            text=ai_response,
                            target_language=language,
                            source_language="en",
                        )
                    )
                localized_response = translation_response.translated_text
            else:
                localized_response = ai_response

            # Generate TTS response
            return self._generate_tts_response(localized_response, language)

        except Exception as e:
            logger.error(f"Error processing transcription: {e}")
            return self._generate_error_response(language)

    def _get_service_response(self, query: str, request_type: str) -> str:
        """Get AI response from appropriate service based on request type."""
        try:
            if request_type == "weather":
                return self._process_weather_query(query)
            elif request_type == "disease":
                return self._process_disease_query(query)
            elif request_type == "schemes":
                return self._process_schemes_query(query)
            elif request_type == "market":
                return self._process_market_query(query)
            else:
                return self._get_ai_response(query, request_type)
        except Exception as e:
            logger.error(f"Error getting service response: {e}")
            return "I apologize, but I'm having trouble processing your request. Please try again or contact support."

    def _process_weather_query(self, query: str) -> str:
        """Process weather query using weather service."""
        try:
            # Extract location from query using LLM
            location_prompt = f"Extract the location (district or city name) from this query: '{query}'. Return only the location name, nothing else."
            location_response = self.llm_service.generate_response(location_prompt)
            location_name = location_response.strip()

            # For IVR, we need to handle location-based queries
            # In production, this would geocode the location
            # For now, provide general weather guidance

            weather_prompt = f"""Based on this farmer's weather query: '{query}'
            
Provide a concise voice-friendly response (max 150 words) that includes:
1. General weather guidance for the mentioned location
2. Agricultural recommendations based on typical weather patterns
3. Advice on irrigation, crop protection, or field operations

Keep the response conversational and easy to understand over phone."""

            response = self.llm_service.generate_response(weather_prompt)
            return self._optimize_for_voice(response)

        except Exception as e:
            logger.error(f"Error processing weather query: {e}")
            return "I can help you with weather information. Please provide your district name clearly, and I'll give you relevant weather updates and agricultural advice."

    def _process_disease_query(self, query: str) -> str:
        """Process crop disease query using RAG engine."""
        try:
            # Use RAG engine to get disease information
            import asyncio

            # Create async function to call RAG
            async def get_disease_info():
                return await self.rag_engine.search_and_generate(
                    query=query,
                    collections=["crop_diseases", "agricultural_knowledge"],
                    top_k=3,
                    response_type="concise",
                    language="en",
                )

            # Run async function
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If loop is already running, create a new task
                import concurrent.futures

                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, get_disease_info())
                    rag_response = future.result(timeout=10)
            else:
                rag_response = loop.run_until_complete(get_disease_info())

            response_text = rag_response.get("response", "")

            # Optimize for voice
            voice_response = self._optimize_for_voice(response_text)

            # Add source information if available
            sources = rag_response.get("sources", [])
            if sources and len(sources) > 0:
                voice_response += (
                    " This information is from verified agricultural sources."
                )

            return voice_response

        except Exception as e:
            logger.error(f"Error processing disease query: {e}")
            return "For crop disease diagnosis, please describe the symptoms you're seeing on your crop, including leaf color, spots, or wilting. I'll provide treatment recommendations based on the symptoms."

    def _process_schemes_query(self, query: str) -> str:
        """Process government schemes query using scheme service."""
        try:
            import asyncio

            # Create async function to search schemes
            async def search_schemes():
                return await self.scheme_service.search_schemes(
                    query=query, user_profile=None, top_k=3  # No profile in IVR context
                )

            # Run async function
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures

                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(asyncio.run, search_schemes())
                    schemes = future.result(timeout=10)
            else:
                schemes = loop.run_until_complete(search_schemes())

            if not schemes:
                return "I found no specific schemes matching your query. Please contact your local agricultural office for personalized scheme information."

            # Format top scheme for voice
            top_scheme = schemes[0]
            response = f"I found the {top_scheme.scheme_name}. "
            response += f"{top_scheme.description[:150]}. "

            if top_scheme.benefits:
                response += f"Benefits include: {', '.join(top_scheme.benefits[:2])}. "

            if top_scheme.application_procedure:
                response += f"To apply: {top_scheme.application_procedure[:100]}. "

            return self._optimize_for_voice(response)

        except Exception as e:
            logger.error(f"Error processing schemes query: {e}")
            return "I can help you find government schemes. Please tell me your state, crop type, or the kind of assistance you're looking for."

    def _process_market_query(self, query: str) -> str:
        """Process market price query using market service."""
        try:
            # Extract crop name from query using LLM
            crop_prompt = f"Extract the crop name from this query: '{query}'. Return only the crop name, nothing else."
            crop_response = self.llm_service.generate_response(crop_prompt)
            crop_name = crop_response.strip().lower()

            # Provide general market guidance
            market_prompt = f"""Based on this farmer's market query: '{query}'
            
Provide a concise voice-friendly response (max 150 words) that includes:
1. General market price guidance for the mentioned crop
2. Advice on when and where to sell
3. Tips for getting better prices
4. Mention checking local mandi prices

Keep the response conversational and easy to understand over phone."""

            response = self.llm_service.generate_response(market_prompt)
            return self._optimize_for_voice(response)

        except Exception as e:
            logger.error(f"Error processing market query: {e}")
            return "I can help you with market prices. Please tell me your crop name and location, and I'll provide current price information and selling recommendations."

    def _optimize_for_voice(self, text: str) -> str:
        """Optimize text response for voice delivery."""
        # Remove markdown formatting
        text = text.replace("**", "").replace("*", "")
        text = text.replace("#", "")

        # Remove source citations for voice
        import re

        text = re.sub(r"\[Source \d+\]", "", text)

        # Limit length for voice (max 500 characters)
        if len(text) > 500:
            # Find last complete sentence within limit
            text = text[:500]
            last_period = text.rfind(".")
            if last_period > 0:
                text = text[: last_period + 1]
            else:
                text = text + "..."

        # Replace technical terms with voice-friendly versions
        replacements = {
            "quintal": "quintal",
            "hectare": "hectare",
            "kg": "kilogram",
            "ml": "milliliter",
            "°C": "degrees Celsius",
            "%": "percent",
        }

        for old, new in replacements.items():
            text = text.replace(old, new)

        return text.strip()

    def _get_ai_response(self, query: str, request_type: str) -> str:
        """Get AI response based on query and request type (fallback method)."""
        context_prompts = {
            "weather": "Provide weather information and agricultural advice for: ",
            "disease": "Provide crop disease diagnosis and treatment for: ",
            "schemes": "Provide information about relevant government schemes for: ",
            "market": "Provide market price information and selling advice for: ",
        }

        prompt = context_prompts.get(request_type, "") + query
        response = self.llm_service.generate_response(prompt)
        return self._optimize_for_voice(response)

    def _generate_tts_response(self, text: str, language: str) -> str:
        """Generate TTS response for the user."""
        response = VoiceResponse()

        # Limit response length for voice
        if len(text) > 500:
            text = text[:500] + "..."

        response.say(
            text,
            language=f"{language}-IN" if language != "en" else "en-IN",
            voice=self._get_voice_for_language(language),
        )

        # Offer to repeat or go back to main menu
        repeat_prompts = {
            "hi": "दोहराने के लिए 1, मुख्य मेनू के लिए 2, कॉल समाप्त करने के लिए 9 दबाएं।",
            "en": "Press 1 to repeat, 2 for main menu, 9 to end call.",
            "bn": "পুনরাবৃত্তির জন্য 1, প্রধান মেনুর জন্য 2, কল শেষ করতে 9 চাপুন।",
            "te": "పునరావృతం చేయడానికి 1, ప్రధాన మెనూ కోసం 2, కాల్ ముగించడానికి 9 నొక్కండి।",
            "ta": "மீண்டும் கேட்க 1, முதன்மை மெனுவிற்கு 2, அழைப்பை முடிக்க 9 அழுத்தவும்.",
        }

        repeat_message = repeat_prompts.get(language, repeat_prompts["hi"])
        response.say(repeat_message, language=f"{language}-IN")

        gather = response.gather(
            num_digits=1,
            action=f"/api/v1/ivr/post-response?lang={language}",
            method="POST",
            timeout=10,
        )

        # Default action
        response.hangup()

        return str(response)

    def _generate_error_response(self, language: str) -> str:
        """Generate error response."""
        response = VoiceResponse()

        error_messages = {
            "hi": "क्षमा करें, कुछ तकनीकी समस्या है। कृपया बाद में कॉल करें।",
            "en": "Sorry, there's a technical issue. Please call back later.",
            "bn": "দুঃখিত, একটি প্রযুক্তিগত সমস্যা আছে। অনুগ্রহ করে পরে কল করুন।",
            "te": "క్షమించండి, సాంకేతిక సమస్య ఉంది. దయచేసి తర్వాత కాల్ చేయండి।",
            "ta": "மன்னிக்கவும், தொழில்நுட்ப சிக்கல் உள்ளது. தயவுசெய்து பின்னர் அழைக்கவும்.",
        }

        message = error_messages.get(language, error_messages["hi"])
        response.say(message, language=f"{language}-IN")
        response.hangup()

        return str(response)

    def _get_voice_for_language(self, language: str) -> str:
        """Get appropriate Twilio voice for language."""
        voice_map = {
            "hi": "Polly.Aditi",
            "en": "Polly.Raveena",
            "bn": "Polly.Aditi",  # Use Hindi voice for Bengali
            "te": "Polly.Aditi",  # Use Hindi voice for Telugu
            "ta": "Polly.Aditi",  # Use Hindi voice for Tamil
            "mr": "Polly.Aditi",  # Use Hindi voice for Marathi
            "gu": "Polly.Aditi",  # Use Hindi voice for Gujarati
            "kn": "Polly.Aditi",  # Use Hindi voice for Kannada
            "ml": "Polly.Aditi",  # Use Hindi voice for Malayalam
        }

        return voice_map.get(language, "Polly.Aditi")

    def make_outbound_call(
        self, to_number: str, message: str, language: str = "hi"
    ) -> Optional[str]:
        """Make an outbound call for notifications."""
        try:
            if not self.client:
                logger.error("Twilio client not initialized")
                return None

            # Create TwiML for the message
            response = VoiceResponse()
            response.say(
                message,
                language=f"{language}-IN" if language != "en" else "en-IN",
                voice=self._get_voice_for_language(language),
            )

            call = self.client.calls.create(
                twiml=str(response), to=to_number, from_=settings.twilio_phone_number
            )

            logger.info(f"Outbound call initiated: {call.sid}")
            return call.sid

        except TwilioException as e:
            logger.error(f"Twilio error making outbound call: {e}")
            return None
        except Exception as e:
            logger.error(f"Error making outbound call: {e}")
            return None


# Global instance
ivr_service = IVRService()
