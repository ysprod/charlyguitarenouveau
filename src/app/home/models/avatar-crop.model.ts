/**
 * Représente la zone de recadrage à appliquer à une image.
 * Toutes les valeurs sont en pixels, dans le repère de l'image NATIVE.
 */
export interface CropArea {
  /** Position X du coin supérieur gauche dans l'image native. */
  readonly x: number;

  /** Position Y du coin supérieur gauche dans l'image native. */
  readonly y: number;

  /** Largeur du carré de recadrage (en px natifs). */
  readonly width: number;

  /** Hauteur du carré de recadrage (en px natifs, égale à `width`). */
  readonly height: number;
}

/**
 * Résultat final d'un recadrage : un Blob d'image prêt à uploader.
 */
export interface CropResult {
  readonly blob: Blob;
  readonly dataUrl: string;
  readonly width: number;
  readonly height: number;
}

/** Taille finale exportée (côté du carré). */
export const AVATAR_OUTPUT_SIZE = 200;

/** Ratio qualité JPEG à l'export. */
export const AVATAR_JPEG_QUALITY = 0.9;

export const MAX_SOURCE_FILE_SIZE = 12 * 1024 * 1024; // 10 Mo