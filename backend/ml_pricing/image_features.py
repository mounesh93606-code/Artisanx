import os
import io
import requests
from typing import Optional, List, Any
import numpy as np
from PIL import Image

try:
    import torch
    import torchvision.transforms as transforms
    from torchvision.models import mobilenet_v2, MobileNet_V2_Weights
    TORCH_AVAILABLE = True
except Exception as e:
    TORCH_AVAILABLE = False
    print(f"PyTorch/Torchvision note: {e}")

_model = None
_transform = None

def get_image_model():
    global _model, _transform
    if not TORCH_AVAILABLE:
        return None, None
    if _model is None:
        try:
            weights = MobileNet_V2_Weights.DEFAULT
            model = mobilenet_v2(weights=weights)
            # Remove final classifier to get 1280-dim feature vector
            model.classifier = torch.nn.Identity()
            model.eval()
            _model = model
            _transform = weights.transforms()
        except Exception as e:
            print(f"Warning loading MobileNetV2: {e}")
            _model = None
    return _model, _transform

def extract_image_features_from_pil(img: Image.Image) -> np.ndarray:
    """
    Extracts normalized feature embedding from PIL Image using MobileNetV2.
    Falls back to color/histogram signature if model unavailable.
    """
    try:
        model, transform = get_image_model()
        if model is not None and transform is not None:
            rgb_img = img.convert("RGB")
            tensor = transform(rgb_img).unsqueeze(0)
            with torch.no_grad():
                features = model(tensor).squeeze().numpy()
            norm = np.linalg.norm(features)
            if norm > 0:
                features = features / norm
            return features
    except Exception as e:
        print(f"Model feature extraction note: {e}")

    # Fallback: 128-dim color-spatial histogram representation
    try:
        rgb_img = img.convert("RGB").resize((64, 64))
        arr = np.array(rgb_img, dtype=np.float32) / 255.0
        # Compute color channel histograms
        r_hist, _ = np.histogram(arr[:, :, 0], bins=42, range=(0, 1))
        g_hist, _ = np.histogram(arr[:, :, 1], bins=43, range=(0, 1))
        b_hist, _ = np.histogram(arr[:, :, 2], bins=43, range=(0, 1))
        emb = np.concatenate([r_hist, g_hist, b_hist]).astype(np.float32)
        norm = np.linalg.norm(emb)
        if norm > 0:
            emb = emb / norm
        return emb
    except Exception:
        return np.zeros(128, dtype=np.float32)

def extract_image_features(image_input: Any) -> np.ndarray:
    """
    Extracts embedding from either image URL, file path, bytes, or PIL Image.
    """
    if image_input is None:
        return np.zeros(128, dtype=np.float32)

    try:
        if isinstance(image_input, Image.Image):
            return extract_image_features_from_pil(image_input)
        elif isinstance(image_input, bytes):
            img = Image.open(io.BytesIO(image_input))
            return extract_image_features_from_pil(img)
        elif isinstance(image_input, str):
            if image_input.startswith("http://") or image_input.startswith("https://"):
                resp = requests.get(image_input, timeout=4.0)
                if resp.status_code == 200:
                    img = Image.open(io.BytesIO(resp.content))
                    return extract_image_features_from_pil(img)
            elif os.path.exists(image_input):
                img = Image.open(image_input)
                return extract_image_features_from_pil(img)
    except Exception as e:
        print(f"Failed to extract image feature from {image_input}: {e}")

    return np.zeros(128, dtype=np.float32)
