export interface CsvImportState {
  id: string;
  headers: string[];
  rowsByBaseRowId: Record<string, string[]>;
}
