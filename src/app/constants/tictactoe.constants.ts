/* ═════════════════════════════════════════════════════════════════════
   TICTACTOE — CONSTANTES
   ═════════════════════════════════════════════════════════════════════ */

/** Récompense en PV par alignement de 3. */
export const ALIGNMENT_REWARD = 10;

/** Nombre de confettis projetés en cas de victoire. */
export const CONFETTI_COUNT = 60;

/** Durée d'affichage des confettis (ms). */
export const CONFETTI_DURATION_MS = 4500;

/** Délai de "réflexion" du bot avant de jouer (ms). */
export const BOT_THINK_DELAY_MS = 400;

/** Durée de mise en évidence des cellules gagnantes (ms). */
export const WINNING_HIGHLIGHT_MS = 1000;

/** Délai avant d'afficher le dialogue de fin (ms). */
export const END_GAME_DELAY_MS = 300;

/** Taille minimale de la grille. */
export const GRID_MIN_SIZE = 3;

/** Longueur d'un alignement gagnant. */
export const WINNING_STREAK = 3;

/** Symboles de jeu. */
export const SYMBOL_PLAYER = 'tick';
export const SYMBOL_BOT = 'cross';

/** Assets des pions. */
export const ASSET_PLAYER = 'assets/bleu.jpg';
export const ASSET_BOT = 'assets/gblanc.jpg';

/** Nombre de particules par cellule nouvellement jouée. */
export const CELL_PARTICLES = [1, 2, 3, 4] as const;