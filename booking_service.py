import os
from dataclasses import dataclass
from datetime import date, datetime
from enum import StrEnum
from typing import Final

import requests
from dotenv import load_dotenv

load_dotenv()

BOOKING_TIME_SLOTS: Final[tuple[str, ...]] = (
    "7.00am to 9.00am",
    "9.00am to 11.00am",
    "11.00am to 1.00pm",
    "1.00pm to 3.00pm",
    "4.00pm to 6.00pm",
    "6.00pm to 8.00pm",
)

DEFAULT_TIME_SLOT: Final[str] = "11.00am to 1.00pm"


class BookingError(ValueError):
    pass


@dataclass(frozen=True)
class SubmissionResult:
    success: bool
    status_code: int | None
    message: str
    response_text: str = ""


class Entry(StrEnum):
    # TSX ids
    NAME = "entry.1864049470"
    EMAIL = "entry.927040196"
    COMPANY = "entry.1041958229"
    NUMBER = "entry.667761107"
    DATE = "entry.1608810612"
    TIME = "entry.1474718058"
    ACK_1 = "entry.1288551277"
    ACK_2 = "entry.1227858351"
    ACK_3 = "entry.1301469599"
    ACK_4 = "entry.104398499"
    PAGE_HISTORY = "pageHistory"


def normalize_time_slot(time_slot: str) -> str:
    normalized = " ".join(time_slot.strip().lower().split())
    canonical_map = {slot.lower(): slot for slot in BOOKING_TIME_SLOTS}
    if normalized in canonical_map:
        return canonical_map[normalized]
    raise BookingError(
        f"Invalid time_slot '{time_slot}'. Allowed values: {', '.join(BOOKING_TIME_SLOTS)}"
    )


def validate_target_date(target_date: str, *, allow_past: bool = False) -> str:
    try:
        parsed = datetime.strptime(target_date, "%Y-%m-%d").date()
    except ValueError as exc:
        raise BookingError("date must be in YYYY-MM-DD format") from exc

    if not allow_past and parsed < date.today():
        raise BookingError("date must not be in the past")

    return parsed.strftime("%Y-%m-%d")


def _load_profile_from_env() -> dict[str, str]:
    profile = {
        "NAME": os.getenv("NAME", "").strip(),
        "EMAIL": os.getenv("EMAIL", "").strip(),
        "COMPANY": os.getenv("COMPANY", "").strip(),
        "PHONE": os.getenv("PHONE", "").strip(),
    }
    missing = [key for key, value in profile.items() if not value]
    if missing:
        raise BookingError(
            f"Missing required environment variables: {', '.join(missing)}"
        )
    return profile


def _resolve_form_url(use_mock_url: bool) -> str:
    env_var = "MOCK_URL" if use_mock_url else "TSX_URL"
    url = os.getenv(env_var, "").strip()
    if not url:
        raise BookingError(f"{env_var} environment variable is required")
    return url


def submit_booking(
    target_date: str,
    time_slot: str = DEFAULT_TIME_SLOT,
    *,
    use_mock_url: bool = False,
    timeout_seconds: int = 20,
) -> SubmissionResult:
    safe_date = validate_target_date(target_date)
    safe_slot = normalize_time_slot(time_slot)
    profile = _load_profile_from_env()
    form_url = _resolve_form_url(use_mock_url)

    form_data = {
        Entry.NAME: profile["NAME"],
        Entry.EMAIL: profile["EMAIL"],
        Entry.COMPANY: profile["COMPANY"],
        Entry.NUMBER: profile["PHONE"],
        Entry.DATE: safe_date,
        Entry.TIME: safe_slot,
        Entry.ACK_1: "Yes",
        Entry.ACK_2: "Yes",
        Entry.ACK_3: "Yes",
        Entry.ACK_4: "Yes",
        Entry.PAGE_HISTORY: "0,1,2",
    }

    try:
        response = requests.post(form_url, data=form_data, timeout=timeout_seconds)
    except requests.exceptions.RequestException as exc:
        return SubmissionResult(
            success=False,
            status_code=None,
            message=f"Request error: {exc}",
        )

    if response.status_code == 200:
        return SubmissionResult(
            success=True,
            status_code=response.status_code,
            message="Form submitted successfully",
            response_text=response.text,
        )

    return SubmissionResult(
        success=False,
        status_code=response.status_code,
        message=f"Form submission failed with status {response.status_code}",
        response_text=response.text,
    )