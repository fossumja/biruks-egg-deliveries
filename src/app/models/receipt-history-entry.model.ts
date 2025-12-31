import { DonationMethod, DonationStatus } from './delivery.model';

export type ReceiptHistoryKind = 'run' | 'oneOffDonation' | 'oneOffDelivery';

export interface ReceiptHistoryEntry {
  kind: ReceiptHistoryKind;
  date: string;
  status: 'delivered' | 'skipped' | 'donation';
  dozens: number;
  donationStatus: DonationStatus;
  donationMethod?: DonationMethod;
  donationAmount: number;
  taxableAmount: number;
  runEntryId?: string;
  runId?: string;
  deliveryId?: string;
  oneOffKind?: 'donation' | 'delivery';
  oneOffIndex?: number;
}
