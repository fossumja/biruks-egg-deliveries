import { Injectable } from '@angular/core';

export interface BuildInfo {
  version: string;
  builtAt: string;
  commit?: string | null;
}

@Injectable({ providedIn: 'root' })
export class BuildInfoService {
  private cache?: BuildInfo;

  async load(): Promise<BuildInfo | null> {
    if (this.cache) return this.cache;
    try {
      // build-info.json is emitted at the app root from /public.
      const res = await fetch('build-info.json', { cache: 'no-store' });
      if (!res.ok) return null;
      const data = (await res.json()) as BuildInfo;
      this.cache = data;
      return data;
    } catch (err) {
      console.warn('build-info fetch failed', err);
      return null;
    }
  }
}
