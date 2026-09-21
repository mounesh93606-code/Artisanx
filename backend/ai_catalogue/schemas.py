from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class CatalogueGenerateRequest(BaseModel):
    transcript: str
    category: Optional[str] = None
    language: Optional[str] = "en"
    source_language: Optional[str] = "en"
    target_languages: Optional[List[str]] = None

class CatalogueTranslationItem(BaseModel):
    title: str
    short_description: str
    full_description: str
    key_highlights: List[str]

class SEOMetadata(BaseModel):
    seo_title: str
    meta_description: str
    keywords: List[str]
    search_tags: List[str]

class CatalogueGenerateResponse(BaseModel):
    title: str
    description: str
    category: str
    tags: List[str]
    materials: List[str]
    care_instructions: str
    estimated_production_time: str
    dimensions: Optional[str] = None
    
    # Enhanced e-commerce fields
    short_description: Optional[str] = None
    full_description: Optional[str] = None
    key_highlights: Optional[List[str]] = None
    product_story: Optional[str] = None
    craft_type: Optional[str] = None
    manufacturing_technique: Optional[str] = None
    handmade_status: Optional[str] = "100% Handcrafted"
    
    # SEO & Multilingual
    seo: Optional[Dict[str, Any]] = None
    translations: Optional[Dict[str, Any]] = None
    quality_validation: Optional[Dict[str, Any]] = None

class CatalogueSaveRequest(CatalogueGenerateResponse):
    pass
