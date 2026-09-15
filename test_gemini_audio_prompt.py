import os
import sys
import json
from dotenv import load_dotenv

load_dotenv("backend/.env")
sys.path.append("backend")

from google import genai
from google.genai import types

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

prompt = """
Please listen to this audio recorded by an Indian artisan describing their product.
Return a JSON response with EXACTLY this structure:
{
  "detected_language": "supported language code (en/ta/hi/te/kn/ml/bn/mr/ur)",
  "original_text": "verbatim transcript in the original spoken language",
  "english_translation": "natural English translation"
}
Keep the translation natural and professional, not word-for-word literal.
"""

gemini_file = client.files.upload(file="backend/test_audio.mp3")
print("Uploaded successfully:", gemini_file.name)

models = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]

for m in models:
    try:
        print(f"\n--- Testing {m} ---")
        res = client.models.generate_content(
            model=m,
            contents=[gemini_file, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        print(f"Result from {m}:")
        print(res.text)
        data = json.loads(res.text)
        print("Parsed JSON keys:", list(data.keys()))
        print("SUCCESS with", m)
        break
    except Exception as e:
        print(f"Error with {m}: {e}")

try:
    client.files.delete(name=gemini_file.name)
except Exception:
    pass
