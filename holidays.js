// Singapore public holidays and the booking-day rules built on them. Loaded by
// the popup and the service worker after config.js, so it stays plain script.

// The gym is closed on these days. Copied from MOM's "Public Holidays for
// <year>" datasets on data.gov.sg, including the "(Observed)" in-lieu days.
// Add the next year once MOM publishes it, usually around June or July.
const SG_PUBLIC_HOLIDAYS = {
  "2026-01-01": "New Year's Day",
  "2026-02-17": "Chinese New Year",
  "2026-02-18": "Chinese New Year",
  "2026-03-21": "Hari Raya Puasa",
  "2026-04-03": "Good Friday",
  "2026-05-01": "Labour Day",
  "2026-05-27": "Hari Raya Haji",
  "2026-05-31": "Vesak Day",
  "2026-06-01": "Vesak Day (Observed)",
  "2026-08-09": "National Day",
  "2026-08-10": "National Day (Observed)",
  "2026-11-08": "Deepavali",
  "2026-11-09": "Deepavali (Observed)",
  "2026-12-25": "Christmas Day",

  "2027-01-01": "New Year's Day",
  "2027-02-06": "Chinese New Year",
  "2027-02-07": "Chinese New Year",
  "2027-02-08": "Chinese New Year (Observed)",
  "2027-03-10": "Hari Raya Puasa",
  "2027-03-26": "Good Friday",
  "2027-05-01": "Labour Day",
  "2027-05-17": "Hari Raya Haji",
  "2027-05-20": "Vesak Day",
  "2027-08-09": "National Day",
  "2027-10-28": "Deepavali",
  "2027-12-25": "Christmas Day",
};

function isWeekend(date) {
  return date.getDay() === 0 || date.getDay() === 6;
}

function holidayName(date) {
  return SG_PUBLIC_HOLIDAYS[toIsoDate(date)] || null;
}

// Weekends and public holidays: the gym is closed and they are not working days.
function isClosed(date) {
  return isWeekend(date) || !!holidayName(date);
}

// The last moment a slot on `date` can still be booked: CUTOFF_HOUR on the
// previous working day.
function bookingCutoff(date) {
  const d = new Date(date);
  do d.setDate(d.getDate() - 1);
  while (isClosed(d));
  d.setHours(CUTOFF_HOUR, 0, 0, 0);
  return d;
}

function isBookable(date, now = new Date()) {
  return !isClosed(date) && now < bookingCutoff(date);
}

function parseIsoDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIsoDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
