import {
  Component, OnInit, OnDestroy, signal, computed, inject,
  ChangeDetectionStrategy, HostListener, ElementRef, ViewChild,
  AfterViewInit, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PianoAudioService, InstrumentType } from 'src/app/services/piano-audio.service';
import { PianoKey } from 'src/app/models/piano.model';

/* ═════════════════════════════════════════════════════════════════════
   CONSTANTES
   ═════════════════════════════════════════════════════════════════════ */
const AZERTY_MAP: Record<string, string> = {
  q: 'C3', s: 'C#3', d: 'D3', f: 'D#3', g: 'E3',
  h: 'F3', j: 'F#3', k: 'G3', l: 'G#3', m: 'A3',
  w: 'C#3', x: 'D#3', c: 'F#3', v: 'G#3', b: 'A#3',
};

const PIANO_KEYS_DATA: PianoKey[] = [
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
  { index: 24, note: 'C5',  frenchNote: 'DO',   octave: 5, isBlack: false, whiteIndex: 14 },
];

const STORAGE_KEY = 'charly_piano_song_v2';
const SOUND_PREF_KEY = 'piano_sound_enabled';

/* ═════════════════════════════════════════════════════════════════════
   INTERFACES
   ═════════════════════════════════════════════════════════════════════ */
export interface RecordedNote {
  note: string;
  time: number;
  duration: number;
}

export interface SavedSong {
  id: string;
  title: string;
  date: string;
  bpm: number;
  notes: RecordedNote[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
}

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */
@Component({
  selector: 'app-pianovirtuel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pianovirtuel.component.html',
  styleUrl: './pianovirtuel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PianovirtuelComponent implements OnInit, AfterViewInit, OnDestroy {

  /* ─── Dépendances ─── */
  private readonly router = inject(Router);
  readonly audio = inject(PianoAudioService);

  @ViewChild('particleCanvas') particleCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pianoScroll') pianoScroll?: ElementRef<HTMLDivElement>;

  /* ═══════════════════════════════════════════════════════════════════
     CANVAS PARTICULES
     ═══════════════════════════════════════════════════════════════════ */
  private ctxCanvas: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private particles: Particle[] = [];
  private canvasWidth = 0;
  private canvasHeight = 0;

  /* ═══════════════════════════════════════════════════════════════════
     INSTRUMENTS
     ═══════════════════════════════════════════════════════════════════ */
  readonly instruments: { type: InstrumentType; label: string }[] = [
    { type: 'piano',       label: '🎹 Piano' },
    { type: 'organ',       label: '⛪ Orgue' },
    { type: 'strings',     label: '🎻 Cordes' },
    { type: 'harpsichord', label: '🎼 Clavecin' },
    { type: 'synth',       label: '🎛 Synthé' },
    { type: 'trumpet',     label: '🎺 Trompette' },
    { type: 'eguitar',     label: '🎸 Guitare élec.' },
    { type: 'bells',       label: '🔔 Cloches' },
    { type: 'flute',       label: '🪈 Flûte' },
    { type: 'sax',         label: '🎷 Saxophone' },
  ];

  /* ═══════════════════════════════════════════════════════════════════
     CLAVIER
     ═══════════════════════════════════════════════════════════════════ */
  readonly pianoKeys: PianoKey[] = PIANO_KEYS_DATA;
  readonly whiteKeys = computed(() => this.pianoKeys.filter(k => !k.isBlack));
  readonly blackKeys = computed(() => this.pianoKeys.filter(k => k.isBlack));
  readonly pressedNotes = signal<Set<string>>(new Set());

  /* ═══════════════════════════════════════════════════════════════════
     MÉTRONOME
     ═══════════════════════════════════════════════════════════════════ */
  readonly bpm = signal<number>(120);
  readonly isMetronomeActive = signal<boolean>(false);
  readonly metronomeBeat = signal<number>(0);
  readonly beatsPerMeasure = signal<number>(4);
  readonly beatArray = [1, 2, 3, 4];
  private metronomeTimer: ReturnType<typeof setInterval> | null = null;
  private audioCtx: AudioContext | null = null;

  /* ═══════════════════════════════════════════════════════════════════
     ENREGISTREMENT
     ═══════════════════════════════════════════════════════════════════ */
  readonly isRecording = signal<boolean>(false);
  readonly isPlayingBack = signal<boolean>(false);
  readonly recordedNotes = signal<RecordedNote[]>([]);
  readonly savedSong = signal<SavedSong | null>(null);
  private recordStartTime = 0;
  private noteStartTimes = new Map<string, number>();
  private playbackTimeouts: ReturnType<typeof setTimeout>[] = [];

  /* ═══════════════════════════════════════════════════════════════════
     GESTION CLAVIER / POINTER
     ═══════════════════════════════════════════════════════════════════ */
  private readonly pointerToNote = new Map<number, string>();
  private readonly keyboardPressed = new Set<string>();
  private audioUnlocked = false;

  /* ═══════════════════════════════════════════════════════════════════
     DRAG-SCROLL
     ═══════════════════════════════════════════════════════════════════ */
  readonly isDragging = signal<boolean>(false);
  private dragStartX = 0;
  private dragStartScrollLeft = 0;
  private dragPointerId: number | null = null;
  private dragMoved = false;
  private readonly DRAG_THRESHOLD_PX = 6;

  /* ═══════════════════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════════════════ */
  constructor() {
    /* Réagit aux changements du métronome */
    effect(() => {
      const active = this.isMetronomeActive();
      const bpm = this.bpm();
      if (active) {
        this.startMetronomeLoop(bpm);
      } else {
        this.stopMetronomeLoop();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════════════ */
  ngOnInit(): void {
    void this.audio.init();
    this.loadSavedSong();
    this.loadSoundPreference();
  }

  ngAfterViewInit(): void {
    this.initCanvas();
  }

  ngOnDestroy(): void {
    this.stopMetronomeLoop();
    this.stopParticleAnimation();
    this.clearPlaybackTimeouts();
    this.pointerToNote.clear();
    this.keyboardPressed.clear();
    this.audio.allNotesOff();

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close();
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     SON — Préférence persistante
     ═══════════════════════════════════════════════════════════════════ */
  private loadSoundPreference(): void {
    const saved = localStorage.getItem(SOUND_PREF_KEY);
    if (saved === 'false' && !this.audio.isMuted()) {
      this.audio.toggleMute();
    }
  }

  toggleMute(): void {
    this.audio.toggleMute();
    localStorage.setItem(SOUND_PREF_KEY, String(this.audio.isMuted()));
  }

  /* ═══════════════════════════════════════════════════════════════════
     DRAG-SCROLL MANUEL DU CLAVIER
     ═══════════════════════════════════════════════════════════════════ */
  onScrollPointerDown(event: PointerEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.white-key, .black-key')) return;

    const el = this.pianoScroll?.nativeElement;
    if (!el) return;

    this.dragPointerId = event.pointerId;
    this.dragStartX = event.clientX;
    this.dragStartScrollLeft = el.scrollLeft;
    this.dragMoved = false;
    this.isDragging.set(true);

    el.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  onScrollPointerMove(event: PointerEvent): void {
    if (this.dragPointerId !== event.pointerId) return;
    const el = this.pianoScroll?.nativeElement;
    if (!el) return;

    const dx = event.clientX - this.dragStartX;
    if (!this.dragMoved && Math.abs(dx) > this.DRAG_THRESHOLD_PX) {
      this.dragMoved = true;
    }
    el.scrollLeft = this.dragStartScrollLeft - dx;
  }

  onScrollPointerUp(event: PointerEvent): void {
    if (this.dragPointerId !== event.pointerId) return;
    const el = this.pianoScroll?.nativeElement;
    if (el?.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    this.dragPointerId = null;
    this.isDragging.set(false);
  }

  onWheel(event: WheelEvent): void {
    const el = this.pianoScroll?.nativeElement;
    if (!el) return;
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      el.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  }

  scrollByAmount(direction: -1 | 1): void {
    const el = this.pianoScroll?.nativeElement;
    if (!el) return;
    const amount = el.clientWidth * 0.7 * direction;
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }

  /* ═══════════════════════════════════════════════════════════════════
     INSTRUMENTS
     ═══════════════════════════════════════════════════════════════════ */
  selectInstrument(type: InstrumentType): void {
    this.audio.setInstrument(type);
  }

  /* ═══════════════════════════════════════════════════════════════════
     CANVAS PARTICULES
     ═══════════════════════════════════════════════════════════════════ */
  private initCanvas(): void {
    const canvas = this.particleCanvas.nativeElement;
    this.ctxCanvas = canvas.getContext('2d');
    this.resizeCanvas();
  }

  @HostListener('window:resize')
  resizeCanvas(): void {
    if (!this.particleCanvas) return;
    const canvas = this.particleCanvas.nativeElement;
    this.canvasWidth = canvas.width = window.innerWidth;
    this.canvasHeight = canvas.height = window.innerHeight;
  }

  private triggerKeyParticles(event: PointerEvent): void {
    if (!this.ctxCanvas) return;
    const { clientX: x, clientY: y } = event;

    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 1) * 5 - 2,
        alpha: 1,
        color: Math.random() > 0.5 ? '#00f2fe' : '#ff0080',
      });
    }

    if (!this.animFrameId) {
      this.renderParticles();
    }
  }

  private renderParticles = (): void => {
    const ctx = this.ctxCanvas;

    if (ctx) {
      ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;

        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
      }
    }

    if (this.particles.length > 0) {
      this.animFrameId = requestAnimationFrame(this.renderParticles);
    } else {
      this.stopParticleAnimation();
    }
  };

  private stopParticleAnimation(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     MÉTRONOME
     ═══════════════════════════════════════════════════════════════════ */
  toggleMetronome(): void {
    this.isMetronomeActive.update(v => !v);
  }

  updateBpm(delta: number): void {
    this.bpm.update(b => Math.min(240, Math.max(40, b + delta)));
  }

  private startMetronomeLoop(bpm: number): void {
    this.stopMetronomeLoop();
    const intervalMs = (60 / bpm) * 1000;
    this.metronomeTimer = setInterval(() => {
      this.metronomeBeat.update(b => (b % this.beatsPerMeasure()) + 1);
      this.playClickSound(this.metronomeBeat() === 1);
    }, intervalMs);
  }

  private stopMetronomeLoop(): void {
    if (this.metronomeTimer) {
      clearInterval(this.metronomeTimer);
      this.metronomeTimer = null;
    }
    this.metronomeBeat.set(0);
  }

  private playClickSound(isHighPitch: boolean): void {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }

    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const now = this.audioCtx.currentTime;

    osc.frequency.setValueAtTime(isHighPitch ? 1200 : 800, now);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ENREGISTREMENT & LECTURE
     ═══════════════════════════════════════════════════════════════════ */
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

  private finalizeDurations(): void {
    const now = performance.now();
    this.recordedNotes.update(notes =>
      notes.map(n => ({
        ...n,
        duration: n.duration > 0 ? n.duration : (now - this.recordStartTime - n.time),
      }))
    );
  }

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
  }

  playSavedSong(): void {
    const song = this.savedSong();
    if (!song || this.isPlayingBack()) return;

    this.isPlayingBack.set(true);
    this.clearPlaybackTimeouts();
    let maxTime = 0;

    for (const item of song.notes) {
      const startDelay = item.time;
      const dur = Math.max(80, item.duration);
      maxTime = Math.max(maxTime, startDelay + dur + 100);

      const t1 = setTimeout(() => {
        this.audio.noteOn(item.note);
        this.markPressed(item.note, true);

        const t2 = setTimeout(() => {
          this.audio.noteOff(item.note);
          this.markPressed(item.note, false);
        }, dur);

        this.playbackTimeouts.push(t2);
      }, startDelay);

      this.playbackTimeouts.push(t1);
    }

    const finalTimeout = setTimeout(() => {
      this.isPlayingBack.set(false);
    }, maxTime);

    this.playbackTimeouts.push(finalTimeout);
  }

  private clearPlaybackTimeouts(): void {
    this.playbackTimeouts.forEach(t => clearTimeout(t));
    this.playbackTimeouts = [];
  }

  /* ═══════════════════════════════════════════════════════════════════
     CLAVIER / POINTER
     ═══════════════════════════════════════════════════════════════════ */
  onPointerDown(key: PianoKey, event: PointerEvent): void {
    if (!this.audioUnlocked) {
      this.audioUnlocked = true;
      void this.audio.unlock();
    }
    event.preventDefault();
    event.stopPropagation();
    this.triggerKeyParticles(event);
    this.audio.noteOn(key.note);
    this.pointerToNote.set(event.pointerId, key.note);
    this.markPressed(key.note, true);
    this.captureNoteStart(key.note);
  }

  onPointerEnter(key: PianoKey, event: PointerEvent): void {
    if (!this.pointerToNote.has(event.pointerId)) return;
    const previousNote = this.pointerToNote.get(event.pointerId);
    if (previousNote === key.note) return;

    if (previousNote) {
      this.audio.noteOff(previousNote);
      this.markPressed(previousNote, false);
      this.captureNoteEnd(previousNote);
    }

    this.audio.noteOn(key.note);
    this.pointerToNote.set(event.pointerId, key.note);
    this.markPressed(key.note, true);
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

  onPointerCancel(event: PointerEvent): void {
    this.onPointerUp(event);
  }

  @HostListener('window:pointerup', ['$event'])
  @HostListener('window:pointercancel', ['$event'])
  onGlobalPointerUp(event: PointerEvent): void {
    this.onPointerUp(event);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;
    const note = AZERTY_MAP[event.key.toLowerCase()];
    if (!note || this.keyboardPressed.has(note)) return;

    event.preventDefault();
    this.keyboardPressed.add(note);
    this.audio.noteOn(note);
    this.markPressed(note, true);
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

  /* ═══════════════════════════════════════════════════════════════════
     CAPTURE DES DURÉES DE NOTES
     ═══════════════════════════════════════════════════════════════════ */
  private captureNoteStart(note: string): void {
    if (!this.isRecording()) return;
    const t = performance.now() - this.recordStartTime;
    this.noteStartTimes.set(note, t);
    this.recordedNotes.update(notes => [...notes, { note, time: t, duration: 0 }]);
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

  /* ═══════════════════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════════════════ */
  isPressed(note: string): boolean {
    return this.pressedNotes().has(note);
  }

  private markPressed(note: string, pressed: boolean): void {
    this.pressedNotes.update(set => {
      const next = new Set(set);
      if (pressed) next.add(note);
      else next.delete(note);
      return next;
    });
  }

  goBack(): void {
    void this.router.navigate(['/play']);
  }
}