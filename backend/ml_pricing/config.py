import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
CLEANED_DATA_DIR = DATA_DIR / "cleaned"
MODELS_DIR = DATA_DIR / "models"

# Ensure directories exist
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
CLEANED_DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# File paths
SOURCES_CONFIG_PATH = Path(__file__).resolve().parent / "market_sources.yaml"
CLEANED_CSV_PATH = CLEANED_DATA_DIR / "market_prices.csv"
CLEANED_PARQUET_PATH = CLEANED_DATA_DIR / "market_prices.parquet"
DATASET_REPORT_PATH = CLEANED_DATA_DIR / "dataset_report.json"

MODEL_LATEST_PATH = MODELS_DIR / "price_model_latest.pkl"
FEATURE_PIPELINE_PATH = MODELS_DIR / "feature_pipeline.pkl"
MODEL_METRICS_PATH = MODELS_DIR / "model_metrics.json"
MODEL_METADATA_PATH = MODELS_DIR / "model_metadata.json"

# Hybrid pricing engine weights
WEIGHT_SIMILARITY_MARKET = 0.55
WEIGHT_ML_PREDICTION = 0.45

# Similarity engine component weights
SIM_WEIGHT_IMAGE = 0.30
SIM_WEIGHT_TEXT = 0.35
SIM_WEIGHT_CATEGORY_MATERIAL = 0.25
SIM_WEIGHT_RECENCY = 0.10

# Outlier bounds (INR)
MIN_VALID_PRICE_INR = 50.0
MAX_VALID_PRICE_INR = 500000.0

# Current Model Version
MODEL_VERSION = "v001"
FEATURE_VERSION = "v001"
