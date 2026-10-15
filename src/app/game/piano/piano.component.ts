import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import {
  animate,
  keyframes,
  state,
  style,
  transition,
  trigger
} from '@angular/animations';
import { Router } from '@angular/router';

import {
  FeedbackType,
  GameDifficulty,
  HitEffect,
  MelodyChord,
  Particle,
  PianoKey
} from '../models/piano.model';

import {
  InstrumentType,
  PianoAudioService
} from '../services/piano-audio.service';

 import { StorageService } from '../../shared/services/storage.service';
import { randomElement, randomFloat } from '../utils/random.utils';
import { GameAudioService } from '../services/game-audio.service';

/* ═══════════════════════════════════════════════════════
   CONSTANTES DE JEU
   ═══════════════════════════════════════════════════════ */

const MAX_TIME = 200;
const STAR_POWER_DURATION = 8;
const STAR_POWER_GAIN_PER_HIT = 12;
const STAR_POWER_GAIN_MAX = 100;
const COMBO_MELODY_TRIGGER = 12;
const COMBO_SHAKE_TRIGGER = 10;
const TAP_THRESHOLD_PX = 8;

const STORAGE_KEYS = {
  HIGH_SCORE: 'charly_piano_highscore',
  SOUND_ENABLED: 'piano_hero_sound_enabled'
} as const;

@Component({
  selector: 'app-piano',
  standalone: true,
  imports: [],
  templateUrl: './piano.component.html',
  styleUrls: ['./piano.component.scss'],
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
export class PianoComponent implements OnInit, OnDestroy {

  /* ─── Injection ─── */
  private readonly router = inject(Router);
  private readonly audio = inject(PianoAudioService);
  private readonly uiAudio = inject(GameAudioService);
  private readonly storage = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly keyboardScrollRef =
    viewChild<ElementRef<HTMLDivElement>>('keyboardScroll');

  /* ═══════════════════════════════════════════════════════
     CLAVIER (C3 → C5)
     ═══════════════════════════════════════════════════════ */
  readonly pianoKeys: readonly PianoKey[] = [
    { index: 0,  note: 'C3',  frenchNote: 'DO',   octave: 3, isBlack: false, whiteIndex: 0 },
    { index: 1,  note: 'C#3', frenchNote: 'DO#',  octave: 3, isBlack: true,  whiteIndex: 0 },
    { index: 2,  note: 'D3',  frenchNote: 'RÉ',   octave: 3, isBlack: false, whiteIndex: 1 },
    { index: 3,  note: 'D#3', frenchNote: 'RÉ#',  octave: 3, isBlack: true,  whiteIndex: 1 },
    { index: 4,  note: 'E3',  frenchNote: 'MI',   octave: 3, isBlack: false, whiteIndex: 2 },
    { index: 5,  note: 'F3',  frenchNote: 'FA',   octave: 3, isBlack: false, whiteIndex: 3 },
    { index: 6,  note: 'F#3', frenchNote: 'FA#',  octave: 3, isBlack: true,  whiteIndex: 3 },
    { index: 7,  note: 'G3',  frenchNote: 'SOL',  octave: 3, isBlack: false, whiteIndex: 4 },
    { index: 8,  note: 'G#3', frenchNote: 'SOL#', octave: 3, isBlack: true,  whiteIndex: 4 },
    { index: 9,  note: 'A3',  frenchNote: 'LA',   octave: 3, isBlack: false, whiteIndex: 5 },
    { index: 10, note: 'A#3', frenchNote: 'LA#',  octave: 3, isBlack: true,  whiteIndex: 5 },
    { index: 11, note: 'B3',  frenchNote: 'SI',   octave: 3, isBlack: false, whiteIndex: 6 },
    { index: 12, note: 'C4',  frenchNote: 'DO',   octave: 4, isBlack: false, whiteIndex: 7 },
    { index: 13, note: 'C#4', frenchNote: 'DO#',  octave: 4, isBlack: true,  whiteIndex: 7 },
    { index: 14, note: 'D4',  frenchNote: 'RÉ',   octave: 4, isBlack: false, whiteIndex: 8 },
    { index: 15, note: 'D#4', frenchNote: 'RÉ#',  octave: 4, isBlack: true,  whiteIndex: 8 },
    { index: 16, note: 'E4',  frenchNote: 'MI',   octave: 4, isBlack: false, whiteIndex: 9 },
    { index: 17, note: 'F4',  frenchNote: 'FA',   octave: 4, isBlack: false, whiteIndex: 10 },
    { index: 18, note: 'F#4', frenchNote: 'FA#',  octave: 4, isBlack: true,  whiteIndex: 10 },
    { index: 19, note: 'G4',  frenchNote: 'SOL',  octave: 4, isBlack: false, whiteIndex: 11 },
    { index: 20, note: 'G#4', frenchNote: 'SOL#', octave: 4, isBlack: true,  whiteIndex: 11 },
    { index: 21, note: 'A4',  frenchNote: 'LA',   octave: 4, isBlack: false, whiteIndex: 12 },
    { index: 22, note: 'A#4', frenchNote: 'LA#',  octave: 4, isBlack: true,  whiteIndex: 12 },
    { index: 23, note: 'B4',  frenchNote: 'SI',   octave: 4, isBlack: false, whiteIndex: 13 },
    { index: 24, note: 'C5',  frenchNote: 'DO',   octave: 5, isBlack: false, whiteIndex: 14 }
  ];

  readonly whiteNotesList = ['DO', 'RÉ', 'MI', 'FA', 'SOL', 'LA', 'SI'];

  readonly noteColors: Readonly<Record<string, string>> = {
    'DO':  '#FF3366', 'DO#': '#FF3366',
    'RÉ':  '#FFD700', 'RÉ#': '#FFD700',
    'MI':  '#00D4FF',
    'FA':  '#FF6B35', 'FA#': '#FF6B35',
    'SOL': '#00FF88', 'SOL#':'#00FF88',
    'LA':  '#B266FF', 'LA#': '#B266FF',
    'SI':  '#FF8CC8'
  };

  /* ═══════════════════════════════════════════════════════
     ÉTAT DU JEU
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

  /* ─── Melody progressions ─── */
  readonly melodyProgressions: readonly MelodyChord[][] = [
    [
      { name: 'Am', frenchName: 'La mineur',  color: '#B266FF', notes: ['A3','C4','E4'], bassNote: 'A2' },
      { name: 'Dm', frenchName: 'Ré mineur',  color: '#00D4FF', notes: ['D4','F4','A4'], bassNote: 'D3' },
      { name: 'F',  frenchName: 'Fa majeur',  color: '#FFD700', notes: ['F4','A4','C5'], bassNote: 'F3' },
      { name: 'G',  frenchName: 'Sol majeur', color: '#00FF88', notes: ['G4','B4','D5'], bassNote: 'G3' }
    ],
    [
      { name: 'C',  frenchName: 'Do majeur',  color: '#FF3366', notes: ['C4','E4','G4'], bassNote: 'C3' },
      { name: 'G',  frenchName: 'Sol majeur', color: '#00FF88', notes: ['G4','B4','D5'], bassNote: 'G3' },
      { name: 'Am', frenchName: 'La mineur',  color: '#B266FF', notes: ['A3','C4','E4'], bassNote: 'A2' },
      { name: 'F',  frenchName: 'Fa majeur',  color: '#FFD700', notes: ['F4','A4','C5'], bassNote: 'F3' }
    ],
    [
      { name: 'F',  frenchName: 'Fa majeur',  color: '#FFD700', notes: ['F4','A4','C5'], bassNote: 'F3' },
      { name: 'C',  frenchName: 'Do majeur',  color: '#FF3366', notes: ['C4','E4','G4'], bassNote: 'C3' },
      { name: 'G',  frenchName: 'Sol majeur', color: '#00FF88', notes: ['G4','B4','D5'], bassNote: 'G3' },
      { name: 'Am', frenchName: 'La mineur',  color: '#B266FF', notes: ['A3','C4','E4'], bassNote: 'A2' }
    ],
    [
      { name: 'Dm', frenchName: 'Ré mineur',  color: '#00D4FF', notes: ['D4','F4','A4'], bassNote: 'D3' },
      { name: 'G',  frenchName: 'Sol majeur', color: '#00FF88', notes: ['G4','B4','D5'], bassNote: 'G3' },
      { name: 'C',  frenchName: 'Do majeur',  color: '#FF3366', notes: ['C4','E4','G4'], bassNote: 'C3' },
      { name: 'Am', frenchName: 'La mineur',  color: '#B266FF', notes: ['A3','C4','E4'], bassNote: 'A2' }
    ]
  ];

  readonly melodyTitles = [
    '✨ ORIGINES ✨',
    '⭐ ÉTOILES ⭐',
    '⚔️ HÉROS ⚔️',
    '🌙 RÊVE 🌙'
  ] as const;

  readonly melodyInstruments: readonly InstrumentType[] = [
    'strings', 'bells', 'trumpet', 'flute'
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
    const idx = (this.melodyProgressionIndex - 1 + this.melodyProgressions.length)
      % this.melodyProgressions.length;
    return [...this.melodyProgressions[idx]];
  });

  readonly keyColorsByIndex = computed<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    for (const k of this.pianoKeys) {
      map[k.index] = this.noteColors[k.frenchNote] ?? '#FFFFFF';
    }
    return map;
  });

  readonly whiteKeys = computed(() => this.pianoKeys.filter(k => !k.isBlack));
  readonly blackKeys = computed(() => this.pianoKeys.filter(k => k.isBlack));

  readonly targetKeyIndex = computed<number>(() => {
    const note = this.targetNote();
    const oct = this.targetOctave();
    if (!note) return -1;
    const key = this.pianoKeys.find(k =>
      !k.isBlack && k.frenchNote === note && k.octave === oct
    );
    return key?.index ?? -1;
  });

  readonly targetNoteDisplay = computed<string>(() => {
    const note = this.targetNote();
    const oct = this.targetOctave();
    if (!note) return '';
    const sub = ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'];
    const octStr = String(oct).split('').map(d => sub[+d]).join('');
    return `${note}${octStr}`;
  });

  readonly shouldHighlightTarget = computed(() =>
    this.isPlaying() && !this.melodyPlaying()
  );

  /**
   * ✅ Computed pour le pourcentage du timer.
   * (Avant : méthode appelée dans le template → non réactive.)
   */
  readonly timerPercent = computed(() =>
    (this.timeLeft() / MAX_TIME) * 100
  );

  /**
   * ✅ Computed pour la couleur du timer.
   */
  readonly timerColor = computed(() => {
    const pct = this.timerPercent();
    if (pct < 20) return 'linear-gradient(90deg, #ef4444, #f59e0b)';
    if (pct < 50) return 'linear-gradient(90deg, #f59e0b, #fbbf24, #10b981)';
    return 'linear-gradient(90deg, #10b981, #06b6d4, #3b82f6)';
  });

  readonly isTimerCritical = computed(() => this.timerPercent() < 20);

  /**
   * ✅ Indices des étoiles Star Power (constante calculée une fois).
   */
  readonly starPowerStars = Array.from({ length: 10 }, (_, i) => i);

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
  private readonly activePointer = new Map<number, {
    keyIndex: number;
    startX: number;
    startY: number;
    moved: boolean;
  }>();

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */

  constructor() {
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
    void this.audio.init();
    this.loadHighScore();
    this.loadSoundPreference();
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
    this.stopMelody();
    this.audio.allNotesOff();
  }

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

    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts.clear();

    this.melodyTimeouts.forEach(id => clearTimeout(id));
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
     POINTER / TACTILE (glissando)
     ═══════════════════════════════════════════════════════ */

  onPointerDown(key: PianoKey, event: PointerEvent): void {
    event.preventDefault();
    void this.audio.unlock();

    this.activePointer.set(event.pointerId, {
      keyIndex: key.index,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    });

    this.activeKeyIndexes.update(set => {
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

    const prevKey = this.pianoKeys.find(k => k.index === info.keyIndex);
    if (prevKey) this.audio.noteOff(prevKey.note);

    this.activeKeyIndexes.update(set => {
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

    this.activeKeyIndexes.update(set => {
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
    this.activeKeyIndexes.update(set => {
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
    return this.hitEffects().some(e => e.keyIndex === keyIndex);
  }

  shouldShowNoteLabel(): boolean {
    return this.difficulty() !== 'hardcore';
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
      this.timeLeft.update(t => t - this.getTimeMultiplier());
      if (this.timeLeft() <= 0) this.handleMiss(true);
    }, 100);
  }

  private nextRound(): void {
    const pool = this.getNotePool();

    const filtered = pool.filter(p =>
      `${p.frenchNote}-${p.octave}` !== this.lastTargetKey
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
    this.combo.update(c => c + 1);
    this.streak.update(s => s + 1);
    this.notesHit.update(n => n + 1);
    if (this.combo() > this.maxCombo()) this.maxCombo.set(this.combo());

    const starPowerBonus = this.isStarPowerActive() ? 2 : 1;
    const perfectBonus = this.timeLeft() > MAX_TIME * 0.7 ? 1.5 : 1;
    const basePoints = Math.round(100 * this.multiplier() * starPowerBonus * perfectBonus);
    this.score.update(s => s + basePoints);

    if (!this.isStarPowerActive()) {
      this.starPowerGauge.update(g =>
        Math.min(STAR_POWER_GAIN_MAX, g + STAR_POWER_GAIN_PER_HIT)
      );
    }

    this.correctKeyIndex.set(keyIndex);
    this.triggerParticles(keyIndex);
    this.triggerHitEffect(keyIndex);

    const isPerfect = this.timeLeft() > MAX_TIME * 0.75;
    const comboText = this.effectiveMultiplier() > 1 ? ` x${this.effectiveMultiplier()}` : '';
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
    this.notesMissed.update(n => n + 1);
    this.lives.update(l => l - 1);
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

    /* Fanfare de trompette */
    this.audio.setInstrument('trumpet');
    this.schedule(() => {
      ['C4', 'E4', 'G4', 'C5'].forEach(n => {
        this.audio.playNoteFor(n, 0.8, 0.7);
      });
    }, 0);

    this.schedule(() => this.audio.setInstrument('piano'), 1500);

    if (this.starPowerInterval) clearInterval(this.starPowerInterval);

    this.starPowerInterval = setInterval(() => {
      this.starPowerTimeLeft.update(t => t - 0.1);

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

    const progression = this.melodyProgressions[this.melodyProgressionIndex];
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
    this.melodyTimeouts.forEach(id => clearTimeout(id));
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
      return this.whiteNotesList.map(n => ({ frenchNote: n, octave: 4 }));
    }

    const octaves = [3, 4, 5];
    const pool: { frenchNote: string; octave: number }[] = [];
    for (const oct of octaves) {
      for (const note of this.whiteNotesList) {
        const exists = this.pianoKeys.some(k =>
          !k.isBlack && k.frenchNote === note && k.octave === oct
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

      const el = scroll.querySelector<HTMLElement>(`[data-key-index="${idx}"]`);
      if (!el) return;

      const elLeft = el.offsetLeft;
      const elWidth = el.offsetWidth;
      const scrollWidth = scroll.clientWidth;
      const targetScrollLeft = elLeft - (scrollWidth / 2) + (elWidth / 2);

      scroll.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth'
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

    const el = scroll.querySelector<HTMLElement>(`[data-key-index="${key.index}"]`);
    if (!el) return { x: 0, y: key.isBlack ? 30 : 60 };

    const keyRect = el.getBoundingClientRect();
    const scrollRect = scroll.getBoundingClientRect();

    return {
      x: keyRect.left - scrollRect.left + scroll.scrollLeft + keyRect.width / 2,
      y: key.isBlack ? 30 : 60
    };
  }

  private triggerParticles(keyIndex: number): void {
    const key = this.pianoKeys.find(k => k.index === keyIndex);
    if (!key) return;

    const { x, y } = this.getKeyCenter(key);

    const newParticles: Particle[] = Array.from({ length: 16 }, () => ({
      id: this.particleId++,
      x,
      y,
      color: this.getKeyColor(key),
      size: randomFloat(4, 12),
      rotation: randomFloat(0, 360)
    }));

    const ids = new Set(newParticles.map(p => p.id));
    this.particles.update(p => [...p, ...newParticles]);
    this.schedule(() => {
      this.particles.update(p => p.filter(x => !ids.has(x.id)));
    }, 1200);
  }

  private triggerHitEffect(keyIndex: number): void {
    const id = this.effectId++;
    this.hitEffects.update(e => [...e, { id, keyIndex }]);
    this.schedule(() => {
      this.hitEffects.update(e => e.filter(x => x.id !== id));
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
    this.feedbackKey.update(k => k + 1);
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