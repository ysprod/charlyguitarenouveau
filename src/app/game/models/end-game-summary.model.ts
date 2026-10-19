export type EndGameResult = 'victory' | 'defeat' | 'draw';

export interface EndGameSummary {
  /** Résultat global de la manche. */
  result: EndGameResult;

  /** Score final du joueur. */
  playerScore: number;

  /** Score final du bot. */
  botScore: number;

  /** Nombre d'égalités cumulées. */
  drawCount: number;

  /** Niveau en cours (= gridSize - 2). */
  level: number;

  /** Taille de la grille (ex : 3, 4, 5…). */
  gridSize: number;

  /** Nombre d'alignements réalisés par le joueur durant la manche. */
  playerAlignments: number;

  /** Nombre d'alignements réalisés par le bot durant la manche. */
  botAlignments: number;

  /** PV gagnés par le joueur durant la manche. */
  playerGainedPv: number;

  /** PV gagnés par le bot durant la manche. */
  botGainedPv: number;

  /** Indique si un niveau précédent est disponible. */
  hasPreviousLevel: boolean;

  /** Indique si un niveau suivant est disponible. */
  hasNextLevel: boolean;
}