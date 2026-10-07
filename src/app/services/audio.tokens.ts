import { InjectionToken } from '@angular/core';

export const AUDIO_CONTEXT_CTOR = new InjectionToken<typeof AudioContext | null>(
  'AUDIO_CONTEXT_CTOR',
  {
    factory: () => {
      if (typeof window === 'undefined') return null;
      return (window as any).AudioContext || (window as any).webkitAudioContext || null;
    },
  }
);