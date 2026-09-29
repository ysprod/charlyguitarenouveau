import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TictacduoService } from '../../services/tictacduo.service';

@Component({
  selector: 'app-tictacduo',
  templateUrl: './tictacduo.component.html',
  styleUrls: ['./tictacduo.component.css']
})
export class TictacduoComponent implements OnInit, OnDestroy {
  lock = false;
  rejouer = false;
  etapedujeu: string = "0";
  lavie: number = 0;
  lebonus: number = 0;
  pointdevies: number = 0;
  pointdebonus: number = 0;
  messageLyko: string = "Au tour du Joueur 1...";
  showConfetti = false;
  showVictoryOverlay = false;
  particles: number[] = [];

  readonly ALIGNMENT_REWARD = 10;

  private audioCtx?: AudioContext;
  private timeouts: number[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private snackBar: MatSnackBar,
    public gs: TictacduoService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const vieParam = this.activatedRoute.snapshot.queryParamMap.get('vie');
    const bonusParam = this.activatedRoute.snapshot.queryParamMap.get('bonus');

    this.lavie = parseInt(vieParam || '500', 10);
    this.lebonus = parseInt(bonusParam || '0', 10);
    this.etapedujeu = this.activatedRoute.snapshot.queryParamMap.get('etape') || this.etapedujeu;

    this.pointdevies = this.lavie;
    this.pointdebonus = this.lebonus;

    this.initAudio();
    this.resetjeu();
  }

  ngOnDestroy(): void {
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
    this.timeouts.forEach(t => clearTimeout(t));
  }

  private initAudio(): void {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      this.audioCtx = new AudioContextClass();
    }
  }

  private playSound(type: 'click' | 'win' | 'draw' | 'levelup'): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    const now = this.audioCtx.currentTime;

    switch (type) {
      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
        break;

      case 'win':
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const o = this.audioCtx!.createOscillator();
          const g = this.audioCtx!.createGain();
          o.type = 'triangle';
          o.connect(g);
          g.connect(this.audioCtx!.destination);
          o.frequency.setValueAtTime(freq, now + idx * 0.1);
          g.gain.setValueAtTime(0.2, now + idx * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);
          o.start(now + idx * 0.1);
          o.stop(now + idx * 0.1 + 0.3);
        });
        break;

      case 'draw':
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'levelup':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
    }
  }

  resetjeu(): void {
    this.rejouer = false;
    this.lock = false;
    this.showConfetti = false;
    this.showVictoryOverlay = false;

    this.gs.resetAll();
    this.gs.turn = 0;

    this.messageLyko = `Niveau ${this.gs.gridSize - 2} : Grille ${this.gs.gridSize}x${this.gs.gridSize} — Alignez 3 pions pour gagner +${this.ALIGNMENT_REWARD} PV !`;
  }

  prochainNiveau(): void {
    this.playSound('levelup');
    this.gs.nextLevel();
    this.resetjeu();
    this.snackBar.open(`🚀 Niveau Supérieur ! Grille ${this.gs.gridSize}x${this.gs.gridSize} !`, "Super !", { duration: 2500 });
  }

  precedentNiveau(): void {
    if (!this.yaprecedent()) return;
    this.playSound('levelup');
    this.gs.previousLevel();
    this.resetjeu();
    this.snackBar.open(`⏪ Niveau Précédent ! Grille ${this.gs.gridSize}x${this.gs.gridSize} !`, "Retour !", { duration: 2500 });
  }

  playerClick(i: number): void {
    if (this.lock || !this.gs.blocks[i].free) return;

    const playerTurn = this.gs.turn;
    const played = this.gs.playMove(i);

    if (!played) return;

    this.playSound('click');

    // Détection d'éventuels alignements
    const newAlignments = this.gs.checkNewAlignments();
    if (newAlignments > 0) {
      this.handleAlignment(playerTurn, newAlignments);
    }

    // Le jeu se termine UNIQUEMENT quand toutes les cases de la grille sont remplies
    if (this.gs.isGameOver) {
      const timerId = window.setTimeout(() => this.handleEndGame(), 500);
      this.timeouts.push(timerId);
      return;
    }

    this.changeTurn();
  }

  private handleAlignment(playerTurn: number, count: number): void {
    const gain = count * this.ALIGNMENT_REWARD;
    this.pointdevies += gain;
    this.lavie = this.pointdevies;

    this.playSound('win');

    const joueur = playerTurn === 0 ? "JOUEUR 1" : "JOUEUR 2";
    this.messageLyko = `✨ ${count} alignement(s) pour ${joueur} ! +${gain} PV !`;

    this.snackBar.open(`🎯 ${count} alignement(s) ${joueur} : +${gain} PV`, "Bravo !", { duration: 2000 });

    const timerId = window.setTimeout(() => this.gs.clearWinningHighlight(), 1200);
    this.timeouts.push(timerId);
  }

  private handleEndGame(): void {
    if (this.lock) return;
    this.lock = true;
    this.rejouer = true;
    this.gs.draw += 1;
    this.playSound('draw');

    const scoreJ1 = this.gs.players[0].score;
    const scoreJ2 = this.gs.players[1].score;

    if (scoreJ1 > scoreJ2) {
      this.triggerConfetti();
      this.showVictoryOverlay = true;
      this.messageLyko = `🏆 Le JOUEUR 1 remporte le duel (${scoreJ1} - ${scoreJ2}) !`;
      this.snackBar.open(`🏆 VICTOIRE JOUEUR 1 : ${scoreJ1} - ${scoreJ2} !`, "Félicitations !", { duration: 3500 });
    } else if (scoreJ2 > scoreJ1) {
      this.triggerConfetti();
      this.showVictoryOverlay = true;
      this.messageLyko = `🏆 Le JOUEUR 2 remporte le duel (${scoreJ2} - ${scoreJ1}) !`;
      this.snackBar.open(`🏆 VICTOIRE JOUEUR 2 : ${scoreJ2} - ${scoreJ1} !`, "Félicitations !", { duration: 3500 });
    } else {
      this.messageLyko = `⚖️ Égalité parfaite (${scoreJ1} - ${scoreJ2}) !`;
      this.snackBar.open(`⚖️ MATCH NUL ${scoreJ1} - ${scoreJ2}`, "Égalité", { duration: 3000 });
    }
  }

  private triggerConfetti(): void {
    this.showConfetti = true;
    this.particles = Array.from({ length: 60 }, (_, i) => i);
    const timerId = window.setTimeout(() => {
      this.showConfetti = false;
      this.showVictoryOverlay = false;
    }, 4500);
    this.timeouts.push(timerId);
  }

  private changeTurn(): void {
    const current = this.gs.changeTurn();
    this.messageLyko = current === 1 
      ? "🎯 Au tour du JOUEUR 2" 
      : "🎯 Au tour du JOUEUR 1";
  }

  /**
   * Le bouton de niveau précédent s'affiche si la taille de la grille est supérieure à 4
   */
  yaprecedent(): boolean {
    return this.gs.gridSize > 3;
  }

  goToPlay(lavie: number, lebonus: number, letape: string): void {
    this.router.navigate(['/play'], { queryParams: { vie: lavie, bonus: lebonus, etape: letape } });
  }

  onrecommencer(): void {
    this.goToPlay(this.lavie, this.lebonus, this.etapedujeu);
  }
}