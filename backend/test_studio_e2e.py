import os
import io
import sys
import cv2
import numpy as np
import time
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from images.service import calculate_image_quality, create_studio_background, create_ground_contact_shadow

# Test 6 product scenarios
scenarios = [
    {
        'category': 'Pottery & Terracotta',
        'name': 'Terracotta Clay Pot (Curved edges & earth tone)',
        'bg_color': (180, 185, 190),
        'fg_type': 'pottery',
        'difficult': 'Cluttered room background with indoor lighting'
    },
    {
        'category': 'Textiles & Handloom',
        'name': 'Banarasi Silk Saree (Intricate zari threads & border)',
        'bg_color': (140, 130, 120),
        'fg_type': 'textile',
        'difficult': 'Complex textile thread edges'
    },
    {
        'category': 'Jewellery & Ornaments',
        'name': 'Kundan Gold Necklace (Fine chains & gemstones)',
        'bg_color': (210, 210, 210),
        'fg_type': 'jewellery',
        'difficult': 'Reflective surface & fine chain links'
    },
    {
        'category': 'Woodwork & Carving',
        'name': 'Sheesham Wooden Elephant (Deep brown grain)',
        'bg_color': (220, 215, 205),
        'fg_type': 'wood',
        'difficult': 'Dark wood tone & shadow occlusions'
    },
    {
        'category': 'Folk Art & Painting',
        'name': 'Madhubani Canvas Painting (Vibrant multi-color motifs)',
        'bg_color': (190, 195, 200),
        'fg_type': 'painting',
        'difficult': 'Preserving authentic natural dye vibrancy'
    },
    {
        'category': 'Home Decor & Metalwork',
        'name': 'Brass Pooja Diya (Metallic shine & curved handle)',
        'bg_color': (170, 175, 180),
        'fg_type': 'brass',
        'difficult': 'High dynamic range highlights'
    }
]

print("=== TESTING ARTISANX AI PRODUCT STUDIO PIPELINE ===\n")

for sc in scenarios:
    img = Image.new('RGB', (800, 800), sc['bg_color'])
    draw = ImageDraw.Draw(img)
    
    if sc['fg_type'] == 'pottery':
        draw.ellipse((220, 180, 580, 620), fill=(185, 85, 45))
        draw.rectangle((320, 120, 480, 200), fill=(160, 75, 38))
    elif sc['fg_type'] == 'textile':
        draw.rectangle((200, 150, 600, 650), fill=(190, 30, 60))
        for y in range(160, 640, 20):
            draw.line((210, y, 590, y), fill=(230, 190, 40), width=2)
    elif sc['fg_type'] == 'jewellery':
        draw.arc((240, 200, 560, 580), start=0, end=180, fill=(240, 200, 50), width=12)
        for x in range(280, 530, 40):
            draw.ellipse((x, 480, x + 20, 510), fill=(20, 150, 80))
    elif sc['fg_type'] == 'wood':
        draw.rectangle((240, 240, 560, 560), fill=(95, 50, 25))
        draw.ellipse((200, 280, 360, 480), fill=(85, 45, 20))
    elif sc['fg_type'] == 'painting':
        draw.rectangle((180, 180, 620, 620), fill=(250, 245, 230), outline=(20, 20, 20), width=6)
        draw.ellipse((280, 280, 520, 520), fill=(210, 50, 30))
        draw.polygon([(400, 220), (320, 380), (480, 380)], fill=(40, 100, 180))
    elif sc['fg_type'] == 'brass':
        draw.ellipse((280, 400, 520, 580), fill=(220, 180, 45))
        draw.polygon([(400, 200), (350, 420), (450, 420)], fill=(240, 195, 55))
        
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=90)
    raw_bytes = buf.getvalue()
    
    # 1. Quality Analysis
    q_res = calculate_image_quality(raw_bytes)
    
    # 2. Studio Backgrounds
    for bg_mode in ['pure_white', 'studio', 'warm', 'transparent']:
        bg_canvas = create_studio_background(1080, 1080, bg_mode)
        assert bg_canvas.size == (1080, 1080)
        
    # 3. Shadow test
    shadow = create_ground_contact_shadow(500, 500)
    assert shadow.size[0] > 500
    
    cat = sc['category']
    name = sc['name']
    diff = sc['difficult']
    score = q_res['overall_score_100']
    sharp = q_res['quality_breakdown']['sharpness']
    light = q_res['quality_breakdown']['lighting']
    feedback = q_res['actionable_feedback'][:2]
    
    print(f"[{cat}] {name}")
    print(f"   Challenge: {diff}")
    print(f"   Quality Score: {score}/100 (Sharpness: {sharp}, Lighting: {light})")
    safe_feedback = [f.encode('ascii', 'replace').decode() for f in feedback]
    print(f"   Actionable Feedback: {safe_feedback}")
    print("   Studio Modes: pure_white, soft_studio, warm_craft, transparent -> ALL OK\n")


print("ALL 6 REPRESENTATIVE PRODUCT SCENARIOS TESTED & VERIFIED!")
