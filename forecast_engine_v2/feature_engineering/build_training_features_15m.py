"""
Build training features for Forecast Engine v2.
"""

import sys
from pathlib import Path

import pandas as pd

CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = CURRENT_DIR.parents[0]
sys.path.append(str(PROJECT_DIR))

from feature_engineering.load_training_data import (
    load_eso_load_forecast_hourly,
    load_generation_forecast_hourly,
    load_market_15m,
)


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

    df["price_avg_1h"] = shifted_price.rolling(window=4, min_periods=1).mean()
    df["price_avg_4h"] = shifted_price.rolling(window=16, min_periods=1).mean()
    df["price_avg_24h"] = shifted_price.rolling(window=96, min_periods=1).mean()

    return df


def add_market_period_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    df["is_night"] = df["hour"].between(0, 5).astype(int)
    df["is_morning_ramp"] = df["hour"].between(6, 9).astype(int)
    df["is_solar_hours"] = df["hour"].between(10, 16).astype(int)
    df["is_evening_peak"] = df["hour"].between(17, 22).astype(int)

    return df


def add_eso_load_forecast_features(
    df: pd.DataFrame,
    eso_load_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Add ESO hourly load forecast to 15-minute market rows.

    Hourly forecast values are only valid up to 1 hour backward.
    If there is a longer data gap, the feature remains NaN.
    """
    df = df.copy()
    df = df.sort_values("timestamp_utc").reset_index(drop=True)

    eso_load_df = eso_load_df.copy()
    eso_load_df = eso_load_df[["timestamp_utc", "eso_load_forecast_mw"]]
    eso_load_df = eso_load_df.sort_values("timestamp_utc").reset_index(drop=True)

    merged = pd.merge_asof(
        df,
        eso_load_df,
        on="timestamp_utc",
        direction="backward",
        tolerance=pd.Timedelta("1h"),
    )

    return merged


def add_generation_forecast_features(
    df: pd.DataFrame,
    generation_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Add ENTSO-E hourly generation forecast to 15-minute market rows.

    Hourly forecast values are only valid up to 1 hour backward.

    Also calculate:
    - generation_margin_mw = generation_forecast_mw - eso_load_forecast_mw
    - generation_to_load_ratio = generation_forecast_mw / eso_load_forecast_mw
    """
    df = df.copy()
    df = df.sort_values("timestamp_utc").reset_index(drop=True)

    generation_df = generation_df.copy()
    generation_df = generation_df[["timestamp_utc", "generation_forecast_mw"]]
    generation_df = generation_df.sort_values("timestamp_utc").reset_index(drop=True)

    merged = pd.merge_asof(
        df,
        generation_df,
        on="timestamp_utc",
        direction="backward",
        tolerance=pd.Timedelta("1h"),
    )

    merged["generation_margin_mw"] = (
        merged["generation_forecast_mw"] - merged["eso_load_forecast_mw"]
    )

    merged["generation_to_load_ratio"] = (
        merged["generation_forecast_mw"] / merged["eso_load_forecast_mw"]
    )

    return merged


if __name__ == "__main__":
    df = load_market_15m()

    df = add_calendar_features(df)
    df = add_price_features(df)
    df = add_market_period_features(df)

    eso_load_df = load_eso_load_forecast_hourly()
    df = add_eso_load_forecast_features(df, eso_load_df)

    generation_df = load_generation_forecast_hourly()
    df = add_generation_forecast_features(df, generation_df)

    print(df.head(10))

    print("\nColumns:")
    print(df.columns.tolist())

    print("\nRows:")
    print(len(df))

    print("\nMissing values in price features:")
    print(df[[
        "price_lag_15m",
        "price_lag_1h",
        "price_lag_24h",
        "price_avg_1h",
        "price_avg_4h",
        "price_avg_24h",
    ]].isna().sum())

    print("\nMissing values in fundamental features:")
    print(df[[
        "eso_load_forecast_mw",
        "generation_forecast_mw",
        "generation_margin_mw",
        "generation_to_load_ratio",
    ]].isna().sum())

    print("\nFundamental feature coverage inside 15m features:")
    for col in [
        "eso_load_forecast_mw",
        "generation_forecast_mw",
        "generation_margin_mw",
        "generation_to_load_ratio",
    ]:
        print(
            col,
            "first:",
            df[col].first_valid_index(),
            "last:",
            df[col].last_valid_index(),
        )

    print("\nSample fundamental rows:")
    print(df[[
        "timestamp_utc",
        "dayahead_price",
        "eso_load_forecast_mw",
        "generation_forecast_mw",
        "generation_margin_mw",
        "generation_to_load_ratio",
    ]].dropna().head(30))