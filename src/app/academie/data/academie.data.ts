// src/app/academie/data/academie.data.ts

import { Formation, LiveCard } from '../models/academie.model';

/* ═════════════════════════════════════════════════════════════════════
   FORMATIONS
   ═════════════════════════════════════════════════════════════════════ */

export const FORMATIONS: readonly Formation[] = [
  {
    id: 'apprendre',
    number: '02',
    icon: '🎓',
    label: 'FORMATION',
    title: 'APPRENDRE',
    description:
      'Progressez à votre rythme grâce à nos cours, exercices et contenus pédagogiques.',
    subcategories: [
      'Cours de guitare',
      'Piano',
      'Solfège',
      'MAO',
      'Formation musicale',
      'Exercices et vidéos',
    ],
    actionLabel: "Démarrer l'apprentissage",
    actionRoute: '/contact',
    highlighted: true,
    popular: true,
  },
  {
    id: 'master-class',
    number: '03',
    icon: '🎤',
    label: 'EXPERTS',
    title: 'MASTER CLASS',
    description:
      'Découvrez les techniques et conseils de musiciens expérimentés lors de sessions exclusives.',
    subcategories: [
      'Prochaines master class',
      'Programme détaillé',
      'Dates et lieux',
      'Inscription / Réservation',
    ],
    actionLabel: "S'inscrire aux sessions",
    actionRoute: '/contact',
    highlighted: false,
    popular: false,
  },
  {
    id: 'cours-prives',
    number: '06',
    icon: '👨🏾‍🏫',
    label: 'PERSONNALISÉ',
    title: 'COURS PRIVÉS',
    description:
      "Bénéficiez d'un accompagnement personnalisé adapté à votre niveau et à vos objectifs.",
    subcategories: [
      'Cours à domicile',
      'Cours en ligne',
      'Programme privé',
      'Accompagnement personnalisé',
    ],
    actionLabel: 'Réserver un professeur',
    actionRoute: '/contact',
    highlighted: false,
    popular: false,
  },
];

/* ═════════════════════════════════════════════════════════════════════
   LIVE CARDS
   ═════════════════════════════════════════════════════════════════════ */

export const LIVE_CARDS: readonly LiveCard[] = [
  {
    id: 'master-class-live',
    icon: '🎓',
    backgroundIcon: '🎓',
    title: 'MASTER CLASS LIVE',
    description:
      'Participez aux sessions interactives avec des experts et développez votre technique.',
    actionLabel: 'Rejoindre la session',
    actionRoute: '/contact',
  },
  {
    id: 'cours-live',
    icon: '🎸',
    backgroundIcon: '🎸',
    title: 'COURS LIVE',
    description:
      'Apprenez en temps réel avec un formateur et bénéficiez de conseils personnalisés.',
    actionLabel: "S'inscrire au cours",
    actionRoute: '/contact',
  },
];