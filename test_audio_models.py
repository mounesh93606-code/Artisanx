import os
import sys
from dotenv import load_dotenv

load_dotenv("backend/.env")
sys.path.append("backend")

from google import genai
from google.genai import types

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

models_to_test = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-1.5-flash",
    "gemini-3.5-flash"
]

print("Uploading audio...")
try:
    gemini_file = client.files.upload(file="backend/test_audio.mp3")
    print(f"File uploaded: {gemini_file.name}")
except Exception as e:
    print(f"Upload failed: {e}")
    sys.exit(1)

for m in models_to_test:
    print(f"\nTesting model: {m}...")
    try:
        res = client.models.generate_content(
            model=m,
            contents=[gemini_file, "Transcribe this audio in JSON: {\"transcript\": \"...\"}"],
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        print(f"Success with {m}: {res.text[:150]}")
        break
    except Exception as e:
        print(f"Failed with {m}: {e}")

try:
    client.files.delete(name=gemini_file.name)
except Exception:
    pass
