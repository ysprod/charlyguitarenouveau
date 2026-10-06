import {
  Component, OnInit, OnDestroy, signal, computed, inject,
  ChangeDetectionStrategy, HostListener, ElementRef, ViewChild,
  AfterViewInit, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PianoKey } from '../models/piano.model';
import { PianoAudioService } from '../services/piano-audio.service';

const AZERTY_MAP: Record<string, string> = {
  q: 'C3', s: 'C#3', d: 'D3', f: 'D#3', g: 'E3',
  h: 'F3', j: 'F#3', k: 'G3', l: 'G#3', m: 'A3',
  w: 'C#3', x: 'D#3', c: 'F#3', v: 'G#3', b: 'A#3',
};

export interface RecordedNote {
  note: string;
  time: number;      // ms depuis le début
  duration: number;  // ms
}

export interface SavedSong {
  id: string;
  title: string;
  date: string;
  bpm: number;
  notes: RecordedNote[];
}

/** Figure rythmique selon la durée en ms (base = noire à 120 BPM ≈ 500ms) */
export type NoteDuration = 'whole' | 'half' | 'quarter' | 'eighth';

export interface RenderedSheetNote {
  id: number;
  note: string;
  pitch: string;
  octave: number;
  isSharp: boolean;
  clef: 'treble' | 'bass';
  y: number;
  stemDirection: 'up' | 'down';
  hasLedgerLine: boolean;
  ledgerY?: number;
  duration: NoteDuration;
  filled: boolean;
  hasFlag: boolean;
}

const DIATONIC_STEPS: Record<string, number> = {
  'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6
};

const STORAGE_KEY = 'charly_piano_song_v2';

@Component({
  selector: 'app-pianovirtuel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pianovirtuel.component.html',
  styleUrl: './pianovirtuel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PianovirtuelComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  readonly audio = inject(PianoAudioService);

  @ViewChild('particleCanvas') particleCanvas!: ElementRef<HTMLCanvasElement>;
  private ctxCanvas!: CanvasRenderingContext2D | null;
  private animFrameId: number | null = null;
  private particles: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; color: string }> = [];

  // ── CLAVIER ──────────────────────────────────────────────
  readonly pianoKeys: PianoKey[] = [
    { index: 0, note: 'C3', frenchNote: 'DO', octave: 3, isBlack: false, whiteIndex: 0 },
    { index: 1, note: 'C#3', frenchNote: 'DO#', octave: 3, isBlack: true, whiteIndex: 0 },
    { index: 2, note: 'D3', frenchNote: 'RÉ', octave: 3, isBlack: false, whiteIndex: 1 },
    { index: 3, note: 'D#3', frenchNote: 'RÉ#', octave: 3, isBlack: true, whiteIndex: 1 },
    { index: 4, note: 'E3', frenchNote: 'MI', octave: 3, isBlack: false, whiteIndex: 2 },
    { index: 5, note: 'F3', frenchNote: 'FA', octave: 3, isBlack: false, whiteIndex: 3 },
    { index: 6, note: 'F#3', frenchNote: 'FA#', octave: 3, isBlack: true, whiteIndex: 3 },
    { index: 7, note: 'G3', frenchNote: 'SOL', octave: 3, isBlack: false, whiteIndex: 4 },
    { index: 8, note: 'G#3', frenchNote: 'SOL#', octave: 3, isBlack: true, whiteIndex: 4 },
    { index: 9, note: 'A3', frenchNote: 'LA', octave: 3, isBlack: false, whiteIndex: 5 },
    { index: 10, note: 'A#3', frenchNote: 'LA#', octave: 3, isBlack: true, whiteIndex: 5 },
    { index: 11, note: 'B3', frenchNote: 'SI', octave: 3, isBlack: false, whiteIndex: 6 },
    { index: 12, note: 'C4', frenchNote: 'DO', octave: 4, isBlack: false, whiteIndex: 7 },
    { index: 13, note: 'C#4', frenchNote: 'DO#', octave: 4, isBlack: true, whiteIndex: 7 },
    { index: 14, note: 'D4', frenchNote: 'RÉ', octave: 4, isBlack: false, whiteIndex: 8 },
    { index: 15, note: 'D#4', frenchNote: 'RÉ#', octave: 4, isBlack: true, whiteIndex: 8 },
    { index: 16, note: 'E4', frenchNote: 'MI', octave: 4, isBlack: false, whiteIndex: 9 },
    { index: 17, note: 'F4', frenchNote: 'FA', octave: 4, isBlack: false, whiteIndex: 10 },
    { index: 18, note: 'F#4', frenchNote: 'FA#', octave: 4, isBlack: true, whiteIndex: 10 },
    { index: 19, note: 'G4', frenchNote: 'SOL', octave: 4, isBlack: false, whiteIndex: 11 },
    { index: 20, note: 'G#4', frenchNote: 'SOL#', octave: 4, isBlack: true, whiteIndex: 11 },
    { index: 21, note: 'A4', frenchNote: 'LA', octave: 4, isBlack: false, whiteIndex: 12 },
    { index: 22, note: 'A#4', frenchNote: 'LA#', octave: 4, isBlack: true, whiteIndex: 12 },
    { index: 23, note: 'B4', frenchNote: 'SI', octave: 4, isBlack: false, whiteIndex: 13 },
    { index: 24, note: 'C5', frenchNote: 'DO', octave: 5, isBlack: false, whiteIndex: 14 },
  ];

  readonly whiteKeys = computed(() => this.pianoKeys.filter(k => !k.isBlack));
  readonly blackKeys = computed(() => this.pianoKeys.filter(k => k.isBlack));
  readonly pressedNotes = signal<Set<string>>(new Set());

  // ── MÉTRONOME ────────────────────────────────────────────
  readonly bpm = signal<number>(120);
  readonly isMetronomeActive = signal<boolean>(false);
  readonly metronomeBeat = signal<number>(0);
  readonly beatsPerMeasure = signal<number>(4);
  private metronomeTimer: ReturnType<typeof setInterval> | null = null;
  private audioCtx: AudioContext | null = null;

  // ── PARTITION ────────────────────────────────────────────
  readonly activeSheetNotes = signal<RenderedSheetNote[]>([]);
  private nextNoteId = 0;

  // ── ENREGISTREMENT ───────────────────────────────────────
  readonly isRecording = signal<boolean>(false);
  readonly isPlayingBack = signal<boolean>(false);
  readonly recordedNotes = signal<RecordedNote[]>([]);
  readonly savedSong = signal<SavedSong | null>(null);
  private recordStartTime = 0;
  private noteStartTimes = new Map<string, number>(); // note -> timestamp de départ

  private readonly pointerToNote = new Map<number, string>();
  private readonly keyboardPressed = new Set<string>();
  private audioUnlocked = false;

  constructor() {
    effect(() => {
      if (this.isMetronomeActive()) this.startMetronomeLoop();
      else this.stopMetronomeLoop();
    });
  }

  ngOnInit(): void {
    void this.audio.init();
    this.loadSavedSong();
  }

  ngAfterViewInit(): void {
    this.initCanvas();
  }

  ngOnDestroy(): void {
    this.stopMetronomeLoop();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.pointerToNote.clear();
    this.keyboardPressed.clear();
    this.audio.allNotesOff();
  }

  // ═══════════════════════════════════════════════════════
  // CANVAS PARTICULES
  // ═══════════════════════════════════════════════════════
  private initCanvas(): void {
    const canvas = this.particleCanvas.nativeElement;
    this.ctxCanvas = canvas.getContext('2d');
    this.resizeCanvas();
    this.renderParticles();
  }

  @HostListener('window:resize')
  resizeCanvas(): void {
    if (!this.particleCanvas) return;
    const canvas = this.particleCanvas.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  private triggerKeyParticles(event: PointerEvent): void {
    if (!this.ctxCanvas) return;
    const { clientX: x, clientY: y } = event;
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 9,
        vy: (Math.random() - 1) * 6 - 2,
        alpha: 1,
        color: Math.random() > 0.5 ? '#00f2fe' : '#ff0080',
      });
    }
  }

  private renderParticles = (): void => {
    const ctx = this.ctxCanvas;
    if (ctx) {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx; p.y += p.vy; p.alpha -= 0.02;
        if (p.alpha <= 0) { this.particles.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.fill();
      }
    }
    this.animFrameId = requestAnimationFrame(this.renderParticles);
  };

  // ═══════════════════════════════════════════════════════
  // MÉTRONOME
  // ═══════════════════════════════════════════════════════
  toggleMetronome(): void { this.isMetronomeActive.update(v => !v); }

  updateBpm(delta: number): void {
    this.bpm.update(b => Math.min(240, Math.max(40, b + delta)));
    if (this.isMetronomeActive()) this.startMetronomeLoop();
  }

  private startMetronomeLoop(): void {
    this.stopMetronomeLoop();
    const intervalMs = (60 / this.bpm()) * 1000;
    this.metronomeTimer = setInterval(() => {
      this.metronomeBeat.update(b => (b % this.beatsPerMeasure()) + 1);
      this.playClickSound(this.metronomeBeat() === 1);
    }, intervalMs);
  }

  private stopMetronomeLoop(): void {
    if (this.metronomeTimer) { clearInterval(this.metronomeTimer); this.metronomeTimer = null; }
    this.metronomeBeat.set(0);
  }

  private playClickSound(isHighPitch: boolean): void {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.frequency.value = isHighPitch ? 1200 : 800;
    gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);
    osc.connect(gain); gain.connect(this.audioCtx.destination);
    osc.start(); osc.stop(this.audioCtx.currentTime + 0.05);
  }

  // ═══════════════════════════════════════════════════════
  // ENREGISTREMENT / SAUVEGARDE (1 SEUL SLOT)
  // ═══════════════════════════════════════════════════════
  toggleRecording(): void {
    if (this.isRecording()) {
      this.isRecording.set(false);
      this.finalizeDurations();
    } else {
      this.recordedNotes.set([]);
      this.noteStartTimes.clear();
      this.recordStartTime = performance.now();
      this.isRecording.set(true);
    }
  }

  /** Convertit les timestamps de noteOn en durées réelles */
  private finalizeDurations(): void {
    const now = performance.now();
    this.recordedNotes.update(notes =>
      notes.map(n => ({
        ...n,
        duration: n.duration > 0 ? n.duration : (now - this.recordStartTime - n.time),
      }))
    );
  }

  /** Sauvegarde l'unique slot (remplace l'ancien) */
  saveCurrentRecording(): void {
    const notes = this.recordedNotes();
    if (notes.length === 0) return;

    const song: SavedSong = {
      id: 'session-' + Date.now(),
      title: 'Ma composition',
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      bpm: this.bpm(),
      notes: [...notes],
    };

    this.savedSong.set(song);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(song));
    this.renderSheetFromSong(song);
  }

  loadSavedSong(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const song = JSON.parse(stored) as SavedSong;
      this.savedSong.set(song);
    } catch (e) {
      console.error('Lecture sauvegarde impossible', e);
    }
  }

  deleteSavedSong(): void {
    this.savedSong.set(null);
    localStorage.removeItem(STORAGE_KEY);
    this.clearSheet();
  }

  /** Recharge la partition avec les durées enregistrées */
  private renderSheetFromSong(song: SavedSong): void {
    this.activeSheetNotes.set([]);
    this.nextNoteId = 0;
    for (const n of song.notes) {
      this.addNoteToSheet(n.note, n.duration);
    }
  }

  playSavedSong(): void {
    const song = this.savedSong();
    if (!song || this.isPlayingBack()) return;
    this.isPlayingBack.set(true);

    this.clearSheet();
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let maxTime = 0;

    for (const item of song.notes) {
      const startDelay = item.time;
      const dur = Math.max(80, item.duration);
      maxTime = Math.max(maxTime, startDelay + dur + 100);

      timeouts.push(setTimeout(() => {
        this.audio.noteOn(item.note);
        this.markPressed(item.note, true);
        this.addNoteToSheet(item.note, dur);

        timeouts.push(setTimeout(() => {
          this.audio.noteOff(item.note);
          this.markPressed(item.note, false);
        }, dur));
      }, startDelay));
    }

    setTimeout(() => this.isPlayingBack.set(false), maxTime);
  }

  // ═══════════════════════════════════════════════════════
  // EXPORT / IMPRESSION
  // ═══════════════════════════════════════════════════════
  printSheet(): void { window.print(); }
  clearSheet(): void { this.activeSheetNotes.set([]); this.nextNoteId = 0; }

  // ═══════════════════════════════════════════════════════
  // INTERACTIONS CLAVIER
  // ═══════════════════════════════════════════════════════
  onPointerDown(key: PianoKey, event: PointerEvent): void {
    if (!this.audioUnlocked) {
      this.audioUnlocked = true;
      void this.audio.unlock();
    }
    this.triggerKeyParticles(event);
    this.audio.noteOn(key.note);
    this.pointerToNote.set(event.pointerId, key.note);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    this.markPressed(key.note, true);
    this.addNoteToSheet(key.note);
    this.captureNoteStart(key.note);
  }

  onPointerUp(event: PointerEvent): void {
    const note = this.pointerToNote.get(event.pointerId);
    if (!note) return;
    this.pointerToNote.delete(event.pointerId);
    this.audio.noteOff(note);
    this.markPressed(note, false);
    this.captureNoteEnd(note);
  }

  onPointerCancel(event: PointerEvent): void { this.onPointerUp(event); }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;
    const note = AZERTY_MAP[event.key.toLowerCase()];
    if (!note || this.keyboardPressed.has(note)) return;
    event.preventDefault();
    this.keyboardPressed.add(note);
    this.audio.noteOn(note);
    this.markPressed(note, true);
    this.addNoteToSheet(note);
    this.captureNoteStart(note);
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    const note = AZERTY_MAP[event.key.toLowerCase()];
    if (!note || !this.keyboardPressed.has(note)) return;
    this.keyboardPressed.delete(note);
    this.audio.noteOff(note);
    this.markPressed(note, false);
    this.captureNoteEnd(note);
  }

  @HostListener('window:blur')
  onWindowBlur(): void {
    this.pointerToNote.clear();
    this.keyboardPressed.clear();
    this.pressedNotes.set(new Set());
    this.audio.allNotesOff();
  }

  // ═══════════════════════════════════════════════════════
  // CAPTURE DURÉE POUR L'ENREGISTREMENT
  // ═══════════════════════════════════════════════════════
  private captureNoteStart(note: string): void {
    if (!this.isRecording()) return;
    const t = performance.now() - this.recordStartTime;
    this.noteStartTimes.set(note, t);
    this.recordedNotes.update(notes => [
      ...notes,
      { note, time: t, duration: 0 },
    ]);
  }

  private captureNoteEnd(note: string): void {
    if (!this.isRecording()) return;
    const start = this.noteStartTimes.get(note);
    if (start === undefined) return;
    const dur = performance.now() - this.recordStartTime - start;
    this.noteStartTimes.delete(note);

    this.recordedNotes.update(notes => {
      const copy = [...notes];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].note === note && copy[i].duration === 0) {
          copy[i] = { ...copy[i], duration: Math.max(80, dur) };
          break;
        }
      }
      return copy;
    });
  }

  // ═══════════════════════════════════════════════════════
  // RENDU DE LA PARTITION
  // ═══════════════════════════════════════════════════════
  /** Détermine la figure rythmique selon la durée ms et le BPM courant */
  private durationToFigure(durationMs: number): NoteDuration {
    const quarterMs = (60_000 / this.bpm()); // noire
    const ratio = durationMs / quarterMs;
    if (ratio >= 3.2) return 'whole';
    if (ratio >= 1.6) return 'half';
    if (ratio >= 0.7) return 'quarter';
    return 'eighth';
  }

  private addNoteToSheet(noteStr: string, durationMs?: number): void {
    const match = noteStr.match(/^([A-G])(#?)(\d)$/);
    if (!match) return;

    const [, pitch, sharp, octStr] = match;
    const octave = parseInt(octStr, 10);
    const isSharp = sharp === '#';

    const isTreble = octave >= 4;
    const clef: 'treble' | 'bass' = isTreble ? 'treble' : 'bass';

    const baseStep = DIATONIC_STEPS[pitch] ?? 0;
    const totalDiatonicStep = (octave - 4) * 7 + baseStep;

    let y: number;
    if (isTreble) y = 70 - (totalDiatonicStep - 6) * 6;
    else y = 142 - (totalDiatonicStep - (-6)) * 6;

    const stemDirection: 'up' | 'down' =
      isTreble ? (totalDiatonicStep >= 6 ? 'down' : 'up')
               : (totalDiatonicStep >= -6 ? 'down' : 'up');

    const hasLedgerLine = noteStr === 'C4';
    const ledgerY = hasLedgerLine ? 106 : undefined;

    const durationFig: NoteDuration = durationMs !== undefined
      ? this.durationToFigure(durationMs)
      : 'quarter';

    const filled = durationFig === 'quarter' || durationFig === 'eighth';
    const hasFlag = durationFig === 'eighth';

    const renderedNote: RenderedSheetNote = {
      id: this.nextNoteId++,
      note: noteStr,
      pitch, octave, isSharp, clef, y, stemDirection,
      hasLedgerLine, ledgerY,
      duration: durationFig,
      filled,
      hasFlag,
    };

    // Capacité : 15 notes max sur la portée
    this.activeSheetNotes.update(list => [...list.slice(-14), renderedNote]);
  }

  isPressed(note: string): boolean { return this.pressedNotes().has(note); }

  private markPressed(note: string, pressed: boolean): void {
    this.pressedNotes.update(set => {
      const next = new Set(set);
      if (pressed) next.add(note); else next.delete(note);
      return next;
    });
  }

  // ── Helpers template ─────────────────────────────────────
  frenchPitch(pitch: string): string {
    switch (pitch) {
      case 'C': return 'DO'; case 'D': return 'RÉ'; case 'E': return 'MI';
      case 'F': return 'FA'; case 'G': return 'SOL'; case 'A': return 'LA';
      default: return 'SI';
    }
  }

  toggleMute(): void { this.audio.toggleMute(); }
  goBack(): void { this.router.navigate(['/play']); }
}