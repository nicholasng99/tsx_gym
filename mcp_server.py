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

    return {
        "ok": result.success,
        "message": result.message,
        "status_code": result.status_code,
        "date": date,
        "time_slot": time_slot,
        "used": "TSX_URL",
    }


if __name__ == "__main__":
    mcp.run()