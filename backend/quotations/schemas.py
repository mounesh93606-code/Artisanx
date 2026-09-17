from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class QuotationCreate(BaseModel):
    enquiry_id: str
    quantity: int
    unit_price: float
    moq: Optional[int] = None
    customization_cost: float = 0.0
    production_lead_time_days: Optional[int] = None
    expected_dispatch_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    artisan_notes: Optional[str] = None

class QuotationRevise(BaseModel):
    quantity: int
    unit_price: float
    moq: Optional[int] = None
    customization_cost: float = 0.0
    production_lead_time_days: Optional[int] = None
    expected_dispatch_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    artisan_notes: Optional[str] = None

class QuotationAction(BaseModel):
    note: Optional[str] = None

class QuotationResponse(BaseModel):
    id: UUID
    display_id: str
    enquiry_id: UUID
    product_id: UUID
    buyer_id: UUID
    artisan_id: UUID
    current_version: int
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class QuotationRevisionResponse(BaseModel):
    id: UUID
    quotation_id: UUID
    version: int
    quantity: int
    unit_price: float
    total_price: float
    moq: Optional[int]
    customization_cost: float
    production_lead_time_days: Optional[int]
    expected_dispatch_date: Optional[datetime]
    expiry_date: Optional[datetime]
    artisan_notes: Optional[str]
    created_at: datetime
