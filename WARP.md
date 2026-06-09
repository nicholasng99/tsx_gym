# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a Python MCP (Model Context Protocol) server for booking TSX Gym slots through Google Forms.
The repository is API-first and accepts explicit date inputs; date calculation is handled by callers.

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
# Start MCP server over stdio
python mcp_server.py
```

### Environment Variables
The service requires these environment variables to be set (via .env file):

**Required personal details:**
- `NAME` - Your full name for the booking
- `EMAIL` - Your email address
- `COMPANY` - Your company name
- `PHONE` - Your phone number

**Form URL configuration:**
- `TSX_URL` - Production Google Form URL for TSX gym booking
- `MOCK_URL` - Optional URL for non-MCP testing paths

## Architecture

### Core Components

**mcp_server.py**
- Exposes the MCP tool `book_gym_slot(date, time_slot)`
- Runs the server over stdio transport

**booking_service.py**
- Validates explicit date format (`YYYY-MM-DD`) and rejects past dates
- Validates allowed time slots
- Loads identity fields from env vars only
- Maps payload to Google Form entry IDs and submits via HTTP POST

**submit_form.py**
- Minimal Python API wrapper around `booking_service.submit_booking`
- Useful for direct module calls, but MCP is the primary interface

### MCP Tool Contract
- Tool name: `book_gym_slot`
- Required input: `date`, `time_slot`
- No mock URL toggle in MCP; submissions use `TSX_URL`
- One booking per tool call

## Development Notes

### Form Field Discovery
When Google Forms change, new entry IDs need to be discovered by:
1. Inspecting the form HTML source
2. Updating field mappings in `booking_service.py`
3. Testing with mock URL before switching to production

### Personal Data Handling
User information (name, email, company, phone) is loaded from environment variables via a `.env` file. The `.env` file is excluded from version control for security.

**Setup process:**
1. Copy `.env.example` to `.env`
2. Edit `.env` with your personal details
3. Ensure `.env` is in `.gitignore` (already configured)

### Error Handling
The service includes validation and HTTP error handling. Monitor for:
- Google Form structure changes (status code 200 but form rejection)
- Network connectivity issues
- Invalid caller-provided dates or time slots

### Security Considerations
- Form URLs are stored in environment variables
- No sensitive data is logged in output
