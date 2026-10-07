import { animate, keyframes, style, transition, trigger, state } from '@angular/animations';
import { Component, OnDestroy, OnInit, signal, computed, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

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

interface NoteHighway {
  id: number;
  note: string;
  stringIdx: number;
  fretIdx: number;
  progress: number;
  hit: boolean;
  missed: boolean;
}

interface PlayingVoice {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  stringIdx: number;
  startTime: number;
}

@Component({
  selector: 'app-fretboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fretboard.component.html',
  styleUrls: ['./fretboard.component.scss'],
  animations: [
    trigger('feedbackAnim', [
      transition(':enter', [
        animate('700ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', keyframes([
          style({ transform: 'scale(0.2) rotate(-15deg)', opacity: 0, offset: 0 }),
          style({ transform: 'scale(1.4) rotate(8deg)', opacity: 1, offset: 0.35 }),
          style({ transform: 'scale(0.95) rotate(-3deg)', opacity: 1, offset: 0.6 }),
          style({ transform: 'scale(1.05) rotate(0deg)', opacity: 1, offset: 0.8 }),
          style({ transform: 'scale(1.2) rotate(0deg)', opacity: 0, offset: 1 })
        ]))
      ])
    ]),
    trigger('modalAnim', [
      transition(':enter', [
        animate('600ms cubic-bezier(0.34, 1.56, 0.64, 1)', keyframes([
          style({ transform: 'scale(0.5) translateY(80px) rotateX(20deg)', opacity: 0, offset: 0 }),
          style({ transform: 'scale(1.08) translateY(-10px) rotateX(-2deg)', opacity: 1, offset: 0.7 }),
          style({ transform: 'scale(1) translateY(0) rotateX(0)', opacity: 1, offset: 1 })
        ]))
      ])
    ]),
    trigger('melodyBanner', [
      transition(':enter', [
        animate('800ms cubic-bezier(0.22, 1, 0.36, 1)', keyframes([
          style({ transform: 'scale(0.3) translateY(-60px)', opacity: 0, offset: 0 }),
          style({ transform: 'scale(1.15) translateY(10px)', opacity: 1, offset: 0.5 }),
          style({ transform: 'scale(1) translateY(0)', opacity: 1, offset: 1 })
        ]))
      ]),
      transition(':leave', [
        animate('400ms ease-in', style({ transform: 'scale(0.85)', opacity: 0 }))
      ])
    ]),
    trigger('starPowerPulse', [
      state('inactive', style({ transform: 'scale(1)' })),
      state('active', style({ transform: 'scale(1.02)' })),
      transition('inactive <=> active', animate('400ms ease-in-out'))
    ]),
    trigger('comboFlash', [
      transition('* => *', [
        animate('500ms ease-out', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1.5)', color: '#FFD700', offset: 0.3 }),
          style({ transform: 'scale(1)', offset: 1 })
        ]))
      ])
    ])
  ]
})
export class FretboardComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  readonly strings: GuitarString[] = [
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

  readonly singleDotFrets = [3, 5, 7, 9];
  readonly doubleDotFret = 12;

  // Signals de jeu
  score = signal<number>(0);
  combo = signal<number>(0);
  maxCombo = signal<number>(0);
  lives = signal<number>(7);
  targetNote = signal<string>('');
  timeLeft = signal<number>(200);
  isPlaying = signal<boolean>(false);
  isGameOver = signal<boolean>(false);
  isTimerPaused = signal<boolean>(false);
  notesHit = signal<number>(0);
  notesMissed = signal<number>(0);
  streak = signal<number>(0);

  // Star Power
  starPowerGauge = signal<number>(0);
  isStarPowerActive = signal<boolean>(false);
  starPowerTimeLeft = signal<number>(0);

  multiplier = computed(() => {
    const c = this.combo();
    if (c >= 20) return 6;
    if (c >= 15) return 5;
    if (c >= 12) return 4;
    if (c >= 8) return 3;
    if (c >= 4) return 2;
    return 1;
  });

  effectiveMultiplier = computed(() =>
    this.multiplier() * (this.isStarPowerActive() ? 2 : 1)
  );

  accuracy = computed(() => {
    const total = this.notesHit() + this.notesMissed();
    return total === 0 ? 100 : Math.round((this.notesHit() / total) * 100);
  });

  // UI & Feedback
  feedbackMessage = signal<string | null>(null);
  feedbackType = signal<'success' | 'error' | 'perfect'>('success');
  feedbackKey = signal<number>(0);
  highScore = signal<number>(0);
  difficulty = signal<'facile' | 'normal' | 'hardcore'>('normal');
  screenShake = signal<boolean>(false);
  comboFlashKey = signal<number>(0);

  // Animations & Effets
  particles = signal<Particle[]>([]);
  correctFretIndex = signal<number>(-1);
  correctStringIndex = signal<number>(-1);
  activeVibratingString = signal<number>(-1);
  hitEffects = signal<{ id: number; stringIdx: number; fretIdx: number }[]>([]);

  // Confettis
  confettiParticles = signal<ConfettiParticle[]>([]);

  // Mélodie des Origines
  melodyPlaying = signal<boolean>(false);
  melodyChordIndex = signal<number>(-1);
  melodyChordName = signal<string>('');
  melodyChordFrench = signal<string>('');
  melodyChordColor = signal<string>('#FFD700');
  melodyActiveNote = signal<{ stringIdx: number; fretIdx: number } | null>(null);

  // Highway
  noteHighwayActive = signal<boolean>(false);
  highwayNotes = signal<NoteHighway[]>([]);

  // Pool d'accords disponibles
  readonly chordPool: MelodyChord[] = [
    {
      name: 'Am', frenchName: 'La mineur', color: '#B266FF', bassNote: 'A2',
      arpeggio: [
        { stringIdx: 5, fretIdx: 0 },
        { stringIdx: 4, fretIdx: 2 },
        { stringIdx: 3, fretIdx: 2 },
        { stringIdx: 2, fretIdx: 1 },
        { stringIdx: 1, fretIdx: 0 },
      ]
    },
    {
      name: 'C', frenchName: 'Do majeur', color: '#FFD700', bassNote: 'C3',
      arpeggio: [
        { stringIdx: 5, fretIdx: 3 },
        { stringIdx: 4, fretIdx: 2 },
        { stringIdx: 3, fretIdx: 0 },
        { stringIdx: 2, fretIdx: 1 },
        { stringIdx: 1, fretIdx: 0 },
      ]
    },
    {
      name: 'G', frenchName: 'Sol majeur', color: '#00FF88', bassNote: 'G2',
      arpeggio: [
        { stringIdx: 6, fretIdx: 3 },
        { stringIdx: 5, fretIdx: 2 },
        { stringIdx: 4, fretIdx: 0 },
        { stringIdx: 3, fretIdx: 0 },
        { stringIdx: 2, fretIdx: 0 },
      ]
    },
    {
      name: 'Dm', frenchName: 'Ré mineur', color: '#00D4FF', bassNote: 'D3',
      arpeggio: [
        { stringIdx: 4, fretIdx: 0 },
        { stringIdx: 3, fretIdx: 2 },
        { stringIdx: 2, fretIdx: 3 },
        { stringIdx: 1, fretIdx: 1 },
      ]
    },
    {
      name: 'Em', frenchName: 'Mi mineur', color: '#FF6B9D', bassNote: 'E2',
      arpeggio: [
        { stringIdx: 6, fretIdx: 0 },
        { stringIdx: 5, fretIdx: 2 },
        { stringIdx: 4, fretIdx: 2 },
        { stringIdx: 3, fretIdx: 0 },
        { stringIdx: 2, fretIdx: 0 },
        { stringIdx: 1, fretIdx: 0 },
      ]
    },
    {
      name: 'F', frenchName: 'Fa majeur', color: '#FFB347', bassNote: 'F2',
      arpeggio: [
        { stringIdx: 6, fretIdx: 1 },
        { stringIdx: 5, fretIdx: 3 },
        { stringIdx: 4, fretIdx: 3 },
        { stringIdx: 3, fretIdx: 2 },
        { stringIdx: 2, fretIdx: 1 },
        { stringIdx: 1, fretIdx: 1 },
      ]
    },
    {
      name: 'E', frenchName: 'Mi majeur', color: '#FF4500', bassNote: 'E2',
      arpeggio: [
        { stringIdx: 6, fretIdx: 0 },
        { stringIdx: 5, fretIdx: 2 },
        { stringIdx: 4, fretIdx: 2 },
        { stringIdx: 3, fretIdx: 1 },
        { stringIdx: 2, fretIdx: 0 },
        { stringIdx: 1, fretIdx: 0 },
      ]
    },
    {
      name: 'A', frenchName: 'La majeur', color: '#9D4EDD', bassNote: 'A2',
      arpeggio: [
        { stringIdx: 5, fretIdx: 0 },
        { stringIdx: 4, fretIdx: 2 },
        { stringIdx: 3, fretIdx: 2 },
        { stringIdx: 2, fretIdx: 2 },
        { stringIdx: 1, fretIdx: 0 },
      ]
    },
  ];

  readonly melodieOrigines: MelodyChord[] = this.chordPool.slice(0, 4);

  private timerInterval: any;
  private starPowerInterval: any;
  private readonly maxTime = 200;
  private isMelodyPlaying = false;
  private melodyTimeoutIds: any[] = [];
  private particleId = 0;
  private effectId = 0;
  private confettiId = 0;
  private confettiTimeoutIds: any[] = [];

  // Web Audio
  private audioCtx?: AudioContext;
  private activeVoices: Map<number, PlayingVoice> = new Map();
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private isAudioReady = false;
  private melodyVoices: Set<AudioBufferSourceNode | OscillatorNode> = new Set();
  private readonly guitarBasePath = 'assets/audio/guitar-acoustic/';
  private readonly guitarSamples: Record<string, string> = {
    'E2': 'E2.ogg', 'A2': 'A2.ogg', 'D3': 'D3.ogg',
    'G3': 'G3.ogg', 'B3': 'B3.ogg', 'E4': 'E4.ogg'
  };

  private readonly noteToMidiOffset: Record<string, number> = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
  };

  constructor() {
    effect(() => {
      const c = this.combo();
      if (c > 0 && c % 4 === 0) {
        this.comboFlashKey.update(k => k + 1);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.initAudioContext();
    this.preloadSamples();
    this.loadHighScore();
  }

  /* ═══════════════════════════════════════════════════════
     MOTEUR AUDIO
     ═══════════════════════════════════════════════════════ */
  private initAudioContext(): void {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      this.audioCtx = new AudioContextClass();
    }
  }

  private async preloadSamples(): Promise<void> {
    if (!this.audioCtx) return;
    const promises = Object.entries(this.guitarSamples).map(async ([note, file]) => {
      try {
        const response = await fetch(this.guitarBasePath + file);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioCtx!.decodeAudioData(arrayBuffer);
        this.audioBuffers.set(note, audioBuffer);
      } catch (err) {
        // Fallback silencieux
      }
    });
    await Promise.all(promises);
    this.isAudioReady = this.audioBuffers.size > 0;
  }

  private async ensureAudioContextRunning(): Promise<void> {
    if (this.audioCtx?.state === 'suspended') {
      await this.audioCtx.resume();
    }
  }

  private noteToMidiIndex(note: string): number {
    const match = note.match(/^([A-G]#?)(\d+)$/);
    if (!match) return 60;
    const [, pitch, octaveStr] = match;
    return (parseInt(octaveStr, 10) + 1) * 12 + (this.noteToMidiOffset[pitch] ?? 0);
  }

  private dampPreviousStringNote(stringIdx: number, dampingDuration = 0.04): void {
    const existing = this.activeVoices.get(stringIdx);
    if (existing && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      existing.gainNode.gain.cancelScheduledValues(now);
      existing.gainNode.gain.setValueAtTime(existing.gainNode.gain.value, now);
      existing.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + dampingDuration);
      setTimeout(() => {
        try {
          existing.source.stop();
          existing.source.disconnect();
        } catch {}
      }, dampingDuration * 1000 + 10);
      this.activeVoices.delete(stringIdx);
    }
  }

  private playAcousticGuitarNote(stringIdx: number, toneNote: string, duration = 2.5, volume = 0.85, delaySeconds = 0): void {
    if (!this.audioCtx) return;

    this.dampPreviousStringNote(stringIdx);

    const targetMidi = this.noteToMidiIndex(toneNote);
    const targetFreq = 440 * Math.pow(2, (targetMidi - 69) / 12);
    const startTime = this.audioCtx.currentTime + delaySeconds;

    if (this.isAudioReady && this.audioBuffers.size > 0) {
      let closest: { note: string; buffer: AudioBuffer; distance: number } | null = null;
      this.audioBuffers.forEach((buffer, note) => {
        const sampleMidi = this.noteToMidiIndex(note);
        const distance = Math.abs(sampleMidi - targetMidi);
        if (!closest || distance < closest.distance) {
          closest = { note, buffer, distance };
        }
      });

      if (closest) {
        const sampleMidi = this.noteToMidiIndex((closest as any).note);
        const playbackRate = Math.pow(2, (targetMidi - sampleMidi) / 12);

        const source = this.audioCtx.createBufferSource();
        source.buffer = (closest as any).buffer;
        source.playbackRate.value = playbackRate;

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.001, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.008);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        source.start(startTime);
        source.stop(startTime + duration + 0.1);

        this.activeVoices.set(stringIdx, { source, gainNode, stringIdx, startTime });
        return;
      }
    }

    // Fallback synthèse
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    const bodyFilter = this.audioCtx.createBiquadFilter();

    osc.type = stringIdx >= 4 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(targetFreq, startTime);

    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(targetFreq * 2.8, startTime);
    bodyFilter.frequency.exponentialRampToValueAtTime(targetFreq * 0.8, startTime + duration * 0.7);

    gainNode.gain.setValueAtTime(0.001, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(bodyFilter);
    bodyFilter.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);

    this.activeVoices.set(stringIdx, { source: osc as any, gainNode, stringIdx, startTime });
  }

  /**
   * Joue une note de mélodie SANS damper les autres voix
   */
  private playMelodyNote(
    stringIdx: number,
    toneNote: string,
    duration: number,
    volume: number,
    delaySeconds: number
  ): void {
    if (!this.audioCtx || this.audioCtx.state !== 'running') return;

    const targetMidi = this.noteToMidiIndex(toneNote);
    const targetFreq = 440 * Math.pow(2, (targetMidi - 69) / 12);
    const startTime = this.audioCtx.currentTime + delaySeconds;

    // CAS 1 : Sample réel
    if (this.isAudioReady && this.audioBuffers.size > 0) {
      let closest: { note: string; buffer: AudioBuffer; distance: number } | null = null;
      this.audioBuffers.forEach((buffer, note) => {
        const sampleMidi = this.noteToMidiIndex(note);
        const distance = Math.abs(sampleMidi - targetMidi);
        if (!closest || distance < closest.distance) {
          closest = { note, buffer, distance };
        }
      });

      if (closest) {
        const sampleMidi = this.noteToMidiIndex((closest as any).note);
        const playbackRate = Math.pow(2, (targetMidi - sampleMidi) / 12);

        const source = this.audioCtx.createBufferSource();
        source.buffer = (closest as any).buffer;
        source.playbackRate.value = playbackRate;

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.0001, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gainNode.gain.setValueAtTime(volume, startTime + duration * 0.4);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        source.start(startTime);
        source.stop(startTime + duration + 0.1);

        this.melodyVoices.add(source);
        source.onended = () => this.melodyVoices.delete(source);
        return;
      }
    }

    // CAS 2 : Synthèse (fallback)
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    const bodyFilter = this.audioCtx.createBiquadFilter();

    osc.type = stringIdx >= 4 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(targetFreq, startTime);

    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(targetFreq * 3, startTime);
    bodyFilter.frequency.exponentialRampToValueAtTime(targetFreq * 1.2, startTime + duration * 0.7);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.setValueAtTime(volume, startTime + duration * 0.4);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(bodyFilter);
    bodyFilter.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);

    this.melodyVoices.add(osc);
    osc.onended = () => this.melodyVoices.delete(osc);
  }

  /* ═══════════════════════════════════════════════════════
     LOGIQUE DU JEU
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

  startTimer(): void {
    clearInterval(this.timerInterval);
    this.timeLeft.set(this.maxTime);

    this.timerInterval = setInterval(() => {
      if (!this.isPlaying()) return;
      // ⏸️ Geler le timer pendant la mélodie
      if (this.isTimerPaused()) return;
      this.timeLeft.update(t => t - this.getTimeMultiplier());
      if (this.timeLeft() <= 0) this.handleMiss(true);
    }, 100);
  }

  nextRound(): void {
    const randomIndex = Math.floor(Math.random() * this.notesList.length);
    this.targetNote.set(this.notesList[randomIndex]);
    this.correctFretIndex.set(-1);
    this.correctStringIndex.set(-1);
    this.startTimer();
  }

  onFretClick(stringIdx: number, fretIdx: number): void {
    if (!this.isPlaying()) return;
    // 🛡️ Bloquer les clics pendant la mélodie (pour ne pas casser le combo)
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

  handleSuccess(fretIdx: number, stringIdx: number): void {
    this.combo.update(c => c + 1);
    this.streak.update(s => s + 1);
    this.notesHit.update(n => n + 1);
    if (this.combo() > this.maxCombo()) this.maxCombo.set(this.combo());

    const starPowerBonus = this.isStarPowerActive() ? 2 : 1;
    const perfectBonus = this.timeLeft() > this.maxTime * 0.7 ? 1.5 : 1;
    const basePoints = Math.round(100 * this.multiplier() * starPowerBonus * perfectBonus);
    this.score.update(s => s + basePoints);

    if (!this.isStarPowerActive()) {
      this.starPowerGauge.update(g => Math.min(100, g + 12));
    }

    this.correctFretIndex.set(fretIdx);
    this.correctStringIndex.set(stringIdx);
    this.triggerParticles(stringIdx, fretIdx);
    this.triggerHitEffect(stringIdx, fretIdx);

    const isPerfect = this.timeLeft() > this.maxTime * 0.75;
    const comboText = this.effectiveMultiplier() > 1 ? ` x${this.effectiveMultiplier()}` : '';
    if (isPerfect) {
      this.showFeedback(`PARFAIT ! +${basePoints}${comboText}`, 'perfect');
      this.playUiSound('perfect');
    } else {
      this.showFeedback(`BIEN ! +${basePoints}${comboText}`, 'success');
    }

    if (this.combo() > 0 && this.combo() % 7 === 0) {
      this.playMelodieDesOrigines();
    }

    if (this.combo() > 0 && this.combo() % 10 === 0) {
      this.triggerScreenShake();
    }

    this.nextRound();
  }

  handleMiss(isTimeout: boolean): void {
    // 🛡️ Ne jamais pénaliser pendant la mélodie
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
    this.starPowerTimeLeft.set(8);
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
        return g - 1.25;
      });
    }, 100);
  }

  /* ═══════════════════════════════════════════════════════
     MÉLODIE DES ORIGINES — 4 accords aléatoires
     ═══════════════════════════════════════════════════════ */
  private async playMelodieDesOrigines(): Promise<void> {
    if (this.isMelodyPlaying) return;

    // Réveiller le contexte audio
    if (this.audioCtx?.state === 'suspended') {
      await this.audioCtx.resume();
    }
    if (!this.audioCtx || this.audioCtx.state !== 'running') {
      console.warn('[Mélodie] AudioContext non disponible');
      return;
    }

    // Tirage aléatoire de 4 accords
    const shuffled = [...this.chordPool].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, 4);

    (this.melodieOrigines as MelodyChord[]).length = 0;
    (this.melodieOrigines as MelodyChord[]).push(...chosen);

    this.isMelodyPlaying = true;
    this.melodyPlaying.set(true);
    this.showFeedback('✨ MÉLODIE DES ORIGINES ✨', 'perfect');

    // ⏸️ Geler le timer pendant la célébration
    this.isTimerPaused.set(true);

    // 🎉 Célébration
    this.spawnConfetti(80);
    this.playUiSound('perfect');
    this.triggerScreenShake();

    const chordSpacing = 1.6;
    const arpeggioDelay = 0.09;

    chosen.forEach((chord, i) => {
      const chordStart = i * chordSpacing + 0.3;

      const bannerTimeout = setTimeout(() => {
        this.melodyChordIndex.set(i);
        this.melodyChordName.set(chord.name);
        this.melodyChordFrench.set(chord.frenchName);
        this.melodyChordColor.set(chord.color);
      }, chordStart * 1000);
      this.melodyTimeoutIds.push(bannerTimeout);

      // Basse
      this.playMelodyNote(6, chord.bassNote, 2.8, 0.55, chordStart);

      // Arpège
      chord.arpeggio.forEach((note, nIdx) => {
        const noteDelay = chordStart + 0.10 + nIdx * arpeggioDelay;
        const toneNote = this.getToneNoteForFret(note.stringIdx, note.fretIdx);

        this.playMelodyNote(note.stringIdx, toneNote, 2.4, 0.40, noteDelay);

        const highlightTimeout = setTimeout(() => {
          this.melodyActiveNote.set({ stringIdx: note.stringIdx, fretIdx: note.fretIdx });
          this.activeVibratingString.set(note.stringIdx);
          this.spawnMelodyParticle(note.stringIdx, note.fretIdx, chord.color);
        }, noteDelay * 1000);
        this.melodyTimeoutIds.push(highlightTimeout);

        const offTimeout = setTimeout(() => {
          this.melodyActiveNote.set(null);
          if (this.activeVibratingString() === note.stringIdx) {
            this.activeVibratingString.set(-1);
          }
        }, (noteDelay + 0.45) * 1000);
        this.melodyTimeoutIds.push(offTimeout);
      });
    });

    const totalDuration = chosen.length * chordSpacing + 1.5;
    const endTimeout = setTimeout(() => {
      this.stopMelody();
      this.isTimerPaused.set(false);      // ▶️ Relancer le timer
      this.timeLeft.set(this.maxTime);    // 🕐 Redonner un temps plein
      this.showFeedback('🌟 MÉLODIE ACCOMPLIE 🌟', 'perfect');
    }, totalDuration * 1000);
    this.melodyTimeoutIds.push(endTimeout);
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
      try { voice.stop(); } catch {}
    });
    this.melodyVoices.clear();

    this.stopConfetti();

    this.isMelodyPlaying = false;
    this.melodyPlaying.set(false);
    this.melodyChordIndex.set(-1);
    this.melodyActiveNote.set(null);

    // ▶️ Toujours dégeler le timer
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
  private spawnConfetti(count: number = 60): void {
    const colors = [
      '#FFD700', '#FF6B9D', '#00D4FF', '#00FF88',
      '#B266FF', '#FF4500', '#FFB347', '#9D4EDD'
    ];
    const newConfetti: ConfettiParticle[] = Array.from({ length: count }, () => ({
      id: this.confettiId++,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 6,
      delay: Math.random() * 1500,
      duration: Math.random() * 2000 + 2500,
      rotation: Math.random() * 360
    }));
    this.confettiParticles.update(c => [...c, ...newConfetti]);

    const cleanupId = setTimeout(() => {
      this.confettiParticles.update(c =>
        c.filter(x => !newConfetti.find(n => n.id === x.id))
      );
    }, 6000);
    this.confettiTimeoutIds.push(cleanupId);
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
    clearInterval(this.timerInterval);
    clearInterval(this.starPowerInterval);
    this.stopMelody();
    this.stopConfetti();
    this.isTimerPaused.set(false);
    this.isPlaying.set(false);
    this.isGameOver.set(false);
    this.playUiSound('click');
  }

  goToPlay(): void {
    this.router.navigate(['/play']);
  }

  /* ═══════════════════════════════════════════════════════
     THÉORIE MUSICALE
     ═══════════════════════════════════════════════════════ */
  getNoteAt(stringIndex: number, fret: number): string {
    const noteSequence = ['DO', 'DO#', 'RÉ', 'RÉ#', 'MI', 'FA', 'FA#', 'SOL', 'SOL#', 'LA', 'LA#', 'SI'];
    const str = this.strings.find(s => s.index === stringIndex);
    if (!str) return '';
    const midi = str.baseMidi + fret;
    return noteSequence[midi % 12].replace('#', '');
  }

  private getToneNoteForFret(stringIndex: number, fret: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const str = this.strings.find(s => s.index === stringIndex);
    if (!str) return 'C4';
    const midi = str.baseMidi + fret;
    const octave = Math.floor(midi / 12) - 1;
    return `${noteNames[midi % 12]}${octave}`;
  }

  getStringGauge(stringIdx: number): number {
    const str = this.strings.find(s => s.index === stringIdx);
    return str ? str.gaugeMm : 0.5;
  }

  getStringColor(stringIdx: number): string {
    return this.stringColors[stringIdx - 1] || '#D4AF37';
  }

  isHit(stringIdx: number, fretIdx: number): boolean {
    return this.hitEffects().some(e => e.stringIdx === stringIdx && e.fretIdx === fretIdx);
  }

  /* ═══════════════════════════════════════════════════════
     EFFETS VISUELS
     ═══════════════════════════════════════════════════════ */
  triggerParticles(stringIdx: number, fretIdx: number): void {
    const newParticles: Particle[] = Array.from({ length: 16 }, () => ({
      id: this.particleId++,
      x: (fretIdx / 12) * 100,
      y: ((stringIdx - 1) / 6) * 100,
      color: this.getStringColor(stringIdx),
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360
    }));
    this.particles.update(p => [...p, ...newParticles]);
    setTimeout(() => {
      this.particles.update(p => p.filter(x => !newParticles.find(n => n.id === x.id)));
    }, 1200);
  }

  triggerHitEffect(stringIdx: number, fretIdx: number): void {
    const id = this.effectId++;
    this.hitEffects.update(e => [...e, { id, stringIdx, fretIdx }]);
    setTimeout(() => {
      this.hitEffects.update(e => e.filter(x => x.id !== id));
    }, 700);
  }

  triggerScreenShake(): void {
    this.screenShake.set(true);
    setTimeout(() => this.screenShake.set(false), 300);
  }

  /* ═══════════════════════════════════════════════════════
     SONS UI
     ═══════════════════════════════════════════════════════ */
  private playUiSound(type: 'click' | 'error' | 'gameover' | 'start' | 'perfect' | 'starpower'): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    const now = this.audioCtx.currentTime;

    if (type === 'error') {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.connect(gain); gain.connect(this.audioCtx.destination);
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.2);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'start') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const o = this.audioCtx!.createOscillator();
        const g = this.audioCtx!.createGain();
        o.type = 'sine';
        o.connect(g); g.connect(this.audioCtx!.destination);
        o.frequency.setValueAtTime(freq, now + idx * 0.05);
        g.gain.setValueAtTime(0.08, now + idx * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);
        o.start(now + idx * 0.05); o.stop(now + idx * 0.05 + 0.2);
      });
    } else if (type === 'perfect') {
      [1046.50, 1318.51, 1567.98].forEach((freq, idx) => {
        const o = this.audioCtx!.createOscillator();
        const g = this.audioCtx!.createGain();
        o.type = 'sine';
        o.connect(g); g.connect(this.audioCtx!.destination);
        o.frequency.setValueAtTime(freq, now + idx * 0.04);
        g.gain.setValueAtTime(0.06, now + idx * 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.18);
        o.start(now + idx * 0.04); o.stop(now + idx * 0.04 + 0.18);
      });
    }
  }

  showFeedback(msg: string, type: 'success' | 'error' | 'perfect'): void {
    this.feedbackKey.update(k => k + 1);
    this.feedbackMessage.set(msg);
    this.feedbackType.set(type);
    setTimeout(() => this.feedbackMessage.set(null), 900);
  }

  endGame(): void {
    clearInterval(this.timerInterval);
    clearInterval(this.starPowerInterval);
    this.stopMelody();
    this.stopConfetti();
    this.isTimerPaused.set(false);
    this.isPlaying.set(false);
    this.isGameOver.set(true);
    this.saveHighScore();
    this.playUiSound('gameover');
  }

  setDifficulty(d: 'facile' | 'normal' | 'hardcore'): void {
    this.difficulty.set(d);
    this.playUiSound('click');
  }

  shouldShowNoteLabel(): boolean {
    return this.difficulty() !== 'hardcore';
  }

  private getTimeMultiplier(): number {
    switch (this.difficulty()) {
      case 'facile': return 0.8;
      case 'hardcore': return 2.2;
      default: return 1.5;
    }
  }

  private getLivesStart(): number {
    switch (this.difficulty()) {
      case 'facile': return 5;
      case 'hardcore': return 2;
      default: return 3;
    }
  }

  private loadHighScore(): void {
    const saved = localStorage.getItem('fretboard_highscore');
    if (saved) this.highScore.set(parseInt(saved, 10));
  }

  private saveHighScore(): void {
    if (this.score() > this.highScore()) {
      this.highScore.set(this.score());
      localStorage.setItem('fretboard_highscore', this.score().toString());
    }
  }

  getTimerColor(): string {
    const pct = (this.timeLeft() / this.maxTime) * 100;
    if (pct < 20) return 'linear-gradient(90deg, #ef4444, #f59e0b)';
    if (pct < 50) return 'linear-gradient(90deg, #f59e0b, #fbbf24, #10b981)';
    return 'linear-gradient(90deg, #10b981, #06b6d4, #3b82f6)';
  }

  getTimerPercent(): number {
    return (this.timeLeft() / this.maxTime) * 100;
  }

  getStarPowerStars(): number[] {
    return Array.from({ length: 10 }, (_, i) => i);
  }

  isStarFilled(i: number): boolean {
    return this.starPowerGauge() >= (i + 1) * 10;
  }

  ngOnDestroy(): void {
    clearInterval(this.timerInterval);
    clearInterval(this.starPowerInterval);
    this.stopMelody();
    this.stopConfetti();
    this.activeVoices.forEach(v => {
      try { v.source.stop(); } catch {}
    });
    this.activeVoices.clear();
    this.audioBuffers.clear();
    if (this.audioCtx) this.audioCtx.close();
  }
}