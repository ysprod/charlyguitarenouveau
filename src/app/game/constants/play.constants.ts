import { GameItem } from '../models/play.model'; 

export function buildGamesList(navigate: (path: string) => void): readonly GameItem[] {
  return [
    {
      id: 'lyko',
      category: 'enfants',
      title: 'LYKO',
      subtitle: 'Jouez avec vos amis ou contre LYKO !',
      tagClass: 'tag-new',
      icon: '🐵',
      btnClass: 'btn-lyko btn-duo',
      isLink: false,
      action: () => navigate('/game/lykomode')
    },
     {
      id: 'boubouni',
      category: 'enfants',
      title: 'BOUBOUNI',
      subtitle: 'Jeu de cartes',
      tagClass: 'tag-card',
      icon: '🃏',
      btnClass: 'btn-boubouni',
      isLink: false,
      action: () => navigate('/game/cards?etape=2')
    },
    {
      id: 'oracle',
      category: 'quiz',
      title: "YAYUS",
      subtitle: 'Réponds à la question',
      tagClass: 'tag-oracle',
      icon: '🔮',
      btnClass: 'btn-oracle',
      isLink: false,
      action: () => navigate('/game/oracle')
    },
    {
      id: 'guitarlive',
      category: 'live',
      title: 'GUITARE',
      subtitle: 'Joue pour le plaisir',
      tagClass: 'tag-live',
      icon: '🎸',
      btnClass: 'btn-guitarlive',
      isLink: false,
      action: () => navigate('/game/guitar-live')
    },
    {
      id: 'fretboard',
      category: 'music',
      title: 'NEW GAME',
      subtitle: 'Charly Guitare Hero',
      tagClass: 'tag-speed',
      icon: '🎸',
      btnClass: 'btn-fretboard',
      isLink: false,
      action: () => navigate('/game/fretboard')
    },
    {
      id: 'molkky',
      category: 'learning',
      title: 'METHODE',
      subtitle: 'Essentiel des accords',
      tagClass: 'tag-new',
      icon: '🪵',
      btnClass: 'btn-molkky',
      isLink: false,
      action: () => navigate('/game/memory')
    },
    {
      id: 'acoustic',
      category: 'quiz',
      title: 'QUIZ',
      subtitle: 'Physique & lutherie',
      tagClass: 'tag-quiz',
      icon: '🔊',
      btnClass: 'btn-quiz',
      isLink: false,
      action: () => navigate('/game/acoustic')
    },
    {
      id: 'chord',
      category: 'tools',
      title: 'EXO',
      subtitle: 'Décodeur & grille',
      tagClass: 'tag-tool',
      icon: '🎼',
      btnClass: 'btn-simulator',
      isLink: false,
      action: () => navigate('/game/chord')
    },
    {
      id: 'metronome',
      category: 'music',
      title: 'TEMPO',
      subtitle: 'Precision groove',
      tagClass: 'tag-metro',
      icon: '⏱️',
      btnClass: 'btn-metronome',
      isLink: false,
      action: () => navigate('/game/metronome')
    },
    {
      id: 'piano',
      category: 'tools',
      title: 'JEU',
      subtitle: 'Piano Hero',
      tagClass: 'tag-tool',
      icon: '🎹',
      btnClass: 'btn-piano',
      isLink: false,
      action: () => navigate('/game/piano')
    },
    {
      id: 'kronos',
      category: 'multi',
      title: 'LE DÉ',
      subtitle: 'Maître du temps',
      tagClass: 'tag-time',
      icon: '⏳',
      btnClass: 'btn-kronos',
      isLink: false,
      action: () => navigate('/game/kronos?etape=3')
    },   
    {
      id: 'pianovirtuel',
      category: 'tools',
      title: 'PIANO',
      subtitle: 'Piano Virtuel',
      tagClass: 'tag-tool',
      icon: '🎹',
      btnClass: 'btn-pianovirtuel',
      isLink: false,
      action: () => navigate('/game/pianovirtuel')
    }
  ];
}

/* ═══════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════ */

export const TOAST_DURATION_MS = 4000;