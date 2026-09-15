from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import Any, Optional
from . import schemas
from . import service
from auth.dependencies import get_current_user, get_token

router = APIRouter(prefix="/voice", tags=["voice"])

@router.post("/upload", response_model=schemas.VoiceRecordResponse)
def route_upload_voice(
    product_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: Any = Depends(get_current_user),
    token: str = Depends(get_token)
):
    return service.upload_audio(file, product_id, current_user["id"], token)

@router.post("/transcribe/{record_id}", response_model=schemas.TranscriptResponse)
def route_transcribe_voice(record_id: str, current_user: Any = Depends(get_current_user), token: str = Depends(get_token)):
    return service.transcribe_and_translate(record_id, current_user["id"], token)

@router.get("/transcript/{record_id}", response_model=schemas.TranscriptResponse)
def route_get_transcript(record_id: str, current_user: Any = Depends(get_current_user), token: str = Depends(get_token)):
    return service.get_transcript(record_id, current_user["id"], token)

@router.post("/process", response_model=schemas.TranscriptResponse)
def route_process_voice(
    product_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: Any = Depends(get_current_user),
    token: str = Depends(get_token)
):
    return service.process_voice_directly(file, product_id, current_user["id"], token)

from pydantic import BaseModel

class TTSRequest(BaseModel):
    text: str
    language: Optional[str] = "ta"
    gender: Optional[str] = "female"

class TranslateRequest(BaseModel):
    text: str
    source_language: Optional[str] = "ta"
    target_language: Optional[str] = "en"

@router.post("/tts")
def route_tts(req: TTSRequest, current_user: Any = Depends(get_current_user)):
    return service.synthesize_speech(req.text, language=req.language, gender=req.gender)

@router.post("/translate")
def route_translate(req: TranslateRequest, current_user: Any = Depends(get_current_user)):
    from ai.bhashini_client import bhashini_client, is_bhashini_configured
    if is_bhashini_configured():
        try:
            res = bhashini_client.translate_text(req.text, source_lang=req.source_language, target_lang=req.target_language)
            return {"translated_text": res, "provider": "bhashini"}
        except Exception:
            pass
    from ai.gemini_client import generate_content
    prompt = f"Translate the following text from {req.source_language} to {req.target_language}:\n{req.text}\nReturn JSON: {{\"translated_text\": \"...\"}}"
    res_str = generate_content(prompt, mime_type="application/json")
    import json
    return json.loads(res_str)
