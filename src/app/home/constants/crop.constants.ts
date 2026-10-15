// src/app/shared/avatar-crop-dialog/constants/crop.constants.ts

/* ═══════════════════════════════════════════════════════════
   DIMENSIONS DU VIEWPORT
   ═══════════════════════════════════════════════════════════ */

/** Taille logique du canvas d'aperçu (carré). */
export const VIEWPORT_SIZE = 340;

/** Taille minimum du crop en px natifs (évite les micro-crops). */
export const MIN_CROP_PX = 60;

/* ═══════════════════════════════════════════════════════════
   BORNES DE ZOOM
   ═══════════════════════════════════════════════════════════ */

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.05;
export const WHEEL_ZOOM_DELTA = 0.1;