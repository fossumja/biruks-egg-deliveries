export interface DeliveryRun {
  id: string;            // e.g., 2025-11-25_WeekA_001
  date: string;          // ISO date the run was completed
  weekType: string;      // WeekA / WeekB or similar (scheduleId)
  label: string;         // Human readable label, e.g. "Week A – 2025-11-25"
  note?: string;

  status?: 'completed' | 'endedEarly';
  routeDate?: string;    // Original routeDate (Schedule / Date column)
}
