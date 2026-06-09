from booking_service import BOOKING_TIME_SLOTS, BookingError, submit_booking


def submit_form(target_date: str, time_slot: str, use_mock_url: bool = False) -> bool:
    """
    Submit the Google Form for a specific date and time slot.

    Args:
        target_date (str): Date in YYYY-MM-DD format.
        time_slot (str): One of the supported booking time slots.
        use_mock_url (bool): If true, submit to MOCK_URL instead of TSX_URL.

    Returns:
        bool: True when submission succeeds, otherwise False.
    """
    try:
        print(f"Submitting form for date: {target_date}, slot: {time_slot}...")
        result = submit_booking(
            target_date=target_date,
            time_slot=time_slot,
            use_mock_url=use_mock_url,
        )
        if result.success:
            print("✅ Form submitted successfully!")
            return True

        print(f"❌ Error submitting form: {result.message}")
        if result.response_text:
            print("Response Text:", result.response_text)
        return False
    except BookingError as exc:
        print(f"❌ Validation error: {exc}")
        return False


__all__ = ["submit_form", "BOOKING_TIME_SLOTS"]
