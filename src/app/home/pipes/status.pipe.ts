import { Pipe, PipeTransform } from '@angular/core';

export type MessageCategory = 'technique' | 'abonnement' | 'contenu' | 'autre';

import {
  DEFAULT_CATEGORY_ICON
} from 'src/app/home/constants/messagerie.constants';

import { CATEGORY_ICON } from '../constants/category-icons.constants';


/* ═════════════════════════════════════════════════════════════════════
   CATEGORY ICON — Retourne l'emoji de la catégorie
   ═════════════════════════════════════════════════════════════════════ */

@Pipe({
  name: 'categoryIcon',
  pure: true,
})
export class CategoryIconPipe implements PipeTransform {
  transform(category: string | undefined): string {
    return CATEGORY_ICON[category as MessageCategory] ?? DEFAULT_CATEGORY_ICON;
  }
}