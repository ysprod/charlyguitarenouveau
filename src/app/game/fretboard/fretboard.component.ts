// src/app/game/fretboard/fretboard.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';

import { Router } from '@angular/router';

import {
  CHORD_POOL,
  CONFETTI_COLORS,
  CONFETTI_COUNT,
  DIFFICULTIES,
  DIFFICULTY_MAP,
  FRETBOARD_STORAGE_KEYS,
  FRETS,
  GAME_RULES,
  GUITAR_STRINGS,
  LIVES_INDICES,
  SPARKLES_INDICES,
  STAR_POWER_STARS,
  STRING_COLORS,
  TARGET_NOTES,
} from '../constants/fretboard.constants';

import {
  ConfettiParticle,
  Difficulty,
  FeedbackKind,
  MelodyChord,
  Particle,
} from '../models/fretboard.model';

import {
  randomElement,
  randomFloat,
  randomInt,
  randomSample,
} from '../utils/random.utils';

import { GuitarAudioService } from '../services/guitar-audio.service';
import { StorageService } from '../../shared/services/storage.service';
import { GameAudioService } from '../services/game-audio.service';

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-fretboard',
  imports: [],
  templateUrl: './fretboard.component.html',
  styleUrls: ['./fretboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FretboardComponent {

  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);
  private readonly guitarAudio = inject(GuitarAudioService);
  private readonly uiAudio = inject(GameAudioService);
  private readonly destroyRef = inject(DestroyRef);

  /* ═══════════════════════════════════════════════════════
     CONSTANTES EXPOSÉES AU TEMPLATE
     ═══════════════════════════════════════════════════════ */

  readonly strings = GUITAR_STRINGS;
  readonly notesList = TARGET_NOTES;
  readonly frets = FRETS;
  readonly DIFFICULTIES = DIFFICULTIES;
  readonly STAR_POWER_STARS = STAR_POWER_STARS;
  readonly SPARKLES = SPARKLES_INDICES;
  readonly LIVES_INDICES = LIVES_INDICES;

  /* ═══════════════════════════════════════════════════════
     ÉTAT DE JEU
     ═══════════════════════════════════════════════════════ */

  readonly score = signal(0);
  readonly combo = signal(0);
  readonly maxCombo = signal(0);
  readonly lives = signal(DIFFICULTY_MAP.normal.lives);
  readonly targetNote = signal('');
  readonly timeLeft = signal(GAME_RULES.MAX_TIME);
  readonly isPlaying = signal(false);
  readonly isGameOver = signal(false);
  readonly isTimerPaused = signal(false);
  readonly notesHit = signal(0);
  readonly notesMissed = signal(0);
  readonly streak = signal(0);

  /* ─── Star Power ─── */
  readonly starPowerGauge = signal(0);
  readonly isStarPowerActive = signal(false);
  readonly starPowerTimeLeft = signal(0);

  /* ─── UI / Feedback ─── */
  readonly feedbackMessage = signal<string | null>(null);
  readonly feedbackType = signal<FeedbackKind>('success');
  readonly feedbackKey = signal(0);
  readonly highScore = signal(0);
  readonly difficulty = signal<Difficulty>('normal');
  readonly screenShake = signal(false);
  readonly comboFlashKey = signal(0);

  /* ─── Effets visuels ─── */
  readonly particles = signal<Particle[]>([]);
  readonly correctFretIndex = signal(-1);
  readonly correctStringIndex = signal(-1);
  readonly activeVibratingString = signal(-1);
  readonly hitEffects = signal<Set<string>>(new Set());
  readonly confettiParticles = signal<ConfettiParticle[]>([]);

  /* ─── Mélodie ─── */
  readonly melodyPlaying = signal(false);
  readonly melodyChordIndex = signal(-1);
  readonly melodyChordName = signal('');
  readonly melodyChordFrench = signal('');
  readonly melodyChordColor = signal('#FFD700');
  readonly melodyActiveNote = signal<{ stringIdx: number; fretIdx: number } | null>(null);
  readonly melodySequence = signal<MelodyChord[]>([]);

  /* ═══════════════════════════════════════════════════════
     COMPUTED
     ═══════════════════════════════════════════════════════ */

  readonly multiplier = computed(() => {
    const c = this.combo();
    if (c >= 20) return 6;
    if (c >= 15) return 5;
    if (c >= 12) return 4;
    if (c >= 8) return 3;
    if (c >= 4) return 2;
    return 1;
  });

  readonly effectiveMultiplier = computed(() =>
    this.multiplier() * (this.isStarPowerActive() ? 2 : 1)
  );

  readonly accuracy = computed(() => {
    const total = this.notesHit() + this.notesMissed();
    return total === 0 ? 100 : Math.round((this.notesHit() / total) * 100);
  });

  readonly timerPercent = computed(() =>
    (this.timeLeft() / GAME_RULES.MAX_TIME) * 100
  );

  readonly timerColor = computed(() => {
    const pct = this.timerPercent();
    if (pct < 20) return 'linear-gradient(90deg, #ef4444, #f59e0b)';
    if (pct < 50) return 'linear-gradient(90deg, #f59e0b, #fbbf24, #10b981)';
    return 'linear-gradient(90deg, #10b981, #06b6d4, #3b82f6)';
  });

  /** Formate le temps restant de Star Power (1 décimale). */
  readonly starPowerTimeLeftFormatted = computed(() =>
    this.starPowerTimeLeft().toFixed(1)
  );

  /** Formate la jauge Star Power (sans décimale). */
  readonly starPowerGaugeFormatted = computed(() =>
    Math.round(this.starPowerGauge()).toString()
  );

  /** Indique si le label de note doit être affiché. */
  readonly shouldShowNoteLabel = computed(
    () => this.difficulty() !== 'hardcore'
  );

  /* ═══════════════════════════════════════════════════════
     TIMERS — GESTION CENTRALISÉE
     ═══════════════════════════════════════════════════════ */

  private timerInterval?: ReturnType<typeof setInterval>;
  private starPowerInterval?: ReturnType<typeof setInterval>;
  private readonly timeouts = new Set<ReturnType<typeof setTimeout>>();
  private isMelodyPlaying = false;
  private particleId = 0;
  private confettiId = 0;

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    /* Flash combo tous les 4 points */
    effect(() => {
      const c = this.combo();
      untracked(() => {
        if (c > 0 && c % 4 === 0) {
          this.comboFlashKey.update((k) => k + 1);
        }
      });
    });

    afterNextRender(() => {
      this.loadHighScore();
    });

    this.destroyRef.onDestroy(() => {
      this.clearAllTimers();
      this.stopMelody();
      this.stopConfetti();
    });
  }

  /* ═══════════════════════════════════════════════════════
     TIMERS
     ═══════════════════════════════════════════════════════ */

  private setManagedTimeout(fn: () => void, delayMs: number): void {
    const id = setTimeout(() => {
      this.timeouts.delete(id);
      fn();
    }, delayMs);
    this.timeouts.add(id);
  }

  private clearAllTimers(): void {
    this.timeouts.forEach((id) => clearTimeout(id));
    this.timeouts.clear();
    clearInterval(this.timerInterval);
    clearInterval(this.starPowerInterval);
    this.timerInterval = undefined;
    this.starPowerInterval = undefined;
  }

  /* ═══════════════════════════════════════════════════════
     GAME LOOP
     ═══════════════════════════════════════════════════════ */

  async startGame(): Promise<void> {
    await this.guitarAudio.ensureReady();
    this.stopMelody();
    this.stopConfetti();
    this.isTimerPaused.set(false);
    this.uiAudio.play('start');

    this.score.set(0);
    this.combo.set(0);
    this.maxCombo.set(0);
    this.lives.set(this.getLivesStart());
    this.starPowerGauge.set(0);
    this.isStarPowerActive.set(false);
    this.isPlaying.set(true);
    this.isGameOver.set(false);
    this.notesHit.set(0);
    this.notesMissed.set(0);
    this.streak.set(0);

    this.nextRound();
  }

  private startTimer(): void {
    clearInterval(this.timerInterval);
    this.timeLeft.set(GAME_RULES.MAX_TIME);

    this.timerInterval = setInterval(() => {
      if (!this.isPlaying()) return;
      if (this.isTimerPaused()) return;

      this.timeLeft.update((t) => t - this.getTimeMultiplier());
      if (this.timeLeft() <= 0) this.handleMiss(true);
    }, GAME_RULES.TIMER_TICK_MS);
  }

  private nextRound(): void {
    const idx = randomInt(0, this.notesList.length);
    this.targetNote.set(this.notesList[idx]);
    this.correctFretIndex.set(-1);
    this.correctStringIndex.set(-1);
    this.startTimer();
  }

  /* ═══════════════════════════════════════════════════════
     INTERACTION JOUEUR
     ═══════════════════════════════════════════════════════ */

  onFretClick(stringIdx: number, fretIdx: number): void {
    if (!this.isPlaying()) return;
    if (this.isTimerPaused() || this.isMelodyPlaying) return;

    const clickedNoteName = this.getNoteAt(stringIdx, fretIdx);
    const toneNote = this.guitarAudio.getToneNote(stringIdx, fretIdx);

    this.guitarAudio.playNote(stringIdx, toneNote, 2.2, 0.85);

    this.activeVibratingString.set(stringIdx);
    this.setManagedTimeout(() => {
      if (this.activeVibratingString() === stringIdx) {
        this.activeVibratingString.set(-1);
      }
    }, 450);

    if (clickedNoteName === this.targetNote()) {
      this.handleSuccess(fretIdx, stringIdx);
    } else {
      this.handleMiss(false);
    }
  }

  private handleSuccess(fretIdx: number, stringIdx: number): void {
    this.combo.update((c) => c + 1);
    this.streak.update((s) => s + 1);
    this.notesHit.update((n) => n + 1);
    if (this.combo() > this.maxCombo()) this.maxCombo.set(this.combo());

    const starPowerBonus = this.isStarPowerActive() ? 2 : 1;
    const perfectBonus =
      this.timeLeft() > GAME_RULES.MAX_TIME * GAME_RULES.PERFECT_TIME_THRESHOLD
        ? 1.5
        : 1;
    const basePoints = Math.round(
      100 * this.multiplier() * starPowerBonus * perfectBonus
    );
    this.score.update((s) => s + basePoints);

    if (!this.isStarPowerActive()) {
      this.starPowerGauge.update((g) =>
        Math.min(100, g + GAME_RULES.STAR_POWER_GAIN_ON_HIT)
      );
    }

    this.correctFretIndex.set(fretIdx);
    this.correctStringIndex.set(stringIdx);
    this.triggerParticles(stringIdx, fretIdx);
    this.triggerHitEffect(stringIdx, fretIdx);

    const isPerfect = this.timeLeft() > GAME_RULES.MAX_TIME * 0.75;
    const comboText =
      this.effectiveMultiplier() > 1 ? ` x${this.effectiveMultiplier()}` : '';

    if (isPerfect) {
      this.showFeedback(`PARFAIT ! +${basePoints}${comboText}`, 'perfect');
      this.uiAudio.play('perfect');
    } else {
      this.showFeedback(`BIEN ! +${basePoints}${comboText}`, 'success');
    }

    if (
      this.combo() > 0 &&
      this.combo() % GAME_RULES.COMBO_MELODY_TRIGGER === 0
    ) {
      void this.playMelodieDesOrigines();
    }

    if (
      this.combo() > 0 &&
      this.combo() % GAME_RULES.COMBO_SHAKE_TRIGGER === 0
    ) {
      this.triggerScreenShake();
    }

    this.nextRound();
  }

  private handleMiss(isTimeout: boolean): void {
    if (this.isTimerPaused() || this.isMelodyPlaying) return;

    this.combo.set(0);
    this.streak.set(0);
    this.notesMissed.update((n) => n + 1);
    this.lives.update((l) => l - 1);
    this.uiAudio.play('error');
    this.triggerScreenShake();
    this.showFeedback(isTimeout ? 'TEMPS ÉCOULÉ !' : 'RATÉ !', 'error');

    if (this.lives() <= 0) {
      this.endGame();
    } else {
      this.nextRound();
    }
  }

  activateStarPower(): void {
    if (this.starPowerGauge() < 100 || this.isStarPowerActive()) return;

    this.isStarPowerActive.set(true);
    this.starPowerGauge.set(100);
    this.starPowerTimeLeft.set(GAME_RULES.STAR_POWER_DURATION);
    this.uiAudio.play('starpower');
    this.showFeedback('⚡ STAR POWER ACTIVÉ ! ⚡', 'perfect');
    this.triggerScreenShake();

    clearInterval(this.starPowerInterval);
    this.starPowerInterval = setInterval(() => {
      this.starPowerTimeLeft.update((t) => t - 0.1);
      this.starPowerGauge.update((g) => {
        if (g <= 0) {
          clearInterval(this.starPowerInterval);
          this.isStarPowerActive.set(false);
          return 0;
        }
        return g - GAME_RULES.STAR_POWER_DRAIN_PER_TICK;
      });
    }, 100);
  }

  /* ═══════════════════════════════════════════════════════
     MÉLODIE DES ORIGINES
     ═══════════════════════════════════════════════════════ */

  private async playMelodieDesOrigines(): Promise<void> {
    if (this.isMelodyPlaying) return;

    const ready = await this.guitarAudio.ensureReady();
    if (!ready) return;

    const chosen = randomSample(CHORD_POOL, 4);

    this.melodySequence.set(chosen);

    this.isMelodyPlaying = true;
    this.melodyPlaying.set(true);
    this.showFeedback('✨ MÉLODIE DES ORIGINES ✨', 'perfect');

    this.isTimerPaused.set(true);
    this.spawnConfetti(CONFETTI_COUNT);
    this.uiAudio.play('perfect');
    this.triggerScreenShake();

    const CHORD_SPACING = 1.6;
    const ARPEGGIO_DELAY = 0.09;

    chosen.forEach((chord, i) => {
      const chordStart = i * CHORD_SPACING + 0.3;

      this.setManagedTimeout(() => {
        this.melodyChordIndex.set(i);
        this.melodyChordName.set(chord.name);
        this.melodyChordFrench.set(chord.frenchName);
        this.melodyChordColor.set(chord.color);
      }, chordStart * 1000);

      this.guitarAudio.playMelodyNote(6, chord.bassNote, 2.8, 0.55, chordStart);

      chord.arpeggio.forEach((note, nIdx) => {
        const noteDelay = chordStart + 0.1 + nIdx * ARPEGGIO_DELAY;
        const toneNote = this.guitarAudio.getToneNote(
          note.stringIdx,
          note.fretIdx
        );

        this.guitarAudio.playMelodyNote(
          note.stringIdx,
          toneNote,
          2.4,
          0.4,
          noteDelay
        );

        this.setManagedTimeout(() => {
          this.melodyActiveNote.set({
            stringIdx: note.stringIdx,
            fretIdx: note.fretIdx,
          });
          this.activeVibratingString.set(note.stringIdx);
          this.spawnMelodyParticle(note.stringIdx, note.fretIdx, chord.color);
        }, noteDelay * 1000);

        this.setManagedTimeout(() => {
          this.melodyActiveNote.set(null);
          if (this.activeVibratingString() === note.stringIdx) {
            this.activeVibratingString.set(-1);
          }
        }, (noteDelay + 0.45) * 1000);
      });
    });

    const totalDuration = chosen.length * CHORD_SPACING + 1.5;
    this.setManagedTimeout(() => {
      this.stopMelody();
      this.timeLeft.set(GAME_RULES.MAX_TIME);
      this.showFeedback('🌟 MÉLODIE ACCOMPLIE 🌟', 'perfect');
    }, totalDuration * 1000);
  }

  private spawnMelodyParticle(
    stringIdx: number,
    fretIdx: number,
    color: string
  ): void {
    const particle: Particle = {
      id: this.particleId++,
      x: (fretIdx / 12) * 100,
      y: ((stringIdx - 1) / 6) * 100 + 8,
      color,
      size: 14,
      rotation: randomFloat(0, 360),
    };
    this.particles.update((p) => [...p, particle]);
    this.setManagedTimeout(() => {
      this.particles.update((p) => p.filter((x) => x.id !== particle.id));
    }, 1400);
  }

  private stopMelody(): void {
    this.guitarAudio.stopAllVoices();
    this.stopConfetti();

    this.isMelodyPlaying = false;
    this.melodyPlaying.set(false);
    this.melodyChordIndex.set(-1);
    this.melodyActiveNote.set(null);
    this.isTimerPaused.set(false);
  }

  isMelodyNote(stringIdx: number, fretIdx: number): boolean {
    const active = this.melodyActiveNote();
    return (
      active !== null &&
      active.stringIdx === stringIdx &&
      active.fretIdx === fretIdx
    );
  }

  /* ═══════════════════════════════════════════════════════
     CONFETTIS
     ═══════════════════════════════════════════════════════ */

  private spawnConfetti(count = CONFETTI_COUNT): void {
    const newConfetti: ConfettiParticle[] = Array.from(
      { length: count },
      () => ({
        id: this.confettiId++,
        x: randomFloat(0, 100),
        color: randomElement(CONFETTI_COLORS),
        size: randomFloat(6, 14),
        delay: randomFloat(0, 1500),
        duration: randomFloat(2500, 4500),
        rotation: randomFloat(0, 360),
      })
    );

    this.confettiParticles.update((c) => [...c, ...newConfetti]);

    const ids = new Set(newConfetti.map((n) => n.id));
    this.setManagedTimeout(() => {
      this.confettiParticles.update((c) => c.filter((x) => !ids.has(x.id)));
    }, 6000);
  }

  private stopConfetti(): void {
    this.confettiParticles.set([]);
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════ */

  backToMenu(): void {
    this.clearAllTimers();
    this.stopMelody();
    this.stopConfetti();
    this.isTimerPaused.set(false);
    this.isPlaying.set(false);
    this.isGameOver.set(false);
    this.uiAudio.play('click');
  }

  goToPlay(): void {
    void this.router.navigate(['/play']);
  }

  /* ═══════════════════════════════════════════════════════
     THÉORIE MUSICALE
     ═══════════════════════════════════════════════════════ */

  getNoteAt(stringIndex: number, fret: number): string {
    return this.guitarAudio.getDisplayNote(stringIndex, fret);
  }

  getStringColor(stringIdx: number): string {
    return STRING_COLORS[stringIdx - 1] ?? '#D4AF37';
  }

  getAriaLabel(stringIdx: number, fret: number): string {
    const note = this.getNoteAt(stringIdx, fret);
    return fret === 0
      ? `Corde ${stringIdx}, corde à vide, note ${note}`
      : `Corde ${stringIdx}, case ${fret}, note ${note}`;
  }

  isHit(stringIdx: number, fretIdx: number): boolean {
    return this.hitEffects().has(`${stringIdx}:${fretIdx}`);
  }

  /* ═══════════════════════════════════════════════════════
     EFFETS VISUELS
     ═══════════════════════════════════════════════════════ */

  private triggerParticles(stringIdx: number, fretIdx: number): void {
    const newParticles: Particle[] = Array.from({ length: 16 }, () => ({
      id: this.particleId++,
      x: (fretIdx / 12) * 100,
      y: ((stringIdx - 1) / 6) * 100,
      color: this.getStringColor(stringIdx),
      size: randomFloat(4, 12),
      rotation: randomFloat(0, 360),
    }));

    const ids = new Set(newParticles.map((p) => p.id));
    this.particles.update((p) => [...p, ...newParticles]);
    this.setManagedTimeout(() => {
      this.particles.update((p) => p.filter((x) => !ids.has(x.id)));
    }, 1200);
  }

  private triggerHitEffect(stringIdx: number, fretIdx: number): void {
    const key = `${stringIdx}:${fretIdx}`;
    this.hitEffects.update((set) => new Set(set).add(key));
    this.setManagedTimeout(() => {
      this.hitEffects.update((set) => {
        const copy = new Set(set);
        copy.delete(key);
        return copy;
      });
    }, 700);
  }

  private triggerScreenShake(): void {
    this.screenShake.set(true);
    this.setManagedTimeout(() => this.screenShake.set(false), 300);
  }

  /* ═══════════════════════════════════════════════════════
     FEEDBACK
     ═══════════════════════════════════════════════════════ */

  showFeedback(msg: string, type: FeedbackKind): void {
    this.feedbackKey.update((k) => k + 1);
    this.feedbackMessage.set(msg);
    this.feedbackType.set(type);
    this.setManagedTimeout(() => this.feedbackMessage.set(null), 900);
  }

  private endGame(): void {
    this.clearAllTimers();
    this.stopMelody();
    this.stopConfetti();
    this.isTimerPaused.set(false);
    this.isPlaying.set(false);
    this.isGameOver.set(true);
    this.saveHighScore();
    this.uiAudio.play('gameover');
  }

  /* ═══════════════════════════════════════════════════════
     DIFFICULTÉ / PERSISTANCE
     ═══════════════════════════════════════════════════════ */

  setDifficulty(d: Difficulty): void {
    this.difficulty.set(d);
    this.uiAudio.play('click');
  }

  private getTimeMultiplier(): number {
    return DIFFICULTY_MAP[this.difficulty()].timeMultiplier;
  }

  private getLivesStart(): number {
    return DIFFICULTY_MAP[this.difficulty()].lives;
  }

  private loadHighScore(): void {
    const saved = this.storage.getNumber(
      FRETBOARD_STORAGE_KEYS.HIGH_SCORE,
      -1
    );
    if (saved >= 0) this.highScore.set(saved);
  }

  private saveHighScore(): void {
    if (this.score() > this.highScore()) {
      this.highScore.set(this.score());
      this.storage.setNumber(
        FRETBOARD_STORAGE_KEYS.HIGH_SCORE,
        this.score()
      );
    }
  }

  /* ═══════════════════════════════════════════════════════
     STAR POWER — HELPERS
     ═══════════════════════════════════════════════════════ */

  isStarFilled(i: number): boolean {
    return this.starPowerGauge() >= (i + 1) * 10;
  }
}