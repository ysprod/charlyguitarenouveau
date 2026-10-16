// src/app/legal/privacy/privacy.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
} from '@angular/core';

import {
  CONTACT_EMAIL,
  LAST_UPDATED,
  SITE_NAME,
  SITE_URL,
} from '../constants/privacy.constants';

@Component({
  selector: 'app-privacy',
  imports: [],
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyComponent {

  /* ═══════════════════════════════════════════════════════
     DONNÉES EXPOSÉES AU TEMPLATE
     ═══════════════════════════════════════════════════════ */

  readonly siteName = SITE_NAME;
  readonly siteUrl = SITE_URL;
  readonly contactEmail = CONTACT_EMAIL;
  readonly lastUpdated = LAST_UPDATED;

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      if (typeof window === 'undefined') return;
      window.scrollTo(0, 0);
    });
  }
}