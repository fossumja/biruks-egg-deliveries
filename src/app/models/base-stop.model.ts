export interface BaseStop {
  baseRowId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  dozensDefault: number;
  week?: string;
  notes?: string;
}
