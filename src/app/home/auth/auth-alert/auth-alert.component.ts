// src/app/shared/auth-alert/auth-alert.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { AuthAlertType } from '../../models/auth-alert.model';
import {
  AUTH_ALERT_CLASS,
  AUTH_ALERT_LIVE,
  AUTH_ALERT_ROLE,
} from '../../constants/auth-alert.constants';

@Component({
  selector: 'app-auth-alert',
  templateUrl: './auth-alert.component.html',
  styleUrls: ['./auth-alert.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthAlertComponent {

  /* ═══════════════════════════════════════════════════════
     ENTRÉES
     ═══════════════════════════════════════════════════════ */

  readonly type = input.required<AuthAlertType>();
  readonly message = input.required<string>();

  /* ═══════════════════════════════════════════════════════
     COMPUTED
     ═══════════════════════════════════════════════════════ */

  /** Classe CSS de la bannière selon le type. */
  readonly bannerClass = computed(() => AUTH_ALERT_CLASS[this.type()]);

  /** Rôle ARIA selon le type. */
  readonly role = computed(() => AUTH_ALERT_ROLE[this.type()]);

  /** Mode `aria-live` selon le type. */
  readonly ariaLive = computed(() => AUTH_ALERT_LIVE[this.type()]);

  /** Vrai si l'alerte est une erreur. */
  readonly isError = computed(() => this.type() === 'error');
}