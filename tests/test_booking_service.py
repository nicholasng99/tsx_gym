import unittest
from datetime import date, timedelta
from unittest.mock import MagicMock, call, patch

from booking_service import BookingError, SubmissionResult, submit_booking, validate_target_date


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


class TestBookGymSlotRecording(unittest.TestCase):
    """Verify that book_gym_slot records on success but not on failure."""

    _FUTURE_DATE = (date.today() + timedelta(days=7)).strftime("%Y-%m-%d")
    _TIME_SLOT = "11.00am to 1.00pm"

    @patch("mcp_server.record_booking")
    @patch("mcp_server.submit_booking")
    def test_record_booking_called_on_success(
        self, mock_submit: MagicMock, mock_record: MagicMock
    ) -> None:
        mock_submit.return_value = SubmissionResult(
            success=True, status_code=200, message="Form submitted successfully"
        )

        from mcp_server import book_gym_slot

        result = book_gym_slot(date=self._FUTURE_DATE, time_slot=self._TIME_SLOT)

        self.assertTrue(result["ok"])
        mock_record.assert_called_once_with(self._FUTURE_DATE, self._TIME_SLOT)

    @patch("mcp_server.record_booking")
    @patch("mcp_server.submit_booking")
    def test_record_booking_not_called_on_http_failure(
        self, mock_submit: MagicMock, mock_record: MagicMock
    ) -> None:
        mock_submit.return_value = SubmissionResult(
            success=False, status_code=500, message="Form submission failed with status 500"
        )

        from mcp_server import book_gym_slot

        result = book_gym_slot(date=self._FUTURE_DATE, time_slot=self._TIME_SLOT)

        self.assertFalse(result["ok"])
        mock_record.assert_not_called()

    @patch("mcp_server.record_booking")
    @patch("mcp_server.submit_booking", side_effect=BookingError("bad date"))
    def test_record_booking_not_called_on_booking_error(
        self, mock_submit: MagicMock, mock_record: MagicMock
    ) -> None:
        from mcp_server import book_gym_slot

        result = book_gym_slot(date="not-a-date", time_slot=self._TIME_SLOT)

        self.assertFalse(result["ok"])
        mock_record.assert_not_called()
