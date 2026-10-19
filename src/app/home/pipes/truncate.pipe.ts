import { Pipe, PipeTransform } from '@angular/core';

import { truncate } from 'src/app/home/utils/homeconnect.utils';

/* ═════════════════════════════════════════════════════════════════════
   TRUNCATE — Tronque une chaîne à la longueur spécifiée
   ═════════════════════════════════════════════════════════════════════ */

@Pipe({
  name: 'truncate',
  pure: true,
})
export class TruncatePipe implements PipeTransform {
  transform(
    value: string | null | undefined,
    maxLength: number
  ): string {
    if (!value) return '';
    return truncate(value, maxLength);
  }
}