import os
import sys

# Set path and load env
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from ai.bhashini_client import bhashini_client
from ai_catalogue.service import generate_catalogue, extract_fallback_catalogue
from voice.service import run_audio_transcription_pipeline

print("==================================================")
print("1. TESTING BHASHINI SCRIPT DETECTION & TRANSLATION VALIDATION")
print("==================================================")

# 1. Unicode script detection
tam_text = "இது ஒரு கைவினை மண்பானை"
hin_text = "यह एक सुंदर हस्तनिर्मित मिट्टी का घड़ा है"
eng_text = "This is a handcrafted terracotta pot"

assert bhashini_client.detect_text_language(tam_text) == "ta", "Should detect Tamil"
assert bhashini_client.detect_text_language(hin_text) == "hi", "Should detect Hindi"
assert bhashini_client.detect_text_language(eng_text) == "en", "Should detect English"
print("[OK] Unicode script detection passed (Tamil, Hindi, English)")

# 2. Translation validation
val_good = bhashini_client.validate_translation_quality(
    "Handcrafted Terracotta Pot 25cm with 2 handles",
    "हस्तनिर्मित मिट्टी का बर्तन 25cm 2 हैंडल के साथ"
)
assert val_good["passed"] is True, f"Validation should pass for good translation: {val_good}"
print("[OK] Translation validation passed for accurate translation with numbers preserved")

val_empty = bhashini_client.validate_translation_quality("Terracotta pot", "")
assert val_empty["passed"] is False, "Empty translation should fail validation"
print("[OK] Empty translation validation guard passed")

print("\n==================================================")
print("2. TESTING FALLBACK CATALOGUE GENERATOR")
print("==================================================")
fallback = extract_fallback_catalogue(
    transcript="This is a red clay terracotta tea cup set handmade on potter wheel",
    category="Pottery & Terracotta",
    source_lang="en",
    target_languages=["en", "hi", "ta", "te"]
)

assert fallback["title"], "Title must not be empty"
assert fallback["category"] == "Pottery & Terracotta"
assert "Terracotta Clay" in fallback["materials"] or "Clay" in fallback["materials"] or len(fallback["materials"]) > 0
assert fallback["short_description"]
assert fallback["full_description"]
assert len(fallback["key_highlights"]) >= 3
assert fallback["product_story"]
assert fallback["craft_type"] == "Terracotta Pottery"
assert fallback["handmade_status"] == "100% Handcrafted"
assert fallback["seo"]["seo_title"]
assert fallback["seo"]["meta_description"]
assert len(fallback["seo"]["keywords"]) >= 3
assert "en" in fallback["translations"]
assert "hi" in fallback["translations"]
print("[OK] Fallback catalogue generator passed with rich e-commerce, story, SEO & translations")

print("\n==================================================")
print("3. TESTING GEMINI / FULL CATALOGUE GENERATION WITH ANTI-HALLUCINATION")
print("==================================================")
catalogue = generate_catalogue(
    transcript="Terracotta water jug made with natural river clay, kiln fired, good for summer cooling",
    category="Pottery & Terracotta",
    language="en",
    target_languages=["en", "hi", "ta"]
)

print(f"  Title: {catalogue.get('title')}")
print(f"  Category: {catalogue.get('category')}")
print(f"  Short Desc: {catalogue.get('short_description')}")
print(f"  Craft Type: {catalogue.get('craft_type')}")
print(f"  Handmade Status: {catalogue.get('handmade_status')}")
print(f"  Key Highlights: {catalogue.get('key_highlights')}")
print(f"  Translations available: {list(catalogue.get('translations', {}).keys())}")
print(f"  SEO Title: {catalogue.get('seo', {}).get('seo_title')}")
print(f"  SEO Meta: {catalogue.get('seo', {}).get('meta_description')}")

# Anti-hallucination checks:
# Should NOT have hallucinated expensive materials like gold or diamond
mats_str = " ".join(catalogue.get("materials", [])).lower()
assert "gold" not in mats_str, "Anti-hallucination check failed: gold should not be in terracotta materials"
assert "diamond" not in mats_str, "Anti-hallucination check failed: diamond should not be in terracotta materials"
assert catalogue.get("handmade_status") == "100% Handcrafted"
assert catalogue.get("seo") is not None
assert catalogue.get("translations") is not None
print("[OK] Anti-hallucination and catalogue generation passed!")

print("\n==================================================")
print("ALL E2E CATALOGUE TESTS PASSED SUCCESSFULLY!")
print("==================================================")
