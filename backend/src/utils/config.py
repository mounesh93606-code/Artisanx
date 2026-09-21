"""
Global configuration, schemas, paths, and feature definitions for Artisan Dynamic Pricing ML.
"""
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
INTERIM_DATA_DIR = DATA_DIR / "interim"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
EXTERNAL_DATA_DIR = DATA_DIR / "external"
IMAGES_DIR = BASE_DIR / "images"
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "reports"

# Ensure essential directories exist
for directory in [
    RAW_DATA_DIR,
    INTERIM_DATA_DIR,
    PROCESSED_DATA_DIR,
    EXTERNAL_DATA_DIR,
    IMAGES_DIR,
    MODELS_DIR,
    REPORTS_DIR,
]:
    directory.mkdir(parents=True, exist_ok=True)

# Required Raw Data Schema
RAW_COLUMNS = [
    "product_id",
    "product_name",
    "category",
    "material",
    "craft_type",
    "tags",
    "description",
    "size",
    "weight_g",
    "length_cm",
    "width_cm",
    "height_cm",
    "quantity",
    "handmade",
    "customization",
    "complexity",
    "material_cost",
    "labour_cost",
    "packaging_cost",
    "transport_cost",
    "other_cost",
    "market_min",
    "market_max",
    "market_mean",
    "market_median",
    "market_p25",
    "market_p75",
    "market_sample_count",
    "average_rating",
    "review_count",
    "image_path",
    "target_price",
    "currency",
    "source",
    "timestamp",
]

# Target column
TARGET_COLUMN = "target_price"

# Sensitive / target-leaking columns that MUST NOT be used as input features
LEAKAGE_COLUMNS = [
    "target_price",
    "final_selling_price",
    "price_after_sale",
    "selling_price",
    "actual_price",
]

# Tabular Categorical Features
CATEGORICAL_FEATURES = [
    "category",
    "material",
    "craft_type",
    "size",
    "handmade",
    "customization",
    "complexity",
]

# Tabular Numerical Features
NUMERICAL_FEATURES = [
    "weight_g",
    "length_cm",
    "width_cm",
    "height_cm",
    "quantity",
    "material_cost",
    "labour_cost",
    "packaging_cost",
    "transport_cost",
    "other_cost",
    "market_min",
    "market_max",
    "market_mean",
    "market_median",
    "market_p25",
    "market_p75",
    "market_sample_count",
    "average_rating",
    "review_count",
]

# Derived Features to Engineer
DERIVED_NUMERICAL_FEATURES = [
    "total_cost",
    "cost_per_unit",
    "labour_cost_ratio",
    "material_cost_ratio",
    "market_spread",
    "market_iqr",
    "has_market_data",
    "has_cost_data",
]

# Text Feature Columns to combine
TEXT_COLUMNS = [
    "product_name",
    "category",
    "material",
    "craft_type",
    "tags",
    "description",
]

# Benchmark Categories
BENCHMARK_CATEGORIES = [
    "Pottery",
    "Textiles",
    "Woodcraft",
    "Jewellery",
    "Basketry",
    "Painting",
    "Embroidery",
    "Metal craft",
]

# Random Seed for Reproducibility
RANDOM_SEED = 42
