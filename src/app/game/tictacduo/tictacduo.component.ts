// src/app/game/tictacduo/tictacduo.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';

import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';

import { DuoEndGameSummary } from '../models/duo-end-game-summary.model';
import { TictacduoService } from '../services/tictacduo.service';
import { DuoEndGameDialogComponent } from './duo-end-game-dialog/duo-end-game-dialog.component';
import { createTimeoutScheduler } from '../utils/schedulers.util';
import {
  ALIGNMENT_REWARD,
  DEFAULT_LAVIE,
  DEFAULT_LEBONUS,
  SNACKBAR_DURATION_MS,
  SNACKBAR_LEVEL_DURATION_MS,
  SOUND_PREF_KEY,
  WINNING_HIGHLIGHT_MS,
} from '../constants/tictacduo.constants';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

type SoundType = 'click' | 'win' | 'draw' | 'levelup';

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-tictacduo',
  imports: [DuoEndGameDialogComponent],
  templateUrl: './tictacduo.component.html',
  styleUrls: ['./tictacduo.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TictacduoComponent {

  /* ─── Injection ─── */
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Scheduler setTimeout auto-nettoyé. */
  private readonly scheduleTimeout = createTimeoutScheduler(this.destroyRef);

  /** Service de jeu (public). */
  readonly gs = inject(TictacduoService);

  /* ═══════════════════════════════════════════════════════
     CONSTANTES
     ═══════════════════════════════════════════════════════ */

  readonly alignmentReward = ALIGNMENT_REWARD;

  /* ═══════════════════════════════════════════════════════
     ÉTAT — SIGNALS
     ═══════════════════════════════════════════════════════ */

  readonly lock = signal(false);
  readonly rejouer = signal(false);
  readonly showEndDialog = signal(false);
  readonly endSummary = signal<DuoEndGameSummary | null>(null);

  readonly messageLyko = signal('Au tour du Joueur 1…');

  /* ─── Compteurs de manche ─── */
  private readonly player1AlignmentsThisRound = signal(0);
  private readonly player2AlignmentsThisRound = signal(0);
  private readonly player1GainedPvThisRound = signal(0);
  private readonly player2GainedPvThisRound = signal(0);

  /* ─── Score global de la manche ─── */
  readonly pointdevies = signal(0);
  readonly pointdebonus = signal(0);

  /* ─── Son ─── */
  readonly soundEnabled = signal(true);

  /* ─── Audio ─── */
  private audioCtx?: AudioContext;

  /* ─── Paramètres URL ─── */
  lavie = DEFAULT_LAVIE;
  lebonus = DEFAULT_LEBONUS;

  /* ═══════════════════════════════════════════════════════
     COMPUTED
     ═══════════════════════════════════════════════════════ */

  readonly canGoPrevious = computed(() => this.gs.gridSize() > this.gs.GRID_MIN_SIZE);

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      const params = this.activatedRoute.snapshot.queryParamMap;

      this.lavie = parseInt(params.get('vie') ?? String(DEFAULT_LAVIE), 10);
      this.lebonus = parseInt(params.get('bonus') ?? String(DEFAULT_LEBONUS), 10);
      this.pointdevies.set(this.lavie);
      this.pointdebonus.set(this.lebonus);

      this.initAudio();
      this.loadSoundPreference();
      this.resetjeu();
    });

    this.destroyRef.onDestroy(() => {
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        void this.audioCtx.close();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     SON
     ═══════════════════════════════════════════════════════ */

  private loadSoundPreference(): void {
    try {
      const saved = localStorage.getItem(SOUND_PREF_KEY);
      if (saved === 'false') {
        this.soundEnabled.set(false);
      }
    } catch { /* silencieux */ }
  }

  toggleSound(): void {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);
    try {
      localStorage.setItem(SOUND_PREF_KEY, String(next));
    } catch { /* silencieux */ }
  }

  private initAudio(): void {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (Ctor) this.audioCtx = new Ctor();
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
        this.tone(ctx, { freq: 440, endFreq: 880, type: 'sine', duration: 0.06, volume: 0.15, now });
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          this.tone(ctx, { freq, type: 'triangle', duration: 0.3, volume: 0.2, now: now + i * 0.1 });
        });
        break;
      case 'draw':
        this.tone(ctx, { freq: 220, endFreq: 180, type: 'square', duration: 0.3, volume: 0.2, now });
        break;
      case 'levelup':
        this.tone(ctx, { freq: 300, endFreq: 1200, type: 'sine', duration: 0.5, volume: 0.3, now });
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

  /* ═══════════════════════════════════════════════════════
     RESET & NIVEAUX
     ═══════════════════════════════════════════════════════ */

  resetjeu(): void {
    this.rejouer.set(false);
    this.lock.set(false);
    this.showEndDialog.set(false);
    this.endSummary.set(null);

    this.player1AlignmentsThisRound.set(0);
    this.player2AlignmentsThisRound.set(0);
    this.player1GainedPvThisRound.set(0);
    this.player2GainedPvThisRound.set(0);

    this.gs.resetAll();
    this.gs.setTurn(0);

    this.messageLyko.set(
      `Niveau ${this.gs.gridSize() - 2} — Grille ${this.gs.gridSize()}×${this.gs.gridSize()} · ` +
      `Alignez 3 pions pour gagner +${this.alignmentReward} PV !`
    );
  }

  prochainNiveau(): void {
    this.playSound('levelup');
    this.gs.nextLevel();
    this.resetjeu();

    this.snackBar.open(
      `🚀 Niveau supérieur ! Grille ${this.gs.gridSize()}×${this.gs.gridSize()}`,
      'Super !',
      { duration: SNACKBAR_LEVEL_DURATION_MS }
    );
  }

  precedentNiveau(): void {
    if (!this.canGoPrevious()) return;

    this.playSound('levelup');
    this.gs.previousLevel();
    this.resetjeu();

    this.snackBar.open(
      `⏪ Niveau précédent ! Grille ${this.gs.gridSize()}×${this.gs.gridSize()}`,
      'Retour !',
      { duration: SNACKBAR_LEVEL_DURATION_MS }
    );
  }

  /* ═══════════════════════════════════════════════════════
     JOUEUR — Clic sur une case
     ═══════════════════════════════════════════════════════ */

  playerClick(i: number): void {
    if (this.lock() || this.gs.isGameOver() || !this.gs.blocks()[i].free) return;

    const playerTurn = this.gs.turn();
    const alignments = this.gs.playMove(i);

    this.playSound('click');

    if (alignments > 0) {
      this.handleAlignment(playerTurn, alignments);
    }

    if (this.gs.isGameOver()) {
      this.lock.set(true);
      this.handleEndGame();
      return;
    }

    this.changeTurn();
  }

  private handleAlignment(playerTurn: number, count: number): void {
    const gain = count * this.alignmentReward;
    this.pointdevies.update((v) => v + gain);

    if (playerTurn === 0) {
      this.player1AlignmentsThisRound.update((n) => n + count);
      this.player1GainedPvThisRound.update((n) => n + gain);
    } else {
      this.player2AlignmentsThisRound.update((n) => n + count);
      this.player2GainedPvThisRound.update((n) => n + gain);
    }

    this.playSound('win');

    const joueur = playerTurn === 0 ? 'JOUEUR 1' : 'JOUEUR 2';
    this.messageLyko.set(
      `✨ ${count} alignement(s) pour ${joueur} ! +${gain} PV !`
    );

    this.snackBar.open(
      `🎯 ${count} alignement(s) ${joueur} : +${gain} PV`,
      'Bravo !',
      { duration: SNACKBAR_DURATION_MS }
    );

    this.scheduleTimeout(() => this.gs.clearWinningHighlight(), WINNING_HIGHLIGHT_MS);
  }

  private handleEndGame(): void {
    this.rejouer.set(true);
    this.gs.incrementDraw();

    const scoreJ1 = this.gs.players()[0].score;
    const scoreJ2 = this.gs.players()[1].score;

    let result: DuoEndGameSummary['result'] = 'draw';

    if (scoreJ1 > scoreJ2) {
      result = 'player1';
      this.playSound('win');
      this.messageLyko.set(
        `🏆 Le JOUEUR 1 remporte le duel (${scoreJ1} - ${scoreJ2}) !`
      );
    } else if (scoreJ2 > scoreJ1) {
      result = 'player2';
      this.playSound('win');
      this.messageLyko.set(
        `🎉 Le JOUEUR 2 remporte le duel (${scoreJ2} - ${scoreJ1}) !`
      );
    } else {
      result = 'draw';
      this.playSound('draw');
      this.messageLyko.set(
        `⚖️ Égalité parfaite (${scoreJ1} - ${scoreJ2}) !`
      );
    }

    this.endSummary.set({
      result,
      player1Score: scoreJ1,
      player2Score: scoreJ2,
      drawCount: this.gs.draw(),
      level: this.gs.gridSize() - 2,
      gridSize: this.gs.gridSize(),
      player1Alignments: this.player1AlignmentsThisRound(),
      player2Alignments: this.player2AlignmentsThisRound(),
      player1GainedPv: this.player1GainedPvThisRound(),
      player2GainedPv: this.player2GainedPvThisRound(),
      hasPreviousLevel: this.canGoPrevious(),
      hasNextLevel: true,
    });

    this.showEndDialog.set(true);
  }

  private changeTurn(): void {
    const current = this.gs.changeTurn();
    this.messageLyko.set(
      current === 1
        ? '🎯 Au tour du JOUEUR 2'
        : '🎯 Au tour du JOUEUR 1'
    );
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS DU DIALOGUE DE FIN
     ═══════════════════════════════════════════════════════ */

  onDialogReplay(): void {
    this.resetjeu();
  }

  onDialogNextLevel(): void {
    this.prochainNiveau();
  }

  onDialogPreviousLevel(): void {
    this.precedentNiveau();
  }

  onDialogBackToMenu(): void {
    this.onrecommencer();
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════ */

  goToPlay(lavie: number, lebonus: number, letape: string): void {
    void this.router.navigate(['/game/play'], {
      queryParams: { vie: lavie, bonus: lebonus, etape: letape },
    });
  }

  onrecommencer(): void {
    this.goToPlay(this.lavie, this.lebonus, '0');
  }
}