import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
} from '@angular/core';

import {
  CONTACT_EMAIL,
  HOST_ADDRESS,
  HOST_NAME,
  HOST_WEBSITE,
  OWNER_NAME,
  SITE_NAME,
  SITE_URL,
} from '../constants/mentions.constants';

@Component({
  selector: 'app-mentions',
  imports: [],
  templateUrl: './mentions.component.html',
  styleUrls: ['./mentions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MentionsComponent {

  /* ═══════════════════════════════════════════════════════
     DONNÉES EXPOSÉES AU TEMPLATE
     ═══════════════════════════════════════════════════════ */

  readonly siteName = SITE_NAME;
  readonly siteUrl = SITE_URL;
  readonly ownerName = OWNER_NAME;
  readonly contactEmail = CONTACT_EMAIL;

  readonly hostName = HOST_NAME;
  readonly hostAddress = HOST_ADDRESS;
  readonly hostWebsite = HOST_WEBSITE;

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