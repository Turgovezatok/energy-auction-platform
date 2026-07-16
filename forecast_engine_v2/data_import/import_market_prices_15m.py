"""
Import ENTSO-E Day-Ahead prices for Bulgaria into energy_market_data_15m.

The script:
- requests A44 Day-Ahead prices from ENTSO-E;
- parses PT15M and PT60M resolutions;
- keeps true PT15M values unchanged;
- expands PT60M values only when 15-minute values are unavailable;
- validates the result;
- upserts into Supabase by timestamp_utc.

Required environment variables:
- ENTSOE_API_TOKEN
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import argparse
import os
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import requests
from dotenv import load_dotenv
from supabase import Client, create_client


CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = CURRENT_DIR.parents[0]

# Load the project .env file.
ENV_ROOT = PROJECT_DIR.parent
ENV_FILE = ENV_ROOT / ".env"
ENV_LOCAL_FILE = ENV_ROOT / ".env.local"

if ENV_FILE.exists():
    load_dotenv(ENV_FILE, override=True)
elif ENV_LOCAL_FILE.exists():
    load_dotenv(ENV_LOCAL_FILE, override=True)

ENTSOE_API_URL = "https://web-api.tp.entsoe.eu/api"
BULGARIA_BIDDING_ZONE = "10YCA-BULGARIA-R"
TARGET_TABLE = "energy_market_data_15m"

ENTSOE_API_TOKEN = os.getenv("ENTSOE_API_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


def require_environment() -> None:
    missing: list[str] = []

    if not ENTSOE_API_TOKEN:
        missing.append("ENTSOE_API_TOKEN")
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_SERVICE_ROLE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")

    if missing:
        raise RuntimeError(
            "Missing required environment variables: " + ", ".join(missing)
        )


def get_supabase_client() -> Client:
    require_environment()
    return create_client(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
    )


def format_entsoe_datetime(value: datetime) -> str:
    value = value.astimezone(timezone.utc)
    return value.strftime("%Y%m%d%H%M")


def request_entsoe_prices(
    period_start: datetime,
    period_end: datetime,
) -> str:
    require_environment()

    params = {
        "securityToken": ENTSOE_API_TOKEN,
        "documentType": "A44",
        "in_Domain": BULGARIA_BIDDING_ZONE,
        "out_Domain": BULGARIA_BIDDING_ZONE,
        "periodStart": format_entsoe_datetime(period_start),
        "periodEnd": format_entsoe_datetime(period_end),
    }

    print("\nRequesting ENTSO-E Day-Ahead prices")
    print(f"From: {period_start.isoformat()}")
    print(f"To:   {period_end.isoformat()}")

    response = requests.get(
        ENTSOE_API_URL,
        params=params,
        timeout=90,
    )

    if response.status_code != 200:
        raise RuntimeError(
            f"ENTSO-E request failed: HTTP {response.status_code}\n"
            f"{response.text[:2000]}"
        )

    if not response.text.strip():
        raise RuntimeError("ENTSO-E returned an empty response")

    return response.text


def strip_namespace(tag: str) -> str:
    return tag.split("}", 1)[-1]


def direct_child_text(
    element: ET.Element,
    child_name: str,
) -> str | None:
    for child in element:
        if strip_namespace(child.tag) == child_name:
            return child.text
    return None


def nested_child_text(
    element: ET.Element,
    child_name: str,
) -> str | None:
    for child in element.iter():
        if strip_namespace(child.tag) == child_name:
            return child.text
    return None


def resolution_to_timedelta(resolution: str) -> timedelta:
    mapping = {
        "PT15M": timedelta(minutes=15),
        "PT30M": timedelta(minutes=30),
        "PT60M": timedelta(hours=1),
        "PT1H": timedelta(hours=1),
    }

    if resolution not in mapping:
        raise ValueError(f"Unsupported ENTSO-E resolution: {resolution}")

    return mapping[resolution]


def parse_entsoe_prices(xml_text: str) -> pd.DataFrame:
    root = ET.fromstring(xml_text)

    rows: list[dict[str, Any]] = []

    time_series_elements = [
        element
        for element in root.iter()
        if strip_namespace(element.tag) == "TimeSeries"
    ]

    if not time_series_elements:
        reason = nested_child_text(root, "text")
        raise RuntimeError(
            "No TimeSeries found in ENTSO-E response. "
            f"Reason: {reason or 'unknown'}"
        )

    for time_series in time_series_elements:
        for period in time_series:
            if strip_namespace(period.tag) != "Period":
                continue

            period_start_text: str | None = None
            resolution: str | None = None
            points: list[ET.Element] = []

            for child in period:
                child_name = strip_namespace(child.tag)

                if child_name == "timeInterval":
                    period_start_text = nested_child_text(child, "start")
                elif child_name == "resolution":
                    resolution = child.text
                elif child_name == "Point":
                    points.append(child)

            if not period_start_text or not resolution:
                continue

            period_start = pd.Timestamp(period_start_text)

            if period_start.tzinfo is None:
                period_start = period_start.tz_localize("UTC")
            else:
                period_start = period_start.tz_convert("UTC")

            step = resolution_to_timedelta(resolution)

            period_end_text = None
            for child in period:
                if strip_namespace(child.tag) == "timeInterval":
                    period_end_text = nested_child_text(child, "end")
                    break

            if not period_end_text:
                continue

            period_end = pd.Timestamp(period_end_text)
            if period_end.tzinfo is None:
                period_end = period_end.tz_localize("UTC")
            else:
                period_end = period_end.tz_convert("UTC")

            point_values: dict[int, float] = {}

            for point in points:
                position_text = direct_child_text(point, "position")
                price_text = direct_child_text(point, "price.amount")

                if position_text is None or price_text is None:
                    continue

                point_values[int(position_text)] = float(price_text)

            if not point_values:
                continue

            total_positions = int(
                (period_end - period_start) / pd.Timedelta(step)
            )

            current_price: float | None = None

            for position in range(1, total_positions + 1):
                if position in point_values:
                    current_price = point_values[position]

                if current_price is None:
                    raise RuntimeError(
                        "A03 variable-block series does not contain "
                        f"an initial price at position 1 for period "
                        f"{period_start} -> {period_end}"
                    )

                timestamp = (
                    period_start
                    + (position - 1) * step
                )

                rows.append(
                    {
                        "timestamp_utc": timestamp,
                        "dayahead_price": current_price,
                        "resolution": resolution,
                    }
                )

    df = pd.DataFrame(rows)

    if df.empty:
        raise RuntimeError("No price rows parsed from ENTSO-E XML")

    df["timestamp_utc"] = pd.to_datetime(
        df["timestamp_utc"],
        utc=True,
    )
    df["dayahead_price"] = pd.to_numeric(
        df["dayahead_price"],
        errors="coerce",
    )

    df = df.dropna(
        subset=["timestamp_utc", "dayahead_price"],
    )
    df = df.sort_values("timestamp_utc").reset_index(drop=True)

    return df


def normalize_to_15_minutes(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    resolutions = set(df["resolution"].dropna().unique())

    if "PT15M" in resolutions:
        result = df[df["resolution"] == "PT15M"].copy()
    else:
        hourly_df = df[
            df["resolution"].isin({"PT60M", "PT1H"})
        ].copy()

        if hourly_df.empty:
            raise RuntimeError(
                f"No supported price resolution found: {sorted(resolutions)}"
            )

        expanded_parts: list[pd.DataFrame] = []

        for minute_offset in (0, 15, 30, 45):
            part = hourly_df.copy()
            part["timestamp_utc"] = (
                part["timestamp_utc"]
                + pd.Timedelta(minutes=minute_offset)
            )
            expanded_parts.append(part)

        result = pd.concat(
            expanded_parts,
            ignore_index=True,
        )

    result = result[
        ["timestamp_utc", "dayahead_price"]
    ].copy()

    result = result.drop_duplicates(
        subset=["timestamp_utc"],
        keep="last",
    )
    result = result.sort_values(
        "timestamp_utc"
    ).reset_index(drop=True)

    return result


def validate_prices(df: pd.DataFrame) -> None:
    if df.empty:
        raise RuntimeError("Price dataframe is empty")

    duplicate_count = int(
        df["timestamp_utc"].duplicated().sum()
    )
    missing_price_count = int(
        df["dayahead_price"].isna().sum()
    )

    if duplicate_count:
        raise RuntimeError(
            f"Duplicate timestamps found: {duplicate_count}"
        )

    if missing_price_count:
        raise RuntimeError(
            f"Missing prices found: {missing_price_count}"
        )

    expected = pd.date_range(
        start=df["timestamp_utc"].min(),
        end=df["timestamp_utc"].max(),
        freq="15min",
        tz="UTC",
    )
    actual = pd.DatetimeIndex(df["timestamp_utc"])
    missing_intervals = expected.difference(actual)

    print("\nValidation")
    print(f"Rows: {len(df)}")
    print(f"First timestamp: {df['timestamp_utc'].min()}")
    print(f"Last timestamp:  {df['timestamp_utc'].max()}")
    print(f"Minimum price: {df['dayahead_price'].min():.2f}")
    print(f"Maximum price: {df['dayahead_price'].max():.2f}")
    print(f"Missing intervals: {len(missing_intervals)}")

    if len(missing_intervals) > 0:
        print("First missing intervals:")
        print(missing_intervals[:20])
        raise RuntimeError(
            "Missing 15-minute intervals detected"
        )


def dataframe_to_records(
    df: pd.DataFrame,
) -> list[dict[str, Any]]:
    updated_at = datetime.now(timezone.utc).isoformat()

    return [
        {
            "timestamp_utc": row.timestamp_utc.isoformat(),
            "dayahead_price": float(row.dayahead_price),
            "updated_at": updated_at,
        }
        for row in df.itertuples(index=False)
    ]


def upsert_prices(
    df: pd.DataFrame,
    batch_size: int = 500,
) -> None:
    supabase = get_supabase_client()
    records = dataframe_to_records(df)

    print(
        f"\nUpserting {len(records)} rows into {TARGET_TABLE}"
    )

    for start in range(0, len(records), batch_size):
        batch = records[start:start + batch_size]

        (
            supabase
            .table(TARGET_TABLE)
            .upsert(
                batch,
                on_conflict="timestamp_utc",
            )
            .execute()
        )

        print(
            f"Upserted rows {start + 1}-"
            f"{start + len(batch)}"
        )


def verify_database(
    start_timestamp: pd.Timestamp,
    end_timestamp: pd.Timestamp,
) -> None:
    supabase = get_supabase_client()

    response = (
        supabase
        .table(TARGET_TABLE)
        .select("timestamp_utc, dayahead_price")
        .gte(
            "timestamp_utc",
            start_timestamp.isoformat(),
        )
        .lte(
            "timestamp_utc",
            end_timestamp.isoformat(),
        )
        .order("timestamp_utc", desc=False)
        .execute()
    )

    rows = response.data or []

    print("\nDatabase verification")
    print(f"Rows found: {len(rows)}")

    if rows:
        print(f"First row: {rows[0]}")
        print(f"Last row:  {rows[-1]}")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Import ENTSO-E Day-Ahead prices into "
            "energy_market_data_15m"
        )
    )

    parser.add_argument(
        "--start",
        help="UTC start date YYYY-MM-DD",
    )
    parser.add_argument(
        "--end",
        help="UTC end date YYYY-MM-DD, exclusive",
    )
    parser.add_argument(
        "--days-back",
        type=int,
        default=3,
        help="Days back when --start/--end are omitted",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Download and validate without writing",
    )

    return parser.parse_args()


def resolve_period(
    args: argparse.Namespace,
) -> tuple[datetime, datetime]:
    if args.start and args.end:
        period_start = datetime.strptime(
            args.start,
            "%Y-%m-%d",
        ).replace(tzinfo=timezone.utc)

        period_end = datetime.strptime(
            args.end,
            "%Y-%m-%d",
        ).replace(tzinfo=timezone.utc)

    elif args.start or args.end:
        raise ValueError(
            "--start and --end must be supplied together"
        )

    else:
        now = datetime.now(timezone.utc)
        current_utc_day = now.replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )

        period_start = (
            current_utc_day
            - timedelta(days=args.days_back)
        )
        period_end = (
            current_utc_day
            + timedelta(days=2)
        )

    if period_end <= period_start:
        raise ValueError("End date must be after start date")

    return period_start, period_end


def main() -> None:
    args = parse_arguments()
    period_start, period_end = resolve_period(args)

    xml_text = request_entsoe_prices(
        period_start=period_start,
        period_end=period_end,
    )

    raw_df = parse_entsoe_prices(xml_text)

    print("\nSource resolutions")
    print(
        raw_df["resolution"]
        .value_counts(dropna=False)
        .to_string()
    )

    prices_df = normalize_to_15_minutes(raw_df)

    prices_df = prices_df[
        (prices_df["timestamp_utc"] >= period_start)
        & (prices_df["timestamp_utc"] < period_end)
    ].copy()

    validate_prices(prices_df)

    print("\nFirst rows")
    print(prices_df.head(8).to_string(index=False))

    print("\nLast rows")
    print(prices_df.tail(8).to_string(index=False))

    if args.dry_run:
        print(
            "\nDry run completed. "
            "No database writes performed."
        )
        return

    upsert_prices(prices_df)

    verify_database(
        start_timestamp=prices_df["timestamp_utc"].min(),
        end_timestamp=prices_df["timestamp_utc"].max(),
    )

    print(
        "\nENTSO-E 15-minute price import "
        "completed successfully."
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        sys.exit(1)