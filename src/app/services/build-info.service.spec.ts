import { TestBed } from '@angular/core/testing';
import { BuildInfo, BuildInfoService } from './build-info.service';

describe('BuildInfoService', () => {
  let service: BuildInfoService;
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BuildInfoService);
  });

  afterEach(() => {
    if (fetchSpy) {
      fetchSpy.and.callThrough();
    }
  });

  it('loads build info with no-store and caches the result', async () => {
    const info: BuildInfo = {
      version: '0.0.0',
      builtAt: '2026-01-31T12:00:00.000Z',
      commit: 'abc1234'
    };
    fetchSpy = spyOn(globalThis, 'fetch').and.resolveTo({
      ok: true,
      json: async () => info
    } as Response);

    const first = await service.load();
    const second = await service.load();

    expect(first).toEqual(info);
    expect(second).toEqual(info);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('build-info.json', { cache: 'no-store' });
  });

  it('returns null when the response is not ok', async () => {
    fetchSpy = spyOn(globalThis, 'fetch').and.resolveTo({
      ok: false
    } as Response);

    const result = await service.load();

    expect(result).toBeNull();
  });

  it('returns null when the fetch throws', async () => {
    fetchSpy = spyOn(globalThis, 'fetch').and.rejectWith(new Error('network'));

    const result = await service.load();

    expect(result).toBeNull();
  });
});
