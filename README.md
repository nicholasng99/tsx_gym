# TSX Gym Booker (Chrome extension)

Books TSX gym slots by filling and submitting the booking Google Form from
inside your own Chrome. Pick the days on a calendar, click **Book**, and the
extension walks through the form for each day in turn.

It runs in a signed-in browser session, so the form's invisible reCAPTCHA
passes silently — this is why the earlier script that POSTed to the form
directly stopped working once the form started collecting email addresses.

No Python, Node, build step or server is involved: the extension is plain
HTML/CSS/JS loaded straight from this folder.

## Install

1. Get the folder — either clone this branch or unzip the shared copy (see
   *Sharing* below).
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the folder containing `manifest.json`.
4. Click the orange dumbbell icon → **Settings**. Enter your name, company
   email, company name and contact number, then **Save**.

Chrome must be signed in to a Google account (any account). It is only used so
Google trusts the browser session; the form receives the email you entered in
Settings.

## Use

1. Click the extension icon.
2. Click the days you want on the calendar. Weekends, today, and any day whose
   cutoff has passed are greyed out — bookings close at **4 pm on the working
   day before** the slot, so Friday 4 pm is the cutoff for Monday (per the
   gym's T&Cs).
3. Pick a time slot. It applies to every selected day; each day also gets its
   own dropdown if you want a different slot for one of them.
4. Click **Book N days**.

The days are queued and booked one after another in a single tab: for each
one the extension fills the email page, the booking details and the
declarations, submits, and moves on when the confirmation page appears. The
popup shows the queue with live status and a desktop notification fires for
each result. Recent bookings are listed underneath.

If Google rejects a field, that job fails with the validation message shown on
the form and the queue continues with the next day. If a reCAPTCHA image
challenge appears (rare when signed in), solve it and the submission
continues — the extension never touches the captcha.

## Sharing

Anyone can install it the same way (Developer mode → Load unpacked). Share
only the extension files, not a copy of your whole working tree:

```
manifest.json  config.js  content.js  background.js
popup.html  popup.js  options.html  options.js  style.css
icons/
```

Zip those (or just share the branch) — do **not** include `.env`, `.venv`,
`.git` or `bookings.json`, which are leftovers from the old Python version
and, in the case of `.env`, contain your personal details. Each person enters
their own details in Settings after installing.

Note that Chrome rejects any file or folder starting with `_` inside the
extension folder (e.g. `__pycache__`), so keep the folder clean.

## When the form changes

Everything form-specific lives in **Settings → Entry IDs** (defaults in
[`config.js`](config.js)). To find the current ids, open the form's viewform
page, view source, search for `FB_PUBLIC_LOAD_DATA_`; each question's id
appears as `[[<id>,`. Update the JSON, save, done. The cutoff hour is
`CUTOFF_HOUR` in `config.js`.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | MV3 manifest |
| `config.js` | Form URL, entry ids, time slots, cutoff hour (shared by all scripts) |
| `content.js` | Runs on each form page, fills it and clicks Next/Submit |
| `background.js` | Runs the queue one job at a time; desktop notifications |
| `popup.html/js` | Calendar + slot picker, queue status, history |
| `options.html/js` | Profile and form settings |
| `style.css` | Shared styling |
| `icons/` | Extension icon |
