"""
Data validation module for the Artisan Dynamic Pricing ML pipeline.
Enforces schema constraints, value ranges, and generates validation reports.
"""
from typing import Any
import pandas as pd
from src.utils.config import RAW_COLUMNS, TARGET_COLUMN
from src.utils.logger import get_logger

logger = get_logger("data_validation")


class DataValidator:
    """Validates raw and ingested artisan product datasets."""

    def __init__(self, required_columns: list[str] | None = None):
        self.required_columns = required_columns or RAW_COLUMNS

    def validate_schema(self, df: pd.DataFrame) -> tuple[bool, list[str]]:
        """Check if all required columns are present."""
        missing = [col for col in self.required_columns if col not in df.columns]
        if missing:
            logger.warning(f"Schema validation failed. Missing columns: {missing}")
            return False, missing
        return True, []

    def validate_types_and_ranges(self, df: pd.DataFrame) -> dict[str, Any]:
        """Validate value types and business logic constraints."""
        report = {
            "total_rows": len(df),
            "missing_critical_fields": {},
            "negative_prices": 0,
            "zero_prices": 0,
            "negative_costs": 0,
            "invalid_weights": 0,
            "status": "PASSED",
            "errors": [],
        }

        # Check critical fields
        for col in ["product_id", "product_name", "category", TARGET_COLUMN]:
            if col in df.columns:
                null_count = int(df[col].isna().sum())
                if null_count > 0:
                    report["missing_critical_fields"][col] = null_count
                    report["errors"].append(f"{col} has {null_count} null entries.")

        # Check prices if column exists and is numeric
        if TARGET_COLUMN in df.columns:
            numeric_prices = pd.to_numeric(df[TARGET_COLUMN], errors="coerce")
            neg_p = int((numeric_prices < 0).sum())
            zero_p = int((numeric_prices == 0).sum())
            report["negative_prices"] = neg_p
            report["zero_prices"] = zero_p
            if neg_p > 0 or zero_p > 0:
                report["errors"].append(f"Found {neg_p} negative and {zero_p} zero prices.")

        # Check costs
        cost_cols = [
            "material_cost",
            "labour_cost",
            "packaging_cost",
            "transport_cost",
            "other_cost",
        ]
        for col in cost_cols:
            if col in df.columns:
                numeric_cost = pd.to_numeric(df[col], errors="coerce")
                neg_c = int((numeric_cost < 0).sum())
                if neg_c > 0:
                    report["negative_costs"] += neg_c
                    report["errors"].append(f"{col} has {neg_c} negative values.")

        # Check weights
        if "weight_g" in df.columns:
            numeric_w = pd.to_numeric(df["weight_g"], errors="coerce")
            neg_w = int((numeric_w <= 0).sum())
            report["invalid_weights"] = neg_w
            if neg_w > 0:
                report["errors"].append(f"Found {neg_w} non-positive weights.")

        if report["errors"]:
            report["status"] = "WARNINGS_FOUND"

        return report

    def run_full_validation(self, df: pd.DataFrame) -> dict[str, Any]:
        """Run complete validation suite on the dataframe."""
        schema_ok, missing_cols = self.validate_schema(df)
        range_report = self.validate_types_and_ranges(df)

        full_report = {
            "schema_valid": schema_ok,
            "missing_columns": missing_cols,
            "range_validation": range_report,
            "is_valid_for_training": schema_ok and (range_report["negative_prices"] == 0),
        }
        return full_report
