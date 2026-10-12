/* ═════════════════════════════════════════════════════════════════════
   RÉCAPITULATIF DE FIN DE PARTIE — LYKO DUEL (2 joueurs)
   ═════════════════════════════════════════════════════════════════════ */

export type DuoEndGameResult = 'player1' | 'player2' | 'draw';

export interface DuoEndGameSummary {
  /** Résultat de la manche. */
  result: DuoEndGameResult;

  /** Score final du Joueur 1. */
  player1Score: number;

  /** Score final du Joueur 2. */
  player2Score: number;

  /** Nombre d'égalités cumulées. */
  drawCount: number;

  /** Niveau en cours (= gridSize - 2). */
  level: number;

  /** Taille de la grille (ex : 3, 4, 5…). */
  gridSize: number;

  /** Alignements réalisés par le Joueur 1 durant la manche. */
  player1Alignments: number;

  /** Alignements réalisés par le Joueur 2 durant la manche. */
  player2Alignments: number;

  /** PV gagnés par le Joueur 1 durant la manche. */
  player1GainedPv: number;

  /** PV gagnés par le Joueur 2 durant la manche. */
  player2GainedPv: number;

  /** Indique si un niveau précédent est disponible. */
  hasPreviousLevel: boolean;

  /** Indique si un niveau suivant est disponible. */
  hasNextLevel: boolean;
}