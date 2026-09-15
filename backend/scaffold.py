import os
from pathlib import Path

base = Path(r"c:\Users\moune\art\backend")

folders = [
    "auth", "artisans", "products", "images", "voice", "ai", "ai_catalogue",
    "pricing", "passports", "enquiries", "facilitator", "guidance", "notifications"
]

for f in folders:
    (base / f).mkdir(parents=True, exist_ok=True)
    (base / f / "__init__.py").touch(exist_ok=True)

def write_file(path, content):
    with open(base / path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")

# config.py
write_file("config.py", """
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
""")

# database.py
write_file("database.py", """
from supabase import create_client, Client
from .config import settings

def get_supabase_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

supabase_client = get_supabase_client()
""")

# main.py
write_file("main.py", """
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .auth.router import router as auth_router
from .artisans.router import router as artisans_router
from .products.router import router as products_router
from .images.router import router as images_router
from .voice.router import router as voice_router
from .ai_catalogue.router import router as ai_catalogue_router
from .pricing.router import router as pricing_router
from .passports.router import router as passports_router
from .enquiries.router import router as enquiries_router
from .facilitator.router import router as facilitator_router
from .guidance.router import router as guidance_router
from .notifications.router import router as notifications_router

app = FastAPI(title="ArtisanX API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(artisans_router)
app.include_router(products_router)
app.include_router(images_router)
app.include_router(voice_router)
app.include_router(ai_catalogue_router)
app.include_router(pricing_router)
app.include_router(passports_router)
app.include_router(enquiries_router)
app.include_router(facilitator_router)
app.include_router(guidance_router)
app.include_router(notifications_router)

@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}
""")

# auth/router.py
write_file("auth/router.py", """
from fastapi import APIRouter
from .service import send_otp, verify_otp, get_me

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/send-otp")
def route_send_otp(phone: str) -> dict:
    return send_otp(phone)

@router.post("/verify-otp")
def route_verify_otp(phone: str, otp: str) -> dict:
    return verify_otp(phone, otp)

@router.get("/me")
def route_get_me() -> dict:
    return get_me()
""")

# auth/service.py
write_file("auth/service.py", """
def send_otp(phone: str) -> dict:
    return {"success": True}

def verify_otp(phone: str, otp: str) -> dict:
    return {"token": "placeholder"}

def get_me() -> dict:
    return {"user": "placeholder"}
""")

# auth/dependencies.py
write_file("auth/dependencies.py", """
from fastapi import Depends
from typing import Any

def get_current_user() -> Any:
    return {"id": "placeholder_user_id"}
""")

# language literal
lang_literal = "Literal['en', 'ta', 'hi', 'te', 'kn', 'ml', 'bn', 'mr', 'ur']"

# artisans/schemas.py
write_file("artisans/schemas.py", f"""
from pydantic import BaseModel
from typing import Optional, {lang_literal.split('[')[0]}
from typing import Literal

class ArtisanProfileCreate(BaseModel):
    artisan_name: str
    business_name: Optional[str] = None
    craft_type: Optional[str] = None
    craft_category: Optional[str] = None
    location: Optional[str] = None
    cooperative_name: Optional[str] = None
    preferred_language: Optional[Literal['en', 'ta', 'hi', 'te', 'kn', 'ml', 'bn', 'mr', 'ur']] = 'en'
""")

# artisans/router.py
write_file("artisans/router.py", """
from fastapi import APIRouter
from .schemas import ArtisanProfileCreate
from .service import create_profile, get_profile

router = APIRouter(prefix="/artisans", tags=["artisans"])

@router.post("/")
def route_create_profile(profile: ArtisanProfileCreate) -> dict:
    return create_profile(profile)

@router.get("/{artisan_id}")
def route_get_profile(artisan_id: str) -> dict:
    return get_profile(artisan_id)
""")

# artisans/service.py
write_file("artisans/service.py", """
from .schemas import ArtisanProfileCreate

def create_profile(profile: ArtisanProfileCreate) -> dict:
    return {"id": "profile_id"}

def get_profile(artisan_id: str) -> dict:
    return {"id": artisan_id}
""")

# products/schemas.py
write_file("products/schemas.py", """
from pydantic import BaseModel
from typing import Optional, List

class ProductCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    price: Optional[float] = None
""")

# products/router.py
write_file("products/router.py", """
from fastapi import APIRouter
from .schemas import ProductCreate
from .service import create_product, get_product, publish_product

router = APIRouter(prefix="/products", tags=["products"])

@router.post("/")
def route_create_product(product: ProductCreate) -> dict:
    return create_product(product)

@router.get("/{product_id}")
def route_get_product(product_id: str) -> dict:
    return get_product(product_id)

@router.post("/{product_id}/publish")
def route_publish_product(product_id: str) -> dict:
    return publish_product(product_id)
""")

# products/service.py
write_file("products/service.py", """
from .schemas import ProductCreate

def create_product(product: ProductCreate) -> dict:
    return {"id": "product_id"}

def get_product(product_id: str) -> dict:
    return {"id": product_id}

def publish_product(product_id: str) -> dict:
    return {"status": "published"}
""")

# images/schemas.py
write_file("images/schemas.py", """
from pydantic import BaseModel

class ImageEnhanceRequest(BaseModel):
    image_url: str
""")

# images/router.py
write_file("images/router.py", """
from fastapi import APIRouter
from .schemas import ImageEnhanceRequest
from .service import upload_image, enhance_image

router = APIRouter(prefix="/images", tags=["images"])

@router.post("/upload")
def route_upload_image() -> dict:
    return upload_image()

@router.post("/enhance")
def route_enhance_image(req: ImageEnhanceRequest) -> dict:
    return enhance_image(req)
""")

# images/service.py
write_file("images/service.py", """
from .schemas import ImageEnhanceRequest

def upload_image() -> dict:
    return {"url": "placeholder"}

def enhance_image(req: ImageEnhanceRequest) -> dict:
    return {"enhanced_url": "placeholder"}
""")

# voice/schemas.py
write_file("voice/schemas.py", f"""
from pydantic import BaseModel
from typing import Literal

class VoiceTranscriptResponse(BaseModel):
    original_text: str
    original_language: Literal['en', 'ta', 'hi', 'te', 'kn', 'ml', 'bn', 'mr', 'ur']
    translated_text: str
    translated_language: Literal['en', 'ta', 'hi', 'te', 'kn', 'ml', 'bn', 'mr', 'ur']
""")

# voice/router.py
write_file("voice/router.py", """
from fastapi import APIRouter
from .schemas import VoiceTranscriptResponse
from .service import process_voice

router = APIRouter(prefix="/voice", tags=["voice"])

@router.post("/process", response_model=VoiceTranscriptResponse)
def route_process_voice() -> VoiceTranscriptResponse:
    return process_voice()
""")

# voice/service.py
write_file("voice/service.py", """
from .schemas import VoiceTranscriptResponse

def process_voice() -> VoiceTranscriptResponse:
    return VoiceTranscriptResponse(
        original_text="", original_language="en",
        translated_text="", translated_language="en"
    )
""")

# ai/gemini_client.py
write_file("ai/gemini_client.py", """
class GeminiClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
    
    def generate_content(self, prompt: str) -> str:
        return "placeholder"

def get_gemini_client() -> GeminiClient:
    return GeminiClient("placeholder")
""")

# ai/schemas.py
write_file("ai/schemas.py", """
from pydantic import BaseModel

class AIRequest(BaseModel):
    prompt: str
""")

# ai_catalogue/schemas.py
write_file("ai_catalogue/schemas.py", """
from pydantic import BaseModel
from typing import List

class AICatalogueGenerateRequest(BaseModel):
    transcript_id: str

class AICatalogueGenerateResponse(BaseModel):
    title: str
    description: str
    category: str
    tags: List[str]
""")

# ai_catalogue/router.py
write_file("ai_catalogue/router.py", """
from fastapi import APIRouter
from .schemas import AICatalogueGenerateRequest, AICatalogueGenerateResponse
from .service import generate_catalogue

router = APIRouter(prefix="/catalogue", tags=["catalogue"])

@router.post("/generate", response_model=AICatalogueGenerateResponse)
def route_generate_catalogue(req: AICatalogueGenerateRequest) -> AICatalogueGenerateResponse:
    return generate_catalogue(req)
""")

# ai_catalogue/service.py
write_file("ai_catalogue/service.py", """
from .schemas import AICatalogueGenerateRequest, AICatalogueGenerateResponse

def generate_catalogue(req: AICatalogueGenerateRequest) -> AICatalogueGenerateResponse:
    return AICatalogueGenerateResponse(title="T", description="D", category="C", tags=["tag"])
""")

# pricing/schemas.py
write_file("pricing/schemas.py", """
from pydantic import BaseModel
from typing import Optional

class PricingCalculateRequest(BaseModel):
    product_id: str

class PricingCalculateResponse(BaseModel):
    calculated_min_price: float
    calculated_suggested_price: float
""")

# pricing/router.py
write_file("pricing/router.py", """
from fastapi import APIRouter
from .schemas import PricingCalculateRequest, PricingCalculateResponse
from .service import calculate_price

router = APIRouter(prefix="/pricing", tags=["pricing"])

@router.post("/calculate", response_model=PricingCalculateResponse)
def route_calculate_price(req: PricingCalculateRequest) -> PricingCalculateResponse:
    return calculate_price(req)
""")

# pricing/service.py
write_file("pricing/service.py", """
from .schemas import PricingCalculateRequest, PricingCalculateResponse

def calculate_price(req: PricingCalculateRequest) -> PricingCalculateResponse:
    return PricingCalculateResponse(calculated_min_price=10.0, calculated_suggested_price=15.0)
""")

# passports/schemas.py
write_file("passports/schemas.py", """
from pydantic import BaseModel

class PassportGenerateRequest(BaseModel):
    product_id: str

class PassportGenerateResponse(BaseModel):
    qr_code_url: str
    shareable_url: str
""")

# passports/router.py
write_file("passports/router.py", """
from fastapi import APIRouter
from .schemas import PassportGenerateRequest, PassportGenerateResponse
from .service import generate_passport

router = APIRouter(prefix="/passports", tags=["passports"])

@router.post("/generate", response_model=PassportGenerateResponse)
def route_generate_passport(req: PassportGenerateRequest) -> PassportGenerateResponse:
    return generate_passport(req)
""")

# passports/service.py
write_file("passports/service.py", """
from .schemas import PassportGenerateRequest, PassportGenerateResponse

def generate_passport(req: PassportGenerateRequest) -> PassportGenerateResponse:
    return PassportGenerateResponse(qr_code_url="", shareable_url="")
""")

# enquiries/schemas.py
write_file("enquiries/schemas.py", """
from pydantic import BaseModel
from typing import Optional

class EnquiryCreate(BaseModel):
    product_id: str
    quantity: int
""")

# enquiries/router.py
write_file("enquiries/router.py", """
from fastapi import APIRouter
from .schemas import EnquiryCreate
from .service import create_enquiry, get_enquiry

router = APIRouter(prefix="/enquiries", tags=["enquiries"])

@router.post("/")
def route_create_enquiry(req: EnquiryCreate) -> dict:
    return create_enquiry(req)

@router.get("/{enquiry_id}")
def route_get_enquiry(enquiry_id: str) -> dict:
    return get_enquiry(enquiry_id)
""")

# enquiries/service.py
write_file("enquiries/service.py", """
from .schemas import EnquiryCreate

def create_enquiry(req: EnquiryCreate) -> dict:
    return {"id": "enquiry_id"}

def get_enquiry(enquiry_id: str) -> dict:
    return {"id": enquiry_id}
""")

# facilitator/schemas.py
write_file("facilitator/schemas.py", """
from pydantic import BaseModel

class DashboardDataResponse(BaseModel):
    total_artisans: int
    pending_reviews: int
""")

# facilitator/router.py
write_file("facilitator/router.py", """
from fastapi import APIRouter
from .schemas import DashboardDataResponse
from .service import get_dashboard_data

router = APIRouter(prefix="/facilitator", tags=["facilitator"])

@router.get("/dashboard", response_model=DashboardDataResponse)
def route_get_dashboard_data() -> DashboardDataResponse:
    return get_dashboard_data()
""")

# facilitator/service.py
write_file("facilitator/service.py", """
from .schemas import DashboardDataResponse

def get_dashboard_data() -> DashboardDataResponse:
    return DashboardDataResponse(total_artisans=0, pending_reviews=0)
""")

# guidance/schemas.py
write_file("guidance/schemas.py", f"""
from pydantic import BaseModel
from typing import Optional, Literal

class GuidanceStepResponse(BaseModel):
    instruction_en: Optional[str] = None
    instruction_ta: Optional[str] = None
    instruction_hi: Optional[str] = None
    instruction_te: Optional[str] = None
    instruction_kn: Optional[str] = None
    instruction_ml: Optional[str] = None
    instruction_bn: Optional[str] = None
    instruction_mr: Optional[str] = None
    instruction_ur: Optional[str] = None
""")

# guidance/router.py
write_file("guidance/router.py", """
from fastapi import APIRouter
from .schemas import GuidanceStepResponse
from .service import get_current_step

router = APIRouter(prefix="/guidance", tags=["guidance"])

@router.get("/current", response_model=GuidanceStepResponse)
def route_get_current_step() -> GuidanceStepResponse:
    return get_current_step()
""")

# guidance/service.py
write_file("guidance/service.py", """
from .schemas import GuidanceStepResponse

def get_current_step() -> GuidanceStepResponse:
    return GuidanceStepResponse()
""")

# guidance/workflows.py
write_file("guidance/workflows.py", """
DEFAULT_WORKFLOWS = []
""")

# notifications/schemas.py
write_file("notifications/schemas.py", """
from pydantic import BaseModel

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
""")

# notifications/router.py
write_file("notifications/router.py", """
from fastapi import APIRouter
from .schemas import NotificationResponse
from .service import get_notifications

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=list[NotificationResponse])
def route_get_notifications() -> list[NotificationResponse]:
    return get_notifications()
""")

# notifications/service.py
write_file("notifications/service.py", """
from .schemas import NotificationResponse

def get_notifications() -> list[NotificationResponse]:
    return []
""")
