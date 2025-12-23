const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NUMERIC_PATTERN = /^\d+(\.\d+)?$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 31);

function normalizeExcelSerialDate(serial: number): string | undefined {
  if (!Number.isFinite(serial)) return undefined;
  const days = Math.floor(serial);
  const fraction = serial - days;
  const adjustedDays = days > 59 ? days - 1 : days; // Excel 1900 leap-year bug
  const ms =
    EXCEL_EPOCH_UTC +
    adjustedDays * DAY_MS +
    Math.round(fraction * DAY_MS);
  const parsed = new Date(ms);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const hasTime = Math.abs(fraction) > 0.000001;
  if (!hasTime) {
    const year = parsed.getUTCFullYear();
    const month = parsed.getUTCMonth();
    const day = parsed.getUTCDate();
    const localMidday = new Date(year, month, day, 12, 0, 0, 0);
    return Number.isNaN(localMidday.getTime())
      ? parsed.toISOString()
      : localMidday.toISOString();
  }
  return parsed.toISOString();
}

export function normalizeEventDate(
  raw?: string | number | null
): string | undefined {
  if (raw == null) return undefined;
  const value = raw.toString().trim();
  if (!value) return undefined;
  if (DATE_ONLY_PATTERN.test(value)) {
    const [year, month, day] = value.split('-').map((part) => Number(part));
    const localMidday = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(localMidday.getTime()) ? value : localMidday.toISOString();
  }
  if (NUMERIC_PATTERN.test(value)) {
    const excelDate = normalizeExcelSerialDate(Number(value));
    if (excelDate) return excelDate;
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
