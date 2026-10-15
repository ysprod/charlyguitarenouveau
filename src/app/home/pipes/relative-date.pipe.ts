// src/app/home/homeconnect/inbox-panel/pipes/relative-date.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

import { formatRelativeDate } from 'src/app/home/utils/homeconnect.utils';

/* ═════════════════════════════════════════════════════════════════════
   RELATIVE DATE — Formate une date ISO en « il y a … »
   ═════════════════════════════════════════════════════════════════════ */

@Pipe({
  name: 'relativeDate',
  pure: true,
})
export class RelativeDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return formatRelativeDate(value);
  }
}