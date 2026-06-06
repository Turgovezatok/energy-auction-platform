import os
from datetime import date, timedelta

import holidays
from dotenv import load_dotenv
from supabase import create_client


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise Exception("Missing Supabase environment variables")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

bg_holidays = holidays.BG(years=range(2016, 2036))

start_date = date(2016, 1, 1)
end_date = date(2035, 12, 31)

records = []

current = start_date

while current <= end_date:
    is_weekend = current.weekday() in [5, 6]
    is_holiday = current in bg_holidays

    records.append({
        "date": current.isoformat(),
        "country": "BG",
        "holiday_name": bg_holidays.get(current),
        "is_holiday": is_holiday,
        "is_weekend": is_weekend,
        "is_bridge_day": False,
    })

    current += timedelta(days=1)

supabase.table("holiday_calendar").upsert(
    records,
    on_conflict="date"
).execute()

print(f"Uploaded {len(records)} calendar days.")
