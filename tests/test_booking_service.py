import unittest
from datetime import date, timedelta
from unittest.mock import MagicMock, patch

from booking_service import BookingError, submit_booking, validate_target_date


class TestBookingService(unittest.TestCase):
    def test_validate_target_date_rejects_invalid_format(self) -> None:
        with self.assertRaises(BookingError):
            validate_target_date("09-06-2026")

    def test_validate_target_date_rejects_past_date(self) -> None:
        yesterday = (date.today() - timedelta(days=1)).strftime("%Y-%m-%d")
        with self.assertRaises(BookingError):
            validate_target_date(yesterday)

    @patch("booking_service.requests.post")
    def test_submit_booking_success_maps_payload(self, mock_post: MagicMock) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "ok"
        mock_post.return_value = mock_response

        future_date = (date.today() + timedelta(days=7)).strftime("%Y-%m-%d")
        with patch.dict(
            "booking_service.os.environ",
            {
                "NAME": "Test User",
                "EMAIL": "test@example.com",
                "COMPANY": "TSX",
                "PHONE": "12345678",
                "TSX_URL": "https://example.com/form",
            },
            clear=True,
        ):
            result = submit_booking(
                target_date=future_date,
                time_slot="11.00am to 1.00pm",
                use_mock_url=False,
            )

        self.assertTrue(result.success)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(mock_post.call_count, 1)
        _, kwargs = mock_post.call_args
        self.assertEqual(kwargs["data"]["entry.1608810612"], future_date)
        self.assertEqual(kwargs["data"]["entry.1474718058"], "11.00am to 1.00pm")

    def test_submit_booking_fails_when_env_missing(self) -> None:
        future_date = (date.today() + timedelta(days=7)).strftime("%Y-%m-%d")
        with patch.dict(
            "booking_service.os.environ",
            {
                "TSX_URL": "https://example.com/form",
            },
            clear=True,
        ):
            with self.assertRaises(BookingError):
                submit_booking(
                    target_date=future_date,
                    time_slot="11.00am to 1.00pm",
                )


if __name__ == "__main__":
    unittest.main()
