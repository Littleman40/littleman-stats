export function fnFormatScore(rawScore) {               // formats the points of the run to include , for each hundredth place
  if (rawScore == null) return '-';
  return Number(rawScore).toLocaleString();
}

export function fnFormatTime(totalSeconds) {            // turns returned seconds from api into minutes and seconds
  if (totalSeconds == null) return '-';
  const roundedSeconds = Math.round(Number(totalSeconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const remainderSeconds = roundedSeconds % 60;
  return `${minutes}:${String(remainderSeconds).padStart(2, '0')}`;
}

export function fnFormatDate(isoTimestamp) {            // returns when runs where completed from iso to local user time
  if (!isoTimestamp) return '-';
  try {
    return new Date(isoTimestamp).toLocaleString();
  } catch {
    return isoTimestamp;
  }
}
