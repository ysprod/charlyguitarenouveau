// src/app/features/messagerie/pipes/status.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';

import {
  MessageCategory,
  MessageStatus,
} from '../models/user-message.model';

import {
  STATUS_BADGE_CLASS,
  DEFAULT_STATUS_BADGE,
  STATUS_LABEL,
  DEFAULT_STATUS_LABEL,
  STATUS_ICON,
  DEFAULT_STATUS_ICON,
  DEFAULT_CATEGORY_ICON,
} from 'src/app/home/constants/messagerie.constants';

import { CATEGORY_ICON } from '../constants/category-icons.constants';

/* ═════════════════════════════════════════════════════════════════════
   STATUS BADGE CLASS — Retourne la classe CSS du badge de statut
   ═════════════════════════════════════════════════════════════════════ */

@Pipe({
  name: 'statusBadgeClass',
  pure: true,
})
export class StatusBadgeClassPipe implements PipeTransform {
  transform(status: string | undefined): string {
    return (
      STATUS_BADGE_CLASS[status as MessageStatus] ?? DEFAULT_STATUS_BADGE
    );
  }
}

/* ═════════════════════════════════════════════════════════════════════
   STATUS LABEL — Retourne le label lisible du statut
   ═════════════════════════════════════════════════════════════════════ */

@Pipe({
  name: 'statusLabel',
  pure: true,
})
export class StatusLabelPipe implements PipeTransform {
  transform(status: string | undefined): string {
    return STATUS_LABEL[status as MessageStatus] ?? DEFAULT_STATUS_LABEL;
  }
}

/* ═════════════════════════════════════════════════════════════════════
   STATUS ICON — Retourne l'emoji du statut
   ═════════════════════════════════════════════════════════════════════ */

@Pipe({
  name: 'statusIcon',
  pure: true,
})
export class StatusIconPipe implements PipeTransform {
  transform(status: string | undefined): string {
    return STATUS_ICON[status as MessageStatus] ?? DEFAULT_STATUS_ICON;
  }
}

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