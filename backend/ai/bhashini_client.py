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
        """
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "txt-lang-detection"
                }
            ],
            "inputData": {
                "input": [{"source": text}]
            }
        }
        headers = self._get_inference_headers()
        with httpx.Client(timeout=10.0) as client:
            res = client.post(self.inference_endpoint, json=payload, headers=headers)
            if res.status_code == 200:
                out = res.json().get("pipelineResponse", [{}])[0].get("output", [{}])[0]
                return out.get("langPrediction", [{}])[0].get("langCode", "en")
            return "en"

# Global client singleton
bhashini_client = BhashiniClient()
