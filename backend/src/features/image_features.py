"""
Visual feature extraction pipeline for artisan product images.
Validates images, normalizes dimensions, passes through a pretrained vision backbone
(MobileNetV3 / ResNet), pools visual embeddings, and manages caching and inference.
"""
import json
from pathlib import Path
from typing import Any
import numpy as np
import pandas as pd
from PIL import Image
import torch
import torchvision.transforms as transforms
import torchvision.models as models

from src.utils.config import IMAGES_DIR, PROCESSED_DATA_DIR, MODELS_DIR
from src.utils.logger import get_logger

logger = get_logger("image_features")


class ImageFeatureExtractor:
    """Extracts visual embeddings from artisan product images using a pretrained CNN."""

    def __init__(
        self,
        backbone: str = "mobilenet_v3_small",
        embedding_dim: int = 128,
        device: str | None = None,
    ):
        self.backbone_name = backbone
        self.embedding_dim = embedding_dim
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        # Standard ImageNet normalization and resize transform
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ])

        self.model = None
        self._init_model()

    def _init_model(self) -> None:
        """Initialize pretrained backbone and replace head with projection to embedding_dim."""
        logger.info(f"Loading vision backbone: {self.backbone_name} on {self.device}")
        try:
            if self.backbone_name == "mobilenet_v3_small":
                weights = models.MobileNet_V3_Small_Weights.DEFAULT
                base = models.mobilenet_v3_small(weights=weights)
                # Keep feature extractor + pooling, project to embedding_dim
                in_features = base.classifier[0].in_features
                base.classifier = torch.nn.Sequential(
                    torch.nn.Linear(in_features, self.embedding_dim),
                    torch.nn.LayerNorm(self.embedding_dim),
                )
                self.model = base
            elif self.backbone_name == "resnet18":
                weights = models.ResNet18_Weights.DEFAULT
                base = models.resnet18(weights=weights)
                in_features = base.fc.in_features
                base.fc = torch.nn.Sequential(
                    torch.nn.Linear(in_features, self.embedding_dim),
                    torch.nn.LayerNorm(self.embedding_dim),
                )
                self.model = base
            else:
                raise ValueError(f"Unsupported backbone: {self.backbone_name}")

            self.model.eval()
            self.model.to(self.device)
        except Exception as e:
            logger.error(f"Failed to load pretrained vision model: {e}")
            raise

    def load_and_preprocess(self, image_input: Path | str | bytes | None) -> torch.Tensor | None:
        """Load and preprocess a single image from file path, remote URL, or raw bytes. Returns None if invalid/missing."""
        if not image_input:
            return None

        import io

        # 1. Direct raw bytes
        if isinstance(image_input, bytes):
            try:
                with Image.open(io.BytesIO(image_input)) as img:
                    img_rgb = img.convert("RGB")
                    return self.transform(img_rgb)
            except Exception as e:
                logger.warning(f"Failed to process image from bytes: {e}")
                return None

        clean_path = str(image_input).split("|")[0].strip()
        if not clean_path:
            return None

        # 2. Remote HTTP/HTTPS URL
        if clean_path.startswith(("http://", "https://")):
            try:
                import requests
                resp = requests.get(clean_path, timeout=5, headers={"User-Agent": "ArtisanX-Pricing/1.0"})
                if resp.status_code == 200:
                    with Image.open(io.BytesIO(resp.content)) as img:
                        img_rgb = img.convert("RGB")
                        return self.transform(img_rgb)
            except Exception as e:
                logger.warning(f"Failed to fetch or process remote image from {clean_path}: {e}")
                return None

        # 3. Local file path
        p = Path(clean_path)
        if not p.is_absolute():
            p = IMAGES_DIR / clean_path

        if not p.exists():
            workspace_p = IMAGES_DIR.parent.parent / clean_path
            if workspace_p.exists():
                p = workspace_p

        if not p.exists():
            return None

        try:
            with Image.open(p) as img:
                img_rgb = img.convert("RGB")
                tensor = self.transform(img_rgb)
                return tensor
        except Exception as e:
            logger.warning(f"Failed to process image {p}: {e}")
            return None

    def extract_single(self, image_input: Path | str | bytes | None) -> tuple[np.ndarray, float]:
        """
        Extract embedding for a single image (path, URL, or bytes).
        Returns (embedding_vector, has_image_flag).
        """
        tensor = self.load_and_preprocess(image_input)
        if tensor is None:
            # Return zero vector and flag 0.0
            return np.zeros(self.embedding_dim, dtype=np.float32), 0.0

        with torch.no_grad():
            batch = tensor.unsqueeze(0).to(self.device)
            embedding = self.model(batch).cpu().numpy().squeeze(0)
            # L2 normalize
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            return embedding.astype(np.float32), 1.0

    def extract_batch(self, image_paths: list[str | None], batch_size: int = 32) -> np.ndarray:
        """Extract visual embeddings for a batch of image paths."""
        embeddings = np.zeros((len(image_paths), self.embedding_dim), dtype=np.float32)

        for i in range(0, len(image_paths), batch_size):
            batch_paths = image_paths[i : i + batch_size]
            tensors = []
            valid_indices = []

            for idx, p in enumerate(batch_paths):
                t = self.load_and_preprocess(p)
                if t is not None:
                    tensors.append(t)
                    valid_indices.append(i + idx)

            if tensors:
                batch_tensor = torch.stack(tensors).to(self.device)
                with torch.no_grad():
                    out = self.model(batch_tensor).cpu().numpy()
                    # L2 normalize
                    norms = np.linalg.norm(out, axis=1, keepdims=True)
                    norms[norms == 0] = 1.0
                    out = out / norms
                    embeddings[valid_indices] = out

        return embeddings

    def extract_with_cache(
        self,
        df: pd.DataFrame,
        cache_path: Path | str | None = None,
        force_recompute: bool = False,
    ) -> np.ndarray:
        """Extract image embeddings with disk-level caching."""
        cache_file = Path(cache_path or (PROCESSED_DATA_DIR / "image_embeddings.npy"))
        if cache_file.exists() and not force_recompute:
            try:
                cached = np.load(cache_file)
                if len(cached) == len(df):
                    logger.info(f"Loaded cached image embeddings from {cache_file} (shape: {cached.shape})")
                    return cached
            except Exception as e:
                logger.warning(f"Failed to read cache {cache_file}: {e}")

        paths = df["image_path"].tolist() if "image_path" in df.columns else [None] * len(df)
        embeddings = self.extract_batch(paths)

        cache_file.parent.mkdir(parents=True, exist_ok=True)
        np.save(cache_file, embeddings)
        logger.info(f"Computed and cached image embeddings to {cache_file} (shape: {embeddings.shape})")
        return embeddings

    def save_config(self, filepath: Path | str | None = None) -> None:
        """Save image encoder metadata and architecture details."""
        save_file = Path(filepath or (MODELS_DIR / "image_encoder_config.json"))
        save_file.parent.mkdir(parents=True, exist_ok=True)
        config = {
            "backbone": self.backbone_name,
            "embedding_dim": self.embedding_dim,
            "input_resolution": [224, 224],
            "normalization": {
                "mean": [0.485, 0.456, 0.406],
                "std": [0.229, 0.224, 0.225],
            },
        }
        with open(save_file, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
        logger.info(f"Saved image encoder config to {save_file}")
