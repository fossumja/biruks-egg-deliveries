import { isDevMode } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwRegistrationOptions } from '@angular/service-worker';
import { appConfig } from './app.config';

describe('appConfig service worker registration', () => {
  it('provides service worker registration options', () => {
    TestBed.configureTestingModule({
      providers: appConfig.providers
    });

    const options = TestBed.inject(SwRegistrationOptions);

    expect(options.enabled).toBe(!isDevMode());
    expect(options.registrationStrategy).toBe('registerWhenStable:30000');
  });
});
