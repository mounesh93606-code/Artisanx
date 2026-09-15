import logging
from config import settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Priority order of models: lightweight, high-availability, followed by larger models
FALLBACK_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest"
]

def get_gemini_client():
    return genai.Client(api_key=settings.GEMINI_API_KEY)

def generate_content(prompt: str, mime_type: str = "application/json") -> str:
    client = get_gemini_client()
    last_error = None
    
    for model_name in FALLBACK_MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type=mime_type,
                ),
            )
            if response and response.text:
                return response.text
        except Exception as e:
            logger.warning(f"generate_content with {model_name} failed: {e}. Trying fallback...")
            last_error = e
            continue
            
    if last_error:
        raise last_error
    raise RuntimeError("All Gemini models failed to generate content.")

def process_audio_and_generate(audio_file_path: str, prompt: str, mime_type: str = "application/json") -> str:
    client = get_gemini_client()
    
    # Upload to Gemini File API
    gemini_file = client.files.upload(file=audio_file_path)
    last_error = None
    
    try:
        for model_name in FALLBACK_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[gemini_file, prompt],
                    config=types.GenerateContentConfig(
                        response_mime_type=mime_type,
                    ),
                )
                if response and response.text:
                    return response.text
            except Exception as e:
                logger.warning(f"process_audio_and_generate with {model_name} failed: {e}. Trying fallback...")
                last_error = e
                continue
                
        if last_error:
            raise last_error
        raise RuntimeError("All Gemini models failed to process audio.")
    finally:
        # Guaranteed cleanup of uploaded temporary audio
        try:
            client.files.delete(name=gemini_file.name)
        except Exception:
            pass

def summarize_market_reasoning(listings: list, low: float, high: float) -> str:
    try:
        client = get_gemini_client()
        listing_details = "\n".join([f"- {l.title} (₹{l.price}) from {l.source}" for l in listings])
        prompt = f"""Given these real marketplace listings and prices:
{listing_details}

Write ONE concise sentence describing the observed market price range for an artisan/buyer.
Do not invent, change, estimate, round, or introduce any price not present in the supplied data. The numeric range is exactly ₹{low} to ₹{high}.
"""
        for model_name in FALLBACK_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="text/plain",
                    ),
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                logger.warning(f"summarize_market_reasoning with {model_name} failed: {e}. Trying fallback...")
                continue
    except Exception as e:
        print(f"Gemini Summarize Error: {e}")
        
    # Deterministic fallback
    return f"Based on the available marketplace listings, similar products are currently listed between ₹{low} and ₹{high}."
