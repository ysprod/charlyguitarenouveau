/* ═══════════════════════════════════════════════════════════
   RÈGLES DE SIMULATION
   ═══════════════════════════════════════════════════════════ */

export const MAX_EVENTS = 10;
export const TICK_INTERVAL_MS = 3000;

/* ═══════════════════════════════════════════════════════════
   VALEURS INITIALES
   ═══════════════════════════════════════════════════════════ */

export const INITIAL_TOTAL_SUPPLY = 2_450_000_000_000;
export const INITIAL_CIRCULATING_SUPPLY = 2_180_000_000_000;
export const INITIAL_RESERVES = 1_200_000_000_000;
export const INITIAL_INFLATION_RATE = 2.4;
export const INITIAL_OFO_TO_XOF = 1.0;
export const INITIAL_OFO_TO_EUR = 0.0015;
export const INITIAL_OFO_TO_USD = 0.0016;

/* ═══════════════════════════════════════════════════════════
   FORMATTERS (instanciés une seule fois)
   ═══════════════════════════════════════════════════════════ */

export const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR');