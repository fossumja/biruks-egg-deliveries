import Papa from 'papaparse';
import { CsvImportState } from '../../app/models/csv-import-state.model';

export type CsvRow = Record<string, string>;
export type CsvImportStateSeed = Pick<
  CsvImportState,
  'headers' | 'rowsByBaseRowId' | 'mode'
>;

export const defaultBackupHeaders = [
  'RowType',
  'BaseRowId',
  'RunBaseRowId',
  'Schedule',
  'Name',
  'Address',
  'City',
  'State',
  'ZIP',
  'Dozens',
  'Delivery Order',
  'RunId',
  'RouteDate',
  'ScheduleId',
  'RunStatus',
  'RunEntryStatus',
  'RunDozens',
  'RunDonationStatus',
  'RunDonationMethod',
  'RunDonationAmount',
  'RunTaxableAmount',
  'RunCompletedAt',
  'SuggestedAmount',
  'EventDate'
];

export const buildCsvFile = (
  headers: string[],
  rows: CsvRow[],
  filename = 'backup.csv'
): File => {
  const data = rows.map((row) => headers.map((header) => row[header] ?? ''));
  const csv = Papa.unparse({ fields: headers, data });
  return new File([csv], filename, { type: 'text/csv' });
};

export const buildBackupCsvFile = (
  rows: CsvRow[],
  headers: string[] = defaultBackupHeaders,
  filename = 'backup.csv'
): File => buildCsvFile(headers, rows, filename);

export const buildBackupDeliveryRow = (
  overrides: Partial<CsvRow> = {}
): CsvRow => ({
  BaseRowId: 'c1',
  Schedule: '2025-01-01',
  Name: 'Alice',
  Address: '123 Main St',
  City: 'Testville',
  State: 'TS',
  ZIP: '12345',
  Dozens: '2',
  'Delivery Order': '0',
  ...overrides,
  RowType: 'Delivery'
});

export const buildBackupOneOffDonationRow = (
  overrides: Partial<CsvRow> = {}
): CsvRow => ({
  RunBaseRowId: 'c1',
  RunDonationStatus: 'Donated',
  RunDonationMethod: 'cash',
  RunDonationAmount: '5',
  SuggestedAmount: '5',
  EventDate: '2025-06-15',
  ...overrides,
  RowType: 'OneOffDonation'
});

export const buildBackupOneOffDeliveryRow = (
  overrides: Partial<CsvRow> = {}
): CsvRow => ({
  RunBaseRowId: 'c1',
  RunDozens: '2',
  RunDonationStatus: 'Donated',
  RunDonationMethod: 'ach',
  RunDonationAmount: '8',
  SuggestedAmount: '8',
  EventDate: '2025-06-15',
  ...overrides,
  RowType: 'OneOffDelivery'
});

export const buildBackupRunEntryRow = (
  overrides: Partial<CsvRow> = {}
): CsvRow => ({
  RunId: '2025-01-01_2025-01-02T00:00:00.000Z',
  RunBaseRowId: 'c1',
  RouteDate: '2025-01-01',
  ScheduleId: 'ScheduleA',
  RunStatus: 'completed',
  RunEntryStatus: 'delivered',
  RunDozens: '2',
  RunDonationStatus: 'Donated',
  RunDonationMethod: 'cash',
  RunDonationAmount: '8',
  RunTaxableAmount: '0',
  RunCompletedAt: '2025-01-02',
  Name: 'Alice',
  Address: '123 Main St',
  City: 'Testville',
  State: 'TS',
  ZIP: '12345',
  EventDate: '2025-01-02',
  ...overrides,
  RowType: 'RunEntry'
});

export const buildImportStateFromDeliveries = <
  T extends { baseRowId: string; name: string }
>(
  deliveries: T[],
  options: { headers?: string[]; mode?: CsvImportState['mode'] } = {}
): CsvImportStateSeed => {
  const headers = options.headers ?? ['BaseRowId', 'Name'];
  const rowsByBaseRowId: Record<string, string[]> = {};
  deliveries.forEach((delivery) => {
    if (rowsByBaseRowId[delivery.baseRowId]) {
      return;
    }
    const row = headers.map((header) => {
      const key = header.toLowerCase();
      if (key === 'baserowid') return delivery.baseRowId;
      if (key === 'name') return delivery.name;
      return '';
    });
    rowsByBaseRowId[delivery.baseRowId] = row;
  });
  return {
    headers,
    rowsByBaseRowId,
    mode: options.mode ?? 'baseline'
  };
};
