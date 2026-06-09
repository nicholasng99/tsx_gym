from booking_log import get_bookings, record_booking
from booking_service import BOOKING_TIME_SLOTS, BookingError, submit_booking
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("tsx-gym-booker")


@mcp.tool(
    name="book_gym_slot",
    description=(
        "Submit a TSX gym booking Google Form for one explicit date and one allowed time slot. "
        "Personal details are loaded from environment variables only."
    ),
)
def book_gym_slot(date: str, time_slot: str = "11.00am to 1.00pm") -> dict:
    try:
        result = submit_booking(
            target_date=date,
            time_slot=time_slot,
        )
    except BookingError as exc:
        return {
            "ok": False,
            "error": str(exc),
            "allowed_time_slots": list(BOOKING_TIME_SLOTS),
        }

    response = {
        "ok": result.success,
        "message": result.message,
        "status_code": result.status_code,
        "date": date,
        "time_slot": time_slot,
        "used": "TSX_URL",
    }

    if result.success:
        record_booking(date, time_slot)

    return response


@mcp.tool(
    name="get_booked_slots",
    description="Return all previously booked gym slots stored in the local booking log.",
)
def get_booked_slots() -> dict:
    bookings = get_bookings()
    return {
        "count": len(bookings),
        "bookings": bookings,
    }


if __name__ == "__main__":
    mcp.run()