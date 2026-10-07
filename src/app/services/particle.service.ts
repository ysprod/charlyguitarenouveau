import { Injectable, signal } from '@angular/core';

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  emoji?: string;
}

@Injectable({ providedIn: 'root' })
export class ParticleService {
  readonly particles = signal<Particle[]>([]);
  private nextId = 0;

  burst(
    x: number,
    y: number,
    options: {
      count?: number;
      colors?: string[];
      emojis?: string[];
      speed?: number;
      spread?: number;
    } = {}
  ): void {
    const {
      count = 20,
      colors = ['#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#a78bfa'],
      emojis = [],
      speed = 6,
      spread = 360,
    } = options;

    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * spread - spread / 2) * (Math.PI / 180) - Math.PI / 2;
      const velocity = speed * (0.5 + Math.random());
      newParticles.push({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 1,
        maxLife: 60 + Math.random() * 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 8,
        emoji: emojis.length && Math.random() > 0.7
          ? emojis[Math.floor(Math.random() * emojis.length)]
          : undefined,
      });
    }
    this.particles.update(p => [...p, ...newParticles]);
  }

  update(): void {
    this.particles.update(list =>
      list
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.25,
          vx: p.vx * 0.99,
          life: p.life - 1 / p.maxLife,
        }))
        .filter(p => p.life > 0)
    );
  }

  clear(): void {
    this.particles.set([]);
  }
}