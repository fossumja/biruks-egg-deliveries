import { DonationMethod, DonationStatus } from './delivery.model';

export interface RunSnapshotEntry {
  id: string;
  runId: string;

  baseRowId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip?: string;

  status: 'delivered' | 'skipped';
  dozens: number;
  deliveryOrder: number;

  donationStatus: DonationStatus;
  donationMethod?: DonationMethod;
  donationAmount: number;
  taxableAmount: number;
}
