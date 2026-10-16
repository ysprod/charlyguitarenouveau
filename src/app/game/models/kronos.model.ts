// src/app/game/kronos/models/kronos.model.ts

/* ═══════════════════════════════════════════════════════════
   TYPES DE JEU
   ═══════════════════════════════════════════════════════════ */

export type SoundType = 'roll' | 'win' | 'power';

/* ═══════════════════════════════════════════════════════════
   POUVOIR TEMPOREL
   ═══════════════════════════════════════════════════════════ */

export interface PowerUp {
  id: string;
  name: string;
  icon: string;
  cost: number;
  description: string;
  cooldown: number;
  currentCooldown: number;
  active: boolean;
}

/* ═══════════════════════════════════════════════════════════
   HISTORIQUE
   ═══════════════════════════════════════════════════════════ */

export interface HistoryEntry {
  face: number;
  avant: number;
  apres: number;
  date: Date;
}

/* ═══════════════════════════════════════════════════════════
   FACE DU DÉ
   ═══════════════════════════════════════════════════════════ */

export interface DiceFace {
  value: number;
  symbol: string;
  name: string;
}