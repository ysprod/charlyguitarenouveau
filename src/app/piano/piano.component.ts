import { animate, keyframes, style, transition, trigger, state } from '@angular/animations';
import { Component, OnDestroy, OnInit, signal, computed, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface MelodyChord {
  name: string;
  frenchName: string;
  color: string;
  notes: string[];
  bassNote: string;
}

interface PianoKey {
  index: number;
  note: string;          // ex: "C4"
  frenchNote: string;    // ex: "DO"
  octave: number;
  isBlack: boolean;
  position: number;      // position en % sur le clavier
  width: number;         // largeur relative
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

@Component({
  selector: 'app-piano',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './piano.component.html',
  styleUrls: ['./piano.component.scss'],
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
export class PianoComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  // ═══════════════════════════════════════════════════════
  // CLAVIER DE PIANO — 2 octaves (C3 à C5)
  // ═══════════════════════════════════════════════════════
  readonly pianoKeys: PianoKey[] = [
    // Octave 3
    { index: 0,  note: 'C3',  frenchNote: 'DO',  octave: 3, isBlack: false, position: 0,    width: 100 / 15 },
    { index: 1,  note: 'C#3', frenchNote: 'DO#', octave: 3, isBlack: true,  position: 0.6,  width: 100 / 25 },
    { index: 2,  note: 'D3',  frenchNote: 'RÉ',  octave: 3, isBlack: false, position: 6.6,  width: 100 / 15 },
    { index: 3,  note: 'D#3', frenchNote: 'RÉ#', octave: 3, isBlack: true,  position: 12.6, width: 100 / 25 },
    { index: 4,  note: 'E3',  frenchNote: 'MI',  octave: 3, isBlack: false, position: 13.3, width: 100 / 15 },
    { index: 5,  note: 'F3',  frenchNote: 'FA',  octave: 3, isBlack: false, position: 20,   width: 100 / 15 },
    { index: 6,  note: 'F#3', frenchNote: 'FA#', octave: 3, isBlack: true,  position: 26,   width: 100 / 25 },
    { index: 7,  note: 'G3',  frenchNote: 'SOL', octave: 3, isBlack: false, position: 26.6, width: 100 / 15 },
    { index: 8,  note: 'G#3', frenchNote: 'SOL#',octave: 3, isBlack: true,  position: 32.6, width: 100 / 25 },
    { index: 9,  note: 'A3',  frenchNote: 'LA',  octave: 3, isBlack: false, position: 33.3, width: 100 / 15 },
    { index: 10, note: 'A#3', frenchNote: 'LA#', octave: 3, isBlack: true,  position: 39.3, width: 100 / 25 },
    { index: 11, note: 'B3',  frenchNote: 'SI',  octave: 3, isBlack: false, position: 40,   width: 100 / 15 },
    // Octave 4
    { index: 12, note: 'C4',  frenchNote: 'DO',  octave: 4, isBlack: false, position: 46.6, width: 100 / 15 },
    { index: 13, note: 'C#4', frenchNote: 'DO#', octave: 4, isBlack: true,  position: 53,   width: 100 / 25 },
    { index: 14, note: 'D4',  frenchNote: 'RÉ',  octave: 4, isBlack: false, position: 53.3, width: 100 / 15 },
    { index: 15, note: 'D#4', frenchNote: 'RÉ#', octave: 4, isBlack: true,  position: 59.3, width: 100 / 25 },
    { index: 16, note: 'E4',  frenchNote: 'MI',  octave: 4, isBlack: false, position: 60,   width: 100 / 15 },
    { index: 17, note: 'F4',  frenchNote: 'FA',  octave: 4, isBlack: false, position: 66.6, width: 100 / 15 },
    { index: 18, note: 'F#4', frenchNote: 'FA#', octave: 4, isBlack: true,  position: 73,   width: 100 / 25 },
    { index: 19, note: 'G4',  frenchNote: 'SOL', octave: 4, isBlack: false, position: 73.3, width: 100 / 15 },
    { index: 20, note: 'G#4', frenchNote: 'SOL#',octave: 4, isBlack: true,  position: 79.3, width: 100 / 25 },
    { index: 21, note: 'A4',  frenchNote: 'LA',  octave: 4, isBlack: false, position: 80,   width: 100 / 15 },
    { index: 22, note: 'A#4', frenchNote: 'LA#', octave: 4, isBlack: true,  position: 86,   width: 100 / 25 },
    { index: 23, note: 'B4',  frenchNote: 'SI',  octave: 4, isBlack: false, position: 86.6, width: 100 / 15 },
    // Fin : C5
    { index: 24, note: 'C5',  frenchNote: 'DO',  octave: 5, isBlack: false, position: 93.3, width: 100 / 15 }
  ];

  // Notes blanches uniquement pour le jeu (DO RÉ MI FA SOL LA SI)
  readonly whiteNotesList = ['DO', 'RÉ', 'MI', 'FA', 'SOL', 'LA', 'SI'];

  // Couleurs par note (chromesthésie pour aider le joueur)
  readonly noteColors: Record<string, string> = {
    'DO': '#FF3366',   // Rouge
    'DO#': '#FF3366',
    'RÉ': '#FFD700',   // Or
    'RÉ#': '#FFD700',
    'MI': '#00D4FF',   // Cyan
    'FA': '#FF6B35',   // Orange
    'FA#': '#FF6B35',
    'SOL': '#00FF88',  // Vert
    'SOL#': '#00FF88',
    'LA': '#B266FF',   // Violet
    'LA#': '#B266FF',
    'SI': '#FF8CC8'    // Rose
  };

  // Signals de base
  score = signal<number>(0);
  combo = signal<number>(0);
  maxCombo = signal<number>(0);
  lives = signal<number>(3);
  targetNote = signal<string>('');
  targetOctave = signal<number>(4);
  timeLeft = signal<number>(200);
  isPlaying = signal<boolean>(false);
  isGameOver = signal<boolean>(false);
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

  // Feedback & UI
  feedbackMessage = signal<string | null>(null);
  feedbackType = signal<'success' | 'error' | 'perfect'>('success');
  feedbackKey = signal<number>(0);
  highScore = signal<number>(0);
  difficulty = signal<'facile' | 'normal' | 'hardcore'>('normal');
  screenShake = signal<boolean>(false);
  comboFlashKey = signal<number>(0);

  // Particules
  particles = signal<Particle[]>([]);
  correctKeyIndex = signal<number>(-1);
  hitEffects = signal<{ id: number; keyIndex: number }[]>([]);

  // Mélodie des Origines
  melodyPlaying = signal<boolean>(false);
  melodyChordIndex = signal<number>(-1);
  melodyChordName = signal<string>('');
  melodyChordFrench = signal<string>('');
  melodyChordColor = signal<string>('#FFD700');

  readonly melodieOrigines: MelodyChord[] = [
    { name: 'Am', frenchName: 'La mineur', color: '#B266FF', notes: ['A3', 'C4', 'E4'], bassNote: 'A2' },
    { name: 'Dm', frenchName: 'Ré mineur', color: '#00D4FF', notes: ['D4', 'F4', 'A4'], bassNote: 'D3' },
    { name: 'F',  frenchName: 'Fa majeur', color: '#FFD700', notes: ['F4', 'A4', 'C5'], bassNote: 'F3' },
    { name: 'G',  frenchName: 'Sol majeur', color: '#00FF88', notes: ['G4', 'B4', 'D5'], bassNote: 'G3' }
  ];

  private timerInterval: any;
  private starPowerInterval: any;
  private readonly maxTime = 200;
  private isMelodyPlaying = false;
  private melodyTimeoutIds: any[] = [];
  private particleId = 0;
  private effectId = 0;

  // Audio
  private audioCtx?: AudioContext;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private isAudioReady = false;
  private readonly pianoBasePath = 'assets/audio/piano/';
  private readonly pianoSamples: Record<string, string> = {
    'C3': 'C3.ogg', 'D#3': 'Ds3.ogg', 'F#3': 'Fs3.ogg', 'A3': 'A3.ogg',
    'C4': 'C4.ogg', 'D#4': 'Ds4.ogg', 'F#4': 'Fs4.ogg', 'A4': 'A4.ogg',
    'C5': 'C5.ogg'
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
    const promises = Object.entries(this.pianoSamples).map(async ([note, file]) => {
      try {
        const response = await fetch(this.pianoBasePath + file);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioCtx!.decodeAudioData(arrayBuffer);
        this.audioBuffers.set(note, audioBuffer);
      } catch (err) {
        console.warn(`Impossible de charger ${file}:`, err);
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

  private playNoteWithTransposition(toneNote: string, duration = 1.0, volume = 0.8, delaySeconds = 0): void {
    if (!this.audioCtx || !this.isAudioReady) return;

    const targetMidi = this.noteToMidiIndex(toneNote);
    let closest: { note: string; buffer: AudioBuffer; distance: number } | null = null;

    this.audioBuffers.forEach((buffer, note) => {
      const sampleMidi = this.noteToMidiIndex(note);
      const distance = Math.abs(sampleMidi - targetMidi);
      if (!closest || distance < closest.distance) {
        closest = { note, buffer, distance };
      }
    });

    if (!closest) return;

    const sampleMidi = this.noteToMidiIndex((closest as any).note);
    const playbackRate = Math.pow(2, (targetMidi - sampleMidi) / 12);

    const source = this.audioCtx.createBufferSource();
    source.buffer = (closest as any).buffer;
    source.playbackRate.value = playbackRate;

    const gain = this.audioCtx.createGain();
    const startTime = this.audioCtx.currentTime + delaySeconds;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
    gain.gain.setValueAtTime(volume, startTime + duration - 0.15);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    source.connect(gain);
    gain.connect(this.audioCtx.destination);
    source.start(startTime);
    source.stop(startTime + duration + 0.05);
  }

  /* ═══════════════════════════════════════════════════════
     LOGIQUE DU JEU
     ═══════════════════════════════════════════════════════ */
  async startGame(): Promise<void> {
    await this.ensureAudioContextRunning();
    this.stopMelody();
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
      this.timeLeft.update(t => t - this.getTimeMultiplier());
      if (this.timeLeft() <= 0) this.handleMiss(true);
    }, 100);
  }

  nextRound(): void {
    // Choisir une note dans la plage C4 → C5 (octave centrale) pour rester simple
    const randomIndex = Math.floor(Math.random() * this.whiteNotesList.length);
    this.targetNote.set(this.whiteNotesList[randomIndex]);
    // Octave 4 (sauf DO qui peut être C4 ou C5 — ici on force C4 pour simplifier)
    this.targetOctave.set(4);
    this.correctKeyIndex.set(-1);
    this.startTimer();
  }

  onKeyClick(key: PianoKey): void {
    if (!this.isPlaying()) return;

    this.playNoteWithTransposition(key.note, 1.0, 0.85);

    // Correspondance : la note française ET l'octave doivent matcher
    const targetFullNote = this.targetNote() + this.targetOctave();
    const keyFullNote = key.frenchNote + key.octave;

    // Tolérance : DO4, DO5, RÉ4, MI4, FA4, SOL4, LA4, SI4
    // On accepte l'octave 4 pour toutes les notes
    if (key.frenchNote === this.targetNote() && key.octave === this.targetOctave()) {
      this.handleSuccess(key.index);
    } else {
      this.handleMiss(false);
    }
  }

  handleSuccess(keyIndex: number): void {
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

    this.correctKeyIndex.set(keyIndex);
    this.triggerParticles(keyIndex);
    this.triggerHitEffect(keyIndex);
    this.playNoteWithTransposition('C5', 0.3, 0.4);

    const isPerfect = this.timeLeft() > this.maxTime * 0.75;
    const comboText = this.effectiveMultiplier() > 1 ? ` x${this.effectiveMultiplier()}` : '';
    if (isPerfect) {
      this.showFeedback(`PARFAIT ! +${basePoints}${comboText}`, 'perfect');
      this.playUiSound('perfect');
    } else {
      this.showFeedback(`BIEN ! +${basePoints}${comboText}`, 'success');
    }

    // 🎼 MÉLODIE DES ORIGINES à chaque 7 notes
    if (this.combo() > 0 && this.combo() % 7 === 0) {
      this.playMelodieDesOrigines();
    }

    if (this.combo() > 0 && this.combo() % 10 === 0) {
      this.triggerScreenShake();
    }

    this.nextRound();
  }

  handleMiss(isTimeout: boolean): void {
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
     MÉLODIE DES ORIGINES
     ═══════════════════════════════════════════════════════ */
  private async playMelodieDesOrigines(): Promise<void> {
    if (this.isMelodyPlaying || !this.isAudioReady) return;
    await this.ensureAudioContextRunning();

    this.isMelodyPlaying = true;
    this.melodyPlaying.set(true);

    const chordSpacing = 1.2;
    this.showFeedback('✨ MÉLODIE DES ORIGINES ✨', 'perfect');

    this.melodieOrigines.forEach((chord, i) => {
      const delay = i * chordSpacing;
      const timeout = setTimeout(() => {
        this.melodyChordIndex.set(i);
        this.melodyChordName.set(chord.name);
        this.melodyChordFrench.set(chord.frenchName);
        this.melodyChordColor.set(chord.color);
      }, delay * 1000);
      this.melodyTimeoutIds.push(timeout);

      this.playNoteWithTransposition(chord.bassNote, 1.4, 0.6, delay);
      chord.notes.forEach((note, nIdx) => {
        this.playNoteWithTransposition(note, 1.1, 0.5, delay + nIdx * 0.04);
      });
    });

    const totalDuration = this.melodieOrigines.length * chordSpacing + 1.2;
    const endTimeout = setTimeout(() => {
      this.stopMelody();
      this.showFeedback('🌟 OFFOLOMOU 🌟', 'perfect');
    }, totalDuration * 1000);
    this.melodyTimeoutIds.push(endTimeout);
  }

  private stopMelody(): void {
    this.melodyTimeoutIds.forEach(id => clearTimeout(id));
    this.melodyTimeoutIds = [];
    this.isMelodyPlaying = false;
    this.melodyPlaying.set(false);
    this.melodyChordIndex.set(-1);
  }

  /* ═══════════════════════════════════════════════════════
     CALCUL DES NOTES
     ═══════════════════════════════════════════════════════ */
  getKeyColor(key: PianoKey): string {
    return this.noteColors[key.frenchNote] || '#FFFFFF';
  }

  isHit(keyIndex: number): boolean {
    return this.hitEffects().some(e => e.keyIndex === keyIndex);
  }

  /* ═══════════════════════════════════════════════════════
     EFFETS VISUELS
     ═══════════════════════════════════════════════════════ */
  triggerParticles(keyIndex: number): void {
    const key = this.pianoKeys.find(k => k.index === keyIndex);
    if (!key) return;

    const newParticles: Particle[] = Array.from({ length: 16 }, () => ({
      id: this.particleId++,
      x: key.position + key.width / 2,
      y: key.isBlack ? 30 : 60,
      color: this.getKeyColor(key),
      size: Math.random() * 8 + 4,
      rotation: Math.random() * 360
    }));
    this.particles.update(p => [...p, ...newParticles]);
    setTimeout(() => {
      this.particles.update(p => p.filter(x => !newParticles.find(n => n.id === x.id)));
    }, 1200);
  }

  triggerHitEffect(keyIndex: number): void {
    const id = this.effectId++;
    this.hitEffects.update(e => [...e, { id, keyIndex }]);
    setTimeout(() => {
      this.hitEffects.update(e => e.filter(x => x.id !== id));
    }, 700);
  }

  triggerScreenShake(): void {
    this.screenShake.set(true);
    setTimeout(() => this.screenShake.set(false), 300);
  }

  /* ═══════════════════════════════════════════════════════
     UI SOUNDS
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
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'start') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const o = this.audioCtx!.createOscillator();
        const g = this.audioCtx!.createGain();
        o.type = 'triangle';
        o.connect(g); g.connect(this.audioCtx!.destination);
        o.frequency.setValueAtTime(freq, now + idx * 0.06);
        g.gain.setValueAtTime(0.15, now + idx * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
        o.start(now + idx * 0.06); o.stop(now + idx * 0.06 + 0.25);
      });
    } else if (type === 'perfect') {
      [1046.50, 1318.51, 1567.98].forEach((freq, idx) => {
        const o = this.audioCtx!.createOscillator();
        const g = this.audioCtx!.createGain();
        o.type = 'sine';
        o.connect(g); g.connect(this.audioCtx!.destination);
        o.frequency.setValueAtTime(freq, now + idx * 0.04);
        g.gain.setValueAtTime(0.1, now + idx * 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.2);
        o.start(now + idx * 0.04); o.stop(now + idx * 0.04 + 0.2);
      });
    } else if (type === 'starpower') {
      [392, 523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const o = this.audioCtx!.createOscillator();
        const g = this.audioCtx!.createGain();
        o.type = 'square';
        o.connect(g); g.connect(this.audioCtx!.destination);
        o.frequency.setValueAtTime(freq, now + idx * 0.05);
        g.gain.setValueAtTime(0.08, now + idx * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.3);
        o.start(now + idx * 0.05); o.stop(now + idx * 0.05 + 0.3);
      });
    }
  }

  showFeedback(msg: string, type: 'success' | 'error' | 'perfect'): void {
    this.feedbackKey.update(k => k + 1);
    this.feedbackMessage.set(msg);
    this.feedbackType.set(type);
    setTimeout(() => this.feedbackMessage.set(null), 900);
  }

  /* ═══════════════════════════════════════════════════════
     GAME OVER & UTILS
     ═══════════════════════════════════════════════════════ */
  endGame(): void {
    clearInterval(this.timerInterval);
    clearInterval(this.starPowerInterval);
    this.stopMelody();
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
    const saved = localStorage.getItem('pianohero_highscore');
    if (saved) this.highScore.set(parseInt(saved, 10));
  }

  private saveHighScore(): void {
    if (this.score() > this.highScore()) {
      this.highScore.set(this.score());
      localStorage.setItem('pianohero_highscore', this.score().toString());
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

  // Notes blanches uniquement pour le rendu
  get whiteKeys(): PianoKey[] {
    return this.pianoKeys.filter(k => !k.isBlack);
  }

  get blackKeys(): PianoKey[] {
    return this.pianoKeys.filter(k => k.isBlack);
  }

  goToPlay(): void {
    this.router.navigate(['/play']);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerInterval);
    clearInterval(this.starPowerInterval);
    this.stopMelody();
    this.audioBuffers.clear();
    if (this.audioCtx) this.audioCtx.close();
  }
}