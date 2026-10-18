// src/app/features/messagerie/pipes/status.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

import {
  MessageCategory
} from '../models/user-message.model';

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