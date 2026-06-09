import json
import os
from datetime import datetime, timezone
from pathlib import Path

_DEFAULT_LOG_FILE = Path(__file__).parent / "bookings.json"


def _log_file_path() -> Path:
    env_path = os.getenv("BOOKINGS_FILE", "").strip()
    return Path(env_path) if env_path else _DEFAULT_LOG_FILE


def record_booking(date: str, time_slot: str) -> None:
    """Append a successful booking record to the log file."""
    log_file = _log_file_path()

    records: list[dict] = []
    if log_file.exists():
        with log_file.open("r", encoding="utf-8") as f:
            records = json.load(f)

    records.append(
        {
            "date": date,
            "time_slot": time_slot,
            "booked_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    with log_file.open("w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)


def get_bookings() -> list[dict]:
    """Return all recorded bookings from the log file."""
    log_file = _log_file_path()

    if not log_file.exists():
        return []

    with log_file.open("r", encoding="utf-8") as f:
        return json.load(f)
