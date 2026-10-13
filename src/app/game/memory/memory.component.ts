import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { Router } from '@angular/router';

import { ChordShape, Difficulty } from '../../models/memory-chord.model';
import { DifficultyConfig, PinState } from '../../models/molkky.model';

import { CHORD_CATALOG } from '../../constants/chords.constants';
import {
  MOLKKY_DIFFICULTIES,
  MOLKKY_DIFFICULTY_MAP,
  MOLKKY_RULES,
  MOLKKY_STORAGE_KEYS
} from '../../constants/molkky.constants';

import { GameAudioService } from '../../services/game-audio.service';
import { StorageService } from '../../services/storage.service';

import { randomInt, randomSample } from '../../utils/random.utils';

type FeedbackType = 'success' | 'error';

@Component({
  selector: 'app-memory',
  standalone: true,
  imports: [],
  templateUrl: './memory.component.html',
  styleUrls: ['./memory.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MemoryComponent implements OnInit, OnDestroy {

  /* ─── Injection ─── */
  private readonly router = inject(Router);
  private readonly audio = inject(GameAudioService);
  private readonly storage = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);

  /* ─── Constantes exposées au template ─── */
  readonly difficulties = MOLKKY_DIFFICULTIES;
  readonly chordCatalog = CHORD_CATALOG;

  /* ─── État (signals) ─── */
  readonly pins = signal<PinState[]>([]);
  readonly score = signal(0);
  readonly strikes = signal(0);
  readonly targetChord = signal<ChordShape | null>(null);
  readonly isPlaying = signal(false);
  readonly isGameOver = signal(false);
  readonly isVictory = signal(false);
  readonly difficulty = signal<Difficulty>('normal');
  readonly timeLeft = signal(MOLKKY_RULES.MAX_TIME);
  readonly roundNumber = signal(0);
  readonly perfectRounds = signal(0);
  readonly feedbackMessage = signal<string | null>(null);
  readonly feedbackType = signal<FeedbackType>('success');
  readonly particles = signal<number[]>([]);

  /* ─── Computed ─── */
  readonly currentDifficulty = computed<DifficultyConfig>(() =>
    MOLKKY_DIFFICULTY_MAP[this.difficulty()] ?? MOLKKY_DIFFICULTY_MAP.normal
  );

  readonly strikeLimit = computed(() => this.currentDifficulty().strikeLimit);

  readonly strikeArray = computed(() =>
    Array.from({ length: this.strikeLimit() }, (_, i) => i)
  );

  readonly hasCombo = computed(
    () => this.perfectRounds() >= MOLKKY_RULES.COMBO_THRESHOLD
  );

  readonly timerColor = computed(() => {
    const t = this.timeLeft();
    if (t < 20) return 'linear-gradient(90deg, #ef4444, #dc2626)';
    if (t < 50) return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
    return 'linear-gradient(90deg, #10b981, #06b6d4)';
  });

  readonly showNoteLabels = computed(() => this.difficulty() !== 'difficile');

  /* ─── Timers centralisés ─── */
  private readonly timeouts = new Set<ReturnType<typeof setTimeout>>();
  private timerInterval?: ReturnType<typeof setInterval>;

  /* ─── Cycle de vie ─── */
  ngOnInit(): void {
    this.loadDifficulty();
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
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
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts.clear();
    clearInterval(this.timerInterval);
  }

  /* ═══════════════════════════════════════════════════════
     DIFFICULTÉ
     ═══════════════════════════════════════════════════════ */

  private loadDifficulty(): void {
    const saved = this.storage.getString(MOLKKY_STORAGE_KEYS.DIFFICULTY, '');
    if (saved && this.difficulties.some(d => d.id === saved)) {
      this.difficulty.set(saved as Difficulty);
    }
  }

  setDifficulty(d: Difficulty): void {
    this.difficulty.set(d);
    this.storage.setString(MOLKKY_STORAGE_KEYS.DIFFICULTY, d);
    this.audio.play('click');
  }

  /* ═══════════════════════════════════════════════════════
     DÉMARRAGE
     ═══════════════════════════════════════════════════════ */

  async startGame(): Promise<void> {
    await this.audio.ensureReady();
    this.audio.play('click');

    const config = this.currentDifficulty();
    const diff = this.difficulty();

    /* Filtre les accords selon la difficulté */
    const filtered = this.chordCatalog.filter(c => {
      if (diff === 'facile')    return c.difficulty === 'facile';
      if (diff === 'normal')    return c.difficulty === 'facile' || c.difficulty === 'normal';
      return true;
    });

    const shuffled = randomSample(filtered, config.pinCount);

    this.pins.set(shuffled.map(chord => ({
      chord,
      isDown: false,
      isRevealed: false,
      isShaking: false
    })));

    this.score.set(0);
    this.strikes.set(0);
    this.targetChord.set(null);
    this.isPlaying.set(true);
    this.isGameOver.set(false);
    this.isVictory.set(false);
    this.timeLeft.set(MOLKKY_RULES.MAX_TIME);
    this.roundNumber.set(0);
    this.perfectRounds.set(0);
    this.feedbackMessage.set(null);
    this.particles.set([]);

    this.nextRound();
    this.startTimer();
  }

  /* ═══════════════════════════════════════════════════════
     TIMER
     ═══════════════════════════════════════════════════════ */

  private startTimer(): void {
    clearInterval(this.timerInterval);
    this.timeLeft.set(MOLKKY_RULES.MAX_TIME);

    this.timerInterval = setInterval(() => {
      if (!this.isPlaying()) return;

      const multiplier = this.currentDifficulty().timeMultiplier;
      const next = this.timeLeft() - multiplier;
      this.timeLeft.set(next);

      /* Tick sonore quand on approche de la fin */
      if (
        next < MOLKKY_RULES.TICK_SOUND_THRESHOLD &&
        next > 0 &&
        Math.floor(next) % 10 === 0
      ) {
        this.audio.play('tick');
      }

      if (next <= 0) {
        this.handleMiss(true);
      }
    }, MOLKKY_RULES.TIMER_TICK_MS);
  }

  /* ═══════════════════════════════════════════════════════
     MANCHE
     ═══════════════════════════════════════════════════════ */

  private nextRound(): void {
    const activePins = this.pins().filter(p => !p.isDown);
    if (activePins.length === 0) {
      this.checkEndCondition();
      return;
    }

    const randomIndex = randomInt(0, activePins.length);
    this.targetChord.set(activePins[randomIndex].chord);
    this.roundNumber.update(n => n + 1);
    this.timeLeft.set(MOLKKY_RULES.MAX_TIME);

    /* Reset visuel */
    this.pins.update(pins => pins.map(p => ({ ...p, isRevealed: false })));
  }

  /* ═══════════════════════════════════════════════════════
     INTERACTION
     ═══════════════════════════════════════════════════════ */

  onPinClick(pin: PinState, index: number): void {
    if (!this.isPlaying() || pin.isDown) return;

    /* Marque la quille comme révélée */
    this.pins.update(pins => pins.map((p, i) =>
      i === index ? { ...p, isRevealed: true } : p
    ));

    if (pin.chord.id === this.targetChord()?.id) {
      this.handleSuccess(pin, index);
    } else {
      this.handleFailure(index);
    }
  }

  private handleSuccess(pin: PinState, index: number): void {
    this.pins.update(pins => pins.map((p, i) =>
      i === index ? { ...p, isDown: true, isRevealed: true } : p
    ));

    this.strikes.set(0);
    this.perfectRounds.update(n => n + 1);

    const comboBonus = this.perfectRounds() >= MOLKKY_RULES.COMBO_THRESHOLD
      ? MOLKKY_RULES.COMBO_BONUS
      : 1;
    const points = Math.round(pin.chord.points * comboBonus);
    const newScore = this.score() + points;
    this.score.set(newScore);

    this.audio.play('hit');
    this.triggerParticles();
    this.showFeedback(`EXCELLENT ! +${points} PTS`, 'success');

    if (newScore === MOLKKY_RULES.SCORE_TARGET) {
      this.endGame(true);
      return;
    }

    if (newScore > MOLKKY_RULES.SCORE_TARGET) {
      this.score.set(MOLKKY_RULES.SCORE_PENALTY);
      this.showFeedback(`DÉPASSÉ ! RETOUR À ${MOLKKY_RULES.SCORE_PENALTY} PTS`, 'error');
    }

    this.setManagedTimeout(() => this.nextRound(), 400);
  }

  private handleFailure(index: number): void {
    this.pins.update(pins => pins.map((p, i) =>
      i === index ? { ...p, isShaking: true } : p
    ));

    this.setManagedTimeout(() => {
      this.pins.update(pins => pins.map((p, i) =>
        i === index ? { ...p, isShaking: false, isRevealed: false } : p
      ));
    }, 800);

    this.handleMiss(false);
  }

  private handleMiss(isTimeout: boolean): void {
    this.strikes.update(n => n + 1);
    this.perfectRounds.set(0);
    this.audio.play('miss');

    const remaining = this.strikeLimit() - this.strikes();
    this.showFeedback(
      isTimeout
        ? `TEMPS ÉCOULÉ ! (${remaining} essai${remaining > 1 ? 's' : ''})`
        : `RATÉ ! (${remaining} essai${remaining > 1 ? 's' : ''})`,
      'error'
    );

    if (this.strikes() >= this.strikeLimit()) {
      this.endGame(false);
    } else {
      this.setManagedTimeout(() => {
        this.nextRound();
        this.startTimer();
      }, 500);
    }
  }

  /* ═══════════════════════════════════════════════════════
     FIN DE PARTIE
     ═══════════════════════════════════════════════════════ */

  private checkEndCondition(): void {
    const remaining = this.pins().filter(p => !p.isDown).length;
    if (remaining === 0) {
      this.endGame(this.score() === MOLKKY_RULES.SCORE_TARGET);
    }
  }

  private endGame(isVictory: boolean): void {
    this.clearAllTimers();
    this.isPlaying.set(false);
    this.isGameOver.set(!isVictory);
    this.isVictory.set(isVictory);
    this.audio.play(isVictory ? 'win' : 'over');

    if (isVictory) this.triggerParticles();
  }

  /* ═══════════════════════════════════════════════════════
     UI HELPERS
     ═══════════════════════════════════════════════════════ */

  private showFeedback(msg: string, type: FeedbackType): void {
    this.feedbackMessage.set(msg);
    this.feedbackType.set(type);
    this.setManagedTimeout(() => this.feedbackMessage.set(null), 1000);
  }

  private triggerParticles(): void {
    this.particles.set(Array.from({ length: 24 }, (_, i) => i));
    this.setManagedTimeout(() => this.particles.set([]), 1500);
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════ */

  goToPlay(): void {
    void this.router.navigate(['/play']);
  }
}