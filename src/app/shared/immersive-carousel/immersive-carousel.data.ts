// src/app/shared/immersive-carousel/immersive-carousel.data.ts

export interface ImmersiveCard {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  route: string;
  tag?: string;
  tagColor?: 'gold' | 'live' | 'default';
}

export const DEFAULT_IMMERSIVE_CARDS: readonly ImmersiveCard[] = [
  {
    id: 'academie',
    title: 'Académie',
    description: 'Une formation complète pour maîtriser la musique et les arts du spectacle.',
    imageUrl: 'assets/academie.jpg',
    route: '/academie',
    tag: 'Formation',
    tagColor: 'default'
  },
  {
    id: 'offres',
    title: 'Découvrez nos offres',
    description: 'Choisis ton pack pédagogique et commence ton voyage musical.',
    imageUrl: 'assets/abonnement.jpg',
    route: '/offres',
    tag: 'Cours de Guitare',
    tagColor: 'gold'
  },
  {
    id: 'jeux',
    title: 'Jeux',
    description: 'Jouez, apprenez, progressez… et surtout, amusez-vous !',
    imageUrl: 'assets/jeuxnouveau.jpg',
    route: '/game/play',
    tag: 'Games',
    tagColor: 'live'
  },
  {
    id: 'live',
    title: 'Vidéos Live',
    description: 'Rejoignez-nous pour des sessions interactives et des podcasts.',
    imageUrl: 'assets/live.jpg',
    route: '/live',
    tag: 'Live',
    tagColor: 'live'
  },
  {
    id: 'offoland',
    title: 'Les 7 dimensions',
    description: 'Partez à la découverte d\'un monde nouveau et de ses mystères.',
    imageUrl: 'assets/offoland.jpg',
    route: '/offoland',
    tag: 'Terre des Univers',
    tagColor: 'live'
  },
  {
    id: 'studio',
    title: 'Studio Professionnel',
    description: 'Enregistrez votre musique dans des conditions optimales.',
    imageUrl: 'assets/studio.jpg',
    route: '/studio',
    tag: 'Studio',
    tagColor: 'live'
  },
  {
    id: 'boutique',
    title: 'Boutique',
    description: 'Decouvrez nos produits',
    imageUrl: 'assets/boutique.jpg',
    route: '/store',
    tag: 'store',
    tagColor: 'live'
  }
];