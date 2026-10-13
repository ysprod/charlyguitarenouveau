import { Injectable } from '@angular/core';

import {
  AVATAR_JPEG_QUALITY,
  AVATAR_OUTPUT_SIZE,
  CropArea,
  CropResult
} from './models/avatar-crop.model';

/**
 * Service utilitaire pour recadrer une image dans le navigateur
 * (aucun backend, tout se passe côté client via Canvas API).
 */
@Injectable({ providedIn: 'root' })
export class ImageCropService {

  /**
   * Charge une image depuis un File/Blob et retourne un HTMLImageElement.
   */
  loadImage(file: File | Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Impossible de charger l'image."));
      };

      img.src = url;
    });
  }

  /**
   * Recadre une image source selon la zone donnée, la redimensionne
   * à `AVATAR_OUTPUT_SIZE × AVATAR_OUTPUT_SIZE`, et retourne
   * un Blob JPEG + sa dataUrl.
   */
  async cropToSquare(
    image: HTMLImageElement,
    area: CropArea
  ): Promise<CropResult> {
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_OUTPUT_SIZE;
    canvas.height = AVATAR_OUTPUT_SIZE;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D non supporté par ce navigateur.');
    }

    /* Améliore la qualité du redimensionnement */
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    /* Remplit le fond en blanc (utile pour les PNG transparents) */
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);

    /* Dessine la zone recadrée, mise à l'échelle vers 300×300 */
    ctx.drawImage(
      image,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      AVATAR_OUTPUT_SIZE,
      AVATAR_OUTPUT_SIZE
    );

    /* Export en Blob JPEG */
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('Échec export image.'))),
        'image/jpeg',
        AVATAR_JPEG_QUALITY
      );
    });

    return {
      blob,
      dataUrl: canvas.toDataURL('image/jpeg', AVATAR_JPEG_QUALITY),
      width: AVATAR_OUTPUT_SIZE,
      height: AVATAR_OUTPUT_SIZE
    };
  }

  /**
   * Convertit un Blob en File (nécessaire pour Firebase Storage).
   */
  blobToFile(blob: Blob, filename = 'avatar.jpg'): File {
    return new File([blob], filename, { type: blob.type || 'image/jpeg' });
  }
}