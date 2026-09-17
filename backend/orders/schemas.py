from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class OrderStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None

class CancelOrderRequest(BaseModel):
    reason: str
    notes: Optional[str] = None

class OrderCreate(BaseModel):
    product_id: str
    quantity: int
    enquiry_id: Optional[str] = None
    variant: Optional[dict] = None
    customization_details: Optional[str] = None
    delivery_address: Optional[dict] = None
    notes: Optional[str] = None

class CheckoutBatchRequest(BaseModel):
    items: list[OrderCreate]
    delivery_address: Optional[dict] = None
    notes: Optional[str] = None

