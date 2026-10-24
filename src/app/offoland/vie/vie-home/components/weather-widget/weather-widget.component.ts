// src/app/offoland/vie/vie-home/components/weather-widget/weather-widget.component.ts

import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

interface OffolandWeather {
  id: string;
  dimension: string;
  icon: string;
  condition: string;
  temperature: string;
  description: string;
  color: string;
}

const WEATHERS: readonly OffolandWeather[] = [
  {
    id: 'offore',
    dimension: 'Offoré',
    icon: '🔥',
    condition: 'Vents de braise',
    temperature: '42°',
    description: 'Le ciel est rougeoyant, propice aux épreuves de courage.',
    color: '#dc2626',
  },
  {
    id: 'offola',
    dimension: 'Offola',
    icon: '🌫️',
    condition: 'Brume pourpre',
    temperature: '18°',
    description: 'Les illusions dansent dans la brume. Restez vigilants.',
    color: '#9333ea',
  },
  {
    id: 'offosi',
    dimension: 'Offosi',
    icon: '✨',
    condition: 'Ciel étoilé',
    temperature: '22°',
    description: 'Les astres sont alignés pour célébrer l\'accomplissement.',
    color: '#7c3aed',
  },
  {
    id: 'offodo',
    dimension: 'Offodo',
    icon: '☁️',
    condition: 'Voile blanc',
    temperature: '15°',
    description: 'Le silence est propice à la réflexion et aux commencements.',
    color: '#64748b',
  },
  {
    id: 'offomi',
    dimension: 'Offomi',
    icon: '🌱',
    condition: 'Douce pluie',
    temperature: '24°',
    description: 'La vie s\'épanouit sous cette pluie bienfaisante.',
    color: '#16a34a',
  }
];

@Component({
  selector: 'app-weather-widget',
  standalone: true,
  templateUrl: './weather-widget.component.html',
  styleUrl: './weather-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherWidgetComponent {
  private readonly currentIndex = signal(Math.floor(Math.random() * WEATHERS.length));
  
  readonly currentWeather = computed<OffolandWeather>(() => WEATHERS[this.currentIndex()]);

  refresh(): void {
    this.currentIndex.update((index) => {
      let next = Math.floor(Math.random() * WEATHERS.length);
      while (next === index && WEATHERS.length > 1) {
        next = Math.floor(Math.random() * WEATHERS.length);
      }
      return next;
    });
  }
}