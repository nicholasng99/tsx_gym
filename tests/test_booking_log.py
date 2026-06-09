import json
import unittest
from pathlib import Path
from unittest.mock import patch


class TestBookingLog(unittest.TestCase):
    def _make_log_path(self, tmp_path: Path) -> str:
        return str(tmp_path / "bookings.json")

    # ------------------------------------------------------------------
    # record_booking
    # ------------------------------------------------------------------

    def test_record_booking_creates_file_when_absent(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            log_path = str(Path(tmp) / "bookings.json")
            with patch.dict("booking_log.os.environ", {"BOOKINGS_FILE": log_path}):
                from booking_log import record_booking

                record_booking("2026-06-20", "11.00am to 1.00pm")

            records = json.loads(Path(log_path).read_text())
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0]["date"], "2026-06-20")
            self.assertEqual(records[0]["time_slot"], "11.00am to 1.00pm")
            self.assertIn("booked_at", records[0])

    def test_record_booking_appends_to_existing_file(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            log_path = str(Path(tmp) / "bookings.json")
            # Pre-populate with one record
            Path(log_path).write_text(
                json.dumps([{"date": "2026-06-10", "time_slot": "7.00am to 9.00am", "booked_at": "2026-06-01T00:00:00+00:00"}])
            )
            with patch.dict("booking_log.os.environ", {"BOOKINGS_FILE": log_path}):
                from booking_log import record_booking

                record_booking("2026-06-20", "4.00pm to 6.00pm")

            records = json.loads(Path(log_path).read_text())
            self.assertEqual(len(records), 2)
            self.assertEqual(records[1]["date"], "2026-06-20")
            self.assertEqual(records[1]["time_slot"], "4.00pm to 6.00pm")

    def test_record_booking_stores_utc_timestamp(self) -> None:
        import tempfile
        from datetime import timezone

        with tempfile.TemporaryDirectory() as tmp:
            log_path = str(Path(tmp) / "bookings.json")
            with patch.dict("booking_log.os.environ", {"BOOKINGS_FILE": log_path}):
                from booking_log import record_booking

                record_booking("2026-06-20", "9.00am to 11.00am")

            record = json.loads(Path(log_path).read_text())[0]
            # booked_at must be a valid ISO 8601 string with timezone info
            from datetime import datetime

            dt = datetime.fromisoformat(record["booked_at"])
            self.assertIsNotNone(dt.tzinfo)

    # ------------------------------------------------------------------
    # get_bookings
    # ------------------------------------------------------------------

    def test_get_bookings_returns_empty_list_when_no_file(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            log_path = str(Path(tmp) / "nonexistent.json")
            with patch.dict("booking_log.os.environ", {"BOOKINGS_FILE": log_path}):
                from booking_log import get_bookings

                result = get_bookings()

        self.assertEqual(result, [])

    def test_get_bookings_returns_all_records(self) -> None:
        import tempfile

        records = [
            {"date": "2026-06-10", "time_slot": "7.00am to 9.00am", "booked_at": "2026-06-01T00:00:00+00:00"},
            {"date": "2026-06-15", "time_slot": "6.00pm to 8.00pm", "booked_at": "2026-06-02T00:00:00+00:00"},
        ]
        with tempfile.TemporaryDirectory() as tmp:
            log_path = str(Path(tmp) / "bookings.json")
            Path(log_path).write_text(json.dumps(records))
            with patch.dict("booking_log.os.environ", {"BOOKINGS_FILE": log_path}):
                from booking_log import get_bookings

                result = get_bookings()

        self.assertEqual(result, records)

    # ------------------------------------------------------------------
    # round-trip
    # ------------------------------------------------------------------

    def test_record_then_retrieve_round_trip(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            log_path = str(Path(tmp) / "bookings.json")
            with patch.dict("booking_log.os.environ", {"BOOKINGS_FILE": log_path}):
                from booking_log import get_bookings, record_booking

                record_booking("2026-07-01", "1.00pm to 3.00pm")
                record_booking("2026-07-02", "9.00am to 11.00am")
                result = get_bookings()

        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["date"], "2026-07-01")
        self.assertEqual(result[0]["time_slot"], "1.00pm to 3.00pm")
        self.assertEqual(result[1]["date"], "2026-07-02")
        self.assertEqual(result[1]["time_slot"], "9.00am to 11.00am")


if __name__ == "__main__":
    unittest.main()
