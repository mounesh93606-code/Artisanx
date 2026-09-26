"""
WhatsApp OTP Service (Meta Cloud API)
--------------------------------------
Sends and verifies OTPs via WhatsApp using Meta's Cloud API.

Flow:
  1. Backend generates a 6-digit OTP and stores it in memory with a 10-min expiry
  2. OTP is sent to user's WhatsApp via Meta Graph API
  3. User submits OTP → backend verifies against stored value

Template needed in Meta Business Manager:
  Name    : artisanx_otp
  Category: AUTHENTICATION
  Body    : Your ArtisanX verification code is {{1}}. Valid for 10 minutes.
"""

import random
import time
import logging
import httpx
from fastapi import HTTPException
from config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory OTP store  {normalized_phone: {"otp": "123456", "expires": timestamp}}
# ---------------------------------------------------------------------------
_otp_store: dict[str, dict] = {}
OTP_EXPIRY_SECONDS = 600  # 10 minutes


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize(phone: str) -> str:
    """Strip spaces/dashes/+, return digits only (e.g. 919876543210)."""
    return "".join(c for c in phone if c.isdigit())


def _generate_otp() -> str:
    return str(random.randint(100000, 999999))


def _is_configured() -> bool:
    return bool(
        settings.WHATSAPP_ACCESS_TOKEN
        and settings.WHATSAPP_PHONE_NUMBER_ID
        and not settings.WHATSAPP_ACCESS_TOKEN.startswith("your_")
    )


def _send_whatsapp_template(to_number: str, otp: str) -> dict:
    """
    Call Meta Graph API to send an authentication template message.
    `to_number` must be digits only (e.g. 919876543210).
    """
    url = (
        f"https://graph.facebook.com/{settings.WHATSAPP_API_VERSION}"
        f"/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    )
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }

    # Authentication template payload
    payload = {
        "messaging_product": "whatsapp",
        "to": to_number,
        "type": "template",
        "template": {
            "name": settings.WHATSAPP_OTP_TEMPLATE,
            "language": {"code": "en"},
            "components": [
                {
                    "type": "body",
                    "parameters": [{"type": "text", "text": otp}],
                },
                {
                    # copy-code button (optional, used in auth templates)
                    "type": "button",
                    "sub_type": "url",
                    "index": "0",
                    "parameters": [{"type": "text", "text": otp}],
                },
            ],
        },
    }

    with httpx.Client(timeout=10.0) as client:
        resp = client.post(url, headers=headers, json=payload)

    return resp


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def send_otp_whatsapp(phone: str) -> dict:
    """
    Generate an OTP, store it, and send via WhatsApp.
    """
    normalized = _normalize(phone)
    if len(normalized) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    otp = _generate_otp()
    _otp_store[normalized] = {"otp": otp, "expires": time.time() + OTP_EXPIRY_SECONDS}

    if not _is_configured():
        # -------- DEV MODE --------
        logger.warning("WhatsApp not configured — DEV MODE (OTP: %s)", otp)
        return {"message": f"OTP sent (dev mode — use: {otp})", "dev_mode": True}

    # -------- REAL WHATSAPP CALL --------
    try:
        resp = _send_whatsapp_template(normalized, otp)

        if resp.status_code in (200, 201):
            logger.info("WhatsApp OTP sent to %s", normalized[-4:].rjust(len(normalized), "*"))
            return {"message": "OTP sent to your WhatsApp"}

        data = resp.json()
        error_msg = data.get("error", {}).get("message", "Failed to send OTP")
        logger.error("WhatsApp API error: %s", data)

        # Friendly error for template-not-found
        if "template" in error_msg.lower() or resp.status_code == 400:
            raise HTTPException(
                status_code=502,
                detail=(
                    "WhatsApp OTP template not found. "
                    "Please create the 'artisanx_otp' template in Meta Business Manager first."
                ),
            )
        raise HTTPException(status_code=502, detail=error_msg)

    except HTTPException:
        raise
    except httpx.RequestError as exc:
        logger.error("WhatsApp request error: %s", exc)
        raise HTTPException(status_code=503, detail="WhatsApp service unreachable. Try again.")


def verify_otp_whatsapp(phone: str, otp: str) -> bool:
    """
    Verify OTP submitted by user.
    Returns True on success, raises HTTPException on failure.
    """
    normalized = _normalize(phone)
    stored = _otp_store.get(normalized)

    if not stored:
        raise HTTPException(status_code=400, detail="OTP not found. Please request a new one.")

    if time.time() > stored["expires"]:
        del _otp_store[normalized]
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if stored["otp"] != otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again.")

    # Valid — delete so it can't be reused
    del _otp_store[normalized]
    return True


def resend_otp_whatsapp(phone: str) -> dict:
    """Alias for send — generates a fresh OTP and resends."""
    return send_otp_whatsapp(phone)


# ---------------------------------------------------------------------------
# Aliases used by auth/service.py
# ---------------------------------------------------------------------------
send_otp_msg91 = send_otp_whatsapp
verify_otp_msg91 = verify_otp_whatsapp
resend_otp_msg91 = resend_otp_whatsapp
