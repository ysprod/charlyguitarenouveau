/** Portail vers un module d'Offoland (actif ou verrouillé). */
export interface Portail {
  /** Identifiant unique (utilisé pour le track). */
  readonly id: string;

  /** Emoji du portail. */
  readonly icon: string;

  /** Label principal (ex : ÉCONOMIE). */
  readonly label: string;

  /** Sous-titre descriptif. */
  readonly sub: string;

  /** Route Angular si le portail est actif. `null` si verrouillé. */
  readonly route: string | null;

  /** Classe CSS additionnelle (ex : portail-economie). */
  readonly cssClass: string;
}
 