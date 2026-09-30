import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';

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

@Component({
  selector: 'app-lykomode',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './lykomode.component.html',
  styleUrls: ['./lykomode.component.scss']
})
export class LykomodeComponent implements OnInit {

  particles: Particle[] = [];
  runes: RuneSymbol[] = [];
  showDialog = true;

  private readonly COLORS = ['#a855f7', '#f472b6', '#00f2fe', '#fbbf24', '#00ff88'];
  private readonly RUNE_SET = ['🐵', '⚡', '🌟', '🔮', '✨', '🎴', '🌀', '💫'];

  constructor(
    private readonly router: Router,
    private readonly ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.particles = this.generateParticles(35);
    this.runes = this.generateRunes(14);

    // Petite animation d'entrée : on cache puis on remontre pour déclencher les transitions
    setTimeout(() => (this.showDialog = true), 50);
  }

  ngOnDestroy(): void {
    // Rien à nettoyer (pas de listeners persistants)
  }

  /* ============================================================
     GÉNÉRATION DÉCOR
     ============================================================ */
  private generateParticles(count: number): Particle[] {
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 5 + Math.random() * 8,
      size: 2 + Math.random() * 5,
      color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)]
    }));
  }

  private generateRunes(count: number): RuneSymbol[] {
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 6,
      duration: 6 + Math.random() * 6,
      symbol: this.RUNE_SET[Math.floor(Math.random() * this.RUNE_SET.length)]
    }));
  }

  /* ============================================================
     ACTIONS
     ============================================================ */
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
