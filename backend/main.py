import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth.router import router as auth_router
from artisans.router import router as artisans_router
from products.router import router as products_router
from images.router import router as images_router
from voice.router import router as voice_router
from ai_catalogue.router import router as ai_catalogue_router
from pricing.router import router as pricing_router
from passports.router import router as passports_router
from enquiries.router import router as enquiries_router
from facilitator.router import router as facilitator_router
from guidance.router import router as guidance_router
from notifications.router import router as notifications_router
from market_intelligence.router import router as market_intelligence_router
from quotations.router import router as quotations_router
from orders.router import router as orders_router
from analytics.router import router as analytics_router
from conversations.router import router as conversations_router
from reviews.router import router as reviews_router
from dashboard.router import router as dashboard_router
from buyer.router import router as buyer_router
from support_requests.router import router as support_requests_router
from disputes.router import router as disputes_router
app = FastAPI(title="ArtisanX API")
from fastapi.responses import JSONResponse
import traceback
import httpx

# Global patch for httpx to fix Supabase/Gemini timeouts and HTTP/2 disconnects
_original_client_init = httpx.Client.__init__
def _new_client_init(self, *args, **kwargs):
    kwargs['http2'] = False
    if 'timeout' not in kwargs or kwargs['timeout'] is httpx.USE_CLIENT_DEFAULT:
        kwargs['timeout'] = httpx.Timeout(30.0)
    _original_client_init(self, *args, **kwargs)
httpx.Client.__init__ = _new_client_init

_original_async_client_init = httpx.AsyncClient.__init__
def _new_async_client_init(self, *args, **kwargs):
    kwargs['http2'] = False
    if 'timeout' not in kwargs or kwargs['timeout'] is httpx.USE_CLIENT_DEFAULT:
        kwargs['timeout'] = httpx.Timeout(30.0)
    _original_async_client_init(self, *args, **kwargs)
httpx.AsyncClient.__init__ = _new_async_client_init
import logging
logger = logging.getLogger("artisanx")
from config import settings

cors_env = settings.CORS_ORIGINS or os.environ.get("CORS_ORIGINS", "")
custom_origins = [o.strip() for o in cors_env.split(",") if o.strip()]
if settings.FRONTEND_URL and settings.FRONTEND_URL not in custom_origins:
    custom_origins.append(settings.FRONTEND_URL.strip())

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost",
    "capacitor://localhost",
    "https://localhost",
]
all_origins = list(dict.fromkeys(default_origins + custom_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=all_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    trace = traceback.format_exc()
    logger.error(f"UNHANDLED EXCEPTION on {request.url}:\n{trace}")
    origin = request.headers.get("origin")
    headers = {}
    if origin and (origin in all_origins or "*" in all_origins):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    elif not origin:
        headers["Access-Control-Allow-Origin"] = "*"
    return JSONResponse(
        status_code=500, 
        content={"detail": str(exc), "trace": trace},
        headers=headers
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
app.include_router(market_intelligence_router)
app.include_router(quotations_router)
app.include_router(orders_router)
app.include_router(dashboard_router)
app.include_router(analytics_router)
app.include_router(conversations_router)
app.include_router(reviews_router)
app.include_router(buyer_router)
app.include_router(support_requests_router)
app.include_router(disputes_router)
@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}
