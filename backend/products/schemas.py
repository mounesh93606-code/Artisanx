from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class ProductCreate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    materials: Optional[Any] = None
    care_instructions: Optional[str] = None
    price: Optional[float] = None
    min_safe_price: Optional[float] = None
    suggested_price: Optional[float] = None
    status: Optional[str] = "draft"
    dimensions: Optional[str] = None
    stock_quantity: Optional[int] = None
    reserved_stock: Optional[int] = None
    is_made_to_order: Optional[bool] = None
    monthly_capacity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    moq: Optional[int] = None
    lead_time_days: Optional[int] = None

class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    materials: Optional[Any] = None
    care_instructions: Optional[str] = None
    price: Optional[float] = None
    min_safe_price: Optional[float] = None
    suggested_price: Optional[float] = None
    status: Optional[str] = None
    readiness_score: Optional[int] = None
    dimensions: Optional[str] = None
    stock_quantity: Optional[int] = None
    reserved_stock: Optional[int] = None
    is_made_to_order: Optional[bool] = None
    monthly_capacity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    moq: Optional[int] = None
    lead_time_days: Optional[int] = None

class ProductResponse(BaseModel):
    id: str
    artisan_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    materials: Optional[Any] = None
    care_instructions: Optional[str] = None
    price: Optional[float] = None
    min_safe_price: Optional[float] = None
    suggested_price: Optional[float] = None
    status: str
    readiness_score: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    main_image: Optional[str] = None
    dimensions: Optional[str] = None
    stock_quantity: Optional[int] = None
    reserved_stock: Optional[int] = None
    is_made_to_order: Optional[bool] = None
    monthly_capacity: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    moq: Optional[int] = None
    lead_time_days: Optional[int] = None
    customisation_available: Optional[bool] = None
    review_status: Optional[str] = None
    review_notes: Optional[str] = None
    review_flags: Optional[List[str]] = None
    images: Optional[List[Any]] = None
    artisan_name: Optional[str] = None
    business_name: Optional[str] = None
    location: Optional[str] = None
    craft_story: Optional[str] = None
    craft_type: Optional[str] = None
    passport: Optional[Any] = None

class MissingField(BaseModel):
    field: str
    points: int
    message: str

class ReadinessResponse(BaseModel):
    total_score: int
    missing_fields: List[MissingField]
    is_publishable: bool

class CatalogueItem(BaseModel):
    id: str
    title: Optional[str] = None
    main_image: Optional[str] = None
    price: Optional[float] = None
    artisan_id: Optional[str] = None
    artisan_name: Optional[str] = None
    location: Optional[str] = None
    state: Optional[str] = None
    craft_type: Optional[str] = None
    category: Optional[str] = None
    moq: Optional[int] = None
    lead_time_days: Optional[int] = None
    stock_quantity: Optional[int] = None
    is_made_to_order: Optional[bool] = None

class CatalogueResponse(BaseModel):
    items: List[CatalogueItem]
    total: int
    page: int
    per_page: int

class CatalogueProductResponse(BaseModel):
    id: str
    artisan_id: str
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    materials: Optional[Any] = None
    care_instructions: Optional[str] = None
    price: Optional[float] = None
    status: str
    readiness_score: Optional[int] = None
    dimensions: Optional[str] = None
    stock_quantity: Optional[int] = None
    moq: Optional[int] = None
    lead_time_days: Optional[int] = None
    is_made_to_order: Optional[bool] = None
    customisation_available: Optional[bool] = None

class CatalogueDetailResponse(BaseModel):
    product: CatalogueProductResponse
    images: List[Any]
    artisan: Any
    passport: Optional[Any] = None
