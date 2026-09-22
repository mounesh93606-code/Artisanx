from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class CheckoutItem(BaseModel):
    product_id: str
    quantity: int = Field(gt=0, default=1)
    enquiry_id: Optional[str] = None
    variant: Optional[Dict[str, Any]] = None
    customization: Optional[str] = None

class CreateCashfreeOrderRequest(BaseModel):
    items: List[CheckoutItem]
    delivery_address: Dict[str, Any]
    notes: Optional[str] = None
    is_direct: bool = False
    return_url: Optional[str] = None

class CashfreeOrderResponse(BaseModel):
    payment_session_id: str
    cf_order_id: Optional[str] = None
    order_id: str
    display_id: str
    order_ids: List[str]
    display_ids: List[str]
    amount: float
    currency: str = "INR"
    environment: str = "SANDBOX"
    checkout_url: Optional[str] = None

class PaymentStatusResponse(BaseModel):
    order_id: str
    display_id: str
    payment_status: str
    order_status: str
    amount: float
    currency: str = "INR"
    payment_method: Optional[str] = "upi"
    invoice_id: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    paid_at: Optional[str] = None

class InvoiceResponse(BaseModel):
    invoice_number: str
    order_id: str
    display_id: str
    buyer_id: str
    buyer_name: str
    buyer_phone: Optional[str] = None
    buyer_email: Optional[str] = None
    artisan_id: str
    artisan_name: str
    product_title: str
    quantity: int
    unit_price: float
    subtotal: float
    tax: float = 0.0
    total: float
    currency: str = "INR"
    payment_method: str = "UPI"
    payment_status: str = "PAID"
    gateway_payment_id: Optional[str] = None
    created_at: str
    delivery_address: Optional[Dict[str, Any]] = None
