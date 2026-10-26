# TSX Gym Booker (Chrome extension)

Books TSX gym slots by filling and submitting the booking Google Form from
inside your own Chrome. Pick the days on a calendar, click **Book**, and the
extension walks through the form for each day in turn.

The form collects email addresses, so Google checks each submission with an
invisible reCAPTCHA and rejects a direct POST to the form. The extension fills
the form in your signed-in browser session, where the reCAPTCHA passes without
a challenge.

No Python, Node, build step or server is involved. The extension is plain
HTML, CSS and JS loaded straight from this folder.

## Install

### From the Chrome Web Store (recommended)

Install
[TSX Gym Booker](https://chromewebstore.google.com/detail/mbknanbpdgjojhmcdcbjamonckdmjfgi).
It is unlisted, so it only shows up through this link. Then click the arm icon
in the toolbar and choose **Settings**. Enter your name, company email, company
name and contact number, and click **Save**. Store installs update
automatically.

### From source

1. Clone this repo, or download the zip from the
   [latest release](https://github.com/nicholasng99/tsx_gym/releases/latest).
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the folder containing `manifest.json`.
4. Click the arm icon in the toolbar and choose **Settings**. Enter your name,
   company email, company name and contact number, then click **Save**.

Chrome must be signed in to a Google account (any account). The account only
makes Google trust the browser session. The form receives the email you
entered in Settings.

## Use

1. Click the extension icon.
2. Click the days you want on the calendar. Weekends, today, and any day whose
   cutoff has passed are greyed out. Per the gym's T&Cs, bookings close at
   **4 pm on the working day before** the slot, so Friday 4 pm is the cutoff
   for Monday. Singapore public holidays are blue (hover for the name). The
   gym is closed on those days, and they do not count as working days for the
   cutoff. Days you have already booked are green (hover for the slot), and
   days waiting in the queue have a dashed orange outline. You cannot select
   either again, because the gym allows one slot per person per day.
3. Pick a time slot from the dropdown. It applies to every selected day. Each
   day also has its own dropdown in the list above, if you want a different
   slot for one of them.
4. Click **Book (N)**.

The ⚙ button in the top right opens Settings, which also has a **Dark mode**
switch. The switch applies straight away, without pressing Save.

### The queue

Clicking **Book** does not submit anything by itself. It adds one job per
selected day to the queue, and the queue runs the jobs one after another in a
single tab. For each job the extension opens the form, fills the email page,
the booking details and the declarations, submits, and moves on when the
confirmation page appears. Chrome shows a desktop notification for each
result.

The **Job queue** section at the bottom of the popup starts collapsed, because
you only need it to check on or troubleshoot a run. Its header shows how many
jobs are queued or running. Expand it to see each job's live status and, for
failures, the reason.

Rules.

- Book adds a job only for days that are not already queued or running, and
  that are still before their cutoff at the moment you click.
- Jobs run one at a time, in date order, all in the same tab. Closing that tab
  fails the running job and starts the next one.
- A job finishes as **booked** when the confirmation page appears. It finishes
  as **failed** if Google flags a field, the extension does not recognise the
  page layout, the tab closes, or nothing happens for 3 minutes. A failure
  never stops the queue, and the next job starts immediately.
- Booked jobs stay in the pane for 10 minutes, and the extension records them
  in the history that colours the calendar green. Failed jobs stay until you
  next click Book, which keeps only the last 5 finished jobs.
- If a reCAPTCHA image challenge appears (rare when signed in), solve it in
  the tab and the job continues. The extension never touches the captcha.

## The toolbar icon

The arm in the toolbar grows with how many days you have booked in the week
being planned.

| Booked days | Icon |
| --- | --- |
| 0 or 1 | skinny arm |
| 2 | medium arm |
| 3 or more | full flex |

The week being planned is the current Monday to Friday week. It switches to
next week once the cutoff for next Monday has passed, which is Friday 4 pm, or
Thursday 4 pm when Friday is a public holiday. Over the weekend and on Monday,
the icon already shows what you booked for the new week. The icon updates
whenever a booking completes and re-checks every hour. Hovering it shows the
count.

The three images are in `icons/` as `skinny-*`, `medium-*` and `max-*` at 16,
32, 48 and 128 px.

## Sharing

The easiest way to share is the
[Chrome Web Store link](https://chromewebstore.google.com/detail/mbknanbpdgjojhmcdcbjamonckdmjfgi).
If someone needs to load it unpacked instead, share only the extension files,
not a copy of your whole working tree.

```
manifest.json  config.js  holidays.js  theme.js  content.js  background.js
popup.html  popup.js  options.html  options.js  style.css
icons/
```

Zip those files, or share the branch. Do **not** include `.env`, `.venv`,
`.git` or `bookings.json`. They are not part of the extension, and `.env`
contains your personal details. Each person enters their own details in
Settings after installing.

Chrome rejects any file or folder inside the extension folder whose name
starts with `_`, such as `__pycache__`, so keep the folder clean.

## When the form changes

Everything form-specific is in the **Entry IDs** field in Settings, with
defaults in [`config.js`](config.js). To find the current ids, open the form's
viewform page, view the source and search for `FB_PUBLIC_LOAD_DATA_`. Each
question's id appears as `[[<id>,`. Update the JSON and save. The cutoff hour
is `CUTOFF_HOUR` in `config.js`.

## Public holidays

The holiday list is `SG_PUBLIC_HOLIDAYS` in [`holidays.js`](holidays.js). It is
copied from MOM's "Public Holidays for <year>" datasets on
[data.gov.sg](https://data.gov.sg), including the "(Observed)" in-lieu days.
The list ships with the extension instead of being fetched, so the extension
makes no network requests of its own. MOM publishes the next year's dates
around June or July. Add those dates and release an update. The extension
treats days past the end of the list as normal working days.

## Previewing the popup

To see popup changes without reloading the extension, serve the folder and
open the preview page.

```
python -m http.server 8765
```

Then open http://localhost:8765/.claude/preview/. It loads the real
`popup.html` with an in-memory stand-in for `chrome.storage`
(`.claude/preview/chrome-stub.js`), so the calendar works but nothing gets
booked. The `.claude/` folder is not part of the extension, so leave it out
when sharing.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | MV3 manifest |
| `config.js` | Form URL, entry ids, time slots and cutoff hour, shared by all scripts |
| `holidays.js` | Singapore public holidays and the closed-day and cutoff rules, used by the popup and background |
| `theme.js` | Applies the dark mode setting to the popup and settings page |
| `content.js` | Runs on each form page, fills it and clicks Next or Submit |
| `background.js` | Runs the queue one job at a time, sends notifications and sets the toolbar icon stage |
| `popup.html/js` | Calendar, slot picker and queue status |
| `options.html/js` | Profile and form settings |
| `style.css` | Shared styling |
| `icons/` | Toolbar icon stages (skinny, medium, max) at 16 to 128 px |
