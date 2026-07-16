"""
Run the EnergyBid Forecast Engine v2 production pipeline.

Current safe pipeline:
1. Update ENTSO-E 15-minute Day-Ahead prices.
2. Run the existing 96-interval forecast script.

This wrapper does not modify the forecasting, feature engineering,
run numbering, model loading, or Supabase writing logic.
"""

from __future__ import annotations

import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


CURRENT_DIR = Path(__file__).resolve().parent
FORECAST_ENGINE_DIR = CURRENT_DIR.parent

PRICE_IMPORTER = (
    FORECAST_ENGINE_DIR
    / "data_import"
    / "import_market_prices_15m.py"
)

PREDICTION_SCRIPT = (
    FORECAST_ENGINE_DIR
    / "prediction"
    / "predict_next_96_15m.py"
)


def run_step(
    name: str,
    command: list[str],
    working_directory: Path,
) -> None:
    print("\n" + "=" * 70)
    print(f"START: {name}")
    print(f"UTC time: {datetime.now(timezone.utc).isoformat()}")
    print("Command:", " ".join(command))
    print("=" * 70)

    result = subprocess.run(
        command,
        cwd=working_directory,
        check=False,
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"Pipeline step failed: {name}. "
            f"Exit code: {result.returncode}"
        )

    print(f"\nSUCCESS: {name}")


def main() -> None:
    if not PRICE_IMPORTER.exists():
        raise FileNotFoundError(
            f"Price importer not found: {PRICE_IMPORTER}"
        )

    if not PREDICTION_SCRIPT.exists():
        raise FileNotFoundError(
            f"Prediction script not found: {PREDICTION_SCRIPT}"
        )

    print("\nEnergyBid Forecast Engine v2 pipeline started")
    print(
        "Started at:",
        datetime.now(timezone.utc).isoformat(),
    )

    run_step(
        name="Import ENTSO-E 15-minute prices",
        command=[
            sys.executable,
            str(PRICE_IMPORTER),
            "--days-back",
            "3",
        ],
        working_directory=FORECAST_ENGINE_DIR,
    )

    run_step(
        name="Generate next 96 interval forecast",
        command=[
            sys.executable,
            str(PREDICTION_SCRIPT),
        ],
        working_directory=PREDICTION_SCRIPT.parent,
    )

    print("\n" + "=" * 70)
    print("PIPELINE COMPLETED SUCCESSFULLY")
    print(
        "Finished at:",
        datetime.now(timezone.utc).isoformat(),
    )
    print("=" * 70)


if __name__ == "__main__":
    try:
        main()

    except Exception as exc:
        print(
            f"\nPIPELINE ERROR: {exc}",
            file=sys.stderr,
        )
        sys.exit(1)