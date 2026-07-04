import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
import pandas as pd
from supabase import create_client


load_dotenv(".env.local")
load_dotenv()


SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_ANON_KEY")
    or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
)

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "Missing Supabase credentials. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY."
    )


supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def _to_dataframe(response):
    data = response.data or []
    return pd.DataFrame(data)


def load_market_history(hours_back=720):
    since = (datetime.now(timezone.utc) - timedelta(hours=hours_back)).isoformat()

    response = (
        supabase
        .table("energy_market_data_15m")
        .select("timestamp_utc, dayahead_price")
        .gte("timestamp_utc", since)
        .order("timestamp_utc", desc=False)
        .execute()
    )

    return _to_dataframe(response)


def load_eso_load_forecast():
    response = (
        supabase
        .table("eso_load_forecast_hourly")
        .select("timestamp_utc, eso_load_forecast_mw")
        .order("timestamp_utc", desc=False)
        .execute()
    )

    return _to_dataframe(response)


def load_generation_forecast():
    response = (
        supabase
        .table("entsoe_generation_forecast_hourly")
        .select("timestamp_utc, generation_forecast_mw")
        .order("timestamp_utc", desc=False)
        .execute()
    )

    return _to_dataframe(response)


def load_weather_forecast():
    response = (
        supabase
        .table("weather_forecast_hourly")
        .select(
            "timestamp_utc, temperature_c, wind_speed_ms, "
            "direct_radiation, shortwave_radiation"
        )
        .order("timestamp_utc", desc=False)
        .execute()
    )

    return _to_dataframe(response)


def load_crossborder_forecast():
    response = (
        supabase
        .table("entsoe_crossborder_exchange")
        .select("timestamp_utc, from_zone, to_zone, flow_type, flow_mw, resolution")
        .eq("flow_type", "scheduled_commercial_exchange")
        .order("timestamp_utc", desc=False)
        .execute()
    )

    raw_df = _to_dataframe(response)

    if raw_df.empty:
        return pd.DataFrame(columns=[
            "timestamp_utc",
            "scheduled_import_mw",
            "scheduled_export_mw",
            "net_import_mw",
        ])

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
    return df.sort_values("timestamp_utc").reset_index(drop=True)


def load_solar_empirical_index(min_samples_count=8):
    response = (
        supabase
        .table("solar_empirical_index_15m_v3")
        .select(
            "month, quarter_hour, radiation_bucket, temperature_bucket, "
            "samples_count, solar_mw_avg, solar_mw_p50, solar_mw_p90"
        )
        .gte("samples_count", min_samples_count)
        .order("month", desc=False)
        .order("quarter_hour", desc=False)
        .order("radiation_bucket", desc=False)
        .order("temperature_bucket", desc=False)
        .execute()
    )

    df = _to_dataframe(response)

    if df.empty:
        return pd.DataFrame(columns=[
            "month",
            "quarter_hour",
            "radiation_bucket",
            "temperature_bucket",
            "solar_samples_count",
            "expected_solar_mw_avg",
            "expected_solar_mw_p50",
            "expected_solar_mw_p90",
        ])

    df = df.rename(columns={
        "samples_count": "solar_samples_count",
        "solar_mw_avg": "expected_solar_mw_avg",
        "solar_mw_p50": "expected_solar_mw_p50",
        "solar_mw_p90": "expected_solar_mw_p90",
    })

    numeric_columns = [
        "month",
        "quarter_hour",
        "radiation_bucket",
        "temperature_bucket",
        "solar_samples_count",
        "expected_solar_mw_avg",
        "expected_solar_mw_p50",
        "expected_solar_mw_p90",
    ]

    for col in numeric_columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df["month"] = df["month"].astype(int)
    df["quarter_hour"] = df["quarter_hour"].astype(int)

    return df.sort_values([
        "month",
        "quarter_hour",
        "radiation_bucket",
        "temperature_bucket",
    ]).reset_index(drop=True)


def load_all_runtime_data():
    return {
        "market_history": load_market_history(),
        "eso_load": load_eso_load_forecast(),
        "generation": load_generation_forecast(),
        "weather": load_weather_forecast(),
        "crossborder": load_crossborder_forecast(),
        "solar": load_solar_empirical_index(),
    }


if __name__ == "__main__":
    data = load_all_runtime_data()

    for name, df in data.items():
        print(f"{name}: {len(df)} rows")
        if not df.empty:
            print(df.head(2))
            print(df.tail(2))
            print()