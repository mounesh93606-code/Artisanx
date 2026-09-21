from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ComparableProduct(BaseModel):
    id: Optional[str] = None
    title: str
    price: float
    source: str
    url: Optional[str] = None
    image_url: Optional[str] = None
    similarity: float = Field(..., ge=0.0, le=1.0)
    category: Optional[str] = None
    material: Optional[str] = None
    craft_type: Optional[str] = None
    collection_date: Optional[str] = None

class PriceRange(BaseModel):
    min: float
    max: float

class PriceRecommendationRequest(BaseModel):
    title: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    category: Optional[str] = None
    description: Optional[str] = None
    material: Optional[str] = None
    craft_type: Optional[str] = None
    dimensions: Optional[str] = None
    image_url: Optional[str] = None
    product_id: Optional[str] = None

class PriceRecommendationResponse(BaseModel):
    recommended_price: float
    currency: str = "INR"
    price_range: PriceRange
    confidence: float = Field(..., ge=0.0, le=1.0)
    confidence_level: str = "high"  # high, medium, low
    data_quality: str = "high"      # high, medium, low
    price_explanation: str
    ml_predicted_price: float
    comparable_market_price: Optional[float] = None
    top_market_prices: List[ComparableProduct] = Field(default_factory=list)
    model_version: str = "v001"
    status: str = "success"  # success, limited_data, fallback
