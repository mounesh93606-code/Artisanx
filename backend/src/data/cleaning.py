"""
Data cleaning and normalization module for the Artisan Dynamic Pricing ML pipeline.
Cleans raw text, parses Indian Rupee (INR) currency strings, cleans categories/materials,
filters invalid rows, flags outliers, and produces a structured cleaning report.
"""
import re
import json
from pathlib import Path
from typing import Any
import numpy as np
import pandas as pd
from src.utils.config import TARGET_COLUMN, REPORTS_DIR, IMAGES_DIR
from src.utils.logger import get_logger

logger = get_logger("data_cleaning")


def parse_inr_price(val: Any) -> float | None:
    """
    Parse price representations in INR into a clean float.
    Handles: 'Rs. 850', '₹850', 'INR 850', '850 INR', '1,250.00', '850/-', 850, etc.
    """
    if val is None or pd.isna(val):
        return None
    if isinstance(val, (int, float)):
        return float(val) if not np.isnan(val) else None

    text = str(val).strip()
    # Remove currency prefixes/suffixes and commas
    text = re.sub(r"(?i)rs\.?|inr|₹|/-", "", text)
    text = text.replace(",", "").strip()

    match = re.search(r"[-+]?\d*\.?\d+", text)
    if match:
        try:
            return float(match.group(0))
        except (ValueError, TypeError):
            return None
    return None


class DataCleaner:
    """Performs robust cleaning, deduplication, price normalization, and outlier flagging."""

    def __init__(self, remove_outliers: bool = True, outlier_iqr_multiplier: float = 3.0):
        self.remove_outliers = remove_outliers
        self.outlier_iqr_multiplier = outlier_iqr_multiplier
        self.cleaning_report: dict[str, Any] = {}

    def clean_dataframe(self, df_raw: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
        """
        Clean raw dataframe and return (cleaned_df, cleaning_report).
        Does NOT silently delete suspicious records; logs every step.
        """
        rows_before = len(df_raw)
        df = df_raw.copy()

        report = {
            "rows_before": rows_before,
            "rows_after": 0,
            "duplicates_removed": 0,
            "invalid_prices_removed": 0,
            "missing_values_by_column": {},
            "outliers_detected": 0,
            "images_missing": 0,
            "category_corrections": 0,
        }

        # 1. Deduplication
        subset_cols = [c for c in ["product_name", "category", "material", "craft_type"] if c in df.columns]
        if subset_cols:
            initial_count = len(df)
            df = df.drop_duplicates(subset=subset_cols, keep="first")
            report["duplicates_removed"] = initial_count - len(df)

        # 2. Price normalization
        if TARGET_COLUMN in df.columns:
            df[TARGET_COLUMN] = df[TARGET_COLUMN].apply(parse_inr_price)
            # Filter zero, negative, or unparseable prices
            valid_price_mask = df[TARGET_COLUMN].notna() & (df[TARGET_COLUMN] > 0)
            invalid_prices_count = int((~valid_price_mask).sum())
            report["invalid_prices_removed"] = invalid_prices_count
            df = df[valid_price_mask].copy()

        # 3. Cost columns normalization
        cost_cols = [
            "material_cost",
            "labour_cost",
            "packaging_cost",
            "transport_cost",
            "other_cost",
        ]
        for col in cost_cols:
            if col in df.columns:
                df[col] = df[col].apply(parse_inr_price).fillna(0.0)
                # Clip negative costs to 0
                df[col] = df[col].clip(lower=0.0)

        # 4. Normalize text categories & materials
        str_cols = ["category", "material", "craft_type", "size"]
        for col in str_cols:
            if col in df.columns:
                df[col] = (
                    df[col]
                    .astype(str)
                    .str.strip()
                    .str.title()
                    .replace({"Nan": "Unknown", "None": "Unknown", "": "Unknown"})
                )

        # 5. Clean descriptions
        if "description" in df.columns:
            df["description"] = (
                df["description"]
                .astype(str)
                .str.strip()
                .replace({"nan": "", "None": ""})
            )
            # Fallback if empty
            df["description"] = df.apply(
                lambda r: r["description"] if r["description"] else f"Handcrafted {r.get('product_name', 'artisan product')}",
                axis=1,
            )

        # 6. Verify image paths
        if "image_path" in df.columns:
            missing_img_count = 0
            for path_str in df["image_path"]:
                if not path_str or pd.isna(path_str):
                    missing_img_count += 1
                else:
                    first_img = str(path_str).split("|")[0].strip()
                    p = Path(first_img)
                    if not p.is_absolute():
                        p = IMAGES_DIR / first_img
                    if not p.exists():
                        workspace_p = IMAGES_DIR.parent.parent / first_img
                        if workspace_p.exists():
                            p = workspace_p
                    if not p.exists():
                        missing_img_count += 1
            report["images_missing"] = missing_img_count

        # 7. Missing values count
        for col in df.columns:
            nulls = int(df[col].isna().sum())
            if nulls > 0:
                report["missing_values_by_column"][col] = nulls

        # 8. Outlier detection on target_price (IQR method)
        if TARGET_COLUMN in df.columns and len(df) > 10:
            q25 = df[TARGET_COLUMN].quantile(0.25)
            q75 = df[TARGET_COLUMN].quantile(0.75)
            iqr = q75 - q25
            lower_bound = max(10.0, q25 - self.outlier_iqr_multiplier * iqr)
            upper_bound = q75 + self.outlier_iqr_multiplier * iqr
            outlier_mask = (df[TARGET_COLUMN] < lower_bound) | (df[TARGET_COLUMN] > upper_bound)
            report["outliers_detected"] = int(outlier_mask.sum())

            if self.remove_outliers:
                df = df[~outlier_mask].copy()

        report["rows_after"] = len(df)
        self.cleaning_report = report

        # Save cleaning report
        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        report_path = REPORTS_DIR / "cleaning_report.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

        logger.info(
            f"Cleaning complete. Rows: {rows_before} -> {len(df)}. "
            f"Duplicates: {report['duplicates_removed']}, Outliers: {report['outliers_detected']}"
        )

        return df, report
