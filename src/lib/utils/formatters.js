export function fnFormatScore(rawScore) { // called from LeaderboardTable.svelte (each table row's score cell)
  if (rawScore == null) return '-';
  return Number(rawScore).toLocaleString();
}

export function fnFormatTime(totalSeconds) { // exported helper — turns a number of seconds into a mm:ss string (no current callers, reserved for timing pages)
  if (totalSeconds == null) return '-';
  const roundedSeconds = Math.round(Number(totalSeconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const remainderSeconds = roundedSeconds % 60;
  return `${minutes}:${String(remainderSeconds).padStart(2, '0')}`;
}

export function fnFormatDate(isoTimestamp) { // exported helper — converts an ISO date into the user's local timestamp (no current callers, reserved for run-history views)
  if (!isoTimestamp) return '-';
  try {
    return new Date(isoTimestamp).toLocaleString();
  } catch {
    return isoTimestamp;
  }
}
