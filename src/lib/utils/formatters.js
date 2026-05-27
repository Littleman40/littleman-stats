// formats the points of the run to include , for each hundredth place
export function fnFormatScore(rawScore) {
  if (rawScore == null) return '-';
  return Number(rawScore).toLocaleString();
}

// turns returned seconds from api into minutes and seconds
export function fnFormatTime(totalSeconds) {
  if (totalSeconds == null) return '-';
  const roundedSeconds = Math.round(Number(totalSeconds));
  const minutes = Math.floor(roundedSeconds / 60);
  const remainderSeconds = roundedSeconds % 60;
  return `${minutes}:${String(remainderSeconds).padStart(2, '0')}`;
}

// returns when runs where completed from iso to local user time
export function fnFormatDate(isoTimestamp) {
  if (!isoTimestamp) return '-';
  try {
    return new Date(isoTimestamp).toLocaleString();
  } catch {
    return isoTimestamp;
  }
}

// formats a percentage value, and returns '<1%' for anything less than 1 percent
export function fnFormatPercent(percentValue, { decimals = 0 } = {}) {
  if (percentValue == null || percentValue <= 0) return '0%';

  const roundedForCheck = decimals === 0 ? Math.round(percentValue) : Number(percentValue.toFixed(decimals));
  if (roundedForCheck === 0) return '<1%';

  return decimals === 0 ? `${Math.round(percentValue)}%` : `${percentValue.toFixed(decimals)}%`;
}

// returns when a run was set as 'HH:MM DD/MM/YYYY (UTC)' so users in any timezone see the same value
export function fnFormatDateUTC(isoTimestamp) {
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
