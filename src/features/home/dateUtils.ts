export function formatYear(dateString: string) {
  const year = new Date(dateString).getFullYear();
  return Number.isNaN(year) ? 'Date unknown' : `c. ${year}`;
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateShort(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatEventTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function getTimeAgo(date: Date): string {
  const differenceMinutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  const differenceHours = Math.floor(differenceMinutes / 60);
  const differenceDays = Math.floor(differenceHours / 24);
  if (differenceMinutes < 1) return 'Just now';
  if (differenceMinutes < 60) return `${differenceMinutes}m ago`;
  if (differenceHours < 24) return `${differenceHours}h ago`;
  if (differenceDays < 7) return `${differenceDays}d ago`;
  return formatDateShort(date);
}

export function getEventCountdown(dateString: string): string | null {
  const difference = new Date(dateString).getTime() - Date.now();
  if (difference <= 0) return null;
  const hours = Math.floor(difference / 3_600_000);
  return hours < 24 ? `In ${hours}h` : `In ${Math.floor(hours / 24)}d`;
}

export function isNewArtifact(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1_000;
}
