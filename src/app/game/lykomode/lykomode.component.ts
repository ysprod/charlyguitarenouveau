import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */
interface Particle {
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
}

interface RuneSymbol {
  left: number;
  top: number;
  delay: number;
  duration: number;
  symbol: string;
}

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */
@Component({
  selector: 'app-lykomode',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lykomode.component.html',
  styleUrls: ['./lykomode.component.scss']
})
export class LykomodeComponent implements OnInit {

  private readonly router = inject(Router);

  /* ─── Décor ─── */
  readonly particles = signal<Particle[]>([]);
  readonly runes = signal<RuneSymbol[]>([]);
  readonly showDialog = signal(false);

  /* ─── Constantes ─── */
  private readonly PARTICLE_COLORS = ['#a855f7', '#f472b6', '#00f2fe', '#fbbf24', '#00ff88'];
  private readonly RUNE_SET = ['🐵', '⚡', '🌟', '🔮', '✨', '🎴', '🌀', '💫'];
  private readonly PARTICLE_COUNT = 35;
  private readonly RUNE_COUNT = 14;

  /* ═══════════════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════════════ */
  ngOnInit(): void {
    this.particles.set(this.generateParticles(this.PARTICLE_COUNT));
    this.runes.set(this.generateRunes(this.RUNE_COUNT));

    /* Petite animation d'entrée (déclenche les transitions CSS) */
    setTimeout(() => this.showDialog.set(true), 50);
  }

  /* ═══════════════════════════════════════════════════════════════════
     GÉNÉRATION DÉCOR
     ═══════════════════════════════════════════════════════════════════ */
  private generateParticles(count: number): Particle[] {
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 5 + Math.random() * 8,
      size: 2 + Math.random() * 5,
      color: this.PARTICLE_COLORS[
        Math.floor(Math.random() * this.PARTICLE_COLORS.length)
      ]
    }));
  }

  private generateRunes(count: number): RuneSymbol[] {
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 6,
      duration: 6 + Math.random() * 6,
      symbol: this.RUNE_SET[
        Math.floor(Math.random() * this.RUNE_SET.length)
      ]
    }));
  }

  /* ═══════════════════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════════════════ */
  playWithFriend(): void {
    this.router.navigate(['/tictacduo']);
  }

  playAgainstAI(): void {
    this.router.navigate(['/tictac']);
  }

  backToMenu(): void {
    this.router.navigate(['/play']);
  }
}