import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

class SwUpdateStub {
  isEnabled = true;
  versionUpdates = new Subject<VersionReadyEvent>();
  checkForUpdate = jasmine.createSpy().and.resolveTo(false);
  activateUpdate = jasmine.createSpy().and.resolveTo();
}

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: SwUpdate, useClass: SwUpdateStub }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('shows the update prompt when a new version is ready', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const swUpdate = TestBed.inject(SwUpdate) as unknown as SwUpdateStub;
    fixture.detectChanges();

    swUpdate.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: {} },
      latestVersion: { hash: 'new', appData: {} }
    } as VersionReadyEvent);
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.update-banner');
    expect(banner).toBeTruthy();
  });

  it('checks for updates on init and when the tab becomes visible', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const swUpdate = TestBed.inject(SwUpdate) as unknown as SwUpdateStub;
    fixture.detectChanges();

    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(1);
    const initialPromise = swUpdate.checkForUpdate.calls.mostRecent()
      .returnValue as Promise<boolean>;
    await initialPromise;

    const originalDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    let visibilityState = 'hidden';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState
    });

    try {
      document.dispatchEvent(new Event('visibilitychange'));
      expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(1);

      visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      const visibilityPromise = swUpdate.checkForUpdate.calls.mostRecent()
        .returnValue as Promise<boolean>;
      await visibilityPromise;
      expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(2);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(document, 'visibilityState', originalDescriptor);
      } else {
        delete (document as { visibilityState?: string }).visibilityState;
      }
    }
  });

  it('reloads when the update prompt action runs', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const component = fixture.componentInstance;
    const swUpdate = TestBed.inject(SwUpdate) as unknown as SwUpdateStub;
    const reloadSpy = spyOn(component as any, 'performReload');
    fixture.detectChanges();

    await component.reloadForUpdate();

    expect(swUpdate.activateUpdate).toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();
  });
});
