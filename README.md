# TSX Gym Booking API

This project provides an API-first booking flow for TSX gym slots by submitting a Google Form.
Date calculation logic is intentionally out of scope for this repository; callers pass an explicit date.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in required values: `NAME`, `EMAIL`, `COMPANY`, `PHONE`, `TSX_URL`.
3. Install dependencies:

```bash
pip install -r requirements.txt
```

## MCP Server (stdio)

Start the MCP server:

```bash
python mcp_server.py
```

## Add This Repo As MCP In An AI Tool

Most AI tools that support MCP use a JSON config with an `mcpServers` section.

1. Make sure dependencies are installed in this repo.
2. Add a server entry for `tsx-gym-booker` that runs `mcp_server.py` with your virtual environment Python executable.
3. Set environment variables in your AI tool config for `NAME`, `EMAIL`, `COMPANY`, `PHONE`, and `TSX_URL`.
4. If your MCP host requires explicit transport arguments, configure stdio transport in that same server entry.

Sample JSON with env vars:

```json
{
   "mcpServers": {
      "tsx-gym-booker": {
         "command": "D:/others/tsx_gym/.venv/Scripts/python.exe",
         "args": [
            "D:/others/tsx_gym/mcp_server.py",
            "--transport",
            "stdio"
         ],
         "env": {
            "NAME": "Your Full Name",
            "EMAIL": "your.email@company.com",
            "COMPANY": "Your Company Name",
            "PHONE": "12345678",
            "TSX_URL": "https://docs.google.com/forms/d/e/.../formResponse"
         }
      }
   }
}
```

If your MCP host defaults to stdio, remove `--transport` and `stdio` from `args`.

After saving the config, restart the AI tool and confirm the MCP server `tsx-gym-booker` is connected.

Tool: `book_gym_slot`

Inputs:
1. `date` (required): `YYYY-MM-DD`
2. `time_slot` (optional, default `11.00am to 1.00pm`): one of:
   - `7.00am to 9.00am`
   - `9.00am to 11.00am`
   - `11.00am to 1.00pm`
   - `1.00pm to 3.00pm`
   - `4.00pm to 6.00pm`
   - `6.00pm to 8.00pm`

Notes:
1. Identity/profile values are read from environment variables only.
2. One booking is submitted per tool call.
3. Past dates are rejected.
4. MCP always submits to `TSX_URL`.