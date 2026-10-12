import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';

import { TictacduoService } from '../../services/tictacduo.service';
import { DuoEndGameDialogComponent } from 'src/app/shared/duo-end-game-dialog/duo-end-game-dialog.component';
import { DuoEndGameSummary } from 'src/app/models/duo-end-game-summary.model';

/* ═════════════════════════════════════════════════════════════════════
   TYPES & CONSTANTES
   ═════════════════════════════════════════════════════════════════════ */

type SoundType = 'click' | 'win' | 'draw' | 'levelup';

const ALIGNMENT_REWARD = 10;
const SOUND_PREF_KEY = 'tictacduo_sound_enabled';
const CONFETTI_COUNT = 60;
const CONFETTI_DURATION_MS = 4500;
const END_GAME_DELAY_MS = 150; // ✅ Réduit pour un affichage quasi immédiat
const WINNING_HIGHLIGHT_MS = 1200;

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-tictacduo',
  standalone: true,
  imports: [DuoEndGameDialogComponent],
  templateUrl: './tictacduo.component.html',
  styleUrls: ['./tictacduo.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TictacduoComponent implements OnInit, OnDestroy {

  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef); // ✅ Pour forcer la détection
  public readonly gs = inject(TictacduoService);

  /* ─── État ─── */
  lock = false;
  rejouer = false;
  lavie = 0;
  lebonus = 0;
  pointdevies = 0;
  pointdebonus = 0;
  messageLyko = 'Au tour du Joueur 1…';
  showConfetti = false;

  /* ─── Dialogue de fin ─── */
  showEndDialog = false;
  endSummary: DuoEndGameSummary | null = null;

  readonly alignmentReward = ALIGNMENT_REWARD;

  /* ─── Suivi de manche ─── */
  private player1AlignmentsThisRound = 0;
  private player2AlignmentsThisRound = 0;
  private player1GainedPvThisRound = 0;
  private player2GainedPvThisRound = 0;

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
    this.timeouts.length = 0;
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

  /* ═══════════════════════════════════════════════════════════════════
     RESET & NIVEAUX
     ═══════════════════════════════════════════════════════════════════ */

  resetjeu(): void {
    this.rejouer = false;
    this.lock = false;
    this.showConfetti = false;
    this.showEndDialog = false;
    this.endSummary = null;

    this.player1AlignmentsThisRound = 0;
    this.player2AlignmentsThisRound = 0;
    this.player1GainedPvThisRound = 0;
    this.player2GainedPvThisRound = 0;

    this.gs.resetAll();
    this.gs.turn = 0;

    this.messageLyko =
      `Niveau ${this.gs.gridSize - 2} — Grille ${this.gs.gridSize}×${this.gs.gridSize} · ` +
      `Alignez 3 pions pour gagner +${this.alignmentReward} PV !`;

    this.cdr.markForCheck();
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

  yaprecedent(): boolean {
    return this.gs.gridSize > 3;
  }

  /* ═══════════════════════════════════════════════════════════════════
     JOUEUR — Clic sur une case
     ═══════════════════════════════════════════════════════════════════ */

  playerClick(i: number): void {
    // ✅ On ne bloque que si la partie est déjà verrouillée (fin en cours)
    if (this.lock || this.gs.isGameOver || !this.gs.blocks[i].free) return;

    const playerTurn = this.gs.turn;
    const alignments = this.gs.playMove(i);

    this.playSound('click');

    if (alignments > 0) {
      this.handleAlignment(playerTurn, alignments);
    }

    // ✅ VÉRIFICATION IMMÉDIATE APRÈS LE COUP — l'état est maintenant synchrone
    if (this.gs.isGameOver) {
      this.lock = true;
      // ✅ On affiche le dialogue DIRECTEMENT (plus de setTimeout)
      //    pour garantir l'affichage immédiat
      this.handleEndGame();
      this.cdr.markForCheck();
      return;
    }

    this.changeTurn();
    this.cdr.markForCheck();
  }

  private handleAlignment(playerTurn: number, count: number): void {
    const gain = count * this.alignmentReward;
    this.pointdevies += gain;
    this.lavie = this.pointdevies;

    if (playerTurn === 0) {
      this.player1AlignmentsThisRound += count;
      this.player1GainedPvThisRound += gain;
    } else {
      this.player2AlignmentsThisRound += count;
      this.player2GainedPvThisRound += gain;
    }

    this.playSound('win');

    const joueur = playerTurn === 0 ? 'JOUEUR 1' : 'JOUEUR 2';
    this.messageLyko = `✨ ${count} alignement(s) pour ${joueur} ! +${gain} PV !`;

    this.snackBar.open(
      `🎯 ${count} alignement(s) ${joueur} : +${gain} PV`,
      'Bravo !',
      { duration: 2000 }
    );

    const timerId = setTimeout(
      () => {
        this.gs.clearWinningHighlight();
        this.cdr.markForCheck();
      },
      WINNING_HIGHLIGHT_MS
    );
    this.timeouts.push(timerId);
  }

  private handleEndGame(): void {
    this.rejouer = true;
    this.gs.draw += 1;

    const scoreJ1 = this.gs.players[0].score;
    const scoreJ2 = this.gs.players[1].score;

    let result: 'player1' | 'player2' | 'draw' = 'draw';

    if (scoreJ1 > scoreJ2) {
      result = 'player1';
      this.playSound('win');
      this.messageLyko = `🏆 Le JOUEUR 1 remporte le duel (${scoreJ1} - ${scoreJ2}) !`;
    } else if (scoreJ2 > scoreJ1) {
      result = 'player2';
      this.playSound('win');
      this.messageLyko = `🎉 Le JOUEUR 2 remporte le duel (${scoreJ2} - ${scoreJ1}) !`;
    } else {
      result = 'draw';
      this.playSound('draw');
      this.messageLyko = `⚖️ Égalité parfaite (${scoreJ1} - ${scoreJ2}) !`;
    }

    this.endSummary = {
      result,
      player1Score: scoreJ1,
      player2Score: scoreJ2,
      drawCount: this.gs.draw,
      level: this.gs.gridSize - 2,
      gridSize: this.gs.gridSize,
      player1Alignments: this.player1AlignmentsThisRound,
      player2Alignments: this.player2AlignmentsThisRound,
      player1GainedPv: this.player1GainedPvThisRound,
      player2GainedPv: this.player2GainedPvThisRound,
      hasPreviousLevel: this.yaprecedent(),
      hasNextLevel: true,
    };

    this.showEndDialog = true;
    this.cdr.detectChanges(); // ✅ Force l'affichage immédiat du dialogue
  }



  private changeTurn(): void {
    const current = this.gs.changeTurn();
    this.messageLyko = current === 1
      ? '🎯 Au tour du JOUEUR 2'
      : '🎯 Au tour du JOUEUR 1';
  }

  /* ═══════════════════════════════════════════════════════════════════
     ACTIONS DU DIALOGUE DE FIN
     ═══════════════════════════════════════════════════════════════════ */

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

  /* ═══════════════════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════════════════ */

  goToPlay(lavie: number, lebonus: number, letape: string): void {
    void this.router.navigate(['/play'], {
      queryParams: { vie: lavie, bonus: lebonus, etape: letape },
    });
  }

  onrecommencer(): void {
    this.goToPlay(this.lavie, this.lebonus, '0');
  }
}