"""
Ingestion, normalization, and integration of real-world scraped artisan datasets.
Transforms scraped market_data.csv into the production RAW_COLUMNS schema,
synchronizes downloaded images, and combines with the benchmark craft dataset.
"""
import re
import shutil
from datetime import datetime
from pathlib import Path
import numpy as np
import pandas as pd

from src.utils.config import (
    RAW_DATA_DIR,
    IMAGES_DIR,
    PROCESSED_DATA_DIR,
    RAW_COLUMNS,
    BASE_DIR,
)
from src.utils.logger import get_logger

logger = get_logger("ingest_scraped")


def parse_dimension_from_text(text: str, label: str) -> float | None:
    """Extract dimension in centimeters from text using regex."""
    if not text or not isinstance(text, str):
        return None

    # Matches patterns like 'Height :- 320 mm' or 'Height: 32 cm' or 'Height - 12 inch'
    pattern = rf"(?i){label}\s*[:-]+\s*([\d\.]+)\s*(mm|cm|inch|in)?"
    match = re.search(pattern, text)
    if match:
        val = float(match.group(1))
        unit = (match.group(2) or "mm").lower()
        if unit == "mm":
            return round(val / 10.0, 2)
        elif unit in ("inch", "in"):
            return round(val * 2.54, 2)
        return round(val, 2)

    return None


def infer_craft_type_from_text(title: str, description: str, tags: str) -> str:
    """Infer craft technique keywords from text."""
    combined = f"{title} {description} {tags}".lower()
    if "dokra" in combined:
        return "Dokra Metal Craft"
    if "madhubani" in combined:
        return "Madhubani Art"
    if "handpainted" in combined or "hand-painted" in combined:
        return "Handpainted Art"
    if "block print" in combined:
        return "Block Printing"
    if "sateen weave" in combined or "handloom" in combined or "khadi" in combined:
        return "Handloom Weaving"
    if "engraved" in combined or "engraving" in combined:
        return "Engraving"
    if "terracotta" in combined or "clay" in combined:
        return "Clay Craft"
    if "bamboo" in combined:
        return "Bamboo Craft"
    if "carved" in combined or "carving" in combined:
        return "Wood Carving"
    return "Handcrafted"


def infer_size(title: str, description: str) -> str:
    """Infer size classification."""
    combined = f"{title} {description}".lower()
    if "king" in combined or "extra large" in combined or "xl" in combined:
        return "Extra Large"
    if "double" in combined or "large" in combined:
        return "Large"
    if "small" in combined:
        return "Small"
    return "Medium"


def infer_complexity(price: float) -> str:
    """Infer craftsmanship complexity based on market price tier."""
    if price >= 5000:
        return "High"
    if price <= 500:
        return "Low"
    return "Medium"


def sync_images(src_images_dir: Path, dest_images_dir: Path) -> int:
    """Synchronize downloaded product photos into the ML system images directory."""
    if not src_images_dir.exists():
        logger.warning(f"Source images directory not found: {src_images_dir}")
        return 0

    dest_images_dir.mkdir(parents=True, exist_ok=True)
    synced = 0
    for img_file in src_images_dir.glob("*.*"):
        if img_file.is_file():
            target = dest_images_dir / img_file.name
            if not target.exists():
                shutil.copy2(img_file, target)
                synced += 1

    logger.info(f"Synchronized {synced} image files from {src_images_dir} to {dest_images_dir}")
    return synced


def transform_scraped_data(scraped_csv: Path) -> pd.DataFrame:
    """Transform scraped market_data.csv to match RAW_COLUMNS schema."""
    logger.info(f"Reading scraped dataset from {scraped_csv}")
    df_raw = pd.read_csv(scraped_csv)

    # Calculate category-level market stats from scraped data
    cat_stats = df_raw.groupby("category")["price_inr"].agg([
        ("min", "min"),
        ("max", "max"),
        ("mean", "mean"),
        ("median", "median"),
        ("p25", lambda x: np.percentile(x, 25)),
        ("p75", lambda x: np.percentile(x, 75)),
        ("count", "count"),
    ]).to_dict(orient="index")

    transformed_records = []
    now_ts = datetime.now().isoformat()

    for idx, row in df_raw.iterrows():
        title = str(row.get("title", "")).strip()
        desc = str(row.get("description", "")).strip()
        tags = str(row.get("tags", "")).strip()
        price = float(row.get("price_inr", 0.0))
        cat = str(row.get("category", "Home Decoration")).strip()

        # Craft type
        craft = str(row.get("craft_type", "")).strip()
        if not craft or craft.lower() in ("nan", "none", ""):
            craft = infer_craft_type_from_text(title, desc, tags)

        # Material
        mat = str(row.get("material", "")).strip()
        if not mat or mat.lower() in ("nan", "none", ""):
            mat = "Handcrafted Mixed Material"

        # Dimensions
        h_cm = parse_dimension_from_text(desc, "height")
        l_cm = parse_dimension_from_text(desc, "length")
        w_cm = parse_dimension_from_text(desc, "width") or parse_dimension_from_text(desc, "breadth")
        diam_cm = parse_dimension_from_text(desc, "diameter")
        if diam_cm and not w_cm:
            w_cm = diam_cm
        if diam_cm and not l_cm:
            l_cm = diam_cm

        # Primary image path
        raw_img = str(row.get("image_path", "")).strip()
        primary_img = raw_img.split("|")[0].strip() if raw_img and raw_img.lower() != "nan" else None

        # Market statistics
        stats = cat_stats.get(cat, {})

        record = {
            "product_id": f"SCRAPED-EKHADI-{idx + 1:04d}",
            "product_name": title,
            "category": cat,
            "material": mat,
            "craft_type": craft,
            "tags": tags,
            "description": desc,
            "size": infer_size(title, desc),
            "weight_g": np.nan,
            "length_cm": l_cm,
            "width_cm": w_cm,
            "height_cm": h_cm,
            "quantity": 1,
            "handmade": True,
            "customization": False,
            "complexity": infer_complexity(price),
            "material_cost": np.nan,
            "labour_cost": np.nan,
            "packaging_cost": np.nan,
            "transport_cost": np.nan,
            "other_cost": np.nan,
            "market_min": stats.get("min", price * 0.8),
            "market_max": stats.get("max", price * 1.3),
            "market_mean": stats.get("mean", price),
            "market_median": stats.get("median", price),
            "market_p25": stats.get("p25", price * 0.9),
            "market_p75": stats.get("p75", price * 1.15),
            "market_sample_count": stats.get("count", 1),
            "average_rating": 4.2,
            "review_count": 10,
            "image_path": primary_img,
            "target_price": price,
            "currency": "INR",
            "source": str(row.get("source_name", "eKhadi")),
            "timestamp": now_ts,
        }
        transformed_records.append(record)

    df_transformed = pd.DataFrame(transformed_records)
    # Ensure columns match RAW_COLUMNS exactly
    df_transformed = df_transformed[RAW_COLUMNS]
    logger.info(f"Successfully transformed {len(df_transformed)} scraped records into standard schema.")
    return df_transformed


def integrate_scraped_dataset(
    scraped_csv_path: Path | None = None,
    output_combined_path: Path | None = None,
) -> pd.DataFrame:
    """
    End-to-end integration:
    1. Synchronizes image files.
    2. Transforms scraped CSV.
    3. Backs up existing benchmark CSV.
    4. Combines benchmark + scraped data.
    5. Clears old embeddings cache.
    """
    workspace_root = BASE_DIR.parent
    scraped_csv = scraped_csv_path or (workspace_root / "scraper" / "market_data.csv")
    scraped_img_dir = workspace_root / "scraper" / "images"
    target_img_dir = IMAGES_DIR / "scraper" / "images"
    benchmark_csv = output_combined_path or (RAW_DATA_DIR / "artisan_benchmark_dataset.csv")

    # 1. Sync images
    sync_images(scraped_img_dir, target_img_dir)

    # 2. Transform scraped data
    df_scraped = transform_scraped_data(scraped_csv)

    # Save standalone scraped dataset in data/raw/
    scraped_out_file = RAW_DATA_DIR / "scraped_artisan_dataset.csv"
    df_scraped.to_csv(scraped_out_file, index=False)
    logger.info(f"Saved standalone scraped dataset to {scraped_out_file}")

    # 3. Backup existing benchmark data
    if benchmark_csv.exists():
        backup_csv = RAW_DATA_DIR / "backup_artisan_benchmark_dataset.csv"
        if not backup_csv.exists():
            shutil.copy2(benchmark_csv, backup_csv)
            logger.info(f"Created immutable backup at {backup_csv}")
        df_benchmark = pd.read_csv(benchmark_csv)
        # Avoid double-combining if already present
        df_benchmark = df_benchmark[~df_benchmark["source"].astype(str).str.startswith("eKhadi")]
    else:
        df_benchmark = pd.DataFrame(columns=RAW_COLUMNS)

    # 4. Merge datasets
    df_combined = pd.concat([df_benchmark, df_scraped], ignore_index=True)
    df_combined.to_csv(benchmark_csv, index=False)
    logger.info(
        f"Combined dataset written to {benchmark_csv} "
        f"(Benchmark: {len(df_benchmark)}, Scraped: {len(df_scraped)}, Total: {len(df_combined)})"
    )

    # 5. Invalidate cached embeddings to force recomputing on augmented dataset
    for cache_file in PROCESSED_DATA_DIR.glob("*embeddings*.npy"):
        try:
            cache_file.unlink()
            logger.info(f"Cleared outdated embedding cache: {cache_file.name}")
        except Exception as e:
            logger.warning(f"Could not remove cache file {cache_file}: {e}")

    return df_combined


if __name__ == "__main__":
    integrate_scraped_dataset()
