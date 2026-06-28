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
    load_crossborder_exchange_15m,
    load_eso_load_forecast_hourly,
    load_generation_forecast_hourly,
    load_market_15m,
    load_solar_empirical_index_15m_v3,
    load_weather_forecast_hourly,
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


def add_crossborder_exchange_features(
    df: pd.DataFrame,
    crossborder_df: pd.DataFrame,
) -> pd.DataFrame:
    df = df.copy()
    df = df.sort_values("timestamp_utc").reset_index(drop=True)

    crossborder_df = crossborder_df.copy()
    crossborder_df = crossborder_df[[
        "timestamp_utc",
        "scheduled_import_mw",
        "scheduled_export_mw",
        "net_import_mw",
    ]]
    crossborder_df = crossborder_df.sort_values("timestamp_utc").reset_index(drop=True)

    merged = pd.merge_asof(
        df,
        crossborder_df,
        on="timestamp_utc",
        direction="backward",
        tolerance=pd.Timedelta("15min"),
    )

    return merged


def add_weather_forecast_features(
    df: pd.DataFrame,
    weather_df: pd.DataFrame,
) -> pd.DataFrame:
    df = df.copy()
    df = df.sort_values("timestamp_utc").reset_index(drop=True)

    weather_df = weather_df.copy()
    weather_df = weather_df[[
        "timestamp_utc",
        "temperature_c",
        "wind_speed_ms",
        "direct_radiation",
        "shortwave_radiation",
    ]]
    weather_df = weather_df.sort_values("timestamp_utc").reset_index(drop=True)

    merged = pd.merge_asof(
        df,
        weather_df,
        on="timestamp_utc",
        direction="backward",
        tolerance=pd.Timedelta("1h"),
    )

    merged["solar_radiation_total"] = (
        merged["direct_radiation"] + merged["shortwave_radiation"]
    )

    merged["solar_radiation_ratio"] = (
        merged["direct_radiation"] / merged["shortwave_radiation"]
    )

    merged.loc[
        merged["shortwave_radiation"] == 0,
        "solar_radiation_ratio",
    ] = 0

    merged["is_high_solar_radiation"] = (
        merged["shortwave_radiation"] >= 500
    ).astype(int)

    return merged


def add_solar_empirical_features(
    df: pd.DataFrame,
    solar_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Add empirical solar generation features based on:
    - month
    - quarter_hour
    - radiation_bucket
    - temperature_bucket
    """
    df = df.copy()

    df["radiation_bucket"] = (
        (df["shortwave_radiation"].fillna(0) // 100) * 100
    ).astype(int)

    df["temperature_bucket"] = (
        (df["temperature_c"].fillna(0) // 10) * 10
    ).astype(int)

    solar_df = solar_df.copy()
    solar_df = solar_df.rename(
        columns={
            "samples_count": "solar_samples_count",
            "solar_mw_avg": "expected_solar_mw_avg",
            "solar_mw_p50": "expected_solar_mw_p50",
            "solar_mw_p90": "expected_solar_mw_p90",
        }
    )

    solar_df = solar_df[[
        "month",
        "quarter_hour",
        "radiation_bucket",
        "temperature_bucket",
        "solar_samples_count",
        "expected_solar_mw_avg",
        "expected_solar_mw_p50",
        "expected_solar_mw_p90",
    ]]

    merged = df.merge(
        solar_df,
        on=[
            "month",
            "quarter_hour",
            "radiation_bucket",
            "temperature_bucket",
        ],
        how="left",
    )

    merged["solar_uncertainty_mw"] = (
        merged["expected_solar_mw_p90"] - merged["expected_solar_mw_p50"]
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

    crossborder_df = load_crossborder_exchange_15m()
    df = add_crossborder_exchange_features(df, crossborder_df)

    weather_df = load_weather_forecast_hourly()
    df = add_weather_forecast_features(df, weather_df)

    solar_df = load_solar_empirical_index_15m_v3()
    df = add_solar_empirical_features(df, solar_df)

    print("\nRows:")
    print(len(df))

    print("\nColumns:")
    print(df.columns.tolist())

    print("\nMissing values in final features:")
    print(df[[
        "eso_load_forecast_mw",
        "generation_forecast_mw",
        "generation_margin_mw",
        "generation_to_load_ratio",
        "scheduled_import_mw",
        "scheduled_export_mw",
        "net_import_mw",
        "temperature_c",
        "wind_speed_ms",
        "direct_radiation",
        "shortwave_radiation",
        "solar_radiation_total",
        "solar_radiation_ratio",
        "is_high_solar_radiation",
        "radiation_bucket",
        "temperature_bucket",
        "expected_solar_mw_avg",
        "expected_solar_mw_p50",
        "expected_solar_mw_p90",
        "solar_samples_count",
        "solar_uncertainty_mw",
    ]].isna().sum())

    print("\nSolar empirical feature coverage:")
    for col in [
        "expected_solar_mw_avg",
        "expected_solar_mw_p50",
        "expected_solar_mw_p90",
        "solar_samples_count",
        "solar_uncertainty_mw",
    ]:
        print(
            col,
            "first:",
            df[col].first_valid_index(),
            "last:",
            df[col].last_valid_index(),
        )

    print("\nSample final rows:")
    print(df[[
        "timestamp_utc",
        "dayahead_price",
        "shortwave_radiation",
        "temperature_c",
        "radiation_bucket",
        "temperature_bucket",
        "expected_solar_mw_avg",
        "expected_solar_mw_p50",
        "expected_solar_mw_p90",
        "solar_samples_count",
        "solar_uncertainty_mw",
    ]].dropna().head(30))