// formats the points of the run to include , for each hundredth place
export function fnFormatScore(rawScore) {

  // if null just return a dash
  if (rawScore == null) return '-';

  // converts input to number and adds the commas
  return Number(rawScore).toLocaleString();
}



// turns returned seconds from api into minutes and seconds
export function fnFormatTime(totalSeconds) {

  // if null just return a dash
  if (totalSeconds == null) return '-';

  // converts to number and rounds to neaarest second
  const roundedSeconds = Math.round(Number(totalSeconds));
  
  // gets whole minutes
  const minutes = Math.floor(roundedSeconds / 60);
  
  // gets the left over
  const remainderSeconds = roundedSeconds % 60;
  
  // returns minutes and then seconds with 2 digits
  return `${minutes}:${String(remainderSeconds).padStart(2, '0')}`;
}



export function fnNormaliseTrafficType(rawTrafficType) {

  // anything that isn't text has no traffic type to read
  if (typeof rawTrafficType !== 'string') return null;

  let cleaned = rawTrafficType.trim().toLowerCase();

  // a literal 'none' is impossible in game, so it's treated as missing data rather than a real type
  if (cleaned.length === 0 || cleaned === 'none') return null;

  // drop the redundant 'traffic' word so 'Heavy Traffic' and 'heavy' end up identical, then tidy up the leftover spacing
  cleaned = cleaned.replace(/\btraffic\b/g, ' ').replace(/[\s_]+/g, ' ').trim();
  if (cleaned.length === 0) return null;

  // rush hour turns up as one word and as two
  if (cleaned === 'rushhour') cleaned = 'rush hour';

  // capitalise each word so it reads nicely on the table and in the charts
  return cleaned
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}




// formats a percentage value, and returns '<1%' for anything less than 1 percent
export function fnFormatPercent(percentValue, { decimals = 0 } = {}) {

  // if null just return 0%
  if (percentValue == null || percentValue <= 0) return '0%';

  // creates a rounded value for the check, if there are no decimals just round to nearest whole number, otherwise to round to specified
  let roundedForCheck;
  if (decimals === 0) {
    roundedForCheck = Math.round(percentValue);
  } else {
    roundedForCheck = Number(percentValue.toFixed(decimals));
  }

  // returns <1% if it was rounded to 0
  if (roundedForCheck === 0) return '<1%';


  // returns the value with everything 
  if (decimals === 0) {
  return Math.round(percentValue) + "%";
  }

  return percentValue.toFixed(decimals) + "%";
}




// returns when a run was set as 'HH:MM DD/MM/YYYY (UTC)' so users in any timezone see the same value
export function fnFormatDateUTC(isoTimestamp) {

  // if null just return a dash
  if (!isoTimestamp) return '-';

  // attempts to make a date but if it fails just return origional time
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
