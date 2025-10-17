import argparse
import os
import random
import time
from datetime import datetime, timedelta
from enum import StrEnum
from typing import Final

import requests
from dotenv import load_dotenv

load_dotenv()

MOCK_URL = os.getenv("MOCK_URL")
REAL_URL = os.getenv("TSX_URL")

FORM_URL: Final[str] = REAL_URL


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
    # Mock ids
    # NAME = "entry.550441580"
    # EMAIL = "entry.2106184693"
    # COMPANY = "entry.345562338"
    # NUMBER = "entry.2121367340"
    # DATE = "entry.2066446698"
    # TIME = "entry.269571675"
    # ACK_1 = "entry.177165065"
    # ACK_2 = "entry.46123323"
    # ACK_3 = "entry.2059833228"
    PAGE_HISTORY = "pageHistory"


def submit_form(target_date: str):
    """
    Submits the Google Form with the provided date.
    
    Args:
        target_date (str): The date to submit, in YYYY-MM-DD format.
    """
    if not FORM_URL:
        print("❌ Error: FORM_URL environment variable not set. Set TSX_URL.")
        return

    name = os.getenv("NAME")
    email = os.getenv("EMAIL")
    company = os.getenv("COMPANY")
    phone = os.getenv("PHONE")

    required_vars = {"NAME": name, "EMAIL": email, "COMPANY": company, "PHONE": phone}
    missing_vars = [var for var, value in required_vars.items() if not value]
    
    if missing_vars:
        print(f"❌ Error: Missing required environment variables: {', '.join(missing_vars)}")
        print("Please check your .env file or environment variables.")
        return

    form_data = {
        Entry.NAME: name,
        Entry.EMAIL: email,
        Entry.COMPANY: company,
        Entry.NUMBER: phone,
        Entry.DATE: target_date,
        Entry.TIME: "11.00am to 1.00pm",
        Entry.ACK_1: "Yes",
        Entry.ACK_2: "Yes",
        Entry.ACK_3: "Yes",
        Entry.ACK_4: "Yes",
        Entry.PAGE_HISTORY: "0,1,2",  # this is necessary for multipage form
    }

    try:
        print(f"Submitting form for date: {target_date}...")
        response = requests.post(FORM_URL, data=form_data)

        if response.status_code == 200:
            print("✅ Form submitted successfully!")
        else:
            print(f"❌ Error submitting form. Status Code: {response.status_code}")
            print("Response Text:", response.text)

    except requests.exceptions.RequestException as e:
        print(f"An error occurred with the request: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Submit a Google Form for a specific date.")
    parser.add_argument(
        "--days",
        nargs="+",
        type=int,
        choices=range(1, 6),
        default=[1, 2, 3, 4, 5],
        help="Day(s) to submit for next week (1=Mon, 2=Tue, ..., 5=Fri). Defaults to all days.",)
    args = parser.parse_args()

    today = datetime.now().date()
    days_until_monday = 7 - today.weekday()
    next_monday = today + timedelta(days=days_until_monday)
    next_week_dates = [next_monday + timedelta(days=i) for i in range(5)]

    for day_number in sorted(list(set(args.days))):
        pause_duration = random.uniform(8, 15)
        time.sleep(pause_duration)
        date = next_week_dates[day_number - 1]
        date_str = date.strftime("%Y-%m-%d")
        submit_form(date_str)
