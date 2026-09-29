import { Component, OnInit } from '@angular/core';
interface Particle {
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
}

interface FloatIcon {
  left: number;
  top: number;
  delay: number;
  duration: number;
  symbol: string;
}

@Component({
  selector: 'app-abonnement',
  templateUrl: './abonnement.component.html',
  styleUrls: ['./abonnement.component.scss']
})
export class AbonnementComponent implements OnInit {

  particles: Particle[] = [];
  icons: FloatIcon[] = [];

  private readonly COLORS = ['#a855f7', '#06b6d4', '#22d3ee', '#8b5cf6', '#ec4899', '#10b981'];
  private readonly SYMBOLS = ['🎓', '⭐', '💳', '📋', '📚', '🎮', '🎸', '🎵', '✨', '💎'];

  ngOnInit(): void {
    this.particles = this.generateParticles(40);
    this.icons = this.generateIcons(12);
  }

  private generateParticles(count: number): Particle[] {
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 8,
      size: 2 + Math.random() * 4,
      color: this.COLORS[Math.floor(Math.random() * this.COLORS.length)]
    }));
  }

  private generateIcons(count: number): FloatIcon[] {
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 8 + Math.random() * 8,
      symbol: this.SYMBOLS[Math.floor(Math.random() * this.SYMBOLS.length)]
    }));
  }

}