export const INSTALLED_KEY = 'charlyguitare_app_installed';

/* ═══════════════════════════════════════════════════════════
   SÉLECTEURS DOM
   ═══════════════════════════════════════════════════════════ */

/** Sélecteur des éléments focusables (pour le focus trap). */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');