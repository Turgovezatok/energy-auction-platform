"""
Forecast Engine v2 - shared configuration.
Do not store secrets directly in this file.
Use environment variables for Supabase credentials.
"""

import os
from pathlib import Path

from dotenv import load_dotenv


# Project paths
BASE_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BASE_DIR / "models"
LOGS_DIR = BASE_DIR / "logs"

# Repository root (energy-auction-platform)
REPO_DIR = BASE_DIR.parent

# Load environment variables from .env
load_dotenv(REPO_DIR / ".env")


# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


# Time settings
TIMEZONE = "UTC"
FREQUENCY = "15min"


# Core tables
TABLE_MARKET_15M = "energy_market_data_15m"
TABLE_FEATURES_15M = "forecast_features_15m"


# Rolling windows in 15-minute steps
ROLLING_1H = 4
ROLLING_4H = 16
ROLLING_24H = 96
