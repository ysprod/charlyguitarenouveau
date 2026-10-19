 /**
 * Représentation immuable d'une dimension d'Offoland.
 */
export interface Dimension {
  readonly numero: number;
  readonly nom: string;
  readonly couleur: string;
  readonly couleurSecondaire: string;
  readonly note: string;
  readonly sage: string;
  readonly sageTitre: string;
  readonly temple: string;
  readonly totem: string;
  readonly totemEmoji: string;
  readonly instrument: string;
  readonly instrumentEmoji: string;
  readonly esprit: string;
  readonly espritEmoji: string;
  readonly don: string;
  readonly epreuve: string;
  readonly question: string;
  readonly citation: string;
}