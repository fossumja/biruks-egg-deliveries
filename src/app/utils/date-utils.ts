const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeEventDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const value = raw.toString().trim();
  if (!value) return undefined;
  if (DATE_ONLY_PATTERN.test(value)) {
    const [year, month, day] = value.split('-').map((part) => Number(part));
    const localMidday = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(localMidday.getTime()) ? value : localMidday.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

export function toSortableTimestamp(raw?: string): number {
  const normalized = normalizeEventDate(raw);
  if (!normalized) return 0;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}
