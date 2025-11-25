export interface DeliveryRun {
  id: string; // e.g., 2025-11-25_WeekA
  date: string; // ISO date
  weekType: string; // WeekA / WeekB or similar
  label: string; // Human readable label
  note?: string;
}
