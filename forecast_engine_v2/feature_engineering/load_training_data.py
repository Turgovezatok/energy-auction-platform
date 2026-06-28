"""
Load and validate historical 15-minute market data for Forecast Engine v2.

This module:
- connects to Supabase
- loads all rows from energy_market_data_15m using pagination
- loads ESO hourly load forecast using pagination
- loads ENTSO-E hourly generation forecast using pagination
- loads and aggregates ENTSO-E cross-border exchange data
- loads Open-Meteo hourly weather forecast
- checks date ranges, row counts, and missing intervals
"""

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


def load_market_15m(page_size: int = 1000, max_rows: int | None = None) -> pd.DataFrame:
    supabase = get_supabase_client()
    all_rows = []
    start = 0

    while True:
        end = start + page_size - 1

        response = (
            supabase
            .table(TABLE_MARKET_15M)
            .select("timestamp_utc, dayahead_price")
            .order("timestamp_utc", desc=False)
            .range(start, end)
            .execute()
        )

        batch = response.data or []
        if not batch:
            break

        all_rows.extend(batch)
        print(f"Loaded market rows: {len(all_rows)}")

        if max_rows is not None and len(all_rows) >= max_rows:
            all_rows = all_rows[:max_rows]
            break

        if len(batch) < page_size:
            break

        start += page_size

    df = pd.DataFrame(all_rows)

    if df.empty:
        raise ValueError(f"No rows loaded from {TABLE_MARKET_15M}")

    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True)
    df["dayahead_price"] = pd.to_numeric(df["dayahead_price"], errors="coerce")
    df = df.drop_duplicates(subset=["timestamp_utc"])
    df = df.sort_values("timestamp_utc").reset_index(drop=True)

    return df


def load_eso_load_forecast_hourly(
    page_size: int = 1000,
    max_rows: int | None = None,
) -> pd.DataFrame:
    supabase = get_supabase_client()
    all_rows = []
    start = 0

    while True:
        end = start + page_size - 1

        response = (
            supabase
            .table("eso_load_forecast_hourly")
            .select("timestamp_utc, eso_load_forecast_mw, created_at")
            .order("timestamp_utc", desc=False)
            .range(start, end)
            .execute()
        )

        batch = response.data or []
        if not batch:
            break

        all_rows.extend(batch)
        print(f"Loaded ESO load forecast rows: {len(all_rows)}")

        if max_rows is not None and len(all_rows) >= max_rows:
            all_rows = all_rows[:max_rows]
            break

        if len(batch) < page_size:
            break

        start += page_size

    df = pd.DataFrame(all_rows)

    if df.empty:
        raise ValueError("No rows loaded from eso_load_forecast_hourly")

    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True)
    df["eso_load_forecast_mw"] = pd.to_numeric(
        df["eso_load_forecast_mw"],
        errors="coerce",
    )
    df = df.drop_duplicates(subset=["timestamp_utc"])
    df = df.sort_values("timestamp_utc").reset_index(drop=True)

    return df


def load_generation_forecast_hourly(
    page_size: int = 1000,
    max_rows: int | None = None,
) -> pd.DataFrame:
    supabase = get_supabase_client()
    all_rows = []
    start = 0

    while True:
        end = start + page_size - 1

        response = (
            supabase
            .table("entsoe_generation_forecast_hourly")
            .select("timestamp_utc, generation_forecast_mw, created_at")
            .order("timestamp_utc", desc=False)
            .range(start, end)
            .execute()
        )

        batch = response.data or []
        if not batch:
            break

        all_rows.extend(batch)
        print(f"Loaded generation forecast rows: {len(all_rows)}")

        if max_rows is not None and len(all_rows) >= max_rows:
            all_rows = all_rows[:max_rows]
            break

        if len(batch) < page_size:
            break

        start += page_size

    df = pd.DataFrame(all_rows)

    if df.empty:
        raise ValueError("No rows loaded from entsoe_generation_forecast_hourly")

    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True)
    df["generation_forecast_mw"] = pd.to_numeric(
        df["generation_forecast_mw"],
        errors="coerce",
    )
    df = df.drop_duplicates(subset=["timestamp_utc"])
    df = df.sort_values("timestamp_utc").reset_index(drop=True)

    return df


def load_crossborder_exchange_15m(
    page_size: int = 1000,
    max_rows: int | None = None,
) -> pd.DataFrame:
    """
    Load ENTSO-E cross-border exchange data and aggregate it by 15-minute timestamp.

    PT15M rows are used as-is.
    PT60M rows are expanded to +0, +15, +30, +45 minutes.
    """
    supabase = get_supabase_client()
    all_rows = []
    start = 0

    while True:
        end = start + page_size - 1

        response = (
            supabase
            .table("entsoe_crossborder_exchange")
            .select("timestamp_utc, from_zone, to_zone, flow_type, flow_mw, resolution")
            .eq("flow_type", "scheduled_commercial_exchange")
            .order("timestamp_utc", desc=False)
            .range(start, end)
            .execute()
        )

        batch = response.data or []
        if not batch:
            break

        all_rows.extend(batch)
        print(f"Loaded cross-border rows: {len(all_rows)}")

        if max_rows is not None and len(all_rows) >= max_rows:
            all_rows = all_rows[:max_rows]
            break

        if len(batch) < page_size:
            break

        start += page_size

    raw_df = pd.DataFrame(all_rows)

    if raw_df.empty:
        raise ValueError("No rows loaded from entsoe_crossborder_exchange")

    raw_df["timestamp_utc"] = pd.to_datetime(raw_df["timestamp_utc"], utc=True)
    raw_df["flow_mw"] = pd.to_numeric(raw_df["flow_mw"], errors="coerce")

    pt15_df = raw_df[raw_df["resolution"] == "PT15M"].copy()
    pt60_df = raw_df[raw_df["resolution"] == "PT60M"].copy()

    expanded_rows = []

    for minutes in [0, 15, 30, 45]:
        expanded_part = pt60_df.copy()
        expanded_part["timestamp_utc"] = (
            expanded_part["timestamp_utc"] + pd.Timedelta(minutes=minutes)
        )
        expanded_rows.append(expanded_part)

    if expanded_rows:
        expanded_pt60_df = pd.concat(expanded_rows, ignore_index=True)
        normalized_df = pd.concat([pt15_df, expanded_pt60_df], ignore_index=True)
    else:
        normalized_df = pt15_df.copy()

    normalized_df["import_mw"] = normalized_df["flow_mw"].where(
        normalized_df["to_zone"] == "BG",
        0.0,
    )
    normalized_df["export_mw"] = normalized_df["flow_mw"].where(
        normalized_df["from_zone"] == "BG",
        0.0,
    )

    df = (
        normalized_df
        .groupby("timestamp_utc", as_index=False)
        .agg(
            scheduled_import_mw=("import_mw", "sum"),
            scheduled_export_mw=("export_mw", "sum"),
        )
    )

    df["net_import_mw"] = df["scheduled_import_mw"] - df["scheduled_export_mw"]
    df = df.sort_values("timestamp_utc").reset_index(drop=True)

    return df


def load_weather_forecast_hourly(
    page_size: int = 1000,
    max_rows: int | None = None,
) -> pd.DataFrame:
    """
    Load Open-Meteo hourly weather forecast.

    Output columns:
    - timestamp_utc
    - temperature_c
    - wind_speed_ms
    - direct_radiation
    - shortwave_radiation
    """
    supabase = get_supabase_client()
    all_rows = []
    start = 0

    while True:
        end = start + page_size - 1

        response = (
            supabase
            .table("weather_forecast_hourly")
            .select(
                "timestamp_utc, "
                "temperature_c, "
                "wind_speed_ms, "
                "direct_radiation, "
                "shortwave_radiation, "
                "created_at"
            )
            .order("timestamp_utc", desc=False)
            .range(start, end)
            .execute()
        )

        batch = response.data or []
        if not batch:
            break

        all_rows.extend(batch)
        print(f"Loaded weather rows: {len(all_rows)}")

        if max_rows is not None and len(all_rows) >= max_rows:
            all_rows = all_rows[:max_rows]
            break

        if len(batch) < page_size:
            break

        start += page_size

    df = pd.DataFrame(all_rows)

    if df.empty:
        raise ValueError("No rows loaded from weather_forecast_hourly")

    df["timestamp_utc"] = pd.to_datetime(df["timestamp_utc"], utc=True)

    numeric_cols = [
        "temperature_c",
        "wind_speed_ms",
        "direct_radiation",
        "shortwave_radiation",
    ]

    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.drop_duplicates(subset=["timestamp_utc"])
    df = df.sort_values("timestamp_utc").reset_index(drop=True)

    return df




def load_solar_empirical_index_15m_v3(
    page_size: int = 1000,
    max_rows: int | None = None,
    min_samples_count: int = 8,
) -> pd.DataFrame:
    """Load empirical solar generation lookup table."""
    supabase = get_supabase_client()
    all_rows=[]; start=0
    while True:
        end=start+page_size-1
        response=(supabase.table("solar_empirical_index_15m_v3")
            .select("month, quarter_hour, radiation_bucket, temperature_bucket, samples_count, solar_mw_avg, solar_mw_p50, solar_mw_p90")
            .gte("samples_count", min_samples_count)
            .order("month", desc=False)
            .order("quarter_hour", desc=False)
            .order("radiation_bucket", desc=False)
            .order("temperature_bucket", desc=False)
            .range(start,end).execute())
        batch=response.data or []
        if not batch: break
        all_rows.extend(batch)
        print(f"Loaded solar empirical rows: {len(all_rows)}")
        if max_rows is not None and len(all_rows)>=max_rows:
            all_rows=all_rows[:max_rows]; break
        if len(batch)<page_size: break
        start+=page_size
    df=pd.DataFrame(all_rows)
    if df.empty: raise ValueError("No rows loaded from solar_empirical_index_15m_v3")
    for c in ["samples_count","solar_mw_avg","solar_mw_p50","solar_mw_p90","radiation_bucket","temperature_bucket"]:
        df[c]=pd.to_numeric(df[c],errors='coerce')
    df['month']=df['month'].astype(int)
    df['quarter_hour']=df['quarter_hour'].astype(int)
    return df.sort_values(["month","quarter_hour","radiation_bucket","temperature_bucket"]).reset_index(drop=True)

def validate_market_15m(df: pd.DataFrame) -> None:
    min_ts = df["timestamp_utc"].min()
    max_ts = df["timestamp_utc"].max()
    row_count = len(df)

    expected_range = pd.date_range(start=min_ts, end=max_ts, freq="15min", tz="UTC")
    actual_timestamps = pd.DatetimeIndex(df["timestamp_utc"])
    missing = expected_range.difference(actual_timestamps)

    coverage = row_count / len(expected_range) * 100 if len(expected_range) else 0

    print("\n=== energy_market_data_15m validation ===")
    print(f"Rows loaded: {row_count}")
    print(f"Min timestamp: {min_ts}")
    print(f"Max timestamp: {max_ts}")
    print(f"Expected 15m intervals: {len(expected_range)}")
    print(f"Missing 15m intervals: {len(missing)}")
    print(f"Coverage: {coverage:.2f}%")

    if len(missing) > 0:
        print("\nFirst missing intervals:")
        print(missing[:20])


def validate_eso_load_forecast_hourly(df: pd.DataFrame) -> None:
    min_ts = df["timestamp_utc"].min()
    max_ts = df["timestamp_utc"].max()
    row_count = len(df)

    expected_range = pd.date_range(start=min_ts, end=max_ts, freq="h", tz="UTC")
    actual_timestamps = pd.DatetimeIndex(df["timestamp_utc"])
    missing = expected_range.difference(actual_timestamps)

    print("\n=== eso_load_forecast_hourly validation ===")
    print(f"Rows loaded: {row_count}")
    print(f"Min timestamp: {min_ts}")
    print(f"Max timestamp: {max_ts}")
    print(f"Expected hourly intervals: {len(expected_range)}")
    print(f"Missing hourly intervals: {len(missing)}")
    print(f"Missing eso_load_forecast_mw: {df['eso_load_forecast_mw'].isna().sum()}")

    print("\nFirst rows:")
    print(df.head())

    print("\nLast rows:")
    print(df.tail())

    if len(missing) > 0:
        print("\nFirst missing hourly intervals:")
        print(missing[:20])


def validate_generation_forecast_hourly(df: pd.DataFrame) -> None:
    min_ts = df["timestamp_utc"].min()
    max_ts = df["timestamp_utc"].max()
    row_count = len(df)

    expected_range = pd.date_range(start=min_ts, end=max_ts, freq="h", tz="UTC")
    actual_timestamps = pd.DatetimeIndex(df["timestamp_utc"])
    missing = expected_range.difference(actual_timestamps)

    print("\n=== entsoe_generation_forecast_hourly validation ===")
    print(f"Rows loaded: {row_count}")
    print(f"Min timestamp: {min_ts}")
    print(f"Max timestamp: {max_ts}")
    print(f"Expected hourly intervals: {len(expected_range)}")
    print(f"Missing hourly intervals: {len(missing)}")
    print(f"Missing generation_forecast_mw: {df['generation_forecast_mw'].isna().sum()}")

    print("\nFirst rows:")
    print(df.head())

    print("\nLast rows:")
    print(df.tail())

    if len(missing) > 0:
        print("\nFirst missing hourly intervals:")
        print(missing[:20])


def validate_crossborder_exchange_15m(df: pd.DataFrame) -> None:
    min_ts = df["timestamp_utc"].min()
    max_ts = df["timestamp_utc"].max()
    row_count = len(df)

    expected_range = pd.date_range(start=min_ts, end=max_ts, freq="15min", tz="UTC")
    actual_timestamps = pd.DatetimeIndex(df["timestamp_utc"])
    missing = expected_range.difference(actual_timestamps)

    print("\n=== entsoe_crossborder_exchange aggregated validation ===")
    print(f"Rows loaded after aggregation: {row_count}")
    print(f"Min timestamp: {min_ts}")
    print(f"Max timestamp: {max_ts}")
    print(f"Expected 15m intervals: {len(expected_range)}")
    print(f"Missing 15m intervals: {len(missing)}")
    print(f"Missing scheduled_import_mw: {df['scheduled_import_mw'].isna().sum()}")
    print(f"Missing scheduled_export_mw: {df['scheduled_export_mw'].isna().sum()}")
    print(f"Missing net_import_mw: {df['net_import_mw'].isna().sum()}")

    print("\nFirst rows:")
    print(df.head())

    print("\nLast rows:")
    print(df.tail())

    if len(missing) > 0:
        print("\nFirst missing 15m intervals:")
        print(missing[:20])


def validate_weather_forecast_hourly(df: pd.DataFrame) -> None:
    min_ts = df["timestamp_utc"].min()
    max_ts = df["timestamp_utc"].max()

    expected_range = pd.date_range(start=min_ts, end=max_ts, freq="h", tz="UTC")
    actual_timestamps = pd.DatetimeIndex(df["timestamp_utc"])
    missing = expected_range.difference(actual_timestamps)

    print("\n=== weather_forecast_hourly validation ===")
    print(f"Rows loaded: {len(df)}")
    print(f"Min timestamp: {min_ts}")
    print(f"Max timestamp: {max_ts}")
    print(f"Expected hourly intervals: {len(expected_range)}")
    print(f"Missing hourly intervals: {len(missing)}")

    print("\nMissing values:")
    print(df[[
        "temperature_c",
        "wind_speed_ms",
        "direct_radiation",
        "shortwave_radiation",
    ]].isna().sum())

    print("\nFirst rows:")
    print(df.head())

    print("\nLast rows:")
    print(df.tail())

    if len(missing) > 0:
        print("\nFirst missing hourly intervals:")
        print(missing[:20])


if __name__ == "__main__":
    df = load_solar_empirical_index_15m_v3()

    print(df.head())

    print("\nColumns:")
    print(df.columns.tolist())

    print("\nRows:")
    print(len(df))

    print("\nSamples statistics:")
    print(df["samples_count"].describe())

    print("\nSolar statistics:")
    print(df[[
        "solar_mw_avg",
        "solar_mw_p50",
        "solar_mw_p90",
    ]].describe())