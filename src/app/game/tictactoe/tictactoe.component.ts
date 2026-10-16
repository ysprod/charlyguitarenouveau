// src/app/game/tictactoe/tictactoe.component.ts

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

import { CONFETTI_COUNT } from 'src/app/game/constants/fretboard.constants';
import {
  ALIGNMENT_REWARD,
  CELL_PARTICLES,
  END_GAME_DELAY_MS,
  BOT_THINK_DELAY_MS,
  WINNING_HIGHLIGHT_MS,
  CONFETTI_DURATION_MS,
} from 'src/app/game/constants/tictactoe.constants';

import { EndGameSummary } from 'src/app/game/models/end-game-summary.model';
import { TictactoeserviceService } from 'src/app/game/services/tictactoeservice.service';
import { EndGameDialogComponent } from 'src/app/game/tictactoe/end-game-dialog/end-game-dialog.component';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

type SoundType = 'click' | 'win' | 'lose' | 'draw' | 'levelup' | 'bot';

interface ConfettiPiece {
  readonly left: number;
  readonly delay: string;
  readonly color: string;
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════════════════════ */

const SOUND_PREF_KEY = 'tictactoe_sound_enabled';
const CONFETTI_COLORS = ['#b45309', '#ea580c', '#16a34a'] as const;

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-tictactoe',
  imports: [EndGameDialogComponent],
  templateUrl: './tictactoe.component.html',
  styleUrls: ['./tictactoe.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TictactoeComponent {

  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  public readonly gs = inject(TictactoeserviceService);

  /* ═══════════════════════════════════════════════════════
     CONSTANTES EXPOSÉES
     ═══════════════════════════════════════════════════════ */

  readonly alignmentReward = ALIGNMENT_REWARD;
  readonly cellParticles: readonly number[] = CELL_PARTICLES;

  /* ═══════════════════════════════════════════════════════
     ÉTAT UI
     ═══════════════════════════════════════════════════════ */

  readonly lock = signal(false);
  readonly rejouer = signal(false);
  readonly messageLyko = signal('Lykö le Sage observe votre stratégie…');
  readonly showConfetti = signal(false);
  readonly showEndDialog = signal(false);
  readonly confettiParticles = signal<readonly number[]>([]);
  readonly endSummary = signal<EndGameSummary | null>(null);

  /* ═══════════════════════════════════════════════════════
     ÉTAT PERSISTANT (signals)
     ═══════════════════════════════════════════════════════ */

  readonly lavie = signal(0);
  readonly lebonus = signal(0);
  readonly pointdevies = signal(0);
  readonly pointdebonus = signal(0);

  /* ═══════════════════════════════════════════════════════
     SUIVI DE MANCHE
     ═══════════════════════════════════════════════════════ */

  private readonly playerAlignmentsThisRound = signal(0);
  private readonly botAlignmentsThisRound = signal(0);
  private readonly playerGainedPvThisRound = signal(0);
  private readonly botGainedPvThisRound = signal(0);

  /* ═══════════════════════════════════════════════════════
     ÉTAT DÉRIVÉ
     ═══════════════════════════════════════════════════════ */

  readonly canGoPrevious = computed(
    () => this.gs.gridSize() > this.gs.GRID_MIN_SIZE
  );

  /** Particules de confetti pré-calculées pour le template. */
  readonly confettiView = computed<readonly ConfettiPiece[]>(() =>
    this.confettiParticles().map((p) => ({
      left: (p * 7) % 100,
      delay: `${p * 0.05}s`,
      color: CONFETTI_COLORS[p % CONFETTI_COLORS.length],
    }))
  );

  /* ═══════════════════════════════════════════════════════
     SON
     ═══════════════════════════════════════════════════════ */

  readonly soundEnabled = signal(true);

  /* ═══════════════════════════════════════════════════════
     AUDIO
     ═══════════════════════════════════════════════════════ */

  private audioCtx?: AudioContext;
  private readonly timeouts: ReturnType<typeof setTimeout>[] = [];

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      const params = this.activatedRoute.snapshot.queryParamMap;

      const vie = parseInt(params.get('vie') ?? '500', 10);
      const bonus = parseInt(params.get('bonus') ?? '0', 10);

      this.lavie.set(vie);
      this.lebonus.set(bonus);
      this.pointdevies.set(vie);
      this.pointdebonus.set(bonus);

      this.initAudio();
      this.loadSoundPreference();
      this.resetjeu();
    });

    this.destroyRef.onDestroy(() => {
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        void this.audioCtx.close();
      }
      this.timeouts.forEach((t) => clearTimeout(t));
      this.timeouts.length = 0;
    });
  }

  /* ═══════════════════════════════════════════════════════
     AUDIO
     ═══════════════════════════════════════════════════════ */

  private initAudio(): void {
    if (typeof window === 'undefined') return;

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (Ctor) this.audioCtx = new Ctor();
  }

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

    if (next) {
      this.playSound('click');
    }
  }

  private playSound(type: SoundType): void {
    const ctx = this.audioCtx;
    if (!ctx || !this.soundEnabled()) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {
        /* silencieux */
      });
    }

    const now = ctx.currentTime;

    switch (type) {
      case 'click':
        this.tone(ctx, { freq: 440, endFreq: 880, type: 'sine', duration: 0.06, volume: 0.15, now });
        break;
      case 'bot':
        this.tone(ctx, { freq: 220, endFreq: 110, type: 'triangle', duration: 0.15, volume: 0.1, now });
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          this.tone(ctx, { freq, type: 'triangle', duration: 0.3, volume: 0.2, now: now + i * 0.1 });
        });
        break;
      case 'lose':
        this.tone(ctx, { freq: 300, endFreq: 80, type: 'sawtooth', duration: 0.4, volume: 0.25, now });
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
    this.showConfetti.set(false);
    this.showEndDialog.set(false);
    this.endSummary.set(null);

    this.playerAlignmentsThisRound.set(0);
    this.botAlignmentsThisRound.set(0);
    this.playerGainedPvThisRound.set(0);
    this.botGainedPvThisRound.set(0);

    this.gs.resetAll();
    this.gs.setTurn(0);
    this.gs.setBotThinking(false);

    const level = this.gs.gridSize() - 2;
    this.messageLyko.set(
      `Niveau ${level} : Grille ${this.gs.gridSize()}×${this.gs.gridSize()} — ` +
      `Alignez ${this.gs.winningStreak} pions pour gagner +${this.alignmentReward} PV !`
    );
  }

  prochainNiveau(): void {
    this.playSound('levelup');
    this.gs.nextLevel();
    this.resetjeu();

    this.snackBar.open(
      `🚀 Niveau supérieur ! Grille ${this.gs.gridSize()}×${this.gs.gridSize()} !`,
      'Sensationnel !',
      { duration: 3000 }
    );
  }

  precedentNiveau(): void {
    if (!this.canGoPrevious()) return;

    this.playSound('levelup');
    this.gs.previousLevel();
    this.resetjeu();

    this.snackBar.open(
      `⏪ Niveau précédent ! Grille ${this.gs.gridSize()}×${this.gs.gridSize()} !`,
      'Retour !',
      { duration: 2500 }
    );
  }

  /* ═══════════════════════════════════════════════════════
     JOUEUR — Clic sur une case
     ═══════════════════════════════════════════════════════ */

  playerClick(i: number): void {
    if (this.lock() || !this.gs.blocks()[i].free || this.gs.turn() !== 0) return;

    this.executeMove(i);
  }

  private executeMove(index: number): void {
    const currentTurn = this.gs.turn();
    const result = this.gs.playMove(index);
    if (result < 0) return;

    this.playSound(currentTurn === 0 ? 'click' : 'bot');

    const clearId = setTimeout(() => this.gs.clearIsNew(index), 500);
    this.timeouts.push(clearId);

    if (result > 0) {
      this.handleAlignment(currentTurn, result);
    }

    if (this.gs.isGameOver()) {
      const timerId = setTimeout(
        () => this.handleGameEnd(),
        END_GAME_DELAY_MS
      );
      this.timeouts.push(timerId);
      return;
    }

    this.changeTurn();
  }

  private changeTurn(): void {
    const current = this.gs.changeTurn();

    if (current === 1) {
      this.gs.setBotThinking(true);
      this.messageLyko.set('🔮 Lykö Le Sage prépare son sortilège…');
      this.lock.set(true);

      const timerId = setTimeout(() => {
        this.gs.setBotThinking(false);
        this.botTurn();
      }, BOT_THINK_DELAY_MS);
      this.timeouts.push(timerId);
    } else {
      this.lock.set(false);
      this.messageLyko.set('🎯 À votre tour de jouer.');
    }
  }

  private botTurn(): void {
    if (this.gs.isGameOver()) {
      this.lock.set(false);
      return;
    }

    const botIndex = this.gs.figureBotMove();
    if (botIndex >= 0 && this.gs.blocks()[botIndex].free) {
      this.executeMove(botIndex);
    } else {
      this.lock.set(false);
    }
  }

  /* ═══════════════════════════════════════════════════════
     ALIGNEMENTS & FIN DE PARTIE
     ═══════════════════════════════════════════════════════ */

  private handleAlignment(playerTurn: number, count: number): void {
    const gain = count * this.alignmentReward;

    if (playerTurn === 0) {
      this.pointdevies.update((v) => v + gain);
      this.lavie.set(this.pointdevies());
      this.playerAlignmentsThisRound.update((n) => n + count);
      this.playerGainedPvThisRound.update((n) => n + gain);
    } else {
      this.botAlignmentsThisRound.update((n) => n + count);
      this.botGainedPvThisRound.update((n) => n + gain);
    }

    this.playSound('win');

    const joueur = playerTurn === 0 ? '🎸 VOUS' : '🐵 LYKÖ LE SAGE';
    this.messageLyko.set(
      `✨ ${count} alignement(s) de 3 par ${joueur} ! +${gain} PV !`
    );

    this.snackBar.open(
      `🎯 ${count} alignement(s) ${joueur} : +${gain} PV`,
      'Super !',
      { duration: 2000 }
    );

    const timerId = setTimeout(
      () => this.gs.clearWinningHighlight(),
      WINNING_HIGHLIGHT_MS
    );
    this.timeouts.push(timerId);
  }

  private handleGameEnd(): void {
    if (this.rejouer()) return;

    this.lock.set(true);
    this.rejouer.set(true);
    this.gs.incrementDraw();

    const scoreVous = this.gs.players()[0].score;
    const scoreLyko = this.gs.players()[1].score;

    let result: 'victory' | 'defeat' | 'draw' = 'draw';

    if (scoreVous > scoreLyko) {
      result = 'victory';
      this.playSound('win');
      this.triggerConfetti();
      this.messageLyko.set(
        `🏆 Grille terminée ! Vous remportez le duel (${scoreVous} - ${scoreLyko}) !`
      );
    } else if (scoreLyko > scoreVous) {
      result = 'defeat';
      this.playSound('lose');
      this.messageLyko.set(
        `💀 Grille terminée ! Lykö le Sage l'emporte (${scoreLyko} - ${scoreVous}).`
      );
    } else {
      this.playSound('draw');
      this.messageLyko.set(
        `⚖️ Grille terminée ! Égalité parfaite (${scoreVous} - ${scoreLyko}).`
      );
    }

    const summary: EndGameSummary = {
      result,
      playerScore: scoreVous,
      botScore: scoreLyko,
      drawCount: this.gs.draw(),
      level: this.gs.gridSize() - 2,
      gridSize: this.gs.gridSize(),
      playerAlignments: this.playerAlignmentsThisRound(),
      botAlignments: this.botAlignmentsThisRound(),
      playerGainedPv: this.playerGainedPvThisRound(),
      botGainedPv: this.botGainedPvThisRound(),
      hasPreviousLevel: this.canGoPrevious(),
      hasNextLevel: true,
    };

    this.endSummary.set(summary);
    this.showEndDialog.set(true);
  }

  private triggerConfetti(): void {
    this.showConfetti.set(true);
    this.confettiParticles.set(
      Array.from({ length: CONFETTI_COUNT }, (_, i) => i)
    );

    const timerId = setTimeout(() => {
      this.showConfetti.set(false);
      this.confettiParticles.set([]);
    }, CONFETTI_DURATION_MS);

    this.timeouts.push(timerId);
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS DIALOGUE FIN
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
    void this.router.navigate(['/play'], {
      queryParams: { vie: lavie, bonus: lebonus, etape: letape },
    });
  }

  onrecommencer(): void {
    this.goToPlay(this.lavie(), this.lebonus(), '1');
  }
}