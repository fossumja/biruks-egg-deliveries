import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ToastMessage, ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;
  let latest: ToastMessage | null = null;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
    service.messages$.subscribe((message) => {
      latest = message;
    });
  });

  it('emits a toast and clears it after the duration', fakeAsync(() => {
    service.show('Saved', 'success', 50);

    expect(latest?.message).toBe('Saved');

    tick(49);
    expect(latest?.message).toBe('Saved');

    tick(1);
    expect(latest).toBeNull();
  }));

  it('does not clear a newer toast when an older timer fires', fakeAsync(() => {
    service.show('First', 'info', 50);
    const firstId = latest?.id;

    tick(25);
    service.show('Second', 'success', 50);

    expect(latest?.id).not.toBe(firstId);
    expect(latest?.message).toBe('Second');

    tick(25);
    expect(latest?.message).toBe('Second');

    tick(50);
    expect(latest).toBeNull();
  }));
});
