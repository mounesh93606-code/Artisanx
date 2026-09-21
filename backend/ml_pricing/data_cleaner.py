import os
import re
import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Tuple
import pandas as pd
import numpy as np

from .config import (
    RAW_DATA_DIR,
    CLEANED_CSV_PATH,
    CLEANED_PARQUET_PATH,
    DATASET_REPORT_PATH,
    MIN_VALID_PRICE_INR,
    MAX_VALID_PRICE_INR
)

def clean_text(text: Any) -> str:
    if not text or pd.isna(text):
        return ""
    text_str = str(text)
    # Remove HTML tags
    text_str = re.sub(r'<[^>]+>', ' ', text_str)
    # Collapse multiple whitespaces
    text_str = re.sub(r'\s+', ' ', text_str).strip()
    return text_str

def parse_price(price_raw: Any, currency: str = "INR") -> Tuple[float, bool]:
    """
    Cleans raw price string/number to INR float.
    Returns (cleaned_price, is_valid).
    """
    if price_raw is None or pd.isna(price_raw):
        return 0.0, False

    price_str = str(price_raw).replace(",", "").replace("₹", "").replace("Rs", "").replace("INR", "").strip()
    # Extract numerical part
    match = re.search(r'(\d+(?:\.\d+)?)', price_str)
    if not match:
        return 0.0, False
        
    try:
        val = float(match.group(1))
        # Currency conversion if not INR (e.g. USD to INR ~ 85)
        if currency.upper() == "USD" or "$" in str(price_raw):
            val = val * 85.0

        if MIN_VALID_PRICE_INR <= val <= MAX_VALID_PRICE_INR:
            return round(val, 2), True
        else:
            return round(val, 2), False  # Out of range / suspicious
    except Exception:
        return 0.0, False

def compute_image_hash(url_or_title: str) -> str:
    return hashlib.md5(url_or_title.encode('utf-8')).hexdigest()[:16]

def clean_market_data() -> Dict[str, Any]:
    print("=" * 60)
    print("ARTISANX — STARTING MARKET DATA CLEANING PIPELINE")
    print("=" * 60)

    # 1. Load raw files
    raw_files = list(RAW_DATA_DIR.glob("market_raw_*.json"))
    if not raw_files:
        raise FileNotFoundError(f"No raw market data files found in {RAW_DATA_DIR}. Please run data_collector.py first.")

    all_raw_records: List[Dict[str, Any]] = []
    for rf in raw_files:
        with open(rf, "r", encoding="utf-8") as f:
            records = json.load(f)
            if isinstance(records, list):
                all_raw_records.extend(records)

    total_raw = len(all_raw_records)
    print(f"Loaded {total_raw} raw records from {len(raw_files)} raw data files.")

    # 2. Cleaning & Deduplication
    seen_keys = set()
    cleaned_rows = []
    duplicates_removed = 0
    invalid_prices_removed = 0
    suspicious_records = 0
    missing_price_count = 0
    missing_image_count = 0

    dates_collected = []

    for idx, r in enumerate(all_raw_records):
        title = clean_text(r.get("title"))
        if not title:
            continue

        raw_price = r.get("price")
        if raw_price is None:
            missing_price_count += 1
            invalid_prices_removed += 1
            continue

        price_inr, is_valid_price = parse_price(raw_price, r.get("currency", "INR"))
        if not is_valid_price:
            if price_inr > 0:
                suspicious_records += 1
            invalid_prices_removed += 1
            continue

        product_url = r.get("product_url", "")
        source_name = r.get("source_name", "unknown")
        
        # Deduplication key: product_url or normalized title + source
        dedup_key = f"{source_name}::{title.lower()}" if not product_url else product_url
        if dedup_key in seen_keys:
            duplicates_removed += 1
            continue
        seen_keys.add(dedup_key)

        image_url = r.get("image_url")
        if not image_url or pd.isna(image_url):
            missing_image_count += 1
            image_url = ""

        # Normalize tags
        raw_tags = r.get("tags", [])
        if isinstance(raw_tags, list):
            tags_str = ", ".join([clean_text(t) for t in raw_tags if t])
        else:
            tags_str = clean_text(raw_tags)

        scraped_at = r.get("scraped_at") or datetime.utcnow().isoformat()
        dates_collected.append(scraped_at)

        cleaned_record = {
            "id": f"mkt_{idx+1:05d}",
            "source_name": source_name,
            "source_url": r.get("source_url", ""),
            "product_url": product_url,
            "title": title,
            "description": clean_text(r.get("description")),
            "category": clean_text(r.get("category", "General Handicrafts")),
            "tags": tags_str,
            "material": clean_text(r.get("material", "Mixed Natural Materials")),
            "craft_type": clean_text(r.get("craft_type", "Traditional Handicraft")),
            "image_url": image_url,
            "price_inr": price_inr,
            "rating": float(r.get("rating", 4.5)),
            "review_count": int(r.get("review_count", 10)),
            "availability": r.get("availability", "in_stock"),
            "scraped_at": scraped_at,
            "image_hash": compute_image_hash(image_url or title),
            "text_embedding_id": f"txt_{idx+1:05d}",
            "quality_score": round(min(1.0, 0.7 + (0.05 if image_url else 0.0) + (0.1 if tags_str else 0.0) + (0.1 if r.get('description') else 0.0)), 2)
        }
        cleaned_rows.append(cleaned_record)

    df = pd.DataFrame(cleaned_rows)
    total_clean = len(df)

    # 3. Save Cleaned Dataset (CSV & Parquet)
    df.to_csv(CLEANED_CSV_PATH, index=False, encoding="utf-8")
    try:
        df.to_parquet(CLEANED_PARQUET_PATH, index=False)
        print(f"Saved cleaned dataset to Parquet: {CLEANED_PARQUET_PATH}")
    except Exception as e:
        print(f"Parquet export skipped: {e}")

    print(f"Saved cleaned dataset to CSV: {CLEANED_CSV_PATH}")

    # 4. Generate Dataset Report
    source_counts = df["source_name"].value_counts().to_dict() if not df.empty else {}
    category_counts = df["category"].value_counts().to_dict() if not df.empty else {}

    report = {
        "total_raw_records": total_raw,
        "total_clean_records": total_clean,
        "duplicates_removed": duplicates_removed,
        "invalid_prices_removed": invalid_prices_removed,
        "suspicious_records": suspicious_records,
        "missing_price_count": missing_price_count,
        "missing_image_count": missing_image_count,
        "source_counts": source_counts,
        "category_counts": category_counts,
        "minimum_price": float(df["price_inr"].min()) if not df.empty else 0.0,
        "maximum_price": float(df["price_inr"].max()) if not df.empty else 0.0,
        "median_price": float(df["price_inr"].median()) if not df.empty else 0.0,
        "collection_date_range": {
            "start": min(dates_collected) if dates_collected else "",
            "end": max(dates_collected) if dates_collected else ""
        }
    }

    with open(DATASET_REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("-" * 60)
    print("DATASET QUALITY REPORT:")
    print(f"  - Total Raw Records:        {total_raw}")
    print(f"  - Total Cleaned Records:    {total_clean}")
    print(f"  - Duplicates Removed:       {duplicates_removed}")
    print(f"  - Invalid Prices Removed:   {invalid_prices_removed}")
    print(f"  - Suspicious Records:       {suspicious_records}")
    print(f"  - Price Range (INR):        INR {report['minimum_price']} - INR {report['maximum_price']}")
    print(f"  - Median Price (INR):       INR {report['median_price']}")
    print(f"Saved Dataset Report to: {DATASET_REPORT_PATH}")
    print("=" * 60)

    return report

if __name__ == "__main__":
    clean_market_data()
