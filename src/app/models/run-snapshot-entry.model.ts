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

  status: 'delivered' | 'skipped' | 'donation';
  dozens: number;
  deliveryOrder: number;

  donationStatus: DonationStatus;
  donationMethod?: DonationMethod;
  donationAmount: number;
  taxableAmount: number;
  /**
   * When shown in history/All receipts views, this is the event timestamp
   * (run date or one-off event date).
   */
  eventDate?: string;
  /**
   * For synthetic "oneoff" receipts in history, these fields identify
   * the underlying one-off record on a specific delivery.
   */
  deliveryId?: string;
  oneOffKind?: 'donation' | 'delivery';
  oneOffIndex?: number;
}
