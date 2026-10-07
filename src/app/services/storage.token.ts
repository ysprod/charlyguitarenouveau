import { InjectionToken } from '@angular/core';

export const STORAGE = new InjectionToken<Storage | null>('STORAGE', {
  factory: () => (typeof window !== 'undefined' ? window.localStorage : null),
});