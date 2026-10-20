import { LiveCard, LiveVideo } from '../models/live.model';

/* ═════════════════════════════════════════════════════════════════════
   VIDÉO MISE EN AVANT
   ═════════════════════════════════════════════════════════════════════ */

export const LIVE_VIDEO: LiveVideo = {
  title: ' ',
  embedUrl:
    'https://www.youtube.com/embed/3bvbSb43SvM?autoplay=1&rel=0&modestbranding=1',
  watchUrl: 'https://www.youtube.com/watch?v=3bvbSb43SvM',
  badge: 'SHOWCASE',
};

/* ═════════════════════════════════════════════════════════════════════
   CARTES SECONDAIRES
   ═════════════════════════════════════════════════════════════════════ */

export const LIVE_CARDS: readonly LiveCard[] = [
  {
    id: 'concerts',
    icon: '🎤',
    title: 'CONCERTS',
    description: 'Vivre les grandes performances musicales',
    actionLabel: 'Regarder',
    actionUrl:
      'https://www.youtube.com/watch?v=RjDWzzwbeUM',
    cssClass: 'card-concerts',
  },
  {
    id: 'replay',
    icon: '⏮️',
    title: 'REPLAY',
    description: 'Revoir tous les directs et événements terminés',
    actionLabel: 'Accéder aux archives',
    actionUrl: 'https://www.youtube.com/@CharlyGuitare',
    cssClass: 'card-replay',
  },
];