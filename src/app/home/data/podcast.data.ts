// src/app/home/podcastvideo/podcast.data.ts

import { LiveVideo } from '../../live/models/live.model';

export interface PodcastVideo extends LiveVideo {
  id: string;
}

export const PODCAST_VIDEOS: readonly PodcastVideo[] = [
  {
    id: 'TCJUEVCt8LI',
    title: 'La Grande Bible d\'Offoland enfin expliquée',
    embedUrl: 'https://www.youtube.com/embed/TCJUEVCt8LI?autoplay=1&rel=0&modestbranding=1',
    watchUrl: 'https://www.youtube.com/watch?v=TCJUEVCt8LI',
    badge: 'PODCAST VIDEO',
  },
  {
    id: 'cLXhr4-WZ-Q', // (Vérifiez si l'ID YouTube fait bien 11 caractères, ex: SfuXR-5IZNQ)
    title: 'Charly Guitare et l\'orchestration du coupé décalé',
    embedUrl: 'https://www.youtube.com/embed/cLXhr4-WZ-Q?autoplay=1&rel=0&modestbranding=1',
    watchUrl: 'https://www.youtube.com/watch?v=cLXhr4-WZ-Q',
    badge: 'PODCAST VIDEO',
  },
  {
    id: 'ws2EGWuPnXA',
    title: 'OFFOLOMOU - Le don des septs dimensions',
    embedUrl: 'https://www.youtube.com/embed/ws2EGWuPnXA?autoplay=1&rel=0&modestbranding=1',
    watchUrl: 'https://www.youtube.com/watch?v=ws2EGWuPnXA',
    badge: 'PODCAST VIDEO',
  },
  {
    id: 'wLXMy-aI6d0',
    title: 'La dimension du coupé décalé',
    embedUrl: 'https://www.youtube.com/embed/wLXMy-aI6d0?autoplay=1&rel=0&modestbranding=1',
    watchUrl: 'https://www.youtube.com/watch?v=wLXMy-aI6d0',
    badge: 'PODCAST VIDEO',
  },
  {
    id: '2-I9Yi3GSQo', // (Vérifiez si l'ID YouTube fait bien 11 caractères, ex: SfuXR-5IZNQ)
    title: 'LE JEU EN ORCHESTRE - NIVEAU 1',
    embedUrl: 'https://www.youtube.com/embed/2-I9Yi3GSQo?autoplay=1&rel=0&modestbranding=1',
    watchUrl: 'https://www.youtube.com/watch?v=2-I9Yi3GSQo',
    badge: 'PODCAST VIDEO',
  },
  {
    id: 'r_YK1BfxOLM',
    title: 'L\'ESSENTIEL GUITARE',
    embedUrl: 'https://www.youtube.com/embed/r_YK1BfxOLM?autoplay=1&rel=0&modestbranding=1',
    watchUrl: 'https://www.youtube.com/watch?v=r_YK1BfxOLM',
    badge: 'PODCAST VIDEO',
  },
  {
    id: 'ZiLQfBXAfiY',
    title: 'Cours de guitare',
    embedUrl: 'https://www.youtube.com/embed/ZiLQfBXAfiY?autoplay=1&rel=0&modestbranding=1',
    watchUrl: 'https://www.youtube.com/watch?v=ZiLQfBXAfiY',
    badge: 'PODCAST VIDEO',
  },
];

export const PODCAST_STORAGE_KEY = 'charly_guitare_podcast_plays';