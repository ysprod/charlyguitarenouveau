// src/app/live/data/live.data.ts

import { LiveCard, LiveVideo, FeaturedVideo } from '../models/live.model';

export const PLAYLIST_URL = 'https://youtube.com/playlist?list=PLPbbzqLqrP7U&si=Ur46ov_xX4vuT_Wb';

export const LIVE_VIDEO: LiveVideo = {
  title: 'Charly Guitare Live',
  embedUrl: 'https://www.youtube.com/embed/3bvbSb43SvM?autoplay=1&rel=0&modestbranding=1',
  watchUrl: 'https://www.youtube.com/watch?v=3bvbSb43SvM',
  badge: 'SHOWCASE',
};

export const LIVE_CARDS: readonly LiveCard[] = [
 
  {
    id: 'replay',
    icon: '⏮️',
    title: 'REPLAY',
    description: 'Revoir tous les directs et événements terminés',
    date: 'Archives',
    actionLabel: 'Accéder ',
    actionUrl: 'https://www.youtube.com/playlist?list=PLPbbzqLqrP7U',
    cssClass: 'card-replay',
  },
];

/* ═════════════════════════════════════════════════════════════════════
   POOL DE VIDÉOS "À LA UNE" (Minimum 6 pour que la rotation soit utile)
   ═════════════════════════════════════════════════════════════════════ */

export const FEATURED_VIDEOS_POOL: readonly FeaturedVideo[] = [
  {
    id: 'v1',
    title: 'Clip officiel - Tonton Léo',
    artist: 'Tonton Léo',
    duration: '4:12',
    thumbnailUrl: '/assets/featured-tonton-leo.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=RjDWzzwbeUM',
    views: 120,
  },
  {
    id: 'v2',
    title: 'Présentation de l\'album',
    artist: 'Djeneba',
    duration: '3:45',
    thumbnailUrl: '/assets/featured-djeneba.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=RjDWzzwbeUM',
    views: 45,
  },
  {
    id: 'v3',
    title: 'Live session guitare',
    artist: 'Baba Soul',
    duration: '5:20',
    thumbnailUrl: '/assets/featured-baba-soul.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=RjDWzzwbeUM',
    views: 230,
  },
  {
    id: 'v4',
    title: 'Renaissance',
    artist: 'Les Frères du Son',
    duration: '4:56',
    thumbnailUrl: '/assets/featured-freres.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=RjDWzzwbeUM',
    views: 15,
  },
  {
    id: 'v5',
    title: 'Solo de guitare endiablé',
    artist: 'Charly G.',
    duration: '2:30',
    thumbnailUrl: '/assets/featured-charly.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=RjDWzzwbeUM',
    views: 310,
  },
  {
    id: 'v6',
    title: 'Acoustique au coucher du soleil',
    artist: 'Mamadou Koné',
    duration: '6:10',
    thumbnailUrl: '/assets/featured-mamadou.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=RjDWzzwbeUM',
    views: 85,
  },
];

export const FEATURED_VIDEOS_STORAGE_KEY = 'charlyguitare_featured_views';