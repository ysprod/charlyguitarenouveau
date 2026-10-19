/** Note enregistrée avec sa position temporelle et sa durée. */
export interface RecordedNote {
  readonly note: string;
  readonly time: number;
  readonly duration: number;
}

/** Composition sauvegardée dans le `StorageService`. */
export interface SavedSong {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly bpm: number;
  readonly notes: readonly RecordedNote[];
}

/* ═══════════════════════════════════════════════════════════
   PARTICULES (canvas)
   ═══════════════════════════════════════════════════════════ */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}