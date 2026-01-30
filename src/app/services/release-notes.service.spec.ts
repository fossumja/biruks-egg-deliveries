import { TestBed } from '@angular/core/testing';
import { ReleaseNote, ReleaseNotesService } from './release-notes.service';

describe('ReleaseNotesService', () => {
  let service: ReleaseNotesService;
  let fetchSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReleaseNotesService);
  });

  afterEach(() => {
    if (fetchSpy) {
      fetchSpy.and.callThrough();
    }
  });

  it('returns parsed release notes and caches the result', async () => {
    const notes: ReleaseNote[] = [
      { version: 'v2026.1.1', date: '2026-01-29', summary: 'Update.' }
    ];
    fetchSpy = spyOn(globalThis, 'fetch').and.resolveTo({
      ok: true,
      json: async () => notes
    } as Response);

    const first = await service.load();
    const second = await service.load();

    expect(first).toEqual(notes);
    expect(second).toEqual(notes);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('returns null when the response is not ok', async () => {
    fetchSpy = spyOn(globalThis, 'fetch').and.resolveTo({
      ok: false
    } as Response);

    const result = await service.load();

    expect(result).toBeNull();
  });
});
