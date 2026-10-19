const REFRESH_INTERVALS_MS = Object.freeze({
  rapid: 2 * 60 * 60 * 1000,
  standard: 6 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
});

export function refreshIntervalMs(refreshClass) {
  const interval = REFRESH_INTERVALS_MS[String(refreshClass ?? "")];
  if (!interval) throw new Error(`Unknown refresh_class: ${refreshClass}`);
  return interval;
}

export function nextDueAt(refreshClass, fromDate = new Date()) {
  const from = fromDate instanceof Date ? fromDate : new Date(fromDate);
  if (!Number.isFinite(from.getTime())) throw new Error("Invalid schedule start date");
  return new Date(from.getTime() + refreshIntervalMs(refreshClass)).toISOString();
}

export function isSourceDue(source, now = new Date()) {
  if (source?.enabled !== true) return false;
  const current = now instanceof Date ? now : new Date(now);
  const due = new Date(source?.next_due_at ?? "");
  if (!Number.isFinite(current.getTime()) || !Number.isFinite(due.getTime())) return false;
  return due.getTime() <= current.getTime();
}
