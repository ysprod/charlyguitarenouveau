import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { fromEvent } from 'rxjs';

import {
  InstrumentType,
  PianoAudioService
} from 'src/app/game/services/piano-audio.service';
import { PianoKey } from 'src/app/game/models/piano.model';
import { randomFloat } from 'src/app/game/utils/random.utils';
import { StorageService } from 'src/app/shared/services/storage.service';
import { GameAudioService } from '../services/game-audio.service';

/* ═════════════════════════════════════════════════════════════════════
   CONSTANTES
   ═════════════════════════════════════════════════════════════════════ */

const AZERTY_MAP: Readonly<Record<string, string>> = {
  q: 'C3',  s: 'C#3', d: 'D3',  f: 'D#3', g: 'E3',
  h: 'F3',  j: 'F#3', k: 'G3',  l: 'G#3', m: 'A3',
  w: 'C#3', x: 'D#3', c: 'F#3', v: 'G#3', b: 'A#3'
};

const PIANO_KEYS_DATA: readonly PianoKey[] = [
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

const STORAGE_KEYS = {
  SONG: 'charly_piano_song_v2',
  SOUND_ENABLED: 'piano_sound_enabled'
} as const;

const MIN_NOTE_DURATION_MS = 80;
const DRAG_THRESHOLD_PX = 6;

/* ═════════════════════════════════════════════════════════════════════
   INTERFACES
   ═════════════════════════════════════════════════════════════════════ */

export interface RecordedNote {
  readonly note: string;
  readonly time: number;
  readonly duration: number;
}

export interface SavedSong {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly bpm: number;
  readonly notes: readonly RecordedNote[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-pianovirtuel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './pianovirtuel.component.html',
  styleUrls: ['./pianovirtuel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PianovirtuelComponent implements OnInit, AfterViewInit, OnDestroy {

  /* ─── Dépendances ─── */
  private readonly router = inject(Router);
  readonly audio = inject(PianoAudioService);
  private readonly uiAudio = inject(GameAudioService);
  private readonly storage = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('particleCanvas', { static: true })
  private readonly particleCanvas!: ElementRef<HTMLCanvasElement>;

  @ViewChild('pianoScroll')
  private readonly pianoScroll?: ElementRef<HTMLDivElement>;

  /* ═══════════════════════════════════════════════════════════════════
     CANVAS PARTICULES
     ═══════════════════════════════════════════════════════════════════ */
  private ctxCanvas: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private readonly particles: Particle[] = [];
  private canvasWidth = 0;
  private canvasHeight = 0;

  /* ═══════════════════════════════════════════════════════════════════
     INSTRUMENTS
     ═══════════════════════════════════════════════════════════════════ */
  readonly instruments: readonly { type: InstrumentType; label: string }[] = [
    { type: 'piano',       label: '🎹 Piano' },
    { type: 'organ',       label: '⛪ Orgue' },
    { type: 'strings',     label: '🎻 Cordes' },
    { type: 'harpsichord', label: '🎼 Clavecin' },
    { type: 'synth',       label: '🎛 Synthé' },
    { type: 'trumpet',     label: '🎺 Trompette' },
    { type: 'eguitar',     label: '🎸 Guitare élec.' },
    { type: 'bells',       label: '🔔 Cloches' },
    { type: 'flute',       label: '🪈 Flûte' },
    { type: 'sax',         label: '🎷 Saxophone' }
  ];

  /* ═══════════════════════════════════════════════════════════════════
     CLAVIER
     ═══════════════════════════════════════════════════════════════════ */
  readonly pianoKeys: readonly PianoKey[] = PIANO_KEYS_DATA;
  readonly whiteKeys = computed(() => this.pianoKeys.filter(k => !k.isBlack));
  readonly blackKeys = computed(() => this.pianoKeys.filter(k => k.isBlack));
  readonly pressedNotes = signal<Set<string>>(new Set());

  /* ═══════════════════════════════════════════════════════════════════
     MÉTRONOME
     ═══════════════════════════════════════════════════════════════════ */
  readonly bpm = signal(120);
  readonly isMetronomeActive = signal(false);
  readonly metronomeBeat = signal(0);
  readonly beatsPerMeasure = signal(4);
  readonly beatArray = [1, 2, 3, 4];
  private metronomeTimer: ReturnType<typeof setInterval> | null = null;

  /* ═══════════════════════════════════════════════════════════════════
     ENREGISTREMENT
     ═══════════════════════════════════════════════════════════════════ */
  readonly isRecording = signal(false);
  readonly isPlayingBack = signal(false);
  readonly recordedNotes = signal<RecordedNote[]>([]);
  readonly savedSong = signal<SavedSong | null>(null);
  private recordStartTime = 0;
  private readonly noteStartTimes = new Map<string, number>();
  private readonly playbackTimeouts = new Set<ReturnType<typeof setTimeout>>();

  /* ═══════════════════════════════════════════════════════════════════
     GESTION CLAVIER / POINTER
     ═══════════════════════════════════════════════════════════════════ */
  private readonly pointerToNote = new Map<number, string>();
  private readonly keyboardPressed = new Set<string>();
  private audioUnlocked = false;

  /* ═══════════════════════════════════════════════════════════════════
     DRAG-SCROLL
     ═══════════════════════════════════════════════════════════════════ */
  readonly isDragging = signal(false);
  private dragStartX = 0;
  private dragStartScrollLeft = 0;
  private dragPointerId: number | null = null;
  private dragMoved = false;

  /* ═══════════════════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════════════════ */
  constructor() {
    /* Réagit aux changements du métronome */
    effect(() => {
      const active = this.isMetronomeActive();
      const bpm = this.bpm();

      untracked(() => {
        if (active) {
          this.startMetronomeLoop(bpm);
        } else {
          this.stopMetronomeLoop();
        }
      });
    });

    /* Écoute le redimensionnement de fenêtre */
    fromEvent(window, 'resize')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resizeCanvas());

    /* Écoute les pointerup globaux pour libérer les notes */
    fromEvent<PointerEvent>(window, 'pointerup')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.onPointerUp(event));

    fromEvent<PointerEvent>(window, 'pointercancel')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.onPointerUp(event));

    /* Écoute le clavier */
    fromEvent<KeyboardEvent>(window, 'keydown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.onKeyDown(event));

    fromEvent<KeyboardEvent>(window, 'keyup')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.onKeyUp(event));

    /* Écoute la perte de focus */
    fromEvent(window, 'blur')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onWindowBlur());
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
  }

  /* ═══════════════════════════════════════════════════════════════════
     SON — Préférence persistante
     ═══════════════════════════════════════════════════════════════════ */
  private loadSoundPreference(): void {
    const enabled = this.storage.getBoolean(STORAGE_KEYS.SOUND_ENABLED, true);
    if (!enabled && !this.audio.isMuted()) {
      this.audio.toggleMute();
    }
  }

  toggleMute(): void {
    this.audio.toggleMute();
    this.storage.setBoolean(STORAGE_KEYS.SOUND_ENABLED, !this.audio.isMuted());
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
    if (!this.dragMoved && Math.abs(dx) > DRAG_THRESHOLD_PX) {
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
     CANVAS PARTICULES (avec devicePixelRatio)
     ═══════════════════════════════════════════════════════════════════ */
  private initCanvas(): void {
    const canvas = this.particleCanvas.nativeElement;
    this.ctxCanvas = canvas.getContext('2d');
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const canvas = this.particleCanvas?.nativeElement;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;

    canvas.width = Math.floor(this.canvasWidth * dpr);
    canvas.height = Math.floor(this.canvasHeight * dpr);
    canvas.style.width = `${this.canvasWidth}px`;
    canvas.style.height = `${this.canvasHeight}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctxCanvas = ctx;
    }
  }

  private triggerKeyParticles(event: PointerEvent): void {
    if (!this.ctxCanvas) return;
    const { clientX: x, clientY: y } = event;

    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x,
        y,
        vx: randomFloat(-4, 4),
        vy: randomFloat(-7, -2),
        alpha: 1,
        color: Math.random() > 0.5 ? '#00f2fe' : '#ff0080',
        size: randomFloat(3, 6)
      });
    }

    if (!this.animFrameId) {
      this.renderParticles();
    }
  }

  private readonly renderParticles = (): void => {
    const ctx = this.ctxCanvas;

    if (ctx) {
      ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.alpha -= 0.025;

        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
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
      const nextBeat = (this.metronomeBeat() % this.beatsPerMeasure()) + 1;
      this.metronomeBeat.set(nextBeat);
      this.uiAudio.play(nextBeat === 1 ? 'perfect' : 'tick');
    }, intervalMs);
  }

  private stopMetronomeLoop(): void {
    if (this.metronomeTimer) {
      clearInterval(this.metronomeTimer);
      this.metronomeTimer = null;
    }
    this.metronomeBeat.set(0);
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
        duration: n.duration > 0
          ? n.duration
          : Math.max(MIN_NOTE_DURATION_MS, now - this.recordStartTime - n.time)
      }))
    );
  }

  saveCurrentRecording(): void {
    const notes = this.recordedNotes();
    if (notes.length === 0) return;

    const song: SavedSong = {
      id: `session-${Date.now()}`,
      title: 'Ma composition',
      date: new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      bpm: this.bpm(),
      notes: [...notes]
    };

    this.savedSong.set(song);
    this.storage.setString(STORAGE_KEYS.SONG, JSON.stringify(song));
  }

  loadSavedSong(): void {
    const stored = this.storage.getString(STORAGE_KEYS.SONG, '');
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
    this.storage.remove(STORAGE_KEYS.SONG);
  }

  playSavedSong(): void {
    const song = this.savedSong();
    if (!song || this.isPlayingBack()) return;

    this.isPlayingBack.set(true);
    this.clearPlaybackTimeouts();

    let maxTime = 0;

    for (const item of song.notes) {
      const startDelay = item.time;
      const dur = Math.max(MIN_NOTE_DURATION_MS, item.duration);
      maxTime = Math.max(maxTime, startDelay + dur + 100);

      const t1 = setTimeout(() => {
        this.playbackTimeouts.delete(t1);
        this.audio.noteOn(item.note);
        this.markPressed(item.note, true);

        const t2 = setTimeout(() => {
          this.playbackTimeouts.delete(t2);
          this.audio.noteOff(item.note);
          this.markPressed(item.note, false);
        }, dur);

        this.playbackTimeouts.add(t2);
      }, startDelay);

      this.playbackTimeouts.add(t1);
    }

    const finalTimeout = setTimeout(() => {
      this.playbackTimeouts.delete(finalTimeout);
      this.isPlayingBack.set(false);
    }, maxTime);

    this.playbackTimeouts.add(finalTimeout);
  }

  private clearPlaybackTimeouts(): void {
    this.playbackTimeouts.forEach(t => clearTimeout(t));
    this.playbackTimeouts.clear();
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

  private onKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;
    const note = AZERTY_MAP[event.key.toLowerCase()];
    if (!note || this.keyboardPressed.has(note)) return;

    event.preventDefault();
    this.keyboardPressed.add(note);
    this.audio.noteOn(note);
    this.markPressed(note, true);
    this.captureNoteStart(note);
  }

  private onKeyUp(event: KeyboardEvent): void {
    const note = AZERTY_MAP[event.key.toLowerCase()];
    if (!note || !this.keyboardPressed.has(note)) return;

    this.keyboardPressed.delete(note);
    this.audio.noteOff(note);
    this.markPressed(note, false);
    this.captureNoteEnd(note);
  }

  private onWindowBlur(): void {
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
          copy[i] = { ...copy[i], duration: Math.max(MIN_NOTE_DURATION_MS, dur) };
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