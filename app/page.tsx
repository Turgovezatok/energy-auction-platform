def main():
    now_utc = datetime.now(timezone.utc)

    start_utc = now_utc.replace(minute=0, second=0, microsecond=0) - timedelta(hours=6)
    end_utc = start_utc + timedelta(days=4)

    print("Fetching ENTSO-E generation forecast:")
    print(f"{start_utc.isoformat()} -> {end_utc.isoformat()}")

    xml_text = fetch_generation_forecast(start_utc, end_utc)
    records = parse_generation_forecast(xml_text)

    print(f"Parsed rows: {len(records)}")

    if records:
        print("First row:", records[0])
        print("Last row:", records[-1])

    upload_records(records)

    print("ENTSO-E generation forecast imported successfully.")
