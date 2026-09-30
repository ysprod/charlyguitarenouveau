import { CommonModule } from '@angular/common';
import { Component, NgZone, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Particle {
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
}

interface MusicNote {
  left: number;
  delay: number;
  duration: number;
  symbol: string;
}

@Component({
  selector: 'app-encemoment',
  standalone: true,
  imports: [
    RouterLink,
    CommonModule
  ],
  templateUrl: './encemoment.component.html',
  styleUrls: ['./encemoment.component.scss']
})
export class EncemomentComponent implements OnInit {
  particles: Particle[] = [];
  notes: MusicNote[] = [];

  private readonly COLORS = ['#ff003c', '#facc15', '#a855f7', '#00f2fe', '#00ff88'];
  private readonly SYMBOLS = ['♪', '♫', '♬', '🎵', '🎶', '🎸', '🎤', '🥁'];

  constructor(private readonly ngZone: NgZone) { }

  ngOnInit(): void {
    this.particles = this.generateParticles(35);
    this.notes = this.generateNotes(10);
  }

  ngOnDestroy(): void {
    // Rien à nettoyer
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

  private generateNotes(count: number): MusicNote[] {
    return Array.from({ length: count }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 12,
      duration: 10 + Math.random() * 8,
      symbol: this.SYMBOLS[Math.floor(Math.random() * this.SYMBOLS.length)]
    }));
  }

}
