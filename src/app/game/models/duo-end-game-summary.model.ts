/** Résultat d'une manche de Lyko Duel. */
export type DuoEndGameResult = 'player1' | 'player2' | 'draw';

/** Résumé complet affiché dans le dialogue de fin de manche. */
export interface DuoEndGameSummary {
  readonly result: DuoEndGameResult;
  readonly player1Score: number;
  readonly player2Score: number;
  readonly drawCount: number;
  readonly level: number;
  readonly gridSize: number;
  readonly player1Alignments: number;
  readonly player2Alignments: number;
  readonly player1GainedPv: number;
  readonly player2GainedPv: number;
  readonly hasPreviousLevel: boolean;
  readonly hasNextLevel: boolean;
}