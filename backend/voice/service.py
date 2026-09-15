import uuid
import os
import tempfile
import httpx
import json
import logging
from fastapi import HTTPException, UploadFile
from database import supabase_client, get_authenticated_client, get_service_client
from ai.gemini_client import process_audio_and_generate
from ai.bhashini_client import bhashini_client, is_bhashini_configured

logger = logging.getLogger(__name__)

ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/mpeg", "audio/mp3", "audio/wav", "audio/mp4", "audio/ogg"]

def run_audio_transcription_pipeline(audio_path: str, preferred_lang: str = "ta") -> dict:
    """
    Primary: Bhashini ASR (Speech-to-Text) + NMT (Machine Translation).
    Fallback: Gemini Multimodal Audio Model.
    """
    # 1. PRIMARY: Bhashini (Udyat / Dhruva Inference)
    if is_bhashini_configured():
        try:
            logger.info(f"Using Primary Bhashini Pipeline for audio processing (source_lang={preferred_lang})...")
            res = bhashini_client.transcribe_and_translate(audio_path, source_lang=preferred_lang, target_lang="en")
            if res and (res.get("original_text") or res.get("english_translation")):
                logger.info("Bhashini ASR + NMT succeeded.")
                return res
        except Exception as e:
            logger.warning(f"Bhashini pipeline failed: {e}. Falling back to Gemini...")

    # 2. FALLBACK: Gemini Multimodal
    logger.info("Running Gemini fallback for audio transcription...")
    prompt = """
    Please listen to this audio recorded by an Indian artisan describing their product.
    Return a JSON response with EXACTLY this structure:
    {
      "detected_language": "supported language code (en/ta/hi/te/kn/ml/bn/mr/ur)",
      "original_text": "verbatim transcript in the original spoken language",
      "english_translation": "natural English translation"
    }
    Keep the translation natural and professional, not word-for-word literal.
    """
    result_json = process_audio_and_generate(audio_path, prompt, mime_type="application/json")
    
    cleaned_json = result_json.strip()
    if cleaned_json.startswith("```json"):
        cleaned_json = cleaned_json[7:]
    if cleaned_json.endswith("```"):
        cleaned_json = cleaned_json[:-3]
    cleaned_json = cleaned_json.strip()

    try:
        data = json.loads(cleaned_json)
    except Exception as e:
        logger.error(f"JSON Parse Error from Gemini response: {e}, Content: {cleaned_json}")
        raise HTTPException(status_code=500, detail="Failed to parse transcription response")

    return {
        "detected_language": data.get("detected_language", preferred_lang),
        "original_text": data.get("original_text", ""),
        "english_translation": data.get("english_translation", data.get("original_text", ""))
    }

def upload_audio(file: UploadFile, product_id: str, artisan_id: str, token: str):
    if file.content_type not in ALLOWED_AUDIO_TYPES and not file.filename.endswith((".webm", ".mp3", ".wav")):
        raise HTTPException(status_code=400, detail="Invalid audio format")
    
    file_content = file.file.read()
    file_ext = file.filename.split(".")[-1] if file.filename else "webm"
    file_name = f"{artisan_id}/{uuid.uuid4().hex}.{file_ext}"
    
    auth_client = get_authenticated_client(token)
    try:
        try:
            auth_client.storage.from_("voice-records").upload(
                file_name, 
                file_content,
                {"content-type": file.content_type}
            )
        except Exception:
            get_service_client().storage.from_("voice-records").upload(
                file_name, 
                file_content,
                {"content-type": file.content_type}
            )
        
        record = {
            "user_id": artisan_id,
            "audio_url": file_name
        }
        if product_id:
            record["product_id"] = product_id
            
        res = auth_client.table("voice_records").insert(record).execute()
        if not res.data or len(res.data) == 0:
            res = get_service_client().table("voice_records").insert(record).execute()

        if res.data and len(res.data) > 0:
            return res.data[0]
            
        raise HTTPException(status_code=500, detail="Failed to save voice record in DB")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def verify_record_owner(record_id: str, artisan_id: str, token: str):
    auth_client = get_authenticated_client(token)
    res = auth_client.table("voice_records").select("*").eq("id", record_id).execute()
    if not res.data or len(res.data) == 0:
        res = get_service_client().table("voice_records").select("*").eq("id", record_id).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=404, detail="Voice record not found")
        
    record = res.data[0]
    if record.get("user_id") != artisan_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this voice record")
    return record

def transcribe_and_translate(record_id: str, artisan_id: str, token: str):
    record = verify_record_owner(record_id, artisan_id, token)
    auth_client = get_authenticated_client(token)
    audio_path = record.get("audio_url")
    if not audio_path:
        raise HTTPException(status_code=400, detail="No audio path found")
        
    try:
        try:
            audio_bytes = auth_client.storage.from_("voice-records").download(audio_path)
        except Exception:
            audio_bytes = get_service_client().storage.from_("voice-records").download(audio_path)
        
        fd, temp_path = tempfile.mkstemp(suffix=".webm")
        with os.fdopen(fd, 'wb') as f:
            f.write(audio_bytes)
            
        try:
            data = run_audio_transcription_pipeline(temp_path)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
        transcript_record = {
            "voice_record_id": record_id,
            "original_text": data.get("original_text", ""),
            "translated_text": data.get("english_translation", ""),
            "original_language": data.get("detected_language", "ta"),
            "translated_language": "en"
        }
        
        res = auth_client.table("voice_transcripts").insert(transcript_record).execute()
        if not res.data or len(res.data) == 0:
            res = get_service_client().table("voice_transcripts").insert(transcript_record).execute()
            
        if res.data and len(res.data) > 0:
            return res.data[0]
            
        raise HTTPException(status_code=500, detail="Failed to save transcript to DB")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

def get_transcript(record_id: str, artisan_id: str, token: str):
    auth_client = get_authenticated_client(token)
    verify_record_owner(record_id, artisan_id, token)
    res = auth_client.table("voice_transcripts").select("*").eq("voice_record_id", record_id).execute()
    if not res.data or len(res.data) == 0:
        res = get_service_client().table("voice_transcripts").select("*").eq("voice_record_id", record_id).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=404, detail="Transcript not found")
    return res.data[0]

def process_voice_directly(file: UploadFile, product_id: str, artisan_id: str, token: str):
    if file.content_type not in ALLOWED_AUDIO_TYPES and not file.filename.endswith((".webm", ".mp3", ".wav")):
        raise HTTPException(status_code=400, detail="Invalid audio format")
    
    file_content = file.file.read()
    file_ext = file.filename.split(".")[-1] if file.filename else "webm"
    file_name = f"{artisan_id}/{uuid.uuid4().hex}.{file_ext}"
    
    auth_client = get_authenticated_client(token)
    
    try:
        # 1. Save locally for pipeline processing
        fd, temp_path = tempfile.mkstemp(suffix=f".{file_ext}")
        with os.fdopen(fd, 'wb') as f:
            f.write(file_content)
            
        # 2. Upload to Supabase simultaneously
        try:
            auth_client.storage.from_("voice-records").upload(
                file_name, 
                file_content,
                {"content-type": file.content_type}
            )
        except Exception:
            get_service_client().storage.from_("voice-records").upload(
                file_name, 
                file_content,
                {"content-type": file.content_type}
            )
        
        record = {
            "user_id": artisan_id,
            "audio_url": file_name
        }
        if product_id:
            record["product_id"] = product_id
            
        res = auth_client.table("voice_records").insert(record).execute()
        if not res.data or len(res.data) == 0:
            res = get_service_client().table("voice_records").insert(record).execute()
            
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to save voice record in DB")
            
        record_id = res.data[0]["id"]
        
        # 3. Call Primary Bhashini Pipeline with Fallback to Gemini
        try:
            data = run_audio_transcription_pipeline(temp_path)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
        transcript_record = {
            "voice_record_id": record_id,
            "original_text": data.get("original_text", ""),
            "translated_text": data.get("english_translation", ""),
            "original_language": data.get("detected_language", "ta"),
            "translated_language": "en"
        }
        
        t_res = auth_client.table("voice_transcripts").insert(transcript_record).execute()
        if not t_res.data or len(t_res.data) == 0:
            t_res = get_service_client().table("voice_transcripts").insert(transcript_record).execute()
            
        if t_res.data and len(t_res.data) > 0:
            return t_res.data[0]
            
        raise HTTPException(status_code=500, detail="Failed to save transcript to DB")
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Process failed: {str(e)}")

def synthesize_speech(text: str, language: str = "ta", gender: str = "female") -> dict:
    """TTS Endpoint helper using Bhashini"""
    if is_bhashini_configured():
        try:
            audio_b64 = bhashini_client.text_to_speech(text, source_lang=language, gender=gender)
            return {"audio_content": audio_b64, "format": "wav"}
        except Exception as e:
            logger.warning(f"Bhashini TTS failed: {e}")
    raise HTTPException(status_code=503, detail="TTS service unavailable. Please check Bhashini credentials.")
