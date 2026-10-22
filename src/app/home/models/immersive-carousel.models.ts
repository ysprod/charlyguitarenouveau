// src/app/shared/immersive-carousel/immersive-carousel.models.ts

export interface ImmersiveCard {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  route: string;
  tag?: string;
  tagColor?: 'gold' | 'live' | 'default';
}