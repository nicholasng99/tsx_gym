// Shared defaults. Loaded by the popup, options page, content script and
// service worker, so it must stay plain script (no modules, no exports).

const TSX_DEFAULTS = {
  formUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSfeSiS_n3ao4a4dQ-fozvvqyBNye1jmBuRa7xv5baDhD6YJ7w/viewform",
  // Google Forms entry ids for each question, without the "entry." prefix.
  ids: {
    name: "1864049470",
    email: "927040196",
    company: "1041958229",
    phone: "667761107",
    date: "1608810612",
    time: "1474718058",
    // Yes/No declarations, all answered "Yes".
    acks: ["1288551277", "1227858351", "1301469599", "104398499"],
  },
};

const TIME_SLOTS = [
  "7.00am to 9.00am",
  "9.00am to 11.00am",
  "11.00am to 1.00pm",
  "1.00pm to 3.00pm",
  "4.00pm to 6.00pm",
  "6.00pm to 8.00pm",
];

const DEFAULT_TIME_SLOT = "11.00am to 1.00pm";

// A running job older than this is considered stuck.
const JOB_TIMEOUT_MS = 3 * 60 * 1000;

// Hard cap on page loads per job so a misdetected page can never loop forever.
const MAX_PAGE_LOADS = 8;

// How long the content script keeps retrying a field that Google's own
// scripts have not picked up yet (they bind their handlers after page load).
const FIELD_RETRY_MS = 8000;
