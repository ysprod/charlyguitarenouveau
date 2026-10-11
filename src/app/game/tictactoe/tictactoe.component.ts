import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';

import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';

import { TictactoeserviceService } from '../../services/tictactoeservice.service';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

type SoundType = 'click' | 'win' | 'lose' | 'draw' | 'levelup' | 'bot';

const ALIGNMENT_REWARD = 10;
const CONFETTI_COUNT = 60;
const CONFETTI_DURATION_MS = 4500;
const BOT_THINK_DELAY_MS = 700;
const WINNING_HIGHLIGHT_MS = 1200;
const END_GAME_DELAY_MS = 400;

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-tictactoe',
  standalone: true,
  imports: [],
  templateUrl: './tictactoe.component.html',
  styleUrls: ['./tictactoe.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TictactoeComponent implements OnInit, OnDestroy {

  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  public readonly gs = inject(TictactoeserviceService);

  /* ─── État ─── */
  lock = false;
  rejouer = false;
  etapedujeu = '0';
  lavie = 0;
  lebonus = 0;
  pointdevies = 0;
  pointdebonus = 0;
  messageLyko = 'Lykö le Sage observe votre stratégie…';
  showConfetti = false;
  showVictoryOverlay = false;
  showDefeatOverlay = false;
  particles: number[] = [];

  readonly alignmentReward = ALIGNMENT_REWARD;

  /* ─── Audio ─── */
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
    this.resetjeu();
  }

  ngOnDestroy(): void {
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close();
    }

    this.timeouts.forEach(t => clearTimeout(t));
  }

  /* ═══════════════════════════════════════════════════════════════════
     AUDIO
     ═══════════════════════════════════════════════════════════════════ */

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
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => { /* silencieux */ });
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

  /* ═══════════════════════════════════════════════════════════════════
     RESET & NIVEAUX
     ═══════════════════════════════════════════════════════════════════ */

  resetjeu(): void {
    this.rejouer = false;
    this.lock = false;
    this.showConfetti = false;
    this.showVictoryOverlay = false;
    this.showDefeatOverlay = false;

    this.gs.resetAll();
    this.gs.turn = 0;
    this.gs.isBotThinking = false;

    this.messageLyko =
      `Niveau ${this.gs.gridSize - 2} : Grille ${this.gs.gridSize}×${this.gs.gridSize} — ` +
      `Alignez ${this.gs.winningStreak} pions pour gagner +${this.alignmentReward} PV !`;
  }

  prochainNiveau(): void {
    this.playSound('levelup');
    this.gs.nextLevel();
    this.resetjeu();

    this.snackBar.open(
      `🚀 Niveau supérieur ! Grille ${this.gs.gridSize}×${this.gs.gridSize} !`,
      'Sensationnel !',
      { duration: 3000 }
    );
  }

  precedentNiveau(): void {
    if (!this.yaprecedent()) return;

    this.playSound('levelup');
    this.gs.previousLevel();
    this.resetjeu();

    this.snackBar.open(
      `⏪ Niveau précédent ! Grille ${this.gs.gridSize}×${this.gs.gridSize} !`,
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
    if (this.lock || !this.gs.blocks[i].free || this.gs.turn !== 0) return;

    this.executeMove(i);
  }

  private executeMove(index: number): void {
    const currentTurn = this.gs.turn;
    const scoreBefore = this.gs.players[currentTurn].score;

    const played = this.gs.playMove(index);
    if (!played) return;

    if (currentTurn === 0) {
      this.playSound('click');
    } else {
      this.playSound('bot');
    }

    const scoreAfter = this.gs.players[currentTurn].score;
    const newAlignments = scoreAfter - scoreBefore;

    if (newAlignments > 0) {
      this.handleAlignment(currentTurn, newAlignments);
    }

    if (this.gs.isGameOver) {
      const timerId = setTimeout(() => this.handleDraw(), END_GAME_DELAY_MS);
      this.timeouts.push(timerId);
      return;
    }

    this.changeTurn();
  }

  private changeTurn(): void {
    const current = this.gs.changeTurn();

    if (current === 1) {
      this.gs.isBotThinking = true;
      this.messageLyko = '🔮 Lykö Le Sage prépare son sortilège…';
      this.lock = true;

      const timerId = setTimeout(() => {
        this.gs.isBotThinking = false;
        this.botTurn();
      }, BOT_THINK_DELAY_MS);
      this.timeouts.push(timerId);
    } else {
      this.lock = false;
      this.messageLyko = '🎯 À votre tour de jouer.';
    }
  }

  private botTurn(): void {
    if (this.gs.isGameOver) {
      this.lock = false;
      return;
    }

    const botIndex = this.gs.figureBotMove();
    if (botIndex >= 0 && this.gs.blocks[botIndex].free) {
      this.executeMove(botIndex);
    } else {
      this.lock = false;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ALIGNEMENTS & FIN DE PARTIE
     ═══════════════════════════════════════════════════════════════════ */

  private handleAlignment(playerTurn: number, count: number): void {
    const gain = count * this.alignmentReward;

    if (playerTurn === 0) {
      this.pointdevies += gain;
      this.lavie = this.pointdevies;
    }

    this.playSound('win');

    const joueur = playerTurn === 0 ? '🎸 VOUS' : '🐵 LYKÖ LE SAGE';
    this.messageLyko = `✨ ${count} alignement(s) de 3 par ${joueur} ! +${gain} PV !`;

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

  private handleDraw(): void {
    if (this.lock && this.rejouer) return;

    this.lock = true;
    this.rejouer = true;
    this.gs.draw += 1;

    const scoreVous = this.gs.players[0].score;
    const scoreLyko = this.gs.players[1].score;

    if (scoreVous > scoreLyko) {
      this.playSound('win');
      this.triggerConfetti();
      this.showVictoryOverlay = true;
      this.messageLyko = `🏆 Grille terminée ! Vous remportez le duel (${scoreVous} - ${scoreLyko}) !`;
      this.snackBar.open(
        `🏆 VICTOIRE ${scoreVous} - ${scoreLyko} !`,
        'Bravo !',
        { duration: 3500 }
      );
    } else if (scoreLyko > scoreVous) {
      this.playSound('lose');
      this.showDefeatOverlay = true;
      this.messageLyko = `💀 Grille terminée ! Lykö le Sage l'emporte (${scoreLyko} - ${scoreVous}).`;
      this.snackBar.open(
        `💀 DÉFAITE ${scoreLyko} - ${scoreVous}`,
        'Revanche !',
        { duration: 3000 }
      );
    } else {
      this.playSound('draw');
      this.messageLyko = `⚖️ Grille terminée ! Égalité parfaite (${scoreVous} - ${scoreLyko}).`;
      this.snackBar.open(
        `⚖️ MATCH NUL ${scoreVous} - ${scoreLyko}`,
        'Égalité',
        { duration: 3000 }
      );
    }
  }

  private triggerConfetti(): void {
    this.showConfetti = true;
    this.particles = Array.from({ length: CONFETTI_COUNT }, (_, i) => i);

    const timerId = setTimeout(() => {
      this.showConfetti = false;
      this.showVictoryOverlay = false;
    }, CONFETTI_DURATION_MS);

    this.timeouts.push(timerId);
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