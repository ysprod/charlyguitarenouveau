// src/app/game/piano/piano.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';

import { Router } from '@angular/router';

import {
  FeedbackType,
  GameDifficulty,
  HitEffect,
  MelodyChord,
  Particle,
  PianoKey,
} from '../models/piano.model';

import {
  InstrumentType,
  PianoAudioService,
} from '../services/piano-audio.service';

import { StorageService } from '../../shared/services/storage.service';
import { randomElement, randomFloat } from '../utils/random.utils';
import { GameAudioService } from '../services/game-audio.service';

import {
  COMBO_MELODY_TRIGGER,
  COMBO_SHAKE_TRIGGER,
  HEARTS,
  MAX_TIME,
  MELODY_PARTICLES,
  NOTE_COLORS,
  PIANO_KEYS,
  STAR_POWER_DURATION,
  STAR_POWER_GAIN_MAX,
  STAR_POWER_GAIN_PER_HIT,
  STORAGE_KEYS,
  TAP_THRESHOLD_PX,
  WHITE_NOTES_LIST,  
} from '../constants/piano.constants';

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-piano',
  imports: [],
  templateUrl: './piano.component.html',
  styleUrls: ['./piano.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PianoComponent {

  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly router = inject(Router);
  private readonly audio = inject(PianoAudioService);
  private readonly uiAudio = inject(GameAudioService);
  private readonly storage = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly keyboardScrollRef =
    viewChild<ElementRef<HTMLDivElement>>('keyboardScroll');

  /* ═══════════════════════════════════════════════════════
     CONSTANTES EXPOSÉES
     ═══════════════════════════════════════════════════════ */

  readonly pianoKeys = PIANO_KEYS;
  readonly whiteNotesList = WHITE_NOTES_LIST;
  readonly noteColors = NOTE_COLORS;
  readonly starPowerStars = Array.from({ length: 10 }, (_, i) => i);
  readonly hearts = HEARTS;
  readonly melodyParticles = MELODY_PARTICLES;

  /* ═══════════════════════════════════════════════════════
     ÉTAT — SIGNALS
     ═══════════════════════════════════════════════════════ */

  readonly soundEnabled = signal(true);
  readonly score = signal(0);
  readonly combo = signal(0);
  readonly maxCombo = signal(0);
  readonly lives = signal(3);
  readonly targetNote = signal('');
  readonly targetOctave = signal(4);
  readonly timeLeft = signal(MAX_TIME);
  readonly isPlaying = signal(false);
  readonly isGameOver = signal(false);
  readonly notesHit = signal(0);
  readonly notesMissed = signal(0);
  readonly streak = signal(0);

  readonly starPowerGauge = signal(0);
  readonly isStarPowerActive = signal(false);
  readonly starPowerTimeLeft = signal(0);

  readonly feedbackMessage = signal<string | null>(null);
  readonly feedbackType = signal<FeedbackType>('success');
  readonly feedbackKey = signal(0);
  readonly highScore = signal(0);
  readonly difficulty = signal<GameDifficulty>('normal');
  readonly screenShake = signal(false);
  readonly comboFlashKey = signal(0);

  readonly particles = signal<Particle[]>([]);
  readonly correctKeyIndex = signal(-1);
  readonly hitEffects = signal<HitEffect[]>([]);

  readonly melodyPlaying = signal(false);
  readonly melodyChordIndex = signal(-1);
  readonly melodyChordName = signal('');
  readonly melodyChordFrench = signal('');
  readonly melodyChordColor = signal('#FFD700');
  readonly melodyCurrentTitle = signal('');

  readonly activeKeyIndexes = signal<Set<number>>(new Set());

  /* ═══════════════════════════════════════════════════════
     MÉLODIES
     ═══════════════════════════════════════════════════════ */

  readonly melodyProgressions: readonly MelodyChord[][] = [
    [
      { name: 'Am', frenchName: 'La mineur',  color: '#B266FF', notes: ['A3','C4','E4'], bassNote: 'A2' },
      { name: 'Dm', frenchName: 'Ré mineur',  color: '#00D4FF', notes: ['D4','F4','A4'], bassNote: 'D3' },
      { name: 'F',  frenchName: 'Fa majeur',  color: '#FFD700', notes: ['F4','A4','C5'], bassNote: 'F3' },
      { name: 'G',  frenchName: 'Sol majeur', color: '#00FF88', notes: ['G4','B4','D5'], bassNote: 'G3' },
    ],
    [
      { name: 'C',  frenchName: 'Do majeur',  color: '#FF3366', notes: ['C4','E4','G4'], bassNote: 'C3' },
      { name: 'G',  frenchName: 'Sol majeur', color: '#00FF88', notes: ['G4','B4','D5'], bassNote: 'G3' },
      { name: 'Am', frenchName: 'La mineur',  color: '#B266FF', notes: ['A3','C4','E4'], bassNote: 'A2' },
      { name: 'F',  frenchName: 'Fa majeur',  color: '#FFD700', notes: ['F4','A4','C5'], bassNote: 'F3' },
    ],
    [
      { name: 'F',  frenchName: 'Fa majeur',  color: '#FFD700', notes: ['F4','A4','C5'], bassNote: 'F3' },
      { name: 'C',  frenchName: 'Do majeur',  color: '#FF3366', notes: ['C4','E4','G4'], bassNote: 'C3' },
      { name: 'G',  frenchName: 'Sol majeur', color: '#00FF88', notes: ['G4','B4','D5'], bassNote: 'G3' },
      { name: 'Am', frenchName: 'La mineur',  color: '#B266FF', notes: ['A3','C4','E4'], bassNote: 'A2' },
    ],
    [
      { name: 'Dm', frenchName: 'Ré mineur',  color: '#00D4FF', notes: ['D4','F4','A4'], bassNote: 'D3' },
      { name: 'G',  frenchName: 'Sol majeur', color: '#00FF88', notes: ['G4','B4','D5'], bassNote: 'G3' },
      { name: 'C',  frenchName: 'Do majeur',  color: '#FF3366', notes: ['C4','E4','G4'], bassNote: 'C3' },
      { name: 'Am', frenchName: 'La mineur',  color: '#B266FF', notes: ['A3','C4','E4'], bassNote: 'A2' },
    ],
  ];

  readonly melodyTitles = [
    '✨ ORIGINES ✨',
    '⭐ ÉTOILES ⭐',
    '⚔️ HÉROS ⚔️',
    '🌙 RÊVE 🌙',
  ] as const;

  readonly melodyInstruments: readonly InstrumentType[] = [
    'strings', 'bells', 'trumpet', 'flute',
  ];

  private melodyProgressionIndex = 0;

  /* ═══════════════════════════════════════════════════════
     COMPUTED
     ═══════════════════════════════════════════════════════ */

  readonly multiplier = computed(() => {
    const c = this.combo();
    if (c >= 20) return 6;
    if (c >= 15) return 5;
    if (c >= 12) return 4;
    if (c >= 8)  return 3;
    if (c >= 4)  return 2;
    return 1;
  });

  readonly effectiveMultiplier = computed(() =>
    this.multiplier() * (this.isStarPowerActive() ? 2 : 1)
  );

  readonly accuracy = computed(() => {
    const total = this.notesHit() + this.notesMissed();
    return total === 0 ? 100 : Math.round((this.notesHit() / total) * 100);
  });

  readonly currentMelodyProgression = computed<MelodyChord[]>(() => {
    if (!this.melodyPlaying()) return [];
    const idx =
      (this.melodyProgressionIndex - 1 + this.melodyProgressions.length) %
      this.melodyProgressions.length;
    return [...this.melodyProgressions[idx]];
  });

  readonly keyColorsByIndex = computed<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const k of this.pianoKeys) {
      map[k.index] = this.noteColors[k.frenchNote] ?? '#FFFFFF';
    }
    return map;
  });

  readonly whiteKeys = computed(() => this.pianoKeys.filter((k) => !k.isBlack));
  readonly blackKeys = computed(() => this.pianoKeys.filter((k) => k.isBlack));

  readonly targetKeyIndex = computed<number>(() => {
    const note = this.targetNote();
    const oct = this.targetOctave();
    if (!note) return -1;
    const key = this.pianoKeys.find(
      (k) => !k.isBlack && k.frenchNote === note && k.octave === oct
    );
    return key?.index ?? -1;
  });

  readonly targetNoteDisplay = computed<string>(() => {
    const note = this.targetNote();
    const oct = this.targetOctave();
    if (!note) return '';
    const sub = ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'];
    const octStr = String(oct).split('').map((d) => sub[+d]).join('');
    return `${note}${octStr}`;
  });

  readonly shouldHighlightTarget = computed(
    () => this.isPlaying() && !this.melodyPlaying()
  );

  readonly timerPercent = computed(() => (this.timeLeft() / MAX_TIME) * 100);

  readonly timerColor = computed(() => {
    const pct = this.timerPercent();
    if (pct < 20) return 'linear-gradient(90deg, #ef4444, #f59e0b)';
    if (pct < 50) return 'linear-gradient(90deg, #f59e0b, #fbbf24, #10b981)';
    return 'linear-gradient(90deg, #10b981, #06b6d4, #3b82f6)';
  });

  readonly isTimerCritical = computed(() => this.timerPercent() < 20);

  readonly shouldShowNoteLabel = computed(() => this.difficulty() !== 'hardcore');

  /* ═══════════════════════════════════════════════════════
     RESSOURCES INTERNES
     ═══════════════════════════════════════════════════════ */

  private readonly timeouts = new Set<ReturnType<typeof setTimeout>>();
  private readonly melodyTimeouts = new Set<ReturnType<typeof setTimeout>>();
  private timerInterval?: ReturnType<typeof setInterval>;
  private starPowerInterval?: ReturnType<typeof setInterval>;
  private isMelodyPlaying = false;
  private particleId = 0;
  private effectId = 0;
  private lastTargetKey = '';

  /* ═══════════════════════════════════════════════════════
     POINTER
     ═══════════════════════════════════════════════════════ */

  private readonly activePointer = new Map<
    number,
    {
      keyIndex: number;
      startX: number;
      startY: number;
      moved: boolean;
    }
  >();

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    effect(() => {
      const c = this.combo();
      untracked(() => {
        if (c > 0 && c % 4 === 0) {
          this.comboFlashKey.update((k) => k + 1);
        }
      });
    });

    afterNextRender(() => {
      void this.audio.init();
      this.loadHighScore();
      this.loadSoundPreference();
    });

    this.destroyRef.onDestroy(() => {
      this.clearAllTimers();
      this.stopMelody();
      this.audio.allNotesOff();
    });
  }

  /* ═══════════════════════════════════════════════════════
     TIMERS
     ═══════════════════════════════════════════════════════ */

  private schedule(fn: () => void, delayMs: number): void {
    const id = setTimeout(() => {
      this.timeouts.delete(id);
      fn();
    }, delayMs);
    this.timeouts.add(id);
  }

  private clearAllTimers(): void {
    clearInterval(this.timerInterval);
    clearInterval(this.starPowerInterval);
    this.timerInterval = undefined;
    this.starPowerInterval = undefined;

    this.timeouts.forEach((id) => clearTimeout(id));
    this.timeouts.clear();

    this.melodyTimeouts.forEach((id) => clearTimeout(id));
    this.melodyTimeouts.clear();
  }

  /* ═══════════════════════════════════════════════════════
     PERSISTANCE
     ═══════════════════════════════════════════════════════ */

  private loadSoundPreference(): void {
    const enabled = this.storage.getBoolean(STORAGE_KEYS.SOUND_ENABLED, true);
    this.soundEnabled.set(enabled);
    this.audio.setMuted(!enabled);
  }

  private loadHighScore(): void {
    const saved = this.storage.getNumber(STORAGE_KEYS.HIGH_SCORE, 0);
    if (saved > 0) this.highScore.set(saved);
  }

  private saveHighScore(): void {
    if (this.score() > this.highScore()) {
      this.highScore.set(this.score());
      this.storage.setNumber(STORAGE_KEYS.HIGH_SCORE, this.score());
    }
  }

  /* ═══════════════════════════════════════════════════════
     SON
     ═══════════════════════════════════════════════════════ */

  toggleSound(): void {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);
    this.storage.setBoolean(STORAGE_KEYS.SOUND_ENABLED, next);
    this.audio.setMuted(!next);

    if (next) {
      this.uiAudio.play('click');
    }
  }

  /* ═══════════════════════════════════════════════════════
     FLÈCHES SCROLL CLAVIER
     ═══════════════════════════════════════════════════════ */

  scrollKeyboard(direction: -1 | 1): void {
    const scroll = this.keyboardScrollRef()?.nativeElement;
    if (!scroll) return;

    const amount = scroll.clientWidth * 0.7 * direction;
    scroll.scrollBy({ left: amount, behavior: 'smooth' });
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════ */

  goToPlay(): void {
    void this.router.navigate(['/play']);
  }

  backToDifficultySelect(): void {
    this.clearAllTimers();
    this.isGameOver.set(false);
    this.isPlaying.set(false);
    this.score.set(0);
    this.targetNote.set('');
    this.stopMelody();
  }

  quitToMenu(): void {
    this.clearAllTimers();
    this.stopMelody();
    this.isPlaying.set(false);
    this.isGameOver.set(false);
    this.targetNote.set('');
  }

  /* ═══════════════════════════════════════════════════════
     POINTER / TACTILE
     ═══════════════════════════════════════════════════════ */

  onPointerDown(key: PianoKey, event: PointerEvent): void {
    event.preventDefault();
    void this.audio.unlock();

    this.activePointer.set(event.pointerId, {
      keyIndex: key.index,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    });

    this.activeKeyIndexes.update((set) => {
      const next = new Set(set);
      next.add(key.index);
      return next;
    });

    this.audio.noteOn(key.note, 0.9);
  }

  onPointerEnter(key: PianoKey, event: PointerEvent): void {
    if (!this.activePointer.has(event.pointerId)) return;
    const info = this.activePointer.get(event.pointerId)!;
    if (info.keyIndex === key.index) return;

    const prevKey = this.pianoKeys.find((k) => k.index === info.keyIndex);
    if (prevKey) this.audio.noteOff(prevKey.note);

    this.activeKeyIndexes.update((set) => {
      const next = new Set(set);
      next.delete(info.keyIndex);
      next.add(key.index);
      return next;
    });

    info.keyIndex = key.index;
    this.audio.noteOn(key.note, 0.9);
  }

  onPointerMove(event: PointerEvent): void {
    const info = this.activePointer.get(event.pointerId);
    if (!info) return;

    const dx = Math.abs(event.clientX - info.startX);
    const dy = Math.abs(event.clientY - info.startY);

    if (!info.moved && (dx > TAP_THRESHOLD_PX || dy > TAP_THRESHOLD_PX)) {
      info.moved = true;
    }
  }

  onPointerUp(key: PianoKey, event: PointerEvent): void {
    const info = this.activePointer.get(event.pointerId);
    this.activePointer.delete(event.pointerId);

    this.activeKeyIndexes.update((set) => {
      const next = new Set(set);
      next.delete(key.index);
      return next;
    });

    this.audio.noteOff(key.note);

    if (!info || info.moved) return;

    if (this.isPlaying()) {
      const sameNote = key.frenchNote === this.targetNote();
      const sameOctave = key.octave === this.targetOctave();
      const tolerance = this.difficulty() === 'facile';

      if (sameNote && (sameOctave || tolerance)) {
        this.handleSuccess(key.index);
      } else {
        this.handleMiss(false);
      }
    }
  }

  onPointerCancel(key: PianoKey, event: PointerEvent): void {
    this.activePointer.delete(event.pointerId);
    this.activeKeyIndexes.update((set) => {
      const next = new Set(set);
      next.delete(key.index);
      return next;
    });
    this.audio.noteOff(key.note);
  }

  isKeyPressed(keyIndex: number): boolean {
    return this.activeKeyIndexes().has(keyIndex);
  }

  isTargetKey(keyIndex: number): boolean {
    if (this.difficulty() === 'hardcore') return false;
    return this.shouldHighlightTarget() && this.targetKeyIndex() === keyIndex;
  }

  isHit(keyIndex: number): boolean {
    return this.hitEffects().some((e) => e.keyIndex === keyIndex);
  }

  isStarFilled(i: number): boolean {
    return this.starPowerGauge() >= (i + 1) * 10;
  }

  /* ═══════════════════════════════════════════════════════
     DÉMARRAGE
     ═══════════════════════════════════════════════════════ */

  async startChallenge(): Promise<void> {
    await this.audio.unlock();
    this.audio.setInstrument('piano');
    this.stopMelody();

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
    this.lastTargetKey = '';

    this.nextRound();
  }

  /* ═══════════════════════════════════════════════════════
     TIMER & ROUNDS
     ═══════════════════════════════════════════════════════ */

  private startTimer(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timeLeft.set(MAX_TIME);

    this.timerInterval = setInterval(() => {
      if (!this.isPlaying()) return;
      this.timeLeft.update((t) => t - this.getTimeMultiplier());
      if (this.timeLeft() <= 0) this.handleMiss(true);
    }, 100);
  }

  private nextRound(): void {
    const pool = this.getNotePool();

    const filtered = pool.filter(
      (p) => `${p.frenchNote}-${p.octave}` !== this.lastTargetKey
    );
    const candidates = filtered.length > 0 ? filtered : pool;

    const pick = randomElement(candidates);
    this.lastTargetKey = `${pick.frenchNote}-${pick.octave}`;

    this.targetNote.set(pick.frenchNote);
    this.targetOctave.set(pick.octave);
    this.correctKeyIndex.set(-1);
    this.startTimer();

    this.scrollToTargetKey();
  }

  private handleSuccess(keyIndex: number): void {
    this.combo.update((c) => c + 1);
    this.streak.update((s) => s + 1);
    this.notesHit.update((n) => n + 1);
    if (this.combo() > this.maxCombo()) this.maxCombo.set(this.combo());

    const starPowerBonus = this.isStarPowerActive() ? 2 : 1;
    const perfectBonus = this.timeLeft() > MAX_TIME * 0.7 ? 1.5 : 1;
    const basePoints = Math.round(
      100 * this.multiplier() * starPowerBonus * perfectBonus
    );
    this.score.update((s) => s + basePoints);

    if (!this.isStarPowerActive()) {
      this.starPowerGauge.update((g) =>
        Math.min(STAR_POWER_GAIN_MAX, g + STAR_POWER_GAIN_PER_HIT)
      );
    }

    this.correctKeyIndex.set(keyIndex);
    this.triggerParticles(keyIndex);
    this.triggerHitEffect(keyIndex);

    const isPerfect = this.timeLeft() > MAX_TIME * 0.75;
    const comboText =
      this.effectiveMultiplier() > 1 ? ` x${this.effectiveMultiplier()}` : '';
    if (isPerfect) {
      this.showFeedback(`PARFAIT ! +${basePoints}${comboText}`, 'perfect');
      this.uiAudio.play('perfect');
    } else {
      this.showFeedback(`BIEN ! +${basePoints}${comboText}`, 'success');
    }

    if (this.combo() > 0 && this.combo() % COMBO_MELODY_TRIGGER === 0) {
      void this.playMelodieDesOrigines();
    }
    if (this.combo() > 0 && this.combo() % COMBO_SHAKE_TRIGGER === 0) {
      this.triggerScreenShake();
    }

    this.nextRound();
  }

  private handleMiss(isTimeout: boolean): void {
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
    this.starPowerTimeLeft.set(STAR_POWER_DURATION);
    this.uiAudio.play('starpower');
    this.showFeedback('⚡ STAR POWER ACTIVÉ ! ⚡', 'perfect');
    this.triggerScreenShake();

    this.audio.setInstrument('trumpet');
    this.schedule(() => {
      ['C4', 'E4', 'G4', 'C5'].forEach((n) => {
        this.audio.playNoteFor(n, 0.8, 0.7);
      });
    }, 0);

    this.schedule(() => this.audio.setInstrument('piano'), 1500);

    if (this.starPowerInterval) clearInterval(this.starPowerInterval);

    this.starPowerInterval = setInterval(() => {
      this.starPowerTimeLeft.update((t) => t - 0.1);

      if (this.starPowerTimeLeft() <= 0) {
        if (this.starPowerInterval) clearInterval(this.starPowerInterval);
        this.isStarPowerActive.set(false);
        this.starPowerTimeLeft.set(0);
        this.starPowerGauge.set(0);
      }
    }, 100);
  }

  /* ═══════════════════════════════════════════════════════
     MÉLODIE DES ORIGINES
     ═══════════════════════════════════════════════════════ */

  private async playMelodieDesOrigines(): Promise<void> {
    if (this.isMelodyPlaying) return;
    await this.audio.unlock();

    const progression =
      this.melodyProgressions[this.melodyProgressionIndex];
    const title = this.melodyTitles[this.melodyProgressionIndex];
    const instrument = this.melodyInstruments[this.melodyProgressionIndex];

    this.melodyProgressionIndex =
      (this.melodyProgressionIndex + 1) % this.melodyProgressions.length;

    this.isMelodyPlaying = true;
    this.melodyPlaying.set(true);
    this.melodyCurrentTitle.set(title);

    this.audio.setInstrument(instrument);

    const chordSpacing = 1.2;
    this.showFeedback(title, 'perfect');

    progression.forEach((chord, i) => {
      const delay = i * chordSpacing;

      const t = setTimeout(() => {
        this.melodyTimeouts.delete(t);
        this.melodyChordIndex.set(i);
        this.melodyChordName.set(chord.name);
        this.melodyChordFrench.set(chord.frenchName);
        this.melodyChordColor.set(chord.color);

        this.audio.playNoteFor(chord.bassNote, 1.4, 0.6);
        chord.notes.forEach((note, nIdx) => {
          const noteTimeout = setTimeout(() => {
            this.melodyTimeouts.delete(noteTimeout);
            this.audio.playNoteFor(note, 1.1, 0.5);
          }, nIdx * 40);
          this.melodyTimeouts.add(noteTimeout);
        });
      }, delay * 1000);
      this.melodyTimeouts.add(t);
    });

    const total = progression.length * chordSpacing + 1.2;
    const endT = setTimeout(() => {
      this.melodyTimeouts.delete(endT);
      this.stopMelody();
      this.audio.setInstrument('piano');
      this.showFeedback('🌟 BRAVO ! 🌟', 'perfect');
    }, total * 1000);
    this.melodyTimeouts.add(endT);
  }

  private stopMelody(): void {
    this.melodyTimeouts.forEach((id) => clearTimeout(id));
    this.melodyTimeouts.clear();
    this.isMelodyPlaying = false;
    this.melodyPlaying.set(false);
    this.melodyChordIndex.set(-1);
  }

  /* ═══════════════════════════════════════════════════════
     POOL & SCROLL
     ═══════════════════════════════════════════════════════ */

  private getNotePool(): { frenchNote: string; octave: number }[] {
    const diff = this.difficulty();

    if (diff === 'facile') {
      return this.whiteNotesList.map((n) => ({ frenchNote: n, octave: 4 }));
    }

    const octaves = [3, 4, 5];
    const pool: { frenchNote: string; octave: number }[] = [];
    for (const oct of octaves) {
      for (const note of this.whiteNotesList) {
        const exists = this.pianoKeys.some(
          (k) => !k.isBlack && k.frenchNote === note && k.octave === oct
        );
        if (exists) pool.push({ frenchNote: note, octave: oct });
      }
    }
    return pool;
  }

  private scrollToTargetKey(): void {
    if (this.difficulty() === 'hardcore') return;

    this.schedule(() => {
      const scroll = this.keyboardScrollRef()?.nativeElement;
      const idx = this.targetKeyIndex();
      if (!scroll || idx < 0) return;

      const el = scroll.querySelector<HTMLElement>(
        `[data-key-index="${idx}"]`
      );
      if (!el) return;

      const elLeft = el.offsetLeft;
      const elWidth = el.offsetWidth;
      const scrollWidth = scroll.clientWidth;
      const targetScrollLeft = elLeft - scrollWidth / 2 + elWidth / 2;

      scroll.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth',
      });
    }, 50);
  }

  /* ═══════════════════════════════════════════════════════
     VISUELS
     ═══════════════════════════════════════════════════════ */

  getKeyColor(key: PianoKey): string {
    return this.noteColors[key.frenchNote] ?? '#FFFFFF';
  }

  private getKeyCenter(key: PianoKey): { x: number; y: number } {
    const scroll = this.keyboardScrollRef()?.nativeElement;
    if (!scroll) return { x: 0, y: key.isBlack ? 30 : 60 };

    const el = scroll.querySelector<HTMLElement>(
      `[data-key-index="${key.index}"]`
    );
    if (!el) return { x: 0, y: key.isBlack ? 30 : 60 };

    const keyRect = el.getBoundingClientRect();
    const scrollRect = scroll.getBoundingClientRect();

    return {
      x: keyRect.left - scrollRect.left + scroll.scrollLeft + keyRect.width / 2,
      y: key.isBlack ? 30 : 60,
    };
  }

  private triggerParticles(keyIndex: number): void {
    const key = this.pianoKeys.find((k) => k.index === keyIndex);
    if (!key) return;

    const { x, y } = this.getKeyCenter(key);

    const newParticles: Particle[] = Array.from({ length: 16 }, () => ({
      id: this.particleId++,
      x,
      y,
      color: this.getKeyColor(key),
      size: randomFloat(4, 12),
      rotation: randomFloat(0, 360),
    }));

    const ids = new Set(newParticles.map((p) => p.id));
    this.particles.update((p) => [...p, ...newParticles]);
    this.schedule(() => {
      this.particles.update((p) => p.filter((x) => !ids.has(x.id)));
    }, 1200);
  }

  private triggerHitEffect(keyIndex: number): void {
    const id = this.effectId++;
    this.hitEffects.update((e) => [...e, { id, keyIndex }]);
    this.schedule(() => {
      this.hitEffects.update((e) => e.filter((x) => x.id !== id));
    }, 700);
  }

  private triggerScreenShake(): void {
    this.screenShake.set(true);
    this.schedule(() => this.screenShake.set(false), 300);
  }

  /* ═══════════════════════════════════════════════════════
     FEEDBACK
     ═══════════════════════════════════════════════════════ */

  showFeedback(msg: string, type: FeedbackType): void {
    this.feedbackKey.update((k) => k + 1);
    this.feedbackMessage.set(msg);
    this.feedbackType.set(type);
    this.schedule(() => this.feedbackMessage.set(null), 900);
  }

  /* ═══════════════════════════════════════════════════════
     FIN DE PARTIE
     ═══════════════════════════════════════════════════════ */

  endGame(): void {
    this.clearAllTimers();
    this.stopMelody();
    this.isPlaying.set(false);
    this.isGameOver.set(true);
    this.saveHighScore();
    this.uiAudio.play('over');
  }

  setDifficulty(d: GameDifficulty): void {
    this.difficulty.set(d);
    this.uiAudio.play('click');
  }

  private getTimeMultiplier(): number {
    switch (this.difficulty()) {
      case 'facile':   return 0.8;
      case 'hardcore': return 2.2;
      default:         return 1.5;
    }
  }

  private getLivesStart(): number {
    switch (this.difficulty()) {
      case 'facile':   return 5;
      case 'hardcore': return 2;
      default:         return 3;
    }
  }
}