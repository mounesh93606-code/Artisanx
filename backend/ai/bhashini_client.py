import os
import base64
import logging
import httpx
from typing import Optional, Dict, Any, List
from config import settings

logger = logging.getLogger(__name__)

# Supported Indian languages in Bhashini:
# ta: Tamil, hi: Hindi, te: Telugu, kn: Kannada, ml: Malayalam
# bn: Bengali, mr: Marathi, ur: Urdu, gu: Gujarati, pa: Punjabi, or: Odia, as: Assamese, en: English
SUPPORTED_BHASHINI_LANGUAGES = [
    "ta", "hi", "te", "kn", "ml", "bn", "mr", "ur", "gu", "pa", "or", "as", "en"
]

DRAVIDIAN_LANGS = {"ta", "te", "kn", "ml"}

def get_asr_service_id(lang: str) -> str:
    return "ai4bharat/conformer-multilingual-dravidian-gpu--t4" if lang in DRAVIDIAN_LANGS else "ai4bharat/conformer-multilingual-indo_aryan-gpu--t4"

def get_nmt_service_id() -> str:
    return "ai4bharat/indictrans-v2-all-gpu--t4"

def get_tts_service_id(lang: str) -> str:
    return "ai4bharat/indic-tts-coqui-dravidian-gpu--t4" if lang in DRAVIDIAN_LANGS else "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4"

def is_bhashini_configured() -> bool:
    """Check if minimum Bhashini API key or inference key is configured."""
    return bool(settings.BHASHINI_INFERENCE_API_KEY or settings.BHASHINI_API_KEY)

class BhashiniClient:
    """
    Bhashini (National Language Translation Mission - MeitY / ULCA / Dhruva) API Client.
    Supports ASR, NMT, TTS, Transliteration, OCR, Language Detection, and Normalization.
    Works directly with just an Inference Key / API Key (no User ID or Pipeline ID required).
    """

    def __init__(self):
        self.user_id = settings.BHASHINI_USER_ID
        self.ulca_api_key = settings.BHASHINI_API_KEY
        self.inference_api_key = settings.BHASHINI_INFERENCE_API_KEY
        self.config_endpoint = settings.BHASHINI_CONFIG_ENDPOINT
        self.inference_endpoint = settings.BHASHINI_PIPELINE_ENDPOINT or "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"
        self.pipeline_id = settings.BHASHINI_PIPELINE_ID
        self._cached_service_ids: Dict[str, str] = {}

    def _get_inference_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        key = self.inference_api_key or self.ulca_api_key
        if key:
            headers["Authorization"] = key
            headers["ulcaApiKey"] = key
        return headers

    def _file_to_base64(self, file_path: str) -> str:
        with open(file_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    async def get_pipeline_config(self, tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Dynamically fetch the recommended pipeline inference endpoints and service IDs
        from MeitY ULCA / Dhruva model registry.
        """
        if not self.user_id or not self.ulca_api_key:
            logger.info("Bhashini user credentials not provided, using direct inference endpoint.")
            return {}

        headers = {
            "userID": self.user_id,
            "ulcaApiKey": self.ulca_api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "pipelineTasks": tasks,
            "pipelineRequestConfig": {
                "pipelineId": self.pipeline_id or "64392f96daac500b55c543d0"
            }
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(self.config_endpoint, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    # Cache callbackUrl and inferenceApiKey if returned
                    inference_ep = data.get("pipelineInferenceAPIEndPoint", {})
                    if inference_ep.get("callbackUrl"):
                        self.inference_endpoint = inference_ep.get("callbackUrl")
                    if inference_ep.get("inferenceApiKey", {}).get("value"):
                        self.inference_api_key = inference_ep["inferenceApiKey"]["value"]
                    return data
                else:
                    logger.warning(f"Bhashini config fetch failed with status {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"Error connecting to Bhashini config endpoint: {e}")
        return {}

    def transcribe_and_translate(
        self, 
        audio_path: str, 
        source_lang: str = "ta", 
        target_lang: str = "en"
    ) -> Dict[str, str]:
        """
        ASR (Automatic Speech Recognition) + NMT (Neural Machine Translation) Pipeline.
        Takes artisan voice audio and returns original transcribed text and English translation.
        """
        audio_b64 = self._file_to_base64(audio_path)
        # Build Dhruva Pipeline Task definition for ASR + Translation
        pipeline_tasks = [
            {
                "taskType": "asr",
                "config": {
                    "language": {"sourceLanguage": source_lang},
                    "serviceId": get_asr_service_id(source_lang),
                    "audioFormat": "webm" if audio_path.endswith(".webm") else "wav",
                    "samplingRate": 16000
                }
            },
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source_lang,
                        "targetLanguage": target_lang
                    },
                    "serviceId": get_nmt_service_id()
                }
            }
        ]

        payload = {
            "pipelineTasks": pipeline_tasks,
            "inputData": {
                "audio": [{"audioContent": audio_b64}]
            }
        }

        headers = self._get_inference_headers()
        with httpx.Client(timeout=30.0) as client:
            res = client.post(self.inference_endpoint, json=payload, headers=headers)
            if res.status_code != 200:
                raise RuntimeError(f"Bhashini inference error ({res.status_code}): {res.text}")

            res_json = res.json()
            pipeline_response = res_json.get("pipelineResponse", [])

            original_text = ""
            translated_text = ""

            for task in pipeline_response:
                task_type = task.get("taskType")
                output = task.get("output", [])
                if task_type == "asr" and output:
                    original_text = output[0].get("source", "")
                elif task_type == "translation" and output:
                    translated_text = output[0].get("target", "")

            if not original_text and not translated_text:
                raise RuntimeError("Bhashini returned empty transcript or translation.")

            return {
                "detected_language": source_lang,
                "original_text": original_text,
                "english_translation": translated_text or original_text
            }

    def transcribe_audio(self, audio_path: str, source_lang: str = "ta") -> str:
        """
        ASR (Speech to Text): Transcribes Indian language audio into native script text.
        """
        audio_b64 = self._file_to_base64(audio_path)
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "asr",
                    "config": {
                        "language": {"sourceLanguage": source_lang},
                        "serviceId": get_asr_service_id(source_lang),
                        "audioFormat": "webm" if audio_path.endswith(".webm") else "wav"
                    }
                }
            ],
            "inputData": {
                "audio": [{"audioContent": audio_b64}]
            }
        }
        headers = self._get_inference_headers()
        with httpx.Client(timeout=25.0) as client:
            res = client.post(self.inference_endpoint, json=payload, headers=headers)
            if res.status_code == 200:
                out = res.json().get("pipelineResponse", [{}])[0].get("output", [{}])[0]
                return out.get("source", "")
            raise RuntimeError(f"Bhashini ASR failed: {res.text}")

    def translate_text(self, text: str, source_lang: str = "ta", target_lang: str = "en") -> str:
        """
        NMT (Neural Machine Translation): Translates text between Indian languages and English.
        """
        if not text:
            return ""
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": source_lang,
                            "targetLanguage": target_lang
                        },
                        "serviceId": get_nmt_service_id()
                    }
                }
            ],
            "inputData": {
                "input": [{"source": text}]
            }
        }
        headers = self._get_inference_headers()
        with httpx.Client(timeout=15.0) as client:
            res = client.post(self.inference_endpoint, json=payload, headers=headers)
            if res.status_code == 200:
                out = res.json().get("pipelineResponse", [{}])[0].get("output", [{}])[0]
                return out.get("target", "")
            raise RuntimeError(f"Bhashini NMT failed: {res.text}")

    def text_to_speech(self, text: str, source_lang: str = "ta", gender: str = "female") -> str:
        """
        TTS (Text-to-Speech): Converts Indian language text into high-fidelity voice audio.
        Returns base64 encoded WAV audio string.
        """
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "tts",
                    "config": {
                        "language": {"sourceLanguage": source_lang},
                        "serviceId": get_tts_service_id(source_lang),
                        "gender": gender
                    }
                }
            ],
            "inputData": {
                "input": [{"source": text}]
            }
        }
        headers = self._get_inference_headers()
        with httpx.Client(timeout=20.0) as client:
            res = client.post(self.inference_endpoint, json=payload, headers=headers)
            if res.status_code == 200:
                audio_list = res.json().get("pipelineResponse", [{}])[0].get("audio", [{}])
                if audio_list and "audioContent" in audio_list[0]:
                    return audio_list[0]["audioContent"]
            raise RuntimeError(f"Bhashini TTS failed: {res.text}")

    def transliterate_text(self, text: str, source_lang: str = "en", target_lang: str = "ta") -> str:
        """
        Transliteration: Converts phonetic English text into Indic script (e.g. 'vanakkam' -> 'வணக்கம்').
        """
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "transliteration",
                    "config": {
                        "language": {
                            "sourceLanguage": source_lang,
                            "targetLanguage": target_lang
                        }
                    }
                }
            ],
            "inputData": {
                "input": [{"source": text}]
            }
        }
        headers = self._get_inference_headers()
        with httpx.Client(timeout=15.0) as client:
            res = client.post(self.inference_endpoint, json=payload, headers=headers)
            if res.status_code == 200:
                out = res.json().get("pipelineResponse", [{}])[0].get("output", [{}])[0]
                return out.get("target", "")
            raise RuntimeError(f"Bhashini Transliteration failed: {res.text}")

    def perform_ocr(self, image_b64_or_path: str, source_lang: str = "ta") -> str:
        """
        OCR (Optical Character Recognition): Extracts text from handicraft certificates, labels, or bills.
        """
        if os.path.isfile(image_b64_or_path):
            img_b64 = self._file_to_base64(image_b64_or_path)
        else:
            img_b64 = image_b64_or_path

        payload = {
            "pipelineTasks": [
                {
                    "taskType": "ocr",
                    "config": {
                        "language": {"sourceLanguage": source_lang}
                    }
                }
            ],
            "inputData": {
                "image": [{"imageContent": img_b64}]
            }
        }
        headers = self._get_inference_headers()
        with httpx.Client(timeout=25.0) as client:
            res = client.post(self.inference_endpoint, json=payload, headers=headers)
            if res.status_code == 200:
                out = res.json().get("pipelineResponse", [{}])[0].get("output", [{}])[0]
                return out.get("source", "")
            raise RuntimeError(f"Bhashini OCR failed: {res.text}")

    def detect_text_language(self, text: str) -> str:
        """
        TLD (Text Language Detection): Detects which Indic language the text belongs to.
        Uses fast deterministic Unicode block analysis first, falling back to Bhashini TLD.
        """
        if not text or not text.strip():
            return "en"
            
        # Count characters in Indic Unicode blocks
        script_counts = {
            "ta": sum(1 for c in text if '\u0B80' <= c <= '\u0BFF'), # Tamil
            "hi": sum(1 for c in text if '\u0900' <= c <= '\u097F'), # Devanagari (Hindi/Marathi)
            "te": sum(1 for c in text if '\u0C00' <= c <= '\u0C7F'), # Telugu
            "kn": sum(1 for c in text if '\u0C80' <= c <= '\u0CFF'), # Kannada
            "ml": sum(1 for c in text if '\u0D00' <= c <= '\u0D7F'), # Malayalam
            "bn": sum(1 for c in text if '\u0980' <= c <= '\u09FF'), # Bengali
            "gu": sum(1 for c in text if '\u0A80' <= c <= '\u0AFF'), # Gujarati
            "ur": sum(1 for c in text if '\u0600' <= c <= '\u06FF'), # Urdu
        }
        
        top_lang = max(script_counts, key=script_counts.get)
        if script_counts[top_lang] >= 3:
            return top_lang

        # Fallback to Bhashini API
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "txt-lang-detection"
                }
            ],
            "inputData": {
                "input": [{"source": text[:200]}]
            }
        }
        headers = self._get_inference_headers()
        try:
            with httpx.Client(timeout=8.0) as client:
                res = client.post(self.inference_endpoint, json=payload, headers=headers)
                if res.status_code == 200:
                    out = res.json().get("pipelineResponse", [{}])[0].get("output", [{}])[0]
                    detected = out.get("langPrediction", [{}])[0].get("langCode", "")
                    if detected in SUPPORTED_BHASHINI_LANGUAGES:
                        return detected
        except Exception as e:
            logger.debug(f"Bhashini TLD endpoint skipped: {e}")
            
        return "en"

    def translate_catalogue_fields(
        self, 
        fields: Dict[str, Any], 
        source_lang: str = "en", 
        target_langs: List[str] = None
    ) -> Dict[str, Dict[str, Any]]:
        """
        Translates structured catalogue fields (title, short_description, full_description, key_highlights)
        into multiple regional Indian languages using high-performance concurrent batch requests to Bhashini NMT.
        """
        from concurrent.futures import ThreadPoolExecutor

        if target_langs is None:
            target_langs = ["hi", "ta", "te", "kn", "ml", "bn", "mr", "gu"]

        title = fields.get("title", "")
        short_desc = fields.get("short_description", "") or fields.get("description", "")
        full_desc = fields.get("full_description", "") or fields.get("description", "")
        highlights = fields.get("key_highlights", [])
        highlights_str = "\n".join(f"• {h}" for h in highlights) if highlights else ""

        results: Dict[str, Dict[str, Any]] = {}

        # Default source language entry
        results[source_lang] = {
            "title": title,
            "short_description": short_desc,
            "full_description": full_desc,
            "key_highlights": highlights
        }

        def _translate_single_lang(t_lang: str) -> tuple:
            if t_lang == source_lang:
                return t_lang, results[source_lang]

            # Build single batch request with all fields
            inputs = []
            inputs.append({"source": title or "Craft"})
            inputs.append({"source": short_desc or "Handcrafted product"})
            inputs.append({"source": full_desc or "Handcrafted product by artisans"})
            if highlights_str:
                inputs.append({"source": highlights_str})

            payload = {
                "pipelineTasks": [
                    {
                        "taskType": "translation",
                        "config": {
                            "language": {
                                "sourceLanguage": source_lang,
                                "targetLanguage": t_lang
                            },
                            "serviceId": get_nmt_service_id()
                        }
                    }
                ],
                "inputData": {
                    "input": inputs
                }
            }
            headers = self._get_inference_headers()
            try:
                with httpx.Client(timeout=8.0) as client:
                    res = client.post(self.inference_endpoint, json=payload, headers=headers)
                    if res.status_code == 200:
                        outputs = res.json().get("pipelineResponse", [{}])[0].get("output", [])
                        t_title = outputs[0].get("target", title) if len(outputs) > 0 else title
                        t_short = outputs[1].get("target", short_desc) if len(outputs) > 1 else short_desc
                        t_full = outputs[2].get("target", full_desc) if len(outputs) > 2 else full_desc
                        
                        t_high = highlights
                        if len(outputs) > 3 and highlights_str:
                            t_high_text = outputs[3].get("target", "")
                            t_high = [line.lstrip("•*- ").strip() for line in t_high_text.split("\n") if line.strip()] or highlights

                        return t_lang, {
                            "title": t_title,
                            "short_description": t_short,
                            "full_description": t_full,
                            "key_highlights": t_high
                        }
            except Exception as e:
                logger.warning(f"Batch Bhashini translation to {t_lang} failed: {e}")

            # Fallback to source fields
            return t_lang, {
                "title": title,
                "short_description": short_desc,
                "full_description": full_desc,
                "key_highlights": highlights
            }

        # Run concurrent batch translations across all languages in parallel
        with ThreadPoolExecutor(max_workers=min(len(target_langs), 8)) as executor:
            lang_results = list(executor.map(_translate_single_lang, target_langs))

        for t_lang, lang_dict in lang_results:
            results[t_lang] = lang_dict

        return results

    def validate_translation_quality(
        self, 
        source_text: str, 
        translated_text: str, 
        key_entities: List[str] = None
    ) -> Dict[str, Any]:
        """
        Validates translation quality:
        - Non-empty check
        - Length ratio check
        - Preservation of numbers / measurements (e.g. '10 days', '2.5')
        """
        if not translated_text or not translated_text.strip():
            return {"passed": False, "reason": "Empty translation received"}

        import re
        # Check numbers preservation
        source_numbers = set(re.findall(r'\b\d+(?:\.\d+)?\b', source_text))
        trans_numbers = set(re.findall(r'\b\d+(?:\.\d+)?\b', translated_text))
        
        # Missing numbers check (if source had numbers)
        missing_numbers = source_numbers - trans_numbers
        
        # Length check (translation shouldn't be abnormally tiny compared to source)
        src_len = len(source_text.strip())
        trans_len = len(translated_text.strip())
        length_ratio = trans_len / max(src_len, 1)

        is_valid = True
        warnings = []
        if length_ratio < 0.25 and src_len > 20:
            is_valid = False
            warnings.append("Translation appears truncated or incomplete")
            
        if missing_numbers:
            warnings.append(f"Numbers missing in translation: {', '.join(missing_numbers)}")

        return {
            "passed": is_valid,
            "length_ratio": round(length_ratio, 2),
            "warnings": warnings
        }

# Global client singleton
bhashini_client = BhashiniClient()
