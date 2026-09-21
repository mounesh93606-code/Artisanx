"""
Data ingestion module for Artisan Dynamic Pricing ML.
Supports loading and importing from CSV, XLSX, JSON, and directories of images.
Preserves raw copies in data/raw and ensures strict data leakage prevention.
"""
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any
import pandas as pd
from src.utils.config import RAW_DATA_DIR, LEAKAGE_COLUMNS, TARGET_COLUMN
from src.utils.logger import get_logger

logger = get_logger("data_ingestion")


class DataIngestor:
    """Ingests data from multiple formats while preserving raw immutability."""

    def __init__(self, raw_storage_dir: Path = RAW_DATA_DIR):
        self.raw_storage_dir = Path(raw_storage_dir)
        self.raw_storage_dir.mkdir(parents=True, exist_ok=True)

    def load_file(self, file_path: str | Path) -> pd.DataFrame:
        """Load data from CSV, XLSX, or JSON into a pandas DataFrame."""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Input file not found: {path}")

        suffix = path.suffix.lower()
        logger.info(f"Ingesting data from {path.name} (format: {suffix})")

        if suffix == ".csv":
            df = pd.read_csv(path)
        elif suffix in [".xlsx", ".xls"]:
            df = pd.read_excel(path)
        elif suffix == ".json":
            df = pd.read_json(path)
        else:
            raise ValueError(f"Unsupported file format: {suffix}. Supported: .csv, .xlsx, .xls, .json")

        # Save an immutable timestamped copy into data/raw/
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"raw_{timestamp}_{path.stem}{suffix}"
        backup_path = self.raw_storage_dir / backup_filename
        if not backup_path.exists():
            try:
                shutil.copy2(path, backup_path)
                logger.info(f"Preserved raw copy at {backup_path}")
            except Exception as e:
                logger.warning(f"Could not create raw backup: {e}")

        return df

    @staticmethod
    def prevent_leakage(df: pd.DataFrame, drop_target: bool = True) -> pd.DataFrame:
        """
        Verify and enforce data leakage prevention.
        Strips any columns that contain target price or sale information.
        """
        df_safe = df.copy()
        leakage_found = []
        for col in LEAKAGE_COLUMNS:
            if col in df_safe.columns:
                if col == TARGET_COLUMN and not drop_target:
                    continue
                leakage_found.append(col)
                df_safe = df_safe.drop(columns=[col])

        if leakage_found:
            logger.info(f"Prevented data leakage: Dropped columns {leakage_found}")
        return df_safe
