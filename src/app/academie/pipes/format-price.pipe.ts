// src/app/features/documents/pipes/format-price.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';
import { formatPrice } from 'src/app/academie/utils/documents.utils';
 

/* ═════════════════════════════════════════════════════════════════════
   FORMAT PRICE — Pipe pur pour formater les prix en FCFA
   ═════════════════════════════════════════════════════════════════════ */

@Pipe({
  name: 'formatPrice',
  standalone: true,
  pure: true,
})
export class FormatPricePipe implements PipeTransform {
  transform(value: number | undefined | null): string {
    return formatPrice(value);
  }
}