// src/app/shared/avatar-crop-dialog/models/crop.model.ts

/**
 * Point 2D dans le repère du canvas (px logiques).
 *
 * ⚠️ Type interne mutable : utilisé comme structure de travail
 *    pour l'offset, le drag et le pinch. Pas de `readonly`.
 */
export interface Point {
  x: number;
  y: number;
}