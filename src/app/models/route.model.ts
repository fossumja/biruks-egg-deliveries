export interface Route {
  routeDate: string;
  name?: string;
  totalStops: number;
  deliveredCount: number;
  skippedCount: number;
  createdAt: string;
  lastUpdatedAt: string;
  currentIndex?: number;
  completed?: boolean;
}
