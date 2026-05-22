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

export function fnFormatDateUTC(isoTimestamp) {         // returns when a run was set as 'HH:MM DD/MM/YYYY (UTC)' so users in any timezone see the same value
  if (!isoTimestamp) return '-';
  try {
    const parsedDate = new Date(isoTimestamp);
    const hourPart = String(parsedDate.getUTCHours()).padStart(2, '0');
    const minutePart = String(parsedDate.getUTCMinutes()).padStart(2, '0');
    const dayPart = String(parsedDate.getUTCDate()).padStart(2, '0');
    const monthPart = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
    const yearPart = parsedDate.getUTCFullYear();
    return `${hourPart}:${minutePart} ${dayPart}/${monthPart}/${yearPart} (UTC)`;
  } catch {
    return isoTimestamp;
  }
}
