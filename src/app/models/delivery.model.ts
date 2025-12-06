export type DeliveryStatus = '' | 'changed' | 'delivered' | 'skipped';
export type DonationStatus = 'NotRecorded' | 'Donated' | 'NoDonation';
export type DonationMethod = 'cash' | 'venmo' | 'ach' | 'paypal' | 'other';

export interface DonationInfo {
  status: DonationStatus;
  method?: DonationMethod;
  amount?: number;
  suggestedAmount?: number;
  // Portion of the donation that is above the suggested amount.
  // This is the "taxable" donation amount we want to track and total.
  taxableAmount?: number;
  date?: string;
  note?: string;
}

export interface Delivery {
  id: string;
  runId: string;
  baseRowId: string;
  week?: string;
  routeDate: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  dozens: number;
  originalDozens?: number;
  deliveredDozens?: number;
  deliveryOrder: number;
  subscribed?: boolean;
  notes?: string;
  sortIndex: number;
  status: DeliveryStatus;
  donation?: DonationInfo;
  originalDonation?: DonationInfo;
  oneOffDonations?: DonationInfo[];
  oneOffDeliveries?: {
    deliveredDozens?: number;
    donation?: DonationInfo;
    date: string;
  }[];
  deliveredAt?: string;
  skippedAt?: string;
  skippedReason?: string;
  createdAt: string;
  updatedAt: string;
  synced?: boolean;
}
