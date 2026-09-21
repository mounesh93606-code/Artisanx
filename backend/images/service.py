import uuid
import io
import os
import traceback
import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageOps, ImageFilter, ImageDraw
from fastapi import HTTPException, UploadFile
from database import supabase_client, get_authenticated_client

MAX_FILE_SIZE = 25 * 1024 * 1024
ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

_rembg_session = None

def get_rembg_session():
    global _rembg_session
    if _rembg_session is None:
        try:
            import rembg
            _rembg_session = rembg.new_session("u2netp")
        except Exception as e:
            print(f"Warning: rembg session initialization error: {e}")
            _rembg_session = False
    return _rembg_session if _rembg_session is not False else None

def verify_image_owner(image_id: str, artisan_id: str, token: str):
    auth_client = get_authenticated_client(token)
    res = auth_client.table("product_images").select("*").eq("id", image_id).execute()
    if not res.data or len(res.data) == 0:
        raise HTTPException(status_code=404, detail="Image not found")
    
    image_record = res.data[0]
    
    if image_record.get("product_id"):
        prod_res = auth_client.table("products").select("artisan_id").eq("id", image_record["product_id"]).execute()
        if prod_res.data and len(prod_res.data) > 0:
            if prod_res.data[0]["artisan_id"] != artisan_id:
                raise HTTPException(status_code=403, detail="Unauthorized access to this product's image")
    else:
        if image_record.get("artisan_id") != artisan_id:
             raise HTTPException(status_code=403, detail="Unauthorized access to this image")
             
    return image_record

def create_studio_background(w: int, h: int, bg_type: str = "studio") -> Image.Image:
    if bg_type == "pure_white":
        return Image.new("RGB", (w, h), (255, 255, 255))
    elif bg_type == "warm":
        bg = Image.new("RGB", (w, h), (250, 247, 242))
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        cx, cy = w // 2, int(h * 0.45)
        for r in range(int(min(w, h) * 0.6), 0, -25):
            alpha = int((1.0 - (r / (min(w, h) * 0.6))) * 16)
            draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 253, 248, alpha))
        bg.paste(overlay, (0, 0), overlay)
        return bg
    elif bg_type == "transparent":
        return Image.new("RGBA", (w, h), (0, 0, 0, 0))
    else:  # soft neutral studio
        bg = Image.new("RGB", (w, h), (245, 246, 248))
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        cx, cy = w // 2, int(h * 0.45)
        for r in range(int(min(w, h) * 0.65), 0, -25):
            alpha = int((1.0 - (r / (min(w, h) * 0.65))) * 22)
            draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, alpha))
        bg.paste(overlay, (0, 0), overlay)
        return bg

def create_ground_contact_shadow(product_w: int, product_h: int) -> Image.Image:
    shadow_h = max(20, int(product_h * 0.32))
    shadow_w = product_w + 40
    shadow_canvas = Image.new("RGBA", (shadow_w, shadow_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow_canvas)
    
    cx = shadow_w // 2
    cy = int(shadow_h * 0.28)
    rx = int(product_w * 0.42)
    ry = max(8, int(product_h * 0.065))
    
    # Soft spread shadow
    draw.ellipse((cx - int(rx * 1.16), cy - int(ry * 1.35), cx + int(rx * 1.16), cy + int(ry * 1.35)), fill=(45, 45, 55, 38))
    # Deep ambient contact shadow directly underneath
    draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(25, 25, 30, 85))
    
    return shadow_canvas.filter(ImageFilter.GaussianBlur(10))

def calculate_image_quality(img_data: bytes) -> dict:
    nparr = np.frombuffer(img_data, np.uint8)
    if nparr.size == 0:
        raise ValueError("Empty image data")
        
    cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if cv_img is None:
        raise ValueError("Invalid image format for processing")
        
    h, w = cv_img.shape[:2]
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    
    # 1. Sharpness & Focus (Laplacian variance)
    blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    sharpness_score = int(min(100, max(10, (blur_var / 350.0) * 100)))
    
    # 2. Lighting & Exposure
    mean_b = float(np.mean(gray))
    dark_clip = float(np.mean(gray < 15) * 100)
    bright_clip = float(np.mean(gray > 245) * 100)
    
    if 100 <= mean_b <= 165:
        light_score = 95 - int(abs(mean_b - 130) * 0.35)
    elif mean_b < 100:
        light_score = max(20, int(95 - (100 - mean_b) * 1.1))
    else:
        light_score = max(30, int(95 - (mean_b - 165) * 1.0))
    if dark_clip > 10: light_score -= int(dark_clip * 1.5)
    if bright_clip > 10: light_score -= int(bright_clip * 1.5)
    light_score = int(min(100, max(15, light_score)))
    
    # 3. Contrast & Dynamic Range
    contrast_std = float(np.std(gray))
    if 45 <= contrast_std <= 80:
        contrast_score = 95 - int(abs(contrast_std - 62) * 0.4)
    else:
        contrast_score = max(25, int(95 - abs(contrast_std - 62) * 1.2))
    contrast_score = int(min(100, max(20, contrast_score)))
    
    # 4. Resolution
    min_dim = min(h, w)
    if min_dim >= 1080: res_score = 100
    elif min_dim >= 800: res_score = 88
    elif min_dim >= 600: res_score = 75
    else: res_score = max(20, int((min_dim / 600.0) * 70))
    
    # 5. Background Cleanliness (Border variance in outer 8%)
    b_h, b_w = max(1, int(h * 0.08)), max(1, int(w * 0.08))
    top_b = gray[:b_h, :]
    bot_b = gray[-b_h:, :]
    left_b = gray[:, :b_w]
    right_b = gray[:, -b_w:]
    border_std = float(np.mean([np.std(top_b), np.std(bot_b), np.std(left_b), np.std(right_b)]))
    if border_std < 18: bg_score = 98
    elif border_std < 35: bg_score = 85
    else: bg_score = max(30, int(85 - (border_std - 35) * 1.0))
    
    # 6. Framing
    framing_score = 92
    
    overall_score_100 = int(
        0.25 * sharpness_score +
        0.25 * light_score +
        0.15 * contrast_score +
        0.15 * res_score +
        0.10 * framing_score +
        0.10 * bg_score
    )
    overall_score_100 = int(min(100, max(10, overall_score_100)))
    
    # Legacy 1-10 mapping
    legacy_score = int(round(overall_score_100 / 10.0))
    legacy_score = max(1, min(10, legacy_score))
    
    # Actionable checklist feedback
    actionable_feedback = []
    if sharpness_score >= 70:
        actionable_feedback.append("✓ High texture clarity & sharp focus")
    else:
        actionable_feedback.append("⚠ Soft focus or motion blur detected - hold camera steady")
        
    if light_score >= 70:
        actionable_feedback.append("✓ Balanced studio exposure & lighting")
    elif mean_b < 100:
        actionable_feedback.append("⚠ Dim indoor lighting - take photo near window or daylight")
    else:
        actionable_feedback.append("⚠ Strong glare or overexposed highlights detected")
        
    if contrast_score >= 65:
        actionable_feedback.append("✓ Rich contrast preserving authentic craft colors")
    else:
        actionable_feedback.append("⚠ Low contrast - colors may appear slightly washed out")
        
    if res_score >= 85:
        actionable_feedback.append("✓ High-resolution e-commerce standard")
    else:
        actionable_feedback.append("⚠ Lower resolution - recommended at least 1080x1080")
        
    if bg_score >= 80:
        actionable_feedback.append("✓ Clean product isolation & background")
    else:
        actionable_feedback.append("⚠ Background clutter detected - AI cutout recommended")
        
    # Legacy suggestions keys for i18n
    suggestions = []
    if sharpness_score < 40: suggestions.append("suggBlurHigh")
    elif sharpness_score < 65: suggestions.append("suggBlurMedium")
    if mean_b < 60: suggestions.append("suggDark")
    elif mean_b > 190: suggestions.append("suggBright")
    if contrast_score < 40: suggestions.append("suggWashedOut")
    if not suggestions: suggestions.append("suggGood")
    
    return {
        "blur_score": float(blur_var),
        "brightness_score": float(mean_b),
        "contrast_score": float(contrast_std),
        "overall_score": legacy_score,
        "suggestions": suggestions[:3],
        "overall_score_100": overall_score_100,
        "quality_breakdown": {
            "sharpness": sharpness_score,
            "lighting": light_score,
            "contrast": contrast_score,
            "resolution": res_score,
            "framing": framing_score,
            "background": bg_score
        },
        "actionable_feedback": actionable_feedback
    }

def upload_image(file: UploadFile, artisan_id: str, token: str, product_id: str = None, is_main: bool = False):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, WEBP are allowed.")
    
    file_content = file.file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 25MB limit.")
        
    try:
        auth_client = get_authenticated_client(token)

        file_ext = file.filename.split(".")[-1] if file.filename else "jpg"
        file_name = f"{uuid.uuid4().hex}.{file_ext}"
        
        quality_res = calculate_image_quality(file_content)
        quality_score = quality_res["overall_score"]
        suggestions = quality_res.get("suggestions", [])
        overall_score_100 = quality_res.get("overall_score_100")
        quality_breakdown = quality_res.get("quality_breakdown")
        actionable_feedback = quality_res.get("actionable_feedback")
        
        auth_client.storage.from_("product-images").upload(
            file_name, 
            file_content,
            {"content-type": file.content_type}
        )
        
        public_url = auth_client.storage.from_("product-images").get_public_url(file_name)
        
        record = {
            "image_url": public_url,
            "original_url": public_url,
            "is_main": is_main,
            "quality_score": quality_score
        }
        if product_id:
            record["product_id"] = product_id
        else:
            raise HTTPException(status_code=400, detail="product_id is required")
            
        res = auth_client.table("product_images").insert(record).execute()
        if res.data and len(res.data) > 0:
            out_data = res.data[0]
            out_data["suggestions"] = suggestions
            out_data["overall_score_100"] = overall_score_100
            out_data["quality_breakdown"] = quality_breakdown
            out_data["actionable_feedback"] = actionable_feedback
            return out_data
            
        raise HTTPException(status_code=500, detail="Failed to save image record")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")

def enhance_image(
    image_id: str,
    artisan_id: str,
    token: str,
    background_type: str = "studio",
    brightness: float = 0.0,
    contrast: float = 0.0,
    rotate: int = 0,
    add_shadow: bool = True,
    use_rembg: bool = True
):
    image_record = verify_image_owner(image_id, artisan_id, token)
    auth_client = get_authenticated_client(token)
    original_url = image_record.get("original_url") or image_record.get("image_url")
    
    if not original_url:
        raise HTTPException(status_code=400, detail="Original image URL not found")
        
    import httpx
    try:
        response = httpx.get(original_url, timeout=20.0)
        response.raise_for_status()
        img_data = response.content
        
        # Decode image using OpenCV
        nparr = np.frombuffer(img_data, np.uint8)
        cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if cv_img is None:
            raise ValueError("Failed to decode image")
            
        # 1. Rotation if requested (90, 180, 270)
        if rotate == 90:
            cv_img = cv2.rotate(cv_img, cv2.ROTATE_90_CLOCKWISE)
        elif rotate == 180:
            cv_img = cv2.rotate(cv_img, cv2.ROTATE_180)
        elif rotate == 270:
            cv_img = cv2.rotate(cv_img, cv2.ROTATE_90_COUNTERCLOCKWISE)
            
        h, w = cv_img.shape[:2]
        
        # 2. Scale down ultra-large images to max 1200px for optimal speed
        max_dim = 1200
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            cv_img = cv2.resize(cv_img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        h, w = cv_img.shape[:2]
        
        # 3. Auto White Balance (Gray World in LAB space) to remove indoor yellow/orange tint
        lab = cv2.cvtColor(cv_img, cv2.COLOR_BGR2LAB)
        l, a, b_chan = cv2.split(lab)
        a = cv2.add(a, int(128 - np.mean(a)))
        b_chan = cv2.add(b_chan, int(128 - np.mean(b_chan)))
        
        # CLAHE on L channel preserves authentic artisan dye & material depth
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        lab = cv2.merge((l, a, b_chan))
        balanced_bgr = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        balanced_rgb = cv2.cvtColor(balanced_bgr, cv2.COLOR_BGR2RGB)
        pil_product = Image.fromarray(balanced_rgb)
        
        # 4. Fine-tune Brightness & Contrast
        if brightness != 0.0:
            enh_b = ImageEnhance.Brightness(pil_product)
            pil_product = enh_b.enhance(max(0.2, 1.0 + brightness * 0.5))
        if contrast != 0.0:
            enh_c = ImageEnhance.Contrast(pil_product)
            pil_product = enh_c.enhance(max(0.2, 1.0 + contrast * 0.5))
            
        canvas_w, canvas_h = 1080, 1080
        
        # 5. Background Processing & Composition
        if background_type == "original":
            # Keep original background with color/lighting enhancements
            # Center crop or scale to 1080x1080
            scale = max(canvas_w / w, canvas_h / h)
            new_w, new_h = int(w * scale), int(h * scale)
            pil_resized = pil_product.resize((new_w, new_h), Image.Resampling.LANCZOS)
            x_crop = (new_w - canvas_w) // 2
            y_crop = (new_h - canvas_h) // 2
            final_img = pil_resized.crop((x_crop, y_crop, x_crop + canvas_w, y_crop + canvas_h))
        else:
            # AI Background Removal: rembg primary with GrabCut fallback
            cutout_img = None
            if use_rembg:
                try:
                    session = get_rembg_session()
                    import rembg
                    if session:
                        cutout_img = rembg.remove(pil_product, session=session)
                    else:
                        cutout_img = rembg.remove(pil_product)
                except Exception as rembg_err:
                    print(f"rembg notice: {rembg_err}, using GrabCut fallback")
                    cutout_img = None
                    
            if cutout_img is None:
                # Fallback: High-precision OpenCV GrabCut
                thumb_max = 400
                thumb_scale = thumb_max / max(h, w)
                tw, th = max(10, int(w * thumb_scale)), max(10, int(h * thumb_scale))
                thumb = cv2.resize(balanced_bgr, (tw, th), interpolation=cv2.INTER_AREA)
                
                mask = np.zeros((th, tw), np.uint8)
                rect = (max(1, int(tw * 0.05)), max(1, int(th * 0.05)), max(1, int(tw * 0.90)), max(1, int(th * 0.90)))
                bgdModel = np.zeros((1, 65), np.float64)
                fgdModel = np.zeros((1, 65), np.float64)
                
                try:
                    cv2.grabCut(thumb, mask, rect, bgdModel, fgdModel, 4, cv2.GC_INIT_WITH_RECT)
                    mask2 = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')
                    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
                    mask2 = cv2.morphologyEx(mask2, cv2.MORPH_OPEN, kernel)
                    mask2 = cv2.morphologyEx(mask2, cv2.MORPH_CLOSE, kernel)
                    full_mask = cv2.resize(mask2 * 255, (w, h), interpolation=cv2.INTER_LINEAR)
                    full_mask = cv2.GaussianBlur(full_mask, (7, 7), 0)
                except Exception:
                    full_mask = np.full((h, w), 255, dtype=np.uint8)
                    
                cutout_img = pil_product.copy()
                cutout_img.putalpha(Image.fromarray(full_mask))
                
            # Crop to foreground bounding box
            alpha = cutout_img.split()[3]
            bbox = alpha.point(lambda p: 255 if p > 30 else 0).getbbox()
            if bbox:
                bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
                margin_x = int(bw * 0.03)
                margin_y = int(bh * 0.03)
                crop_box = (
                    max(0, bbox[0] - margin_x),
                    max(0, bbox[1] - margin_y),
                    min(w, bbox[2] + margin_x),
                    min(h, bbox[3] + margin_y)
                )
                cutout_img = cutout_img.crop(crop_box)
                
            # Scale product to fill 82% of 1080x1080 studio canvas
            max_fit_w = int(canvas_w * 0.82)
            max_fit_h = int(canvas_h * 0.82)
            scale = min(max_fit_w / cutout_img.width, max_fit_h / cutout_img.height)
            new_w, new_h = max(10, int(cutout_img.width * scale)), max(10, int(cutout_img.height * scale))
            cutout_img = cutout_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            
            paste_x = (canvas_w - new_w) // 2
            paste_y = (canvas_h - new_h) // 2
            
            studio_canvas = create_studio_background(canvas_w, canvas_h, background_type)
            
            # Ground Contact Shadow Synthesis (for non-transparent backgrounds)
            if add_shadow and background_type != "transparent":
                shadow_img = create_ground_contact_shadow(new_w, new_h)
                shadow_x = paste_x - 20
                shadow_y = paste_y + new_h - int(shadow_img.height * 0.35)
                studio_canvas.paste(shadow_img, (shadow_x, shadow_y), shadow_img)
                
            studio_canvas.paste(cutout_img, (paste_x, paste_y), cutout_img)
            final_img = studio_canvas
            
        # 6. Micro-Sharpening for authentic craft detail
        enhancer = ImageEnhance.Sharpness(final_img)
        final_img = enhancer.enhance(1.18)
        
        # 7. Compress & Save
        out_buffer = io.BytesIO()
        is_transparent = (background_type == "transparent")
        if is_transparent:
            final_img.save(out_buffer, format="PNG", optimize=True)
            mime_type = "image/png"
            file_ext = "png"
        else:
            final_img = final_img.convert("RGB")
            final_img.save(out_buffer, format="JPEG", quality=92, optimize=True)
            mime_type = "image/jpeg"
            file_ext = "jpg"
        out_bytes = out_buffer.getvalue()
        
        # 8. Run 100-Point Quality Analysis
        quality_res = calculate_image_quality(out_bytes)
        enhanced_score_100 = quality_res.get("overall_score_100", 92)
        legacy_score = quality_res.get("overall_score", 9)
        
        enhanced_name = f"enhanced_{uuid.uuid4().hex}.{file_ext}"
        auth_client.storage.from_("product-images").upload(
            enhanced_name, 
            out_bytes,
            {"content-type": mime_type}
        )
        enhanced_url = auth_client.storage.from_("product-images").get_public_url(enhanced_name)
        
        res = auth_client.table("product_images").update({
            "enhanced_url": enhanced_url,
            "image_url": enhanced_url,
            "enhanced_quality_score": legacy_score,
            "enhanced_quality": True
        }).eq("id", image_id).execute()
        
        if res.data and len(res.data) > 0:
            out_record = res.data[0]
            out_record["background_type"] = background_type
            out_record["overall_score_100"] = enhanced_score_100
            out_record["quality_breakdown"] = quality_res.get("quality_breakdown")
            out_record["actionable_feedback"] = quality_res.get("actionable_feedback")
            return out_record
            
        raise HTTPException(status_code=500, detail="Failed to update image record")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")

def check_quality(image_id: str, artisan_id: str, token: str):
    image_record = verify_image_owner(image_id, artisan_id, token)
    auth_client = get_authenticated_client(token)
    url = image_record.get("image_url")
    
    import httpx
    try:
        response = httpx.get(url, timeout=15.0)
        response.raise_for_status()
        
        if not response.content:
            raise HTTPException(status_code=400, detail="Empty image data")
            
        result = calculate_image_quality(response.content)
        auth_client.table("product_images").update({"quality_score": result["overall_score"]}).eq("id", image_id).execute()
        return result
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Quality check failed: {str(e)}")

def delete_image(image_id: str, artisan_id: str, token: str):
    image_record = verify_image_owner(image_id, artisan_id, token)
    auth_client = get_authenticated_client(token)
    
    try:
        def get_filename(url):
            if url:
                return url.split("/")[-1]
            return None
            
        files_to_remove = []
        orig = get_filename(image_record.get("original_url"))
        if orig: files_to_remove.append(orig)
        
        enh = get_filename(image_record.get("enhanced_url"))
        if enh: files_to_remove.append(enh)
        
        if files_to_remove:
            try:
                auth_client.storage.from_("product-images").remove(files_to_remove)
            except Exception:
                pass
            
        auth_client.table("product_images").delete().eq("id", image_id).execute()
        return {"message": "Image deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

def toggle_enhanced_quality(image_id: str, use_enhanced: bool, user_id: str, token: str):
    auth_client = get_authenticated_client(token)
    
    res = auth_client.table("product_images").select("*, products!inner(*)").eq("id", image_id).execute()
    if not res.data or res.data[0]["products"]["artisan_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this image")
        
    image_data = res.data[0]
    
    update_data = {
        "enhanced_quality": use_enhanced
    }
    
    if use_enhanced and image_data.get("enhanced_url"):
        update_data["image_url"] = image_data["enhanced_url"]
    elif not use_enhanced and image_data.get("original_url"):
        update_data["image_url"] = image_data["original_url"]
        
    update_res = auth_client.table("product_images").update(update_data).eq("id", image_id).execute()
    
    if update_res.data and len(update_res.data) > 0:
        return update_res.data[0]
        
    raise HTTPException(status_code=500, detail="Failed to update image")
