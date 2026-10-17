import { GameFilter, GameItem } from '../models/play.model';

/* ═══════════════════════════════════════════════════════
   FILTRES
   ═══════════════════════════════════════════════════════ */

export const GAME_FILTERS: readonly GameFilter[] = [
  { id: 'all',      label: 'Tous',      icon: '🎮' },
  { id: 'enfants',  label: 'Enfants',   icon: '🧒' },
  { id: 'music',    label: 'Musique',   icon: '🎵' },
  { id: 'learning', label: 'Apprendre', icon: '📚' },
  { id: 'live',     label: 'Live',      icon: '🎸' },
  { id: 'multi',    label: 'Multi',     icon: '👥' },
  { id: 'quiz',     label: 'Quiz',      icon: '🧠' },
  { id: 'tools',    label: 'Outils',    icon: '🛠️' }
];

/* ═══════════════════════════════════════════════════════
   JEUX
   ═══════════════════════════════════════════════════════ */

export function buildGamesList(navigate: (path: string) => void): readonly GameItem[] {
  return [
    {
      id: 'lyko',
      category: 'enfants',
      title: 'LYKO LE SAGE',
      subtitle: 'Jouez avec vos amis ou contre LYKO !',
      tag: 'DUEL',
      tagClass: 'tag-new',
      icon: '🐵',
      btnClass: 'btn-lyko btn-duo',
      isLink: false,
      action: () => navigate('/lykomode?etape=1')
    },
     {
      id: 'boubouni',
      category: 'enfants',
      title: 'BOUBOUNI',
      subtitle: 'Jeu de cartes endiablé',
      tag: 'CARTES',
      tagClass: 'tag-card',
      icon: '🃏',
      btnClass: 'btn-boubouni',
      isLink: false,
      action: () => navigate('/cards?etape=2')
    },
    {
      id: 'oracle',
      category: 'quiz',
      title: "L'ORACLE",
      subtitle: 'Réponds à la question',
      tag: 'MATRIX',
      tagClass: 'tag-oracle',
      icon: '🔮',
      btnClass: 'btn-oracle',
      isLink: false,
      action: () => navigate('/oracle')
    },
    {
      id: 'guitarlive',
      category: 'live',
      title: 'GUITARE LIVE',
      subtitle: 'Joue pour le plaisir',
      tag: 'LIVE',
      tagClass: 'tag-live',
      icon: '🎸',
      btnClass: 'btn-guitarlive',
      isLink: false,
      action: () => navigate('/guitar-live')
    },
    {
      id: 'fretboard',
      category: 'music',
      title: 'CHARLY GUITARE HERO',
      subtitle: 'Chasse au fretboard',
      tag: 'RAPIDITÉ',
      tagClass: 'tag-speed',
      icon: '🎸',
      btnClass: 'btn-fretboard',
      isLink: false,
      action: () => navigate('/fretboard')
    },
    {
      id: 'molkky',
      category: 'learning',
      title: 'METHODE CHARLY GUITARE',
      subtitle: 'Essentiel des accords',
      tag: 'NOUVEAU',
      tagClass: 'tag-new',
      icon: '🪵',
      btnClass: 'btn-molkky',
      isLink: false,
      action: () => navigate('/memory')
    },
    {
      id: 'acoustic',
      category: 'quiz',
      title: 'QUIZ ACOUSTIQUE',
      subtitle: 'Physique & lutherie',
      tag: 'QUIZ',
      tagClass: 'tag-quiz',
      icon: '🔊',
      btnClass: 'btn-quiz',
      isLink: false,
      action: () => navigate('/acoustic')
    },
    {
      id: 'chord',
      category: 'tools',
      title: 'EXO SIMULATION',
      subtitle: 'Décodeur & grille',
      tag: 'OUTIL',
      tagClass: 'tag-tool',
      icon: '🎼',
      btnClass: 'btn-simulator',
      isLink: false,
      action: () => navigate('/chord')
    },
    {
      id: 'metronome',
      category: 'music',
      title: 'DÉFI MÉTRONOME',
      subtitle: 'Precision groove',
      tag: 'DÉFI',
      tagClass: 'tag-metro',
      icon: '⏱️',
      btnClass: 'btn-metronome',
      isLink: false,
      action: () => navigate('/metronome')
    },
   
    {
      id: 'kronos',
      category: 'multi',
      title: 'DÉ DE KRONOS',
      subtitle: 'Maître du temps',
      tag: 'TEMPS',
      tagClass: 'tag-time',
      icon: '⏳',
      btnClass: 'btn-kronos',
      isLink: false,
      action: () => navigate('/kronos?etape=3')
    },
    {
      id: 'piano',
      category: 'tools',
      title: 'JEU DE PIANO',
      subtitle: 'Piano Hero',
      tag: 'OUTIL',
      tagClass: 'tag-tool',
      icon: '🎹',
      btnClass: 'btn-piano',
      isLink: false,
      action: () => navigate('/piano')
    },
    {
      id: 'pianovirtuel',
      category: 'tools',
      title: 'APPRENDRE LE PIANO',
      subtitle: 'Piano Virtuel',
      tag: 'OUTIL',
      tagClass: 'tag-tool',
      icon: '🎹',
      btnClass: 'btn-pianovirtuel',
      isLink: false,
      action: () => navigate('/pianovirtuel')
    }
  ];
}

/* ═══════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════ */

export const TOAST_DURATION_MS = 4000;