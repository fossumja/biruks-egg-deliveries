import { Injectable } from '@angular/core';

export interface ReleaseNote {
  version: string;
  date?: string;
  summary: string;
  highlights?: string[];
}

@Injectable({ providedIn: 'root' })
export class ReleaseNotesService {
  private cache?: ReleaseNote[];

  async load(): Promise<ReleaseNote[] | null> {
    if (this.cache) return this.cache;
    try {
      const res = await fetch('release-notes.json', { cache: 'no-store' });
      if (!res.ok) return null;
      const data = (await res.json()) as unknown;
      if (!Array.isArray(data)) return null;
      const notes = data.filter(this.isReleaseNote);
      this.cache = notes;
      return notes;
    } catch (err) {
      console.warn('release notes fetch failed', err);
      return null;
    }
  }

  private isReleaseNote(value: unknown): value is ReleaseNote {
    if (!value || typeof value !== 'object') return false;
    const note = value as ReleaseNote;
    return (
      typeof note.version === 'string' &&
      typeof note.summary === 'string' &&
      (note.date === undefined || typeof note.date === 'string') &&
      (note.highlights === undefined || Array.isArray(note.highlights))
    );
  }
}
