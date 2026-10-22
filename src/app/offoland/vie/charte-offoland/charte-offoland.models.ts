// src/app/charte/charte-offoland.models.ts

/** Article fondamental de la Charte d'Offoland. */
export interface Article {
  number: number;
  title: string;
  content: string;
  symbol: string;
}

/** Dimension cosmologique. */
export interface Dimension {
  name: string;
  color: string;
  note: string;
  principle: string;
}

/** Principe (une des trois dimensions de l'écoute). */
export interface Principle {
  number: string;
  title: string;
  text: string;
  symbol: string;
}

/** Item de la navigation interne. */
export interface NavItem {
  label: string;
  id: string;
}

/** Ton de couleur d'une card. */
export type CardTone = 'gold' | 'cyan' | 'night';