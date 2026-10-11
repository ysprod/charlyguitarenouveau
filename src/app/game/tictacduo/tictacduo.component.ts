import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';

import { TictacduoService } from '../../services/tictacduo.service';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

type SoundType = 'click' | 'win' | 'draw' | 'levelup';

const ALIGNMENT_REWARD = 10;
const SOUND_PREF_KEY = 'tictacduo_sound_enabled';
const CONFETTI_COUNT = 60;
const CONFETTI_DURATION_MS = 4500;
const END_GAME_DELAY_MS = 500;

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-tictacduo',
  standalone: true,
  imports: [],
  templateUrl: './tictacduo.component.html',
  styleUrls: ['./tictacduo.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TictacduoComponent implements OnInit, OnDestroy {

  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  public readonly gs = inject(TictacduoService);

  /* ─── État ─── */
  lock = false;
  rejouer = false;
  etapedujeu = '0';
  lavie = 0;
  lebonus = 0;
  pointdevies = 0;
  pointdebonus = 0;
  messageLyko = 'Au tour du Joueur 1…';
  showConfetti = false;
  showVictoryOverlay = false;
  particles: number[] = [];

  readonly alignmentReward = ALIGNMENT_REWARD;

  /* ─── Son ─── */
  readonly soundEnabled = signal<boolean>(true);

  private audioCtx?: AudioContext;
  private readonly timeouts: ReturnType<typeof setTimeout>[] = [];

  /* ═══════════════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════════════ */

  ngOnInit(): void {
    const params = this.activatedRoute.snapshot.queryParamMap;

    this.lavie = parseInt(params.get('vie') ?? '500', 10);
    this.lebonus = parseInt(params.get('bonus') ?? '0', 10);
    this.etapedujeu = params.get('etape') ?? this.etapedujeu;

    this.pointdevies = this.lavie;
    this.pointdebonus = this.lebonus;

    this.initAudio();
    this.loadSoundPreference();
    this.resetjeu();
  }

  ngOnDestroy(): void {
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close();
    }

    this.timeouts.forEach(t => clearTimeout(t));
  }

  /* ═══════════════════════════════════════════════════════════════════
     SON
     ═══════════════════════════════════════════════════════════════════ */

  private loadSoundPreference(): void {
    try {
      const saved = localStorage.getItem(SOUND_PREF_KEY);
      if (saved === 'false') {
        this.soundEnabled.set(false);
      }
    } catch {
      /* silencieux */
    }
  }

  toggleSound(): void {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);

    try {
      localStorage.setItem(SOUND_PREF_KEY, String(next));
    } catch {
      /* silencieux */
    }
  }

  private initAudio(): void {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (Ctor) {
      this.audioCtx = new Ctor();
    }
  }

  private playSound(type: SoundType): void {
    const ctx = this.audioCtx;
    if (!this.soundEnabled() || !ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => { /* silencieux */ });
    }

    const now = ctx.currentTime;

    switch (type) {
      case 'click':
        this.tone(ctx, {
          freq: 440,
          endFreq: 880,
          type: 'sine',
          duration: 0.06,
          volume: 0.15,
          now,
        });
        break;

      case 'win':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          this.tone(ctx, {
            freq,
            type: 'triangle',
            duration: 0.3,
            volume: 0.2,
            now: now + i * 0.1,
          });
        });
        break;

      case 'draw':
        this.tone(ctx, {
          freq: 220,
          endFreq: 180,
          type: 'square',
          duration: 0.3,
          volume: 0.2,
          now,
        });
        break;

      case 'levelup':
        this.tone(ctx, {
          freq: 300,
          endFreq: 1200,
          type: 'sine',
          duration: 0.5,
          volume: 0.3,
          now,
        });
        break;
    }
  }

  private tone(
    ctx: AudioContext,
    opts: {
      freq: number;
      endFreq?: number;
      type: OscillatorType;
      duration: number;
      volume: number;
      now: number;
    }
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, opts.now);

    if (opts.endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(0.01, opts.endFreq),
        opts.now + opts.duration
      );
    }

    gain.gain.setValueAtTime(0.0001, opts.now);
    gain.gain.exponentialRampToValueAtTime(opts.volume, opts.now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, opts.now + opts.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(opts.now);
    osc.stop(opts.now + opts.duration + 0.05);
  }

  /* ═══════════════════════════════════════════════════════════════════
     OVERLAY
     ═══════════════════════════════════════════════════════════════════ */

  dismissOverlay(): void {
    this.showConfetti = false;
    this.showVictoryOverlay = false;
  }

  /* ═══════════════════════════════════════════════════════════════════
     JEU — Reset & niveaux
     ═══════════════════════════════════════════════════════════════════ */

  resetjeu(): void {
    /* État UI */
    this.rejouer = false;
    this.lock = false;
    this.showConfetti = false;
    this.showVictoryOverlay = false;

    /* Service */
    this.gs.resetAll();
    this.gs.turn = 0;

    /* Message */
    this.messageLyko =
      `Niveau ${this.gs.gridSize - 2} — Grille ${this.gs.gridSize}×${this.gs.gridSize} · ` +
      `Alignez 3 pions pour gagner +${this.alignmentReward} PV !`;
  }

  prochainNiveau(): void {
    this.playSound('levelup');
    this.gs.nextLevel();
    this.resetjeu();

    this.snackBar.open(
      `🚀 Niveau supérieur ! Grille ${this.gs.gridSize}×${this.gs.gridSize}`,
      'Super !',
      { duration: 2500 }
    );
  }

  precedentNiveau(): void {
    if (!this.yaprecedent()) return;

    this.playSound('levelup');
    this.gs.previousLevel();
    this.resetjeu();

    this.snackBar.open(
      `⏪ Niveau précédent ! Grille ${this.gs.gridSize}×${this.gs.gridSize}`,
      'Retour !',
      { duration: 2500 }
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     🎯 JOUEUR — Clic sur une case
     ═══════════════════════════════════════════════════════════════════ */

  playerClick(i: number): void {
    if (this.lock || !this.gs.blocks[i].free) return;

    const playerTurn = this.gs.turn;

    const alignments = this.gs.playMove(i);

    if (this.gs.blocks[i].free) return;

    this.playSound('click');

    if (alignments > 0) {
      this.handleAlignment(playerTurn, alignments);
    }

    if (this.gs.isGameOver) {
      const timerId = setTimeout(() => this.handleEndGame(), END_GAME_DELAY_MS);
      this.timeouts.push(timerId);
      return;
    }

    this.changeTurn();
  }

  private handleAlignment(playerTurn: number, count: number): void {
    const gain = count * this.alignmentReward;
    this.pointdevies += gain;
    this.lavie = this.pointdevies;

    this.playSound('win');

    const joueur = playerTurn === 0 ? 'JOUEUR 1' : 'JOUEUR 2';
    this.messageLyko = `✨ ${count} alignement(s) pour ${joueur} ! +${gain} PV !`;

    this.snackBar.open(
      `🎯 ${count} alignement(s) ${joueur} : +${gain} PV`,
      'Bravo !',
      { duration: 2000 }
    );

    const timerId = setTimeout(
      () => this.gs.clearWinningHighlight(),
      1200
    );
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

      this.snackBar.open(
        `🏆 VICTOIRE JOUEUR 1 : ${scoreJ1} - ${scoreJ2}`,
        'Félicitations !',
        { duration: 3500 }
      );
    } else if (scoreJ2 > scoreJ1) {
      this.triggerConfetti();
      this.showVictoryOverlay = true;
      this.messageLyko = `🏆 Le JOUEUR 2 remporte le duel (${scoreJ2} - ${scoreJ1}) !`;

      this.snackBar.open(
        `🏆 VICTOIRE JOUEUR 2 : ${scoreJ2} - ${scoreJ1}`,
        'Félicitations !',
        { duration: 3500 }
      );
    } else {
      this.messageLyko = `⚖️ Égalité parfaite (${scoreJ1} - ${scoreJ2}) !`;

      this.snackBar.open(
        `⚖️ MATCH NUL ${scoreJ1} - ${scoreJ2}`,
        'Égalité',
        { duration: 3000 }
      );
    }
  }

  private triggerConfetti(): void {
    this.showConfetti = true;
    this.particles = Array.from({ length: CONFETTI_COUNT }, (_, i) => i);

    const timerId = setTimeout(() => {
      if (this.showVictoryOverlay) {
        this.showConfetti = false;
        this.showVictoryOverlay = false;
      }
    }, CONFETTI_DURATION_MS);

    this.timeouts.push(timerId);
  }

  private changeTurn(): void {
    const current = this.gs.changeTurn();
    this.messageLyko = current === 1
      ? '🎯 Au tour du JOUEUR 2'
      : '🎯 Au tour du JOUEUR 1';
  }

  yaprecedent(): boolean {
    return this.gs.gridSize > 3;
  }

  /* ═══════════════════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════════════════ */

  goToPlay(lavie: number, lebonus: number, letape: string): void {
    void this.router.navigate(['/play'], {
      queryParams: { vie: lavie, bonus: lebonus, etape: letape },
    });
  }

  onrecommencer(): void {
    this.goToPlay(this.lavie, this.lebonus, this.etapedujeu);
  }
}