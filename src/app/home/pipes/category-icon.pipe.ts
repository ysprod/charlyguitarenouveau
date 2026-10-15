// src/app/home/homeconnect/inbox-panel/pipes/category-icon.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

import { getCategoryIcon } from 'src/app/home/constants/category-icons.constants';
import type { InboxCategory } from 'src/app/home/models/homeconnect.model';

/* ═════════════════════════════════════════════════════════════════════
   CATEGORY ICON — Retourne l'emoji associé à une catégorie
   ═════════════════════════════════════════════════════════════════════ */

@Pipe({
  name: 'categoryIcon',
  pure: true,
})
export class CategoryIconPipe implements PipeTransform {
  transform(category: string | InboxCategory | undefined): string {
    return getCategoryIcon(category);
  }
}