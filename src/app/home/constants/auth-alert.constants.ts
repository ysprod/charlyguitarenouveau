// src/app/shared/auth-alert/constants/auth-alert.constants.ts

import { AuthAlertType } from '../models/auth-alert.model';

/** Rôle ARIA associé à chaque type d'alerte. */
export const AUTH_ALERT_ROLE: Readonly<Record<AuthAlertType, 'alert' | 'status'>> = {
  error: 'alert',
  success: 'status',
} as const;

/** Mode `aria-live` associé à chaque type d'alerte. */
export const AUTH_ALERT_LIVE: Readonly<Record<AuthAlertType, 'assertive' | 'polite'>> = {
  error: 'assertive',
  success: 'polite',
} as const;

/** Classe CSS de bannière associée à chaque type d'alerte. */
export const AUTH_ALERT_CLASS: Readonly<Record<AuthAlertType, string>> = {
  error: 'error-banner',
  success: 'success-banner',
} as const;