import { TestBed } from '@angular/core/testing';
import { StorageService } from '../app/services/storage.service';
import { miniRouteFixture } from './fixtures/mini-route.fixture';
import { Delivery } from '../app/models/delivery.model';

// Helper to create a fresh StorageService and seed it with a mini route.
export async function createStorageWithMiniRoute(): Promise<StorageService> {
  const storage = TestBed.inject(StorageService);
  await storage.clearAll();
  const deliveries: Delivery[] = miniRouteFixture();
  await storage.importDeliveries(deliveries);
  return storage;
}
