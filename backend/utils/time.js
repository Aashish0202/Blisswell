// Server-time helpers for the Asia/Kolkata (IST) timezone.
// All withdrawal-window / claim-date enforcement goes through here so the
// server is the single source of truth for time (§16) — never the client.

const IST_TZ = 'Asia/Kolkata';

// Returns the current IST time broken into parts: { year, month, day, hour, minute, second }
function getISTParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  const parts = {};
  fmt.formatToParts(date).forEach(p => {
    if (p.type !== 'literal') parts[p.type] = p.value;
  });
  // Some engines emit "24" for midnight under hour12:false — normalise to "00".
  if (parts.hour === '24') parts.hour = '00';
  return parts;
}

// Current IST date as YYYY-MM-DD (used as the cashback claim day).
function getISTDateString(date = new Date()) {
  const p = getISTParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

// Current IST time as HH:MM (24h, zero-padded).
function getISTTimeString(date = new Date()) {
  const p = getISTParts(date);
  return `${p.hour}:${p.minute}`;
}

// Current IST timestamp as YYYY-MM-DD HH:MM:SS.
function getISTNow(date = new Date()) {
  const p = getISTParts(date);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

// True when current IST time is within [startTime, endTime).
// startTime/endTime are "HH:MM" strings (zero-padded → lexical compare is safe).
function isWithinWithdrawalWindow(startTime = '07:00', endTime = '10:00', date = new Date()) {
  const now = getISTTimeString(date);
  return now >= startTime && now < endTime;
}

module.exports = {
  IST_TZ,
  getISTParts,
  getISTDateString,
  getISTTimeString,
  getISTNow,
  isWithinWithdrawalWindow
};