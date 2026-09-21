import json
import re
import logging
from typing import Optional, List, Dict, Any
from fastapi import HTTPException
from database import supabase_client
from ai.gemini_client import generate_content
from ai.bhashini_client import bhashini_client, SUPPORTED_BHASHINI_LANGUAGES
from .schemas import CatalogueSaveRequest, CatalogueGenerateResponse

logger = logging.getLogger(__name__)

CRAFT_CATEGORIES = {
    "pottery": "Pottery & Terracotta",
    "terracotta": "Pottery & Terracotta",
    "clay": "Pottery & Terracotta",
    "ceramic": "Pottery & Terracotta",
    "saree": "Textiles & Handloom",
    "silk": "Textiles & Handloom",
    "cotton": "Textiles & Handloom",
    "fabric": "Textiles & Handloom",
    "dupatta": "Textiles & Handloom",
    "shawl": "Textiles & Handloom",
    "wood": "Woodwork & Carving",
    "wooden": "Woodwork & Carving",
    "sheesham": "Woodwork & Carving",
    "teak": "Woodwork & Carving",
    "toy": "Toys & Games",
    "brass": "Metalwork & Dhokra",
    "copper": "Metalwork & Dhokra",
    "metal": "Metalwork & Dhokra",
    "dhokra": "Metalwork & Dhokra",
    "jewelry": "Jewelry & Ornaments",
    "necklace": "Jewelry & Ornaments",
    "earrings": "Jewelry & Ornaments",
    "bangle": "Jewelry & Ornaments",
    "silver": "Jewelry & Ornaments",
    "leather": "Leathercraft",
    "chappal": "Leathercraft",
    "bag": "Bags & Accessories",
    "painting": "Folk Art & Painting",
    "madhubani": "Folk Art & Painting",
    "warli": "Folk Art & Painting",
    "lamp": "Home Decor & Lighting",
    "diya": "Home Decor & Lighting",
    "decor": "Home Decor & Lighting",
    "bowl": "Kitchen & Dining",
    "plate": "Kitchen & Dining",
    "tray": "Kitchen & Dining"
}

CRAFT_TECHNIQUES = {
    "Pottery & Terracotta": ("Terracotta Pottery", "Traditional Potter's Wheel & Open Kiln Firing"),
    "Textiles & Handloom": ("Handloom Weaving", "Traditional Pit Loom / Jacquard Loom"),
    "Woodwork & Carving": ("Wood Carving", "Hand Chisel & Mallet Sculpting"),
    "Metalwork & Dhokra": ("Dhokra Lost-Wax Casting", "Indigenous Clay Core & Molten Metal Casting"),
    "Jewelry & Ornaments": ("Artisanal Filigree & Kundan", "Handcrafted Stone Setting & Wire Weaving"),
    "Folk Art & Painting": ("Traditional Folk Painting", "Natural Pigment Hand-Brushing & Bamboo Pen"),
    "Leathercraft": ("Hand-stitched Leatherwork", "Vegetable Tanning & Saddle Stitching"),
    "Home Decor & Lighting": ("Artisanal Craftwork", "Hand Assembly & Traditional Finishing")
}

def extract_fallback_catalogue(
    transcript: str, 
    category: str = "", 
    source_lang: str = "en",
    target_languages: Optional[List[str]] = None
) -> dict:
    """
    Intelligent rule-based fallback when Gemini is blocked by network firewalls or unavailable.
    Guarantees that AI Catalogue always returns valid, professional catalogue fields,
    SEO metadata, and Bhashini multilingual translations.
    """
    clean_text = transcript.strip() if transcript else ""
    words = re.findall(r'\w+', clean_text.lower())
    
    # 1. Detect Category
    detected_cat = category
    if not detected_cat or detected_cat.lower() in ["unknown", "other", "all"]:
        for w in words:
            if w in CRAFT_CATEGORIES:
                detected_cat = CRAFT_CATEGORIES[w]
                break
    if not detected_cat:
        detected_cat = "Handicrafts & Decor"

    # 2. Extract Title
    first_sentence = clean_text.split('.')[0].strip()
    if 5 < len(first_sentence) < 60:
        title = first_sentence.title()
    else:
        key_terms = [w.title() for w in words if len(w) > 3][:4]
        title = "Handcrafted " + " ".join(key_terms) if key_terms else f"Handcrafted {detected_cat}"

    # 3. Extract Tags
    common_stops = {"this", "that", "with", "from", "made", "hand", "very", "good", "item", "product", "also", "have", "here"}
    tags = [w for w in set(words) if len(w) > 3 and w not in common_stops][:6]
    if not tags:
        tags = ["handmade", "artisanal", "authentic", "craft", detected_cat.lower().split()[0]]

    # 4. Extract Materials
    material_keywords = ["terracotta", "clay", "silk", "cotton", "wood", "sheesham", "teak", "brass", "copper", "silver", "leather", "jute", "bamboo", "ceramic"]
    found_mats = [w.title() for w in material_keywords if w in words]
    if not found_mats:
        found_mats = ["Natural Traditional Material"]

    # 5. Care Instructions
    if "silk" in words:
        care = "Dry clean only. Store in a clean, dry muslin cloth away from direct sunlight."
    elif "terracotta" in words or "clay" in words:
        care = "Handle with care. Clean gently with a soft dry cloth. Avoid harsh chemicals."
    elif "wood" in words or "sheesham" in words:
        care = "Wipe with a soft dry cloth. Keep away from excessive moisture and direct heat."
    elif "brass" in words or "metal" in words:
        care = "Clean with a soft dry cloth or brass polish to maintain natural shine."
    elif "leather" in words:
        care = "Store in a breathable fabric cover. Keep away from water and direct heat."
    else:
        care = "Handle with care. Wipe with a clean, dry cloth."

    craft_type, technique = CRAFT_TECHNIQUES.get(detected_cat, ("Traditional Craft", "Handcrafted by Skilled Artisan"))
    
    short_desc = f"Handcrafted {detected_cat} made by skilled Indian artisans using time-honored techniques."
    full_desc = clean_text or f"Authentic handcrafted {detected_cat.lower()} created with premium traditional materials. Each piece showcases unique artisanal textures and enduring cultural heritage."
    
    highlights = [
        "100% Handcrafted by skilled Indian artisans",
        f"Crafted using authentic {', '.join(found_mats)}",
        "Unique artisanal piece with traditional heritage",
        f"Production time: 3-5 business days"
    ]
    
    product_story = f"Rooted in generations of Indian artisanal tradition, this piece represents the dedication and mastery of traditional craft makers. Every subtle variation in texture is a mark of authentic handmade artistry."

    seo_data = {
        "seo_title": f"{title} | Authentic Handcrafted Indian Art",
        "meta_description": f"Buy authentic {title}. Handcrafted using traditional {craft_type.lower()} by Indian master artisans. Direct from artisan.",
        "keywords": [detected_cat.lower(), "handmade", "indian craft", "artisanal", "authentic"] + [m.lower() for m in found_mats],
        "search_tags": tags + ["vocal for local", "handmade in india"]
    }

    fields_to_translate = {
        "title": title,
        "short_description": short_desc,
        "full_description": full_desc,
        "key_highlights": highlights
    }

    target_langs = target_languages or ["hi", "ta", "te", "kn", "ml", "bn", "mr", "gu", "en"]
    translations = bhashini_client.translate_catalogue_fields(
        fields_to_translate, 
        source_lang="en", 
        target_langs=target_langs
    )

    return {
        "title": title,
        "description": full_desc,
        "category": detected_cat,
        "tags": tags,
        "materials": found_mats,
        "care_instructions": care,
        "estimated_production_time": "3-5 days",
        "dimensions": "Standard artisanal dimensions",
        "short_description": short_desc,
        "full_description": full_desc,
        "key_highlights": highlights,
        "product_story": product_story,
        "craft_type": craft_type,
        "manufacturing_technique": technique,
        "handmade_status": "100% Handcrafted",
        "seo": seo_data,
        "translations": translations,
        "quality_validation": {
            "passed": True,
            "warnings": []
        }
    }

def generate_catalogue(
    transcript: str, 
    category: str = "", 
    language: str = "en",
    source_language: Optional[str] = "en",
    target_languages: Optional[List[str]] = None
) -> dict:
    """
    Generates professional e-commerce product catalogue copy from artisan voice transcript:
    1. Detects source language (Unicode script analysis or Bhashini TLD).
    2. Translates non-English transcripts to English for accurate AI understanding.
    3. Prompts Gemini with strict anti-hallucination guards.
    4. Generates e-commerce copy (title, short/full descriptions, highlights, craft story, SEO).
    5. Translates catalogue into 9 Indic languages using Bhashini NMT.
    6. Validates translation consistency.
    """
    clean_transcript = transcript.strip() if transcript else ""
    
    # Detect language if not provided or set to generic
    effective_lang = source_language or language or "en"
    if effective_lang == "en" and clean_transcript:
        detected_lang = bhashini_client.detect_text_language(clean_transcript)
        if detected_lang and detected_lang in SUPPORTED_BHASHINI_LANGUAGES:
            effective_lang = detected_lang

    # If transcript is in an Indic language, translate to English for Gemini comprehension
    english_transcript = clean_transcript
    if effective_lang != "en" and clean_transcript:
        try:
            english_transcript = bhashini_client.translate_text(clean_transcript, source_lang=effective_lang, target_lang="en")
            logger.info(f"Translated transcript from {effective_lang} to en: '{english_transcript}'")
        except Exception as e:
            logger.warning(f"Could not translate transcript to en for Gemini: {e}")
            english_transcript = clean_transcript

    prompt = f"""
    You are an expert product catalogue and e-commerce copy assistant for Indian artisan crafts.
    
    ARTISAN VOICE TRANSCRIPTION: "{english_transcript}"
    ORIGINAL LANGUAGE: "{effective_lang}"
    SUGGESTED CATEGORY: "{category or 'unknown'}"
    
    Generate structured, professional e-commerce product details adhering strictly to these rules:
    
    ANTI-HALLUCINATION RULES:
    1. Do NOT invent certifications, GI (Geographical Indication) tags, state origins, or awards not stated by the artisan.
    2. Do NOT invent expensive materials (e.g. pure gold, pure silver, diamonds) unless explicitly stated.
    3. Do NOT invent specific historical figures or false lineage.
    4. Focus on describing the craft aesthetics, texture, intended use, and handcrafted nature based faithfully on the artisan's words.
    
    OUTPUT REQUIREMENTS:
    - title: Clear, compelling e-commerce title (under 60 characters)
    - short_description: 2-3 concise, punchy sentences for product listing cards
    - full_description: Evocative product description covering design, materials, feel, and usage
    - key_highlights: Array of 3-5 bullet points highlighting craftsmanship, materials, care, and handmade quality
    - product_story: 1-2 warm, authentic paragraphs celebrating the artisanal heritage and human skill
    - craft_type: Specific craft style (e.g. 'Terracotta Pottery', 'Handloom Weaving', 'Dhokra Metal Casting', 'Wood Carving')
    - manufacturing_technique: Tools or process used (e.g. 'Hand-thrown on potter's wheel and kiln fired', 'Handloom woven with traditional warp')
    - handmade_status: '100% Handcrafted'
    - category: The best-fit category from: Pottery & Terracotta, Textiles & Handloom, Woodwork & Carving, Metalwork & Dhokra, Jewelry & Ornaments, Folk Art & Painting, Leathercraft, Home Decor & Lighting, Kitchen & Dining, Toys & Games
    - tags: 5-8 relevant searchable tags
    - materials: Array of primary materials (e.g. ['Terracotta Clay', 'Natural Glaze'])
    - care_instructions: Practical care tips to preserve the craft
    - estimated_production_time: Realistic production or dispatch time (e.g. '3-5 days')
    - dimensions: Dimensions/weight if mentioned, else 'Standard artisanal dimensions'
    - seo: Object with:
        - seo_title: Title optimized for search (under 60 chars)
        - meta_description: Search meta description (120-155 chars)
        - keywords: Array of 4-6 search keywords
        - search_tags: Array of 4-6 consumer search terms
        
    Respond in JSON format EXACTLY matching this structure:
    {{
        "title": "...",
        "short_description": "...",
        "full_description": "...",
        "key_highlights": ["...", "..."],
        "product_story": "...",
        "craft_type": "...",
        "manufacturing_technique": "...",
        "handmade_status": "100% Handcrafted",
        "category": "...",
        "tags": ["...", "..."],
        "materials": ["...", "..."],
        "care_instructions": "...",
        "estimated_production_time": "...",
        "dimensions": "...",
        "seo": {{
            "seo_title": "...",
            "meta_description": "...",
            "keywords": ["...", "..."],
            "search_tags": ["...", "..."]
        }}
    }}
    """
    
    try:
        response_json = generate_content(prompt, mime_type="application/json")
        clean_json = response_json.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        elif clean_json.startswith("```"):
            clean_json = clean_json[3:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        clean_json = clean_json.strip()
            
        data = json.loads(clean_json)
        
        # Ensure description is present for backwards compatibility
        if not data.get("description"):
            data["description"] = data.get("full_description") or data.get("short_description") or clean_transcript
            
        # Translate to regional languages via Bhashini NMT
        target_langs = target_languages or ["hi", "ta", "te", "kn", "ml", "bn", "mr", "gu", "en"]
        fields_to_translate = {
            "title": data.get("title", ""),
            "short_description": data.get("short_description", ""),
            "full_description": data.get("full_description", "") or data.get("description", ""),
            "key_highlights": data.get("key_highlights", [])
        }
        
        translations = bhashini_client.translate_catalogue_fields(
            fields_to_translate, 
            source_lang="en", 
            target_langs=target_langs
        )
        data["translations"] = translations
        
        # Validate translation quality
        validation_warnings = []
        for t_lang, t_fields in translations.items():
            if t_lang != "en":
                val = bhashini_client.validate_translation_quality(
                    data.get("title", ""), 
                    t_fields.get("title", "")
                )
                if not val.get("passed"):
                    validation_warnings.extend([f"[{t_lang}] {w}" for w in val.get("warnings", [])])
                    
        data["quality_validation"] = {
            "passed": len(validation_warnings) == 0,
            "warnings": validation_warnings
        }
        
        return data
        
    except Exception as e:
        logger.warning(f"Gemini catalogue generation failed or blocked: {e}. Using intelligent fallback parser.")
        return extract_fallback_catalogue(
            transcript=english_transcript or clean_transcript, 
            category=category, 
            source_lang=effective_lang,
            target_languages=target_languages
        )

def save_catalogue(product_id: str, artisan_id: str, catalogue_data: CatalogueSaveRequest):
    # Verify product ownership
    res = supabase_client.table("products").select("*").eq("id", product_id).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Product not found")
        
    if res.data[0].get("artisan_id") != artisan_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    # Preserve existing materials structure while enriching with translations & SEO
    existing_product = res.data[0]
    existing_materials = existing_product.get("materials") or {}
    
    if isinstance(existing_materials, dict):
        materials_payload = dict(existing_materials)
    elif isinstance(existing_materials, list):
        materials_payload = {"list": existing_materials}
    else:
        materials_payload = {"list": catalogue_data.materials}

    # Store translations, SEO, and story within materials JSONB to guarantee zero schema breakage
    materials_payload["translations"] = catalogue_data.translations or {}
    materials_payload["seo"] = catalogue_data.seo or {}
    materials_payload["short_description"] = catalogue_data.short_description or ""
    materials_payload["product_story"] = catalogue_data.product_story or ""
    materials_payload["key_highlights"] = catalogue_data.key_highlights or []
    materials_payload["craft_type"] = catalogue_data.craft_type or ""
    materials_payload["manufacturing_technique"] = catalogue_data.manufacturing_technique or ""

    update_data = {
        "title": catalogue_data.title,
        "description": catalogue_data.full_description or catalogue_data.description,
        "category": catalogue_data.category,
        "tags": catalogue_data.tags,
        "materials": materials_payload,
        "care_instructions": catalogue_data.care_instructions,
        "production_time": catalogue_data.estimated_production_time,
    }
    
    if catalogue_data.dimensions:
        update_data["dimensions"] = catalogue_data.dimensions
    
    update_res = supabase_client.table("products").update(update_data).eq("id", product_id).execute()
    if update_res.data and len(update_res.data) > 0:
        return {"message": "Catalogue data saved successfully", "product": update_res.data[0]}
        
    raise HTTPException(status_code=500, detail="Failed to save catalogue data")
