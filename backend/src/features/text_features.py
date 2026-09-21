"""
Text feature extraction and embedding pipeline.
Combines product name, description, category, material, craft type, and tags,
encodes into dense semantic embeddings, and manages caching and inference.
"""
import hashlib
import json
from pathlib import Path
from typing import Any
import joblib
import numpy as np
import pandas as pd
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer

from src.utils.config import (
    TEXT_COLUMNS,
    PROCESSED_DATA_DIR,
    MODELS_DIR,
)
from src.utils.logger import get_logger

logger = get_logger("text_features")


def assemble_text(df: pd.DataFrame) -> list[str]:
    """Combine text columns into a coherent product description string."""
    combined_texts = []
    for _, row in df.iterrows():
        parts = [
            f"Product: {row.get('product_name', '')}",
            f"Category: {row.get('category', '')}",
            f"Material: {row.get('material', '')}",
            f"Craft: {row.get('craft_type', '')}",
            f"Tags: {row.get('tags', '')}",
            f"Description: {row.get('description', '')}",
        ]
        text = ". ".join([p for p in parts if p.strip()])
        combined_texts.append(text)
    return combined_texts


class TextFeatureExtractor:
    """Extracts dense semantic embeddings using SentenceTransformer or robust TF-IDF+SVD."""

    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        embedding_dim: int = 64,
        use_sentence_transformers: bool = True,
    ):
        self.model_name = model_name
        self.embedding_dim = embedding_dim
        self.use_sentence_transformers = use_sentence_transformers
        self.st_model = None
        self.fallback_vectorizer: TfidfVectorizer | None = None
        self.fallback_svd: TruncatedSVD | None = None
        self.mode = "sentence_transformers"

        if self.use_sentence_transformers:
            try:
                from sentence_transformers import SentenceTransformer
                # Try to load model
                self.st_model = SentenceTransformer(self.model_name)
                logger.info(f"Loaded SentenceTransformer: {self.model_name}")
                self.mode = "sentence_transformers"
            except Exception as e:
                logger.warning(
                    f"Could not initialize SentenceTransformer ({e}). Falling back to TF-IDF + SVD ({self.embedding_dim} dims)."
                )
                self.mode = "tfidf_svd"
        else:
            self.mode = "tfidf_svd"

    def fit(self, texts: list[str]) -> "TextFeatureExtractor":
        """Fit fallback encoder if using TF-IDF + SVD."""
        if self.mode == "tfidf_svd":
            self.fallback_vectorizer = TfidfVectorizer(
                max_features=2500, stop_words="english", ngram_range=(1, 2)
            )
            tfidf_matrix = self.fallback_vectorizer.fit_transform(texts)
            n_components = min(self.embedding_dim, tfidf_matrix.shape[1] - 1, len(texts) - 1)
            n_components = max(2, n_components)
            self.fallback_svd = TruncatedSVD(n_components=n_components, random_state=42)
            self.fallback_svd.fit(tfidf_matrix)
            logger.info(f"TF-IDF + SVD fitted with {n_components} components.")
        return self

    def extract(self, texts: list[str]) -> np.ndarray:
        """Generate dense embeddings for a list of texts."""
        if self.mode == "sentence_transformers" and self.st_model is not None:
            try:
                embeddings = self.st_model.encode(
                    texts, batch_size=32, show_progress_bar=False, normalize_embeddings=True
                )
                return np.asarray(embeddings, dtype=np.float32)
            except Exception as e:
                logger.warning(f"Inference with SentenceTransformer failed: {e}. Switching to TF-IDF+SVD.")
                self.mode = "tfidf_svd"
                self.fit(texts)

        if self.fallback_vectorizer is None or self.fallback_svd is None:
            self.fit(texts)

        tfidf_matrix = self.fallback_vectorizer.transform(texts)
        embeddings = self.fallback_svd.transform(tfidf_matrix)
        # Pad to self.embedding_dim if SVD n_components < embedding_dim
        if embeddings.shape[1] < self.embedding_dim:
            padded = np.zeros((embeddings.shape[0], self.embedding_dim), dtype=np.float32)
            padded[:, : embeddings.shape[1]] = embeddings
            embeddings = padded
        # L2 normalize
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return (embeddings / norms).astype(np.float32)

    def extract_with_cache(
        self,
        df: pd.DataFrame,
        cache_path: Path | str | None = None,
        force_recompute: bool = False,
    ) -> np.ndarray:
        """Extract text embeddings with disk-level caching."""
        cache_file = Path(cache_path or (PROCESSED_DATA_DIR / "text_embeddings.npy"))
        if cache_file.exists() and not force_recompute:
            try:
                cached = np.load(cache_file)
                if len(cached) == len(df):
                    logger.info(f"Loaded cached text embeddings from {cache_file} (shape: {cached.shape})")
                    return cached
            except Exception as e:
                logger.warning(f"Failed to read cache {cache_file}: {e}")

        texts = assemble_text(df)
        embeddings = self.extract(texts)
        cache_file.parent.mkdir(parents=True, exist_ok=True)
        np.save(cache_file, embeddings)
        logger.info(f"Computed and cached text embeddings to {cache_file} (shape: {embeddings.shape})")
        return embeddings

    def save_config(self, filepath: Path | str | None = None) -> None:
        """Save text encoder metadata & fallback weights."""
        save_file = Path(filepath or (MODELS_DIR / "text_encoder_config.json"))
        save_file.parent.mkdir(parents=True, exist_ok=True)
        config = {
            "mode": self.mode,
            "model_name": self.model_name,
            "embedding_dim": self.embedding_dim,
        }
        with open(save_file, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)

        if self.mode == "tfidf_svd" and self.fallback_vectorizer:
            joblib.dump(
                {"vectorizer": self.fallback_vectorizer, "svd": self.fallback_svd},
                MODELS_DIR / "text_fallback_model.pkl",
            )
        logger.info(f"Saved text encoder config to {save_file}")
