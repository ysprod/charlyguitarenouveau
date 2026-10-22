// src/app/charte/charte-offoland.data.ts

import type {
  Article,
  Dimension,
  Principle,
} from './charte-offoland.models';

/* ═══════════════════════════════════════════════════════════════════
   ARTICLES — 12 articles fondamentaux
   ═══════════════════════════════════════════════════════════════════ */
export const CHARTER_ARTICLES_LIST: readonly Article[] = [
  {
    number: 1,
    title: 'L’écoute',
    content:
      'Écouter avant de répondre, chercher à comprendre avant de juger et laisser à chacun la possibilité de s’exprimer.',
    symbol: '◉',
  },
  {
    number: 2,
    title: 'Le respect de la vie',
    content:
      'Reconnaître la dignité de chaque être et agir avec considération envers les vivants.',
    symbol: '♡',
  },
  {
    number: 3,
    title: 'L’équilibre',
    content:
      'Rechercher une relation juste entre les êtres, les forces, les dimensions et la nature.',
    symbol: '☯',
  },
  {
    number: 4,
    title: 'La vérité',
    content:
      'Observer, vérifier, questionner et reconnaître ce que l’on ignore. La vérité ne doit pas être remplacée par une affirmation sans fondement.',
    symbol: '⌕',
  },
  {
    number: 5,
    title: 'La responsabilité',
    content:
      'Celui qui détient un pouvoir, un savoir ou une autorité doit répondre de ses actes et considérer leurs conséquences.',
    symbol: '⚖',
  },
  {
    number: 6,
    title: 'La connaissance',
    content:
      'Apprendre est un chemin continu, nourri par l’observation, l’expérience, la réflexion et l’écoute des autres.',
    symbol: '◇',
  },
  {
    number: 7,
    title: 'Les Sept Temples',
    content:
      'Les Sept Temples représentent des lieux de mémoire, de réflexion et de cheminement spirituel dans l’univers d’Offoland.',
    symbol: '⌂',
  },
  {
    number: 8,
    title: 'Les Sept Sages',
    content:
      'Les Sages transmettent leurs enseignements par l’exemple, la parole et l’écoute. Ils éclairent le chemin sans supprimer le libre arbitre.',
    symbol: '✧',
  },
  {
    number: 9,
    title: 'Les Sept Esprits',
    content:
      'Les Sept Esprits appartiennent à la cosmologie d’Offoland. Leur symbolique doit être préservée selon les fondements de la Grande Bible.',
    symbol: '✺',
  },
  {
    number: 10,
    title: 'La musique et le son',
    content:
      'Le son est un moyen d’expression, de mémoire et de transmission. La musique relie l’écoute, l’émotion, le rythme et la création.',
    symbol: '♫',
  },
  {
    number: 11,
    title: 'La protection du monde',
    content:
      'Les fleuves, les montagnes, les forêts, les lacs et les terres sont un héritage à préserver.',
    symbol: '♧',
  },
  {
    number: 12,
    title: 'La transmission',
    content:
      'Chaque génération reçoit un héritage, le questionne, l’enrichit et le transmet sans perdre les fondements de la mémoire collective.',
    symbol: '∞',
  },
] as const;

/* ═══════════════════════════════════════════════════════════════════
   PRINCIPES — 3 dimensions de l'écoute
   ═══════════════════════════════════════════════════════════════════ */
export const CHARTER_PRINCIPLES: readonly Principle[] = [
  {
    number: '01',
    title: 'L’écoute de soi',
    text: 'Prêter attention à ses pensées, à ses émotions, à ses limites et à ses intentions. Apprendre à se connaître avec sincérité.',
    symbol: '◉',
  },
  {
    number: '02',
    title: 'L’écoute de l’autre',
    text: 'Accueillir les paroles et les différences, chercher à comprendre les expériences d’autrui et permettre le dialogue sans humiliation.',
    symbol: '◎',
  },
  {
    number: '03',
    title: 'L’écoute du monde',
    text: 'Observer les sons, les silences, la nature et les changements qui nous entourent afin d’agir avec davantage de conscience.',
    symbol: '❋',
  },
] as const;

/* ═══════════════════════════════════════════════════════════════════
   DIMENSIONS — cosmologie
   ═══════════════════════════════════════════════════════════════════ */
export const CHARTER_DIMENSIONS_LIST: readonly Dimension[] = [
  {
    name: 'Offoré',
    color: 'Rouge',
    note: 'Ré',
    principle: 'L’épreuve',
  },
  {
    name: 'Offola',
    color: 'Jaune',
    note: 'La',
    principle: 'La vision',
  },
  {
    name: 'Offosi',
    color: 'Violet',
    note: 'Si',
    principle: 'L’accomplissement',
  },
] as const;

/* ═══════════════════════════════════════════════════════════════════
   GARDIENS — devoirs
   ═══════════════════════════════════════════════════════════════════ */
export const CHARTER_GUARDIAN_DUTIES: readonly string[] = [
  'Incarner l’écoute dans ses actes.',
  'Protéger la mémoire et les enseignements d’Offoland.',
  'Transmettre les connaissances avec responsabilité.',
  'Favoriser le dialogue entre les générations.',
  'Respecter les différences et la dignité de chacun.',
  'Reconnaître ses erreurs et accepter d’apprendre.',
] as const;

/* ═══════════════════════════════════════════════════════════════════
   SERMENT — paragraphes
   ═══════════════════════════════════════════════════════════════════ */
export const CHARTER_OATH_PARAGRAPHS: readonly string[] = [
  'Je choisis d’écouter avant de parler, de comprendre avant de juger et de réfléchir avant d’agir.',
  'Je respecterai la parole d’autrui sans renoncer à ma conscience. Je chercherai la vérité sans prétendre tout savoir.',
  'Je protégerai la mémoire, je respecterai la vie et je transmettrai ce que j’aurai appris avec humilité.',
  'Je me souviendrai que la force sans écoute peut devenir domination, que la connaissance sans écoute peut devenir orgueil et que la parole sans écoute perd sa capacité à unir.',
  'Je ferai de l’écoute le commencement de mes actes et de l’harmonie l’horizon de mon chemin.',
] as const;