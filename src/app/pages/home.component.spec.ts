import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import Papa from 'papaparse';
import { HomeComponent } from './home.component';
import { StorageService } from '../services/storage.service';
import { normalizeEventDate } from '../utils/date-utils';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let storage: StorageService;

  const buildCsvFile = (
    headers: string[],
    rows: Record<string, string>[]
  ): File => {
    const data = rows.map((row) =>
      headers.map((header) => row[header] ?? '')
    );
    const csv = Papa.unparse({ fields: headers, data });
    return new File([csv], 'backup.csv', { type: 'text/csv' });
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    storage = TestBed.inject(StorageService);
    await storage.clearAll();
  });

  afterEach(async () => {
    await storage.clearAll();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('restores one-off rows with normalized EventDate values', async () => {
    const headers = [
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
      'RunDonationStatus',
      'RunDonationMethod',
      'RunDonationAmount',
      'SuggestedAmount',
      'RunDozens',
      'EventDate'
    ];
    const rows: Record<string, string>[] = [
      {
        RowType: 'Delivery',
        BaseRowId: 'c1',
        Schedule: '2025-01-01',
        Name: 'Alice',
        Address: '123 Main St',
        City: 'Testville',
        State: 'TS',
        ZIP: '12345',
        Dozens: '2',
        'Delivery Order': '0'
      },
      {
        RowType: 'OneOffDonation',
        RunBaseRowId: 'c1',
        RunDonationStatus: 'Donated',
        RunDonationMethod: 'cash',
        RunDonationAmount: '5',
        SuggestedAmount: '5',
        EventDate: '2025-06-15'
      },
      {
        RowType: 'OneOffDelivery',
        RunBaseRowId: 'c1',
        RunDozens: '2',
        RunDonationStatus: 'Donated',
        RunDonationMethod: 'ach',
        RunDonationAmount: '8',
        SuggestedAmount: '8',
        EventDate: '45123'
      }
    ];
    const file = buildCsvFile(headers, rows);

    await (component as any).restoreFromBackupFile(file);

    const deliveries = await storage.getAllDeliveries();
    const restored = deliveries.find((delivery) => delivery.baseRowId === 'c1');
    const expectedDonationDate = normalizeEventDate('2025-06-15');
    const expectedDeliveryDate = normalizeEventDate('45123');
    expect(expectedDonationDate).toBeTruthy();
    expect(expectedDeliveryDate).toBeTruthy();
    expect(restored?.oneOffDonations?.[0]?.date).toBe(expectedDonationDate);
    expect(restored?.oneOffDeliveries?.[0]?.date).toBe(expectedDeliveryDate);
    expect(restored?.oneOffDeliveries?.[0]?.donation?.date).toBe(
      expectedDeliveryDate
    );
  });

  it('falls back to route or run dates when EventDate is missing', async () => {
    const headers = [
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
    const rows: Record<string, string>[] = [
      {
        RowType: 'Delivery',
        BaseRowId: 'c1',
        Schedule: '2025-01-01',
        Name: 'Alice',
        Address: '123 Main St',
        City: 'Testville',
        State: 'TS',
        ZIP: '12345',
        Dozens: '2',
        'Delivery Order': '0'
      },
      {
        RowType: 'OneOffDonation',
        RunBaseRowId: 'c1',
        RunDonationStatus: 'Donated',
        RunDonationMethod: 'cash',
        RunDonationAmount: '5',
        SuggestedAmount: '5',
        EventDate: ''
      },
      {
        RowType: 'OneOffDelivery',
        RunBaseRowId: 'c1',
        RunDozens: '1',
        RunDonationStatus: 'Donated',
        RunDonationMethod: 'ach',
        RunDonationAmount: '4',
        SuggestedAmount: '4',
        EventDate: ''
      },
      {
        RowType: 'RunEntry',
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
        EventDate: ''
      }
    ];
    const file = buildCsvFile(headers, rows);

    await (component as any).restoreFromBackupFile(file);

    const deliveries = await storage.getAllDeliveries();
    const restored = deliveries.find((delivery) => delivery.baseRowId === 'c1');
    const fallbackDate = normalizeEventDate('2025-01-01');
    expect(fallbackDate).toBeTruthy();
    expect(restored?.oneOffDonations?.[0]?.date).toBe(fallbackDate);
    expect(restored?.oneOffDeliveries?.[0]?.date).toBe(fallbackDate);
    expect(restored?.oneOffDeliveries?.[0]?.donation?.date).toBe(fallbackDate);

    const runEntries = await storage.getAllRunEntries();
    expect(runEntries.length).toBe(1);
    const expectedRunDate = normalizeEventDate('2025-01-02');
    expect(expectedRunDate).toBeTruthy();
    expect(runEntries[0].eventDate).toBe(expectedRunDate);
  });
});
