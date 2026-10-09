import {
  animate,
  keyframes,
  style,
  transition,
  trigger,
  state
} from '@angular/animations';

import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked
} from '@angular/core';

import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

type Difficulty = 'facile' | 'normal' | 'hardcore';
type FeedbackKind = 'success' | 'error' | 'perfect';
type UiSoundKind = 'click' | 'error' | 'gameover' | 'start' | 'perfect' | 'starpower';

interface MelodyChord {
  name: string;
  frenchName: string;
  color: string;
  bassNote: string;
  arpeggio: { stringIdx: number; fretIdx: number }[];
}

interface GuitarString {
  index: number;
  name: string;
  gaugeMm: number;
  baseMidi: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

interface ConfettiParticle {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
}

interface PlayingVoice {
  source: OscillatorNode;
  gainNode: GainNode;
  stringIdx: number;
  startTime: number;
}

interface DifficultyOption {
  id: Difficulty;
  icon: string;
  name: string;
  desc: string;
  lives: number;
  timeMultiplier: number;
}

/* ═══════════════════════════════════════════════════════
   CONSTANTES (hors classe — évite allocations inutiles)
   ═══════════════════════════════════════════════════════ */

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

const FRENCH_NOTE_SEQUENCE = [
  'DO', 'DO#', 'RÉ', 'RÉ#', 'MI', 'FA',
  'FA#', 'SOL', 'SOL#', 'LA', 'LA#', 'SI'
] as const;

const NOTE_TO_MIDI_OFFSET: Record<string, number> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5,
  'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11
};

const CONFETTI_COLORS = [
  '#FFD700', '#FF6B9D', '#00D4FF', '#00FF88',
  '#B266FF', '#FF4500', '#FFB347', '#9D4EDD'
] as const;

const DIFFICULTIES: readonly DifficultyOption[] = [
  { id: 'facile',   icon: '🌱', name: 'FACILE',   desc: '5 vies · Lent',    lives: 5, timeMultiplier: 0.8 },
  { id: 'normal',   icon: '🔥', name: 'NORMAL',   desc: '3 vies · Moyen',   lives: 3, timeMultiplier: 1.5 },
  { id: 'hardcore', icon: '🌟', name: 'DIFFICILE', desc: '2 vies · Rapide',  lives: 2, timeMultiplier: 2.2 }
] as const;

const DIFFICULTY_MAP: Record<Difficulty, DifficultyOption> = {
  facile:   DIFFICULTIES[0],
  normal:   DIFFICULTIES[1],
  hardcore: DIFFICULTIES[2]
};

const MAX_TIME = 200;
const STAR_POWER_DURATION = 8;
const STAR_POWER_DRAIN_PER_TICK = 1.25;
const STAR_POWER_GAIN_ON_HIT = 12;
const COMBO_MELODY_TRIGGER = 7;
const COMBO_SHAKE_TRIGGER = 10;
const PERFECT_TIME_THRESHOLD = 0.7;

/* ═══════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════ */

@Component({
  selector: 'app-fretboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fretboard.component.html',
  styleUrls: ['./fretboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('feedbackAnim', [
      transition(':enter', [
        animate('700ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', keyframes([
          style({ transform: 'scale(0.2) rotate(-15deg)', opacity: 0, offset: 0 }),
          style({ transform: 'scale(1.4) rotate(8deg)',   opacity: 1, offset: 0.35 }),
          style({ transform: 'scale(0.95) rotate(-3deg)', opacity: 1, offset: 0.6 }),
          style({ transform: 'scale(1.05) rotate(0deg)',  opacity: 1, offset: 0.8 }),
          style({ transform: 'scale(1.2) rotate(0deg)',   opacity: 0, offset: 1 })
        ]))
      ])
    ]),
    trigger('modalAnim', [
      transition(':enter', [
        animate('600ms cubic-bezier(0.34, 1.56, 0.64, 1)', keyframes([
          style({ transform: 'scale(0.5) translateY(80px) rotateX(20deg)',   opacity: 0, offset: 0 }),
          style({ transform: 'scale(1.08) translateY(-10px) rotateX(-2deg)', opacity: 1, offset: 0.7 }),
          style({ transform: 'scale(1) translateY(0) rotateX(0)',           opacity: 1, offset: 1 })
        ]))
      ])
    ]),
    trigger('melodyBanner', [
      transition(':enter', [
        animate('800ms cubic-bezier(0.22, 1, 0.36, 1)', keyframes([
          style({ transform: 'scale(0.3) translateY(-60px)', opacity: 0, offset: 0 }),
          style({ transform: 'scale(1.15) translateY(10px)', opacity: 1, offset: 0.5 }),
          style({ transform: 'scale(1) translateY(0)',       opacity: 1, offset: 1 })
        ]))
      ]),
      transition(':leave', [
        animate('400ms ease-in', style({ transform: 'scale(0.85)', opacity: 0 }))
      ])
    ]),
    trigger('starPowerPulse', [
      state('inactive', style({ transform: 'scale(1)' })),
      state('active',   style({ transform: 'scale(1.02)' })),
      transition('inactive <=> active', animate('400ms ease-in-out'))
    ]),
    trigger('comboFlash', [
      transition('* => *', [
        animate('500ms ease-out', keyframes([
          style({ transform: 'scale(1)',   offset: 0 }),
          style({ transform: 'scale(1.5)', color: '#FFD700', offset: 0.3 }),
          style({ transform: 'scale(1)',   offset: 1 })
        ]))
      ])
    ])
  ]
})
export class FretboardComponent implements OnInit, OnDestroy {

  /* ─── Injection ─── */
  private readonly router = inject(Router);

  /* ─── Constantes exposées au template ─── */
  readonly strings: readonly GuitarString[] = [
    { index: 1, name: 'E', gaugeMm: 0.30, baseMidi: 64 },
    { index: 2, name: 'B', gaugeMm: 0.41, baseMidi: 59 },
    { index: 3, name: 'G', gaugeMm: 0.61, baseMidi: 55 },
    { index: 4, name: 'D', gaugeMm: 0.81, baseMidi: 50 },
    { index: 5, name: 'A', gaugeMm: 1.07, baseMidi: 45 },
    { index: 6, name: 'E', gaugeMm: 1.35, baseMidi: 40 }
  ];

  readonly notesList = ['DO', 'RÉ', 'MI', 'FA', 'SOL', 'LA', 'SI'];
  readonly frets = Array.from({ length: 13 }, (_, i) => i);
  readonly stringColors = ['#E6C280', '#D4AF37', '#B8860B', '#CD7F32', '#8B5A2B', '#5C4033'];

  readonly DIFFICULTIES = DIFFICULTIES;
  readonly STAR_POWER_STARS = Array.from({ length: 10 }, (_, i) => i);
  readonly SPARKLES = [1, 2, 3, 4, 5, 6];
  readonly LIVES_INDICES = [0, 1, 2, 3, 4];

  /* ─── État de jeu ─── */
  readonly score = signal(0);
  readonly combo = signal(0);
  readonly maxCombo = signal(0);
  readonly lives = signal(DIFFICULTY_MAP.normal.lives);
  readonly targetNote = signal('');
  readonly timeLeft = signal(MAX_TIME);
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

  /* ─── Computed ─── */
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

  readonly timerPercent = computed(() =>
    (this.timeLeft() / MAX_TIME) * 100
  );

  readonly timerColor = computed(() => {
    const pct = this.timerPercent();
    if (pct < 20) return 'linear-gradient(90deg, #ef4444, #f59e0b)';
    if (pct < 50) return 'linear-gradient(90deg, #f59e0b, #fbbf24, #10b981)';
    return 'linear-gradient(90deg, #10b981, #06b6d4, #3b82f6)';
  });

  /* ─── Chords disponibles ─── */
  private readonly chordPool: readonly MelodyChord[] = [
    { name: 'Am', frenchName: 'La mineur',  color: '#B266FF', bassNote: 'A2',
      arpeggio: [{ stringIdx: 5, fretIdx: 0 }, { stringIdx: 4, fretIdx: 2 }, { stringIdx: 3, fretIdx: 2 }, { stringIdx: 2, fretIdx: 1 }, { stringIdx: 1, fretIdx: 0 }] },
    { name: 'C',  frenchName: 'Do majeur',  color: '#FFD700', bassNote: 'C3',
      arpeggio: [{ stringIdx: 5, fretIdx: 3 }, { stringIdx: 4, fretIdx: 2 }, { stringIdx: 3, fretIdx: 0 }, { stringIdx: 2, fretIdx: 1 }, { stringIdx: 1, fretIdx: 0 }] },
    { name: 'G',  frenchName: 'Sol majeur', color: '#00FF88', bassNote: 'G2',
      arpeggio: [{ stringIdx: 6, fretIdx: 3 }, { stringIdx: 5, fretIdx: 2 }, { stringIdx: 4, fretIdx: 0 }, { stringIdx: 3, fretIdx: 0 }, { stringIdx: 2, fretIdx: 0 }] },
    { name: 'Dm', frenchName: 'Ré mineur',  color: '#00D4FF', bassNote: 'D3',
      arpeggio: [{ stringIdx: 4, fretIdx: 0 }, { stringIdx: 3, fretIdx: 2 }, { stringIdx: 2, fretIdx: 3 }, { stringIdx: 1, fretIdx: 1 }] },
    { name: 'Em', frenchName: 'Mi mineur',  color: '#FF6B9D', bassNote: 'E2',
      arpeggio: [{ stringIdx: 6, fretIdx: 0 }, { stringIdx: 5, fretIdx: 2 }, { stringIdx: 4, fretIdx: 2 }, { stringIdx: 3, fretIdx: 0 }, { stringIdx: 2, fretIdx: 0 }, { stringIdx: 1, fretIdx: 0 }] },
    { name: 'F',  frenchName: 'Fa majeur',  color: '#FFB347', bassNote: 'F2',
      arpeggio: [{ stringIdx: 6, fretIdx: 1 }, { stringIdx: 5, fretIdx: 3 }, { stringIdx: 4, fretIdx: 3 }, { stringIdx: 3, fretIdx: 2 }, { stringIdx: 2, fretIdx: 1 }, { stringIdx: 1, fretIdx: 1 }] },
    { name: 'E',  frenchName: 'Mi majeur',  color: '#FF4500', bassNote: 'E2',
      arpeggio: [{ stringIdx: 6, fretIdx: 0 }, { stringIdx: 5, fretIdx: 2 }, { stringIdx: 4, fretIdx: 2 }, { stringIdx: 3, fretIdx: 1 }, { stringIdx: 2, fretIdx: 0 }, { stringIdx: 1, fretIdx: 0 }] },
    { name: 'A',  frenchName: 'La majeur',  color: '#9D4EDD', bassNote: 'A2',
      arpeggio: [{ stringIdx: 5, fretIdx: 0 }, { stringIdx: 4, fretIdx: 2 }, { stringIdx: 3, fretIdx: 2 }, { stringIdx: 2, fretIdx: 2 }, { stringIdx: 1, fretIdx: 0 }] }
  ];

  /* ─── Intervals & timers ─── */
  private timerInterval?: ReturnType<typeof setInterval>;
  private starPowerInterval?: ReturnType<typeof setInterval>;
  private melodyTimeoutIds: ReturnType<typeof setTimeout>[] = [];
  private confettiTimeoutIds: ReturnType<typeof setTimeout>[] = [];
  private isMelodyPlaying = false;
  private particleId = 0;
  private effectId = 0;
  private confettiId = 0;

  /* ─── Audio ─── */
  private audioCtx?: AudioContext;
  private readonly activeVoices = new Map<number, PlayingVoice>();
  private readonly melodyVoices = new Set<OscillatorNode>();

  constructor() {
    // Flash combo tous les 4 points
    effect(() => {
      const c = this.combo();
      untracked(() => {
        if (c > 0 && c % 4 === 0) {
          this.comboFlashKey.update(k => k + 1);
        }
      });
    });
  }

  ngOnInit(): void {
    this.initAudioContext();
    this.loadHighScore();
  }

  ngOnDestroy(): void {
    this.clearIntervals();
    this.stopMelody();
    this.stopConfetti();
    this.activeVoices.forEach(v => {
      try { v.source.stop(); } catch { /* noop */ }
    });
    this.activeVoices.clear();
    void this.audioCtx?.close();
  }

  /* ═══════════════════════════════════════════════════════
     AUDIO — SYNTHÈSE PURE
     ═══════════════════════════════════════════════════════ */

  private initAudioContext(): void {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) this.audioCtx = new Ctor();
  }

  private async ensureAudioContextRunning(): Promise<void> {
    if (this.audioCtx?.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  /** Note → index MIDI absolu. */
  private noteToMidiIndex(note: string): number {
    const match = /^([A-G]#?)(\d+)$/.exec(note);
    if (!match) return 60;
    const [, pitch, octaveStr] = match;
    return (Number(octaveStr) + 1) * 12 + (NOTE_TO_MIDI_OFFSET[pitch] ?? 0);
  }

  /**
   * Joue une note de guitare acoustique (corde unique, avec damping).
   */
  private playAcousticGuitarNote(
    stringIdx: number,
    toneNote: string,
    duration = 2.5,
    volume = 0.85,
    delaySeconds = 0
  ): void {
    if (!this.audioCtx) return;

    this.dampPreviousStringNote(stringIdx);

    const { freq, startTime } = this.getFreqAndStart(toneNote, delaySeconds);
    const gainNode = this.audioCtx.createGain();
    const bodyFilter = this.audioCtx.createBiquadFilter();
    const pickFilter = this.audioCtx.createBiquadFilter();

    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(freq * 4, startTime);
    bodyFilter.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + duration * 0.6);
    bodyFilter.Q.value = 1.2;

    pickFilter.type = 'peaking';
    pickFilter.frequency.value = freq * 6;
    pickFilter.Q.value = 0.8;
    pickFilter.gain.value = 4;

    const isBassString = stringIdx >= 5;
    const attack = isBassString ? 0.004 : 0.002;
    const decay = 0.08;
    const sustainLevel = 0.45;

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(volume * sustainLevel, startTime + attack + decay);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    const oscillators = this.buildHarmonics(freq, startTime, duration, [
      { type: 'triangle', ratio: 1,    gain: 0.6 },
      { type: 'sine',     ratio: 2,    gain: 0.25 },
      { type: 'sine',     ratio: 3.01, gain: 0.15 }
    ], pickFilter, true);

    pickFilter.connect(bodyFilter);
    bodyFilter.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    this.activeVoices.set(stringIdx, {
      source: oscillators[0],
      gainNode,
      stringIdx,
      startTime
    });
  }

  /**
   * Joue une note de mélodie (multi-voix, sans damper les autres).
   */
  private playMelodyNote(
    stringIdx: number,
    toneNote: string,
    duration: number,
    volume: number,
    delaySeconds: number
  ): void {
    if (!this.audioCtx || this.audioCtx.state !== 'running') return;

    const { freq, startTime } = this.getFreqAndStart(toneNote, delaySeconds);
    const gainNode = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 5, startTime);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.8, startTime + duration * 0.7);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.008);
    gainNode.gain.exponentialRampToValueAtTime(volume * 0.4, startTime + 0.15);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    this.buildHarmonics(freq, startTime, duration, [
      { type: 'triangle', ratio: 1,    gain: 0.7 },
      { type: 'sine',     ratio: 2,    gain: 0.2 },
      { type: 'sine',     ratio: 3.01, gain: 0.1 }
    ], filter, true, /* trackMelody */ true);

    filter.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
  }

  private getFreqAndStart(toneNote: string, delaySeconds: number) {
    const targetMidi = this.noteToMidiIndex(toneNote);
    const freq = 440 * Math.pow(2, (targetMidi - 69) / 12);
    const startTime = this.audioCtx!.currentTime + delaySeconds;
    return { freq, startTime };
  }

  /**
   * Construit les oscillateurs harmoniques + LFO de vibrato.
   * Retourne le tableau des oscillateurs créés.
   */
  private buildHarmonics(
    freq: number,
    startTime: number,
    duration: number,
    harmonics: readonly { type: OscillatorType; ratio: number; gain: number }[],
    output: AudioNode,
    withVibrato = false,
    trackMelody = false
  ): OscillatorNode[] {
    const ctx = this.audioCtx!;
    const oscillators: OscillatorNode[] = [];

    for (const { type, ratio, gain } of harmonics) {
      const osc = ctx.createOscillator();
      const hGain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq * ratio, startTime);
      hGain.gain.value = gain;

      if (withVibrato) {
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 4.5 + Math.random() * 1.5;
        lfoGain.gain.value = freq * 0.003;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(startTime);
        lfo.stop(startTime + duration);
      }

      osc.connect(hGain);
      hGain.connect(output);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);

      oscillators.push(osc);

      if (trackMelody) {
        this.melodyVoices.add(osc);
        osc.onended = () => this.melodyVoices.delete(osc);
      }
    }

    return oscillators;
  }

  private dampPreviousStringNote(stringIdx: number, dampingDuration = 0.04): void {
    const existing = this.activeVoices.get(stringIdx);
    if (!existing || !this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    existing.gainNode.gain.cancelScheduledValues(now);
    existing.gainNode.gain.setValueAtTime(existing.gainNode.gain.value, now);
    existing.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + dampingDuration);

    setTimeout(() => {
      try {
        existing.source.stop();
        existing.source.disconnect();
      } catch { /* noop */ }
    }, dampingDuration * 1000 + 10);

    this.activeVoices.delete(stringIdx);
  }

  /* ═══════════════════════════════════════════════════════
     GAME LOOP
     ═══════════════════════════════════════════════════════ */

  async startGame(): Promise<void> {
    await this.ensureAudioContextRunning();
    this.stopMelody();
    this.stopConfetti();
    this.isTimerPaused.set(false);
    this.playUiSound('start');

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
    this.timeLeft.set(MAX_TIME);

    this.timerInterval = setInterval(() => {
      if (!this.isPlaying()) return;
      if (this.isTimerPaused()) return;

      this.timeLeft.update(t => t - this.getTimeMultiplier());
      if (this.timeLeft() <= 0) this.handleMiss(true);
    }, 100);
  }

  private nextRound(): void {
    const idx = Math.floor(Math.random() * this.notesList.length);
    this.targetNote.set(this.notesList[idx]);
    this.correctFretIndex.set(-1);
    this.correctStringIndex.set(-1);
    this.startTimer();
  }

  onFretClick(stringIdx: number, fretIdx: number): void {
    if (!this.isPlaying()) return;
    if (this.isTimerPaused() || this.isMelodyPlaying) return;

    const clickedNoteName = this.getNoteAt(stringIdx, fretIdx);
    const toneNote = this.getToneNoteForFret(stringIdx, fretIdx);

    this.playAcousticGuitarNote(stringIdx, toneNote, 2.2, 0.85);

    this.activeVibratingString.set(stringIdx);
    setTimeout(() => {
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
    this.combo.update(c => c + 1);
    this.streak.update(s => s + 1);
    this.notesHit.update(n => n + 1);
    if (this.combo() > this.maxCombo()) this.maxCombo.set(this.combo());

    const starPowerBonus = this.isStarPowerActive() ? 2 : 1;
    const perfectBonus = this.timeLeft() > MAX_TIME * PERFECT_TIME_THRESHOLD ? 1.5 : 1;
    const basePoints = Math.round(100 * this.multiplier() * starPowerBonus * perfectBonus);
    this.score.update(s => s + basePoints);

    if (!this.isStarPowerActive()) {
      this.starPowerGauge.update(g => Math.min(100, g + STAR_POWER_GAIN_ON_HIT));
    }

    this.correctFretIndex.set(fretIdx);
    this.correctStringIndex.set(stringIdx);
    this.triggerParticles(stringIdx, fretIdx);
    this.triggerHitEffect(stringIdx, fretIdx);

    const isPerfect = this.timeLeft() > MAX_TIME * 0.75;
    const comboText = this.effectiveMultiplier() > 1 ? ` x${this.effectiveMultiplier()}` : '';

    if (isPerfect) {
      this.showFeedback(`PARFAIT ! +${basePoints}${comboText}`, 'perfect');
      this.playUiSound('perfect');
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
    if (this.isTimerPaused() || this.isMelodyPlaying) return;

    this.combo.set(0);
    this.streak.set(0);
    this.notesMissed.update(n => n + 1);
    this.lives.update(l => l - 1);
    this.playUiSound('error');
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
    this.starPowerTimeLeft.set(STAR_POWER_DURATION);
    this.playUiSound('starpower');
    this.showFeedback('⚡ STAR POWER ACTIVÉ ! ⚡', 'perfect');
    this.triggerScreenShake();

    clearInterval(this.starPowerInterval);
    this.starPowerInterval = setInterval(() => {
      this.starPowerTimeLeft.update(t => t - 0.1);
      this.starPowerGauge.update(g => {
        if (g <= 0) {
          clearInterval(this.starPowerInterval);
          this.isStarPowerActive.set(false);
          return 0;
        }
        return g - STAR_POWER_DRAIN_PER_TICK;
      });
    }, 100);
  }

  /* ═══════════════════════════════════════════════════════
     MÉLODIE DES ORIGINES
     ═══════════════════════════════════════════════════════ */

  private async playMelodieDesOrigines(): Promise<void> {
    if (this.isMelodyPlaying) return;

    if (this.audioCtx?.state === 'suspended') {
      await this.audioCtx.resume();
    }
    if (!this.audioCtx || this.audioCtx.state !== 'running') return;

    const shuffled = [...this.chordPool].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, 4);

    this.melodySequence.set(chosen);

    this.isMelodyPlaying = true;
    this.melodyPlaying.set(true);
    this.showFeedback('✨ MÉLODIE DES ORIGINES ✨', 'perfect');

    this.isTimerPaused.set(true);
    this.spawnConfetti(80);
    this.playUiSound('perfect');
    this.triggerScreenShake();

    const CHORD_SPACING = 1.6;
    const ARPEGGIO_DELAY = 0.09;

    chosen.forEach((chord, i) => {
      const chordStart = i * CHORD_SPACING + 0.3;

      this.pushMelodyTimeout(() => {
        this.melodyChordIndex.set(i);
        this.melodyChordName.set(chord.name);
        this.melodyChordFrench.set(chord.frenchName);
        this.melodyChordColor.set(chord.color);
      }, chordStart * 1000);

      this.playMelodyNote(6, chord.bassNote, 2.8, 0.55, chordStart);

      chord.arpeggio.forEach((note, nIdx) => {
        const noteDelay = chordStart + 0.10 + nIdx * ARPEGGIO_DELAY;
        const toneNote = this.getToneNoteForFret(note.stringIdx, note.fretIdx);

        this.playMelodyNote(note.stringIdx, toneNote, 2.4, 0.40, noteDelay);

        this.pushMelodyTimeout(() => {
          this.melodyActiveNote.set({ stringIdx: note.stringIdx, fretIdx: note.fretIdx });
          this.activeVibratingString.set(note.stringIdx);
          this.spawnMelodyParticle(note.stringIdx, note.fretIdx, chord.color);
        }, noteDelay * 1000);

        this.pushMelodyTimeout(() => {
          this.melodyActiveNote.set(null);
          if (this.activeVibratingString() === note.stringIdx) {
            this.activeVibratingString.set(-1);
          }
        }, (noteDelay + 0.45) * 1000);
      });
    });

    const totalDuration = chosen.length * CHORD_SPACING + 1.5;
    this.pushMelodyTimeout(() => {
      this.stopMelody();
      this.timeLeft.set(MAX_TIME);
      this.showFeedback('🌟 MÉLODIE ACCOMPLIE 🌟', 'perfect');
    }, totalDuration * 1000);
  }

  private pushMelodyTimeout(fn: () => void, delayMs: number): void {
    this.melodyTimeoutIds.push(setTimeout(fn, delayMs));
  }

  private spawnMelodyParticle(stringIdx: number, fretIdx: number, color: string): void {
    const particle: Particle = {
      id: this.particleId++,
      x: (fretIdx / 12) * 100,
      y: ((stringIdx - 1) / 6) * 100 + 8,
      color,
      size: 14,
      rotation: Math.random() * 360
    };
    this.particles.update(p => [...p, particle]);
    setTimeout(() => {
      this.particles.update(p => p.filter(x => x.id !== particle.id));
    }, 1400);
  }

  private stopMelody(): void {
    this.melodyTimeoutIds.forEach(id => clearTimeout(id));
    this.melodyTimeoutIds = [];

    this.melodyVoices.forEach(voice => {
      try { voice.stop(); } catch { /* noop */ }
    });
    this.melodyVoices.clear();

    this.stopConfetti();

    this.isMelodyPlaying = false;
    this.melodyPlaying.set(false);
    this.melodyChordIndex.set(-1);
    this.melodyActiveNote.set(null);
    this.isTimerPaused.set(false);
  }

  isMelodyNote(stringIdx: number, fretIdx: number): boolean {
    const active = this.melodyActiveNote();
    return active !== null
      && active.stringIdx === stringIdx
      && active.fretIdx === fretIdx;
  }

  /* ═══════════════════════════════════════════════════════
     CONFETTIS
     ═══════════════════════════════════════════════════════ */

  private spawnConfetti(count = 60): void {
    const newConfetti: ConfettiParticle[] = Array.from({ length: count }, () => ({
      id: this.confettiId++,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 8 + 6,
      delay: Math.random() * 1500,
      duration: Math.random() * 2000 + 2500,
      rotation: Math.random() * 360
    }));

    this.confettiParticles.update(c => [...c, ...newConfetti]);

    const ids = new Set(newConfetti.map(n => n.id));
    this.confettiTimeoutIds.push(setTimeout(() => {
      this.confettiParticles.update(c => c.filter(x => !ids.has(x.id)));
    }, 6000));
  }

  private stopConfetti(): void {
    this.confettiTimeoutIds.forEach(id => clearTimeout(id));
    this.confettiTimeoutIds = [];
    this.confettiParticles.set([]);
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════ */

  backToMenu(): void {
    this.clearIntervals();
    this.stopMelody();
    this.stopConfetti();
    this.isTimerPaused.set(false);
    this.isPlaying.set(false);
    this.isGameOver.set(false);
    this.playUiSound('click');
  }

  goToPlay(): void {
    void this.router.navigate(['/play']);
  }

  /* ═══════════════════════════════════════════════════════
     THÉORIE MUSICALE
     ═══════════════════════════════════════════════════════ */

  /** Nom français de la note (sans dièse) pour une case donnée. */
  getNoteAt(stringIndex: number, fret: number): string {
    const str = this.strings.find(s => s.index === stringIndex);
    if (!str) return '';
    const midi = str.baseMidi + fret;
    return FRENCH_NOTE_SEQUENCE[midi % 12].replace('#', '');
  }

  /** Nom scientifique + octave (ex: "A4") pour la synthèse audio. */
  private getToneNoteForFret(stringIndex: number, fret: number): string {
    const str = this.strings.find(s => s.index === stringIndex);
    if (!str) return 'C4';
    const midi = str.baseMidi + fret;
    const octave = Math.floor(midi / 12) - 1;
    return `${CHROMATIC_NOTES[midi % 12]}${octave}`;
  }

  getStringColor(stringIdx: number): string {
    return this.stringColors[stringIdx - 1] ?? '#D4AF37';
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
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360
    }));

    const ids = new Set(newParticles.map(p => p.id));
    this.particles.update(p => [...p, ...newParticles]);
    setTimeout(() => {
      this.particles.update(p => p.filter(x => !ids.has(x.id)));
    }, 1200);
  }

  private triggerHitEffect(stringIdx: number, fretIdx: number): void {
    const key = `${stringIdx}:${fretIdx}`;
    this.hitEffects.update(set => new Set(set).add(key));
    setTimeout(() => {
      this.hitEffects.update(set => {
        const copy = new Set(set);
        copy.delete(key);
        return copy;
      });
    }, 700);
  }

  private triggerScreenShake(): void {
    this.screenShake.set(true);
    setTimeout(() => this.screenShake.set(false), 300);
  }

  /* ═══════════════════════════════════════════════════════
     SONS UI
     ═══════════════════════════════════════════════════════ */

  private playUiSound(type: UiSoundKind): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') void this.audioCtx.resume();

    const now = this.audioCtx.currentTime;

    if (type === 'error') {
      this.playTone('sawtooth', 140, 60, 0.12, now, 0.2);
    } else if (type === 'start') {
      [523.25, 659.25, 783.99, 1046.50].forEach((f, i) =>
        this.playTone('sine', f, f, 0.08, now + i * 0.05, 0.2)
      );
    } else if (type === 'perfect') {
      [1046.50, 1318.51, 1567.98].forEach((f, i) =>
        this.playTone('sine', f, f, 0.06, now + i * 0.04, 0.18)
      );
    } else if (type === 'starpower') {
      [392, 523.25, 659.25, 783.99, 1046.50].forEach((f, i) =>
        this.playTone('square', f, f, 0.06, now + i * 0.05, 0.25)
      );
    }
  }

  private playTone(
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    volume: number,
    startTime: number,
    duration: number
  ): void {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = type;
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.frequency.setValueAtTime(startFreq, startTime);
    if (endFreq !== startFreq) {
      osc.frequency.linearRampToValueAtTime(endFreq, startTime + duration);
    }
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  showFeedback(msg: string, type: FeedbackKind): void {
    this.feedbackKey.update(k => k + 1);
    this.feedbackMessage.set(msg);
    this.feedbackType.set(type);
    setTimeout(() => this.feedbackMessage.set(null), 900);
  }

  private endGame(): void {
    this.clearIntervals();
    this.stopMelody();
    this.stopConfetti();
    this.isTimerPaused.set(false);
    this.isPlaying.set(false);
    this.isGameOver.set(true);
    this.saveHighScore();
    this.playUiSound('gameover');
  }

  private clearIntervals(): void {
    clearInterval(this.timerInterval);
    clearInterval(this.starPowerInterval);
  }

  /* ═══════════════════════════════════════════════════════
     DIFFICULTÉ / PERSISTANCE
     ═══════════════════════════════════════════════════════ */

  setDifficulty(d: Difficulty): void {
    this.difficulty.set(d);
    this.playUiSound('click');
  }

  shouldShowNoteLabel(): boolean {
    return this.difficulty() !== 'hardcore';
  }

  private getTimeMultiplier(): number {
    return DIFFICULTY_MAP[this.difficulty()].timeMultiplier;
  }

  private getLivesStart(): number {
    return DIFFICULTY_MAP[this.difficulty()].lives;
  }

  private loadHighScore(): void {
    const saved = localStorage.getItem('fretboard_highscore');
    if (saved) {
      const parsed = Number.parseInt(saved, 10);
      if (!Number.isNaN(parsed)) this.highScore.set(parsed);
    }
  }

  private saveHighScore(): void {
    if (this.score() > this.highScore()) {
      this.highScore.set(this.score());
      localStorage.setItem('fretboard_highscore', this.score().toString());
    }
  }

  /* ═══════════════════════════════════════════════════════
     STAR POWER — HELPERS
     ═══════════════════════════════════════════════════════ */

  isStarFilled(i: number): boolean {
    return this.starPowerGauge() >= (i + 1) * 10;
  }
}