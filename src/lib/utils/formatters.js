export function formatScore(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

export function formatTime(seconds) {
  if (seconds == null) return '—';
  const s = Math.round(Number(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

export function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}
