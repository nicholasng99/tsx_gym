# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a Python automation script for booking TSX Gym slots through Google Forms. The project consists of a single main script that submits form data for specified weekdays, with support for both manual execution and automated GitHub Actions workflows.

## Development Commands

### Setup and Installation
```powershell
# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment file
copy .env.example .env
# Edit .env file with your personal details and form URLs
```

### Running the Application
```powershell
# Submit for all weekdays (Mon-Fri) of next week
python submit_form.py

# Submit for specific days (1=Monday, 5=Friday)
python submit_form.py --days 1 3 5

# Submit for just Monday and Tuesday
python submit_form.py --days 1 2
```

### Environment Variables
The script requires these environment variables to be set (via .env file):

**Required personal details:**
- `NAME` - Your full name for the booking
- `EMAIL` - Your email address
- `COMPANY` - Your company name
- `PHONE` - Your phone number

**Required form URL (set one):**
- `TSX_URL` - The actual Google Form URL for TSX gym booking
- `MOCK_URL` - A test URL for development/testing

## Architecture

### Core Components

**submit_form.py** - The main application file containing:
- `Entry` enum: Maps Google Form field names to their IDs (both real TSX and mock form versions)
- `submit_form()` function: Handles HTTP POST submission to Google Forms
- Command-line argument parsing for selecting specific weekdays
- Date calculation logic to target next week's dates
- Built-in delays between submissions (8-15 seconds random)

### Form Mapping Strategy
The script uses hardcoded Google Form entry IDs that map to specific form fields. Two sets of IDs are maintained:
- Production TSX form IDs (currently active)
- Mock form IDs (commented out, used for testing)

### Date Handling
- Automatically calculates next Monday from current date
- Generates weekday dates (Mon-Fri) for the following week
- Accepts user input to select specific days via `--days` parameter

### GitHub Actions Integration
The workflow (`.github/workflows/call-submit-form.yml`) enables:
- Manual triggering with custom day selection
- Secure storage of form URLs via GitHub Secrets
- Automated dependency installation and script execution

## Development Notes

### Form Field Discovery
When Google Forms change, new entry IDs need to be discovered by:
1. Inspecting the form HTML source
2. Updating the `Entry` enum with new field mappings
3. Testing with mock URL before switching to production

### Personal Data Handling
User information (name, email, company, phone) is loaded from environment variables via a `.env` file. The `.env` file is excluded from version control for security.

**Setup process:**
1. Copy `.env.example` to `.env`
2. Edit `.env` with your personal details
3. Ensure `.env` is in `.gitignore` (already configured)

### Error Handling
The script includes basic HTTP error handling and request exceptions. Monitor for:
- Google Form structure changes (status code 200 but form rejection)
- Network connectivity issues
- Rate limiting from Google Forms

### Security Considerations
- Form URLs are stored as GitHub Secrets
- No sensitive data is logged in output
- Random delays help avoid detection as automated submissions