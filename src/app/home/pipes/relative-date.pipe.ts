// src/app/home/pipes/relative-date.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

/**
 * Affiche une date relative en français :
 *   "À l'instant" · "il y a 5 min" · "il y a 2 h" · "hier" · "12/10/2026"
 *
 * ✅ Accepte :
 *   - un timestamp en millisecondes (number)
 *   - une chaîne ISO (string)
 *   - null / undefined → ''
 */
@Pipe({
  name: 'relativeDate',
  standalone: true,
})
export class RelativeDatePipe implements PipeTransform {
  transform(value: number | string | Date | null | undefined): string {
    if (value === null || value === undefined) return '';

    let timestamp: number;

    if (typeof value === 'number') {
      timestamp = value;
    } else if (value instanceof Date) {
      timestamp = value.getTime();
    } else {
      // string ISO ou date parsable
      const parsed = new Date(value).getTime();
      if (Number.isNaN(parsed)) return '';
      timestamp = parsed;
    }

    if (!Number.isFinite(timestamp) || timestamp <= 0) return '';

    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffH = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffH / 24);

    if (diffSec < 60) return "À l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    if (diffH < 24) return `il y a ${diffH} h`;
    if (diffDays === 1) return 'hier';
    if (diffDays < 7) return `il y a ${diffDays} jours`;

    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}