# TSX Gym Booker (Chrome extension)

Fills and submits the TSX gym booking Google Form from inside your own Chrome
session. Because it runs in a signed-in browser, the form's invisible reCAPTCHA
passes silently — which is why the old direct-POST approach stopped working.

## Install (unpacked)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Click the extension icon → **Settings**, fill in your name, company email,
   company name and contact number, and save.

Make sure Chrome is signed in to a Google account (any account — it is only
used so Google trusts the browser session; the form itself gets the email you
enter in Settings).

## Use

1. Click the extension icon.
2. Click the days you want on the calendar (weekends and past days are
   disabled). Pick a time slot — it applies to every selected day, and each
   day also gets its own dropdown if you want a different slot for one of them.
3. Click **Book N days**.

The days are queued and booked one after another in a single tab: for each
one the extension walks through the form (email page → booking details →
declarations → Submit) and moves on to the next when the confirmation page
appears. The popup shows the queue with live status, and a desktop
notification fires for each result. Recent bookings are listed underneath.

If Google rejects a field, that job fails with the validation message shown
on the form and the queue continues with the next day. If the reCAPTCHA image
challenge appears (rare when signed in), solve it and the submission
continues — the extension does not interact with it.

## When the form changes

Everything form-specific lives in **Settings → Entry IDs** (defaults in
[`config.js`](config.js)). To find the current ids, open the form's viewform
page, view source, and search for `FB_PUBLIC_LOAD_DATA_`; each question's id
appears as `[[<id>,`. Update the JSON, save, done.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | MV3 manifest |
| `config.js` | Form URL, entry ids, time slots (shared by all scripts) |
| `content.js` | Runs on each form page, fills it and clicks Next/Submit |
| `popup.html/js` | Calendar + slot picker, queue status, history |
| `options.html/js` | Profile and form settings |
| `background.js` | Runs the queue one job at a time; desktop notifications |
