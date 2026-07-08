from datetime import datetime, timezone


MODEL_NAME = "xgboost_v1_15m"
MODEL_VERSION = "v1"
HORIZON_INTERVALS = 96


def get_next_run_number(supabase, forecast_date: str) -> int:
    response = (
        supabase
        .table("forecast_runs_15m")
        .select("run_number")
        .eq("forecast_date", forecast_date)
        .eq("model_name", MODEL_NAME)
        .order("run_number", desc=True)
        .limit(1)
        .execute()
    )

    rows = response.data or []

    if not rows:
        return 1

    last_run_number = int(rows[0]["run_number"])

    if last_run_number >= 9:
        raise ValueError(f"All 9 forecast runs already exist for {forecast_date}")

    return last_run_number + 1


def create_forecast_run(supabase):
    forecast_date = datetime.now(timezone.utc).date().isoformat()
    run_number = get_next_run_number(supabase, forecast_date)

    response = (
        supabase
        .table("forecast_runs_15m")
        .insert({
            "forecast_date": forecast_date,
            "run_number": run_number,
            "model_name": MODEL_NAME,
            "model_version": MODEL_VERSION,
            "horizon_intervals": HORIZON_INTERVALS,
            "status": "started",
        })
        .execute()
    )

    rows = response.data or []

    if not rows:
        raise ValueError("Failed to create forecast run")

    return rows[0]["id"], forecast_date, run_number


def complete_forecast_run(supabase, forecast_run_id: str):
    (
        supabase
        .table("forecast_runs_15m")
        .update({
            "status": "completed",
        })
        .eq("id", forecast_run_id)
        .execute()
    )


def fail_forecast_run(supabase, forecast_run_id: str, error_message: str):
    (
        supabase
        .table("forecast_runs_15m")
        .update({
            "status": "failed",
        })
        .eq("id", forecast_run_id)
        .execute()
    )


def build_forecast_result_rows(
    forecast_run_id,
    forecast_date,
    run_number,
    features_df,
    predictions,
):
    rows = []

    for idx, prediction in enumerate(predictions):
        rows.append({
            "forecast_run_id": forecast_run_id,
            "forecast_date": forecast_date,
            "run_number": run_number,
            "target_timestamp_utc": features_df.iloc[idx]["timestamp_utc"].isoformat(),
            "horizon_step": idx + 1,
            "predicted_price_eur_mwh": float(prediction),
            "model_name": MODEL_NAME,
            "model_version": MODEL_VERSION,
        })

    return rows


def insert_forecast_results(supabase, rows):
    if not rows:
        raise ValueError("No forecast result rows to insert")

    response = (
        supabase
        .table("price_forecast_results_15m")
        .insert(rows)
        .execute()
    )

    return response.data or []