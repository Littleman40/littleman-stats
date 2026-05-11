export function formatScore(n) {                    // formats a score to include commas
  if (n == null) return '-';
  return Number(n).toLocaleString();
}

export function formatTime(seconds) {               // turns number of seconds into a mm:ss string
  if (seconds == null) return '-';
  const s = Math.round(Number(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

export function formatDate(isoString) {             // converts an iso date into a timestamp from the users local time zone
  if (!isoString) return '-';
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}
