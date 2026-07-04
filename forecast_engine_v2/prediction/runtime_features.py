from datetime import datetime, timezone
from pathlib import Path
import sys

import pandas as pd


CURRENT_DIR = Path(__file__).resolve().parent
sys.path.append(str(CURRENT_DIR))


from feature_columns import FEATURE_COLUMNS


def build_target_timestamps(periods=96):
    now = datetime.now(timezone.utc)
    start = pd.Timestamp(now).ceil("15min")

    return pd.DataFrame({
        "timestamp_utc": pd.date_range(
            start=start,
            periods=periods,
            freq="15min",
            tz="UTC",
        )
    })


def add_calendar_features(df):
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


def add_runtime_price_features(target_df, market_history_df):
    target_df = target_df.copy()
    market_history_df = market_history_df.copy()

    market_history_df["timestamp_utc"] = pd.to_datetime(market_history_df["timestamp_utc"], utc=True)
    market_history_df["dayahead_price"] = pd.to_numeric(market_history_df["dayahead_price"], errors="coerce")

    combined = pd.concat([
        market_history_df[["timestamp_utc", "dayahead_price"]],
       target_df[["timestamp_utc"]].assign(dayahead_price=float("nan")),
    ], ignore_index=True)

    combined["dayahead_price"] = pd.to_numeric(
    combined["dayahead_price"],
    errors="coerce",
)

    combined["price_lag_15m"] = combined["dayahead_price"].shift(1)
    combined["price_lag_1h"] = combined["dayahead_price"].shift(4)
    combined["price_lag_24h"] = combined["dayahead_price"].shift(96)

    shifted_price = combined["dayahead_price"].shift(1)

    combined["price_avg_1h"] = shifted_price.rolling(window=4, min_periods=1).mean()
    combined["price_avg_4h"] = shifted_price.rolling(window=16, min_periods=1).mean()
    combined["price_avg_24h"] = shifted_price.rolling(window=96, min_periods=1).mean()

    result = combined[combined["timestamp_utc"].isin(target_df["timestamp_utc"])].copy()

    return target_df.merge(
        result[[
            "timestamp_utc",
            "price_lag_15m",
            "price_lag_1h",
            "price_lag_24h",
            "price_avg_1h",
            "price_avg_4h",
            "price_avg_24h",
        ]],
        on="timestamp_utc",
        how="left",
    )


def add_market_period_features(df):
    df = df.copy()

    df["is_night"] = df["hour"].between(0, 5).astype(int)
    df["is_morning_ramp"] = df["hour"].between(6, 9).astype(int)
    df["is_solar_hours"] = df["hour"].between(10, 16).astype(int)
    df["is_evening_peak"] = df["hour"].between(17, 22).astype(int)

    return df


def merge_asof_hourly(df, source_df, columns, tolerance="1h"):
    df = df.copy().sort_values("timestamp_utc").reset_index(drop=True)
    source_df = source_df.copy()

    source_df["timestamp_utc"] = pd.to_datetime(source_df["timestamp_utc"], utc=True)
    source_df = source_df[["timestamp_utc"] + columns]
    source_df = source_df.sort_values("timestamp_utc").reset_index(drop=True)

    return pd.merge_asof(
        df,
        source_df,
        on="timestamp_utc",
        direction="backward",
        tolerance=pd.Timedelta(tolerance),
    )


def add_weather_features(df, weather_df):
    df = merge_asof_hourly(
        df,
        weather_df,
        [
            "temperature_c",
            "wind_speed_ms",
            "direct_radiation",
            "shortwave_radiation",
        ],
        tolerance="1h",
    )

    df["solar_radiation_total"] = df["direct_radiation"] + df["shortwave_radiation"]
    df["solar_radiation_ratio"] = df["direct_radiation"] / df["shortwave_radiation"]
    df.loc[df["shortwave_radiation"] == 0, "solar_radiation_ratio"] = 0
    df["is_high_solar_radiation"] = (df["shortwave_radiation"] >= 500).astype(int)

    return df


def add_generation_features(df, generation_df):
    df = merge_asof_hourly(
        df,
        generation_df,
        ["generation_forecast_mw"],
        tolerance="1h",
    )

    df["generation_margin_mw"] = df["generation_forecast_mw"] - df["eso_load_forecast_mw"]
    df["generation_to_load_ratio"] = df["generation_forecast_mw"] / df["eso_load_forecast_mw"]

    return df


def add_solar_empirical_features(df, solar_df):
    df = df.copy()
    solar_df = solar_df.copy()

    df["radiation_bucket"] = ((df["shortwave_radiation"].fillna(0) // 100) * 100).astype(int)
    df["temperature_bucket"] = ((df["temperature_c"].fillna(0) // 10) * 10).astype(int)

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


def build_runtime_features(runtime_data, periods=96):
    df = build_target_timestamps(periods=periods)

    df = add_calendar_features(df)
    df = add_runtime_price_features(df, runtime_data["market_history"])
    df = add_market_period_features(df)

    df = merge_asof_hourly(
        df,
        runtime_data["eso_load"],
        ["eso_load_forecast_mw"],
        tolerance="1h",
    )

    df = add_generation_features(df, runtime_data["generation"])

    df = merge_asof_hourly(
        df,
        runtime_data["crossborder"],
        ["scheduled_import_mw", "scheduled_export_mw", "net_import_mw"],
        tolerance="15min",
    )

    df = add_weather_features(df, runtime_data["weather"])
    df = add_solar_empirical_features(df, runtime_data["solar"])

    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0

    df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].apply(pd.to_numeric, errors="coerce")
    df[FEATURE_COLUMNS] = df[FEATURE_COLUMNS].fillna(0)

    return df


if __name__ == "__main__":
    from runtime_data_loader import load_all_runtime_data

    runtime_data = load_all_runtime_data()
    features_df = build_runtime_features(runtime_data)

    print("Runtime features rows:", len(features_df))
    print("Runtime features columns:", len(features_df.columns))
    print("Model feature columns:", len(FEATURE_COLUMNS))

    print("\nMissing values in FEATURE_COLUMNS:")
    print(features_df[FEATURE_COLUMNS].isna().sum().sort_values(ascending=False).head(20))

    print("\nSample:")
    print(features_df[["timestamp_utc"] + FEATURE_COLUMNS].head())