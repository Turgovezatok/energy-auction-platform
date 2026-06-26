"""
Build training features for Forecast Engine v2.
"""

import sys
from pathlib import Path

import pandas as pd

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = CURRENT_DIR.parents[0]
sys.path.append(str(PROJECT_DIR))

from feature_engineering.load_training_data import load_market_15m


def add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    ts = df["timestamp_utc"]

    df["year"] = ts.dt.year
    df["month"] = ts.dt.month
    df["day"] = ts.dt.day
    df["hour"] = ts.dt.hour

    df["quarter_hour"] = ts.dt.minute // 15
    df["quarter_hour_of_day"] = df["hour"] * 4 + df["quarter_hour"]

    df["weekday"] = ts.dt.weekday
    df["day_of_year"] = ts.dt.dayofyear
    df["week_of_year"] = ts.dt.isocalendar().week.astype(int)
    df["is_weekend"] = df["weekday"].isin([5, 6]).astype(int)

    return df


def add_price_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df = df.sort_values("timestamp_utc").reset_index(drop=True)

    df["price_lag_15m"] = df["dayahead_price"].shift(1)
    df["price_lag_1h"] = df["dayahead_price"].shift(4)
    df["price_lag_24h"] = df["dayahead_price"].shift(96)

    shifted_price = df["dayahead_price"].shift(1)

    df["price_avg_1h"] = (
        shifted_price
        .rolling(window=4, min_periods=1)
        .mean()
    )

    df["price_avg_4h"] = (
        shifted_price
        .rolling(window=16, min_periods=1)
        .mean()
    )

    df["price_avg_24h"] = (
        shifted_price
        .rolling(window=96, min_periods=1)
        .mean()
    )

    return df


if __name__ == "__main__":
    df = load_market_15m()
    df = add_calendar_features(df)
    df = add_price_features(df)

    print(df.head(10))

    print("\nColumns:")
    print(df.columns.tolist())

    print("\nRows:")
    print(len(df))

    print("\nMissing values in new price features:")
    print(df[[
        "price_lag_15m",
        "price_lag_1h",
        "price_lag_24h",
        "price_avg_1h",
        "price_avg_4h",
        "price_avg_24h",
    ]].isna().sum())