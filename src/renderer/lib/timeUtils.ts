/**
 * Format a completion timestamp as a relative or absolute time string.
 *
 * Rules:
 * - < 1 min ago: "justo ahora"
 * - < 60 min ago: "hace X min"
 * - Today: "hoy HH:mm"
 * - Yesterday: "ayer HH:mm"
 * - Older: "dd MMM yyyy, HH:mm" (e.g., "15 ene 2024, 14:30")
 *
 * @param completedAt - ISO timestamp string or Unix timestamp (ms)
 * @param now - Current timestamp (ms) from Date.now()
 * @param locale - Locale for formatting (default: "es-ES")
 * @returns Formatted time string
 *
 * @example
 * formatDoneTime("2024-01-15T14:30:00Z", Date.now()) // "hace 5 min"
 * formatDoneTime(1705330200000, Date.now()) // "hoy 14:30"
 */
export function formatDoneTime(
  completedAt: string | number,
  now: number,
  locale: string = "es-ES"
): string {
  // Parse completedAt to timestamp
  const completedTimestamp = typeof completedAt === "string"
    ? new Date(completedAt).getTime()
    : completedAt;

  // Calculate difference in milliseconds
  const diffMs = now - completedTimestamp;
  const diffMinutes = Math.floor(diffMs / 60000);

  // < 1 min ago
  if (diffMinutes < 1) {
    return "justo ahora";
  }

  // < 60 min ago
  if (diffMinutes < 60) {
    return `hace ${diffMinutes} min`;
  }

  // Get date objects for comparison
  const completedDate = new Date(completedTimestamp);
  const nowDate = new Date(now);

  // Helper: check if same day
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // Helper: check if yesterday
  const isYesterday = (completed: Date, current: Date) => {
    const yesterday = new Date(current);
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(completed, yesterday);
  };

  // Format time (HH:mm)
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Today
  if (isSameDay(completedDate, nowDate)) {
    return `hoy ${timeFormatter.format(completedDate)}`;
  }

  // Yesterday
  if (isYesterday(completedDate, nowDate)) {
    return `ayer ${timeFormatter.format(completedDate)}`;
  }

  // Older: "dd MMM yyyy, HH:mm"
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const datePart = dateFormatter.format(completedDate);
  const timePart = timeFormatter.format(completedDate);

  return `${datePart}, ${timePart}`;
}

/**
 * Format a timestamp as a relative time string.
 * Uses simpler format for recent activity display.
 *
 * @param timestamp - ISO timestamp string
 * @returns Formatted relative time string
 *
 * @example
 * formatRelativeTime("2024-01-15T14:30:00Z") // "2m ago"
 */
export function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diffMs = now - time;

  // Negative diff means future time
  if (diffMs < 0) {
    return 'now';
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Just now (< 1 min)
  if (diffMinutes < 1) {
    return 'now';
  }

  // Minutes ago (< 60 min)
  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  // Hours ago (< 24 hours)
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  // Days ago (< 7 days)
  if (diffDays < 7) {
    return `${diffDays}d`;
  }

  // Older: show date
  const date = new Date(time);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}
