"""
Load and validate historical 15-minute market data for Forecast Engine v2.

This module is intentionally simple in v1:
- connects to Supabase
- loads energy_market_data_15m
- checks date range, row count, and missing 15-minute intervals
"""

import os
import sys
from pathlib import Path

import pandas as pd
from supabase import create_client


CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = CURRENT_DIR.parents[0]
sys.path.append(str(PROJECT_DIR))

from config.settings import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TABLE_MARKET_15M


def get_supabase_client():
    if not SUPABASE_URL:
        raise ValueError("Missing environment variable: SUPABASE_URL")

    if not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY")

    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def load_market_15m(limit: int = 50000) -> pd.DataFrame:
    supabase = get_supabase_client()

    response = (
        supabase
        .table(TABLE_MARKET_15M)
        .select("timestamp_utc, dayahead_price")
        .order("timestamp_utc", desc=False)
        .limit(limit)
        .execute()
    )

    rows = response.data or []
    df = pd.DataFrame(rows)

    if df.empty:
        raise ValueError(f"No rows loaded from {TABLE_MARKET_15M}")

    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True)
    df["dayahead_price"] = pd.to_numeric(df["dayahead_price"], errors="coerce")
    df = df.sort_values("timestamp_utc").reset_index(drop=True)

    return df


def validate_market_15m(df: pd.DataFrame) -> None:
    min_ts = df["timestamp_utc"].min()
    max_ts = df["timestamp_utc"].max()
    row_count = len(df)

    expected_range = pd.date_range(start=min_ts, end=max_ts, freq="15min", tz="UTC")
    actual_timestamps = pd.DatetimeIndex(df["timestamp_utc"])
    missing = expected_range.difference(actual_timestamps)

    print("=== energy_market_data_15m validation ===")
    print(f"Rows loaded: {row_count}")
    print(f"Min timestamp: {min_ts}")
    print(f"Max timestamp: {max_ts}")
    print(f"Expected 15m intervals: {len(expected_range)}")
    print(f"Missing 15m intervals: {len(missing)}")
    print(f"Coverage: {row_count / len(expected_range) * 100:.2f}%")

    if len(missing) > 0:
        print("\nFirst missing intervals:")
        print(missing[:20])


if __name__ == "__main__":
    market_df = load_market_15m()
    validate_market_15m(market_df)
