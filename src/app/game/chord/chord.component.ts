import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  ChordDetail,
  GridBar,
  SavedGrid,
} from 'src/app/models/chord-decoder.model';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

interface Preset {
  name: string;
  grid: string;
  key: string;
}

type StatusKind = 'idle' | 'success' | 'error';
type PlayMode = 'normal' | 'learning';

const STORAGE_KEY = 'chordGrids';
const DEFAULT_INPUT = '[C] [Am] | [F] [G] |\n[C] [Em] | [Dm] [G7]';

/** Mapping note → demi-ton depuis C (pour l'export MIDI). */
const NOTE_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

/** Intervalles (en demi-tons) depuis la fondamentale selon la qualité. */
const CHORD_INTERVALS: Record<string, number[]> = {
  '':          [0, 4, 7],
  'm':         [0, 3, 7],
  'min':       [0, 3, 7],
  '7':         [0, 4, 7, 10],
  'maj7':      [0, 4, 7, 11],
  'M7':        [0, 4, 7, 11],
  'm7':        [0, 3, 7, 10],
  'min7':      [0, 3, 7, 10],
  'dim':       [0, 3, 6],
  '°':         [0, 3, 6],
  'dim7':      [0, 3, 6, 9],
  '°7':        [0, 3, 6, 9],
  'aug':       [0, 4, 8],
  '+':         [0, 4, 8],
  'sus2':      [0, 2, 7],
  'sus4':      [0, 5, 7],
  '6':         [0, 4, 7, 9],
  'm6':        [0, 3, 7, 9],
  '9':         [0, 4, 7, 10, 14],
  'm9':        [0, 3, 7, 10, 14],
  'add9':      [0, 4, 7, 14],
  'm7b5':      [0, 3, 6, 10],
  'ø':         [0, 3, 6, 10],
};

/* ─── Constantes arpeggio MIDI ─── */

/** Décalage entre chaque note de l'arpeggio (en ticks). */
const ARPEGGIO_STEP_TICKS = 60;

/** Durée maximale d'une note d'arpeggio (en ticks). */
const ARPEGGIO_NOTE_DURATION_TICKS = 480;

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-chord',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chord.component.html',
  styleUrls: ['./chord.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChordComponent implements OnInit, OnDestroy {

  private readonly router = inject(Router);

  /* ═══════════════════════════════════════════════════════════════════
     ÉTAT
     ═══════════════════════════════════════════════════════════════════ */

  readonly rawInput = signal<string>(DEFAULT_INPUT);
  readonly selectedKey = signal<string>('C');
  readonly bpm = signal<number>(90);
  readonly beatsPerBar = signal<number>(4);
  readonly useFlats = signal<boolean>(false);

  readonly parsedBars = signal<GridBar[]>([]);
  readonly savedGrids = signal<SavedGrid[]>([]);

  readonly isPlaying = signal<boolean>(false);
  readonly isMetronomeOn = signal<boolean>(true);
  readonly currentBarIndex = signal<number>(-1);
  readonly currentBeat = signal<number>(0);

  /* ─── Mode apprentissage ─── */
  readonly playMode = signal<PlayMode>('normal');
  readonly learningBarIndex = signal<number>(-1);
  readonly learningChordIndex = signal<number>(-1);
  readonly learningProgress = signal<number>(0);

  /* ─── Feedback ─── */
  readonly statusKind = signal<StatusKind>('idle');
  readonly statusMessage = signal<string>('');

  /* ─── Notes & gammes ─── */
  readonly notesList = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  readonly notesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  private readonly majorScale = [0, 2, 4, 5, 7, 9, 11];
  private readonly degreeLabels = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

  /* ─── Presets ─── */
  readonly presets: Preset[] = [
    { name: 'Pop I-V-vi-IV',    grid: '[C] [G] | [Am] [F]',                        key: 'C' },
    { name: 'Blues 12 mesures', grid: '[C7] | [F7] | [C7] | [G7] |\n[F7] | [C7] | [G7] | [C7]', key: 'C' },
    { name: 'ii-V-I Jazz',      grid: '[Dm7] [G7] | [Cmaj7]',                      key: 'C' },
    { name: 'Anatole (Rhythm)', grid: '[Cmaj7] [Am7] | [Dm7] [G7]',                key: 'C' },
    { name: 'Andalouse',        grid: '[Am] [G] | [F] [E7]',                       key: 'A' },
  ];

  /* ─── Computed ─── */

  readonly hasBars = computed(() => this.parsedBars().length > 0);

  readonly totalChords = computed(() =>
    this.parsedBars().reduce((sum, b) => sum + b.chords.length, 0)
  );

  readonly diatonicCount = computed(() =>
    this.parsedBars().reduce(
      (sum, b) => sum + b.chords.filter(c => c.isDiatonic).length,
      0
    )
  );

  readonly diatonicPercentage = computed(() => {
    const total = this.totalChords();
    return total === 0 ? 0 : Math.round((this.diatonicCount() / total) * 100);
  });

  readonly uniqueChords = computed(() => {
    const set = new Set<string>();
    this.parsedBars().forEach(b => b.chords.forEach(c => set.add(c.raw)));
    return set.size;
  });

  readonly beatsArray = [0, 1, 2, 3];

  readonly currentChordGlobal = computed(() => {
    const bar = this.learningBarIndex();
    const chord = this.learningChordIndex();
    return bar >= 0 && chord >= 0 ? { bar, chord } : null;
  });

  /* ─── Ressources ─── */
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private learningTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private audioCtx: AudioContext | null = null;
  private statusTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /* ═══════════════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════════════ */

  ngOnInit(): void {
    this.decodeGrid();
    this.loadSaved();
  }

  ngOnDestroy(): void {
    this.stopPlayback();
    this.stopLearningMode();

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      void this.audioCtx.close();
    }

    if (this.statusTimeoutId !== null) {
      clearTimeout(this.statusTimeoutId);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════════════════ */

  goToPlay(): void {
    this.stopPlayback();
    this.stopLearningMode();
    void this.router.navigate(['/play']);
  }

  /* ═══════════════════════════════════════════════════════════════════
     DÉCODAGE
     ═══════════════════════════════════════════════════════════════════ */

  decodeGrid(): void {
    const rawBars = this.rawInput()
      .split(/\||\n/)
      .map(b => b.trim())
      .filter(b => b.length > 0);

    const bars: GridBar[] = [];
    let barCounter = 1;

    for (const rawBar of rawBars) {
      const matches = rawBar.match(/\[(.*?)\]|([A-G][b#]?[a-zA-Z0-9°+]*)/g);
      if (!matches) continue;

      const chords: ChordDetail[] = matches.map(m => {
        const clean = m.replace(/[\[\]]/g, '').trim();
        return this.analyzeChord(clean);
      });

      bars.push({
        barNumber: barCounter++,
        chords,
        duration: this.beatsPerBar(),
      });
    }

    this.parsedBars.set(bars);

    if (bars.length === 0 && this.rawInput().trim().length > 0) {
      this.setStatus('error', '⚠️ Aucun accord reconnu dans la grille.');
    } else {
      this.setStatus('idle', '');
    }
  }

  private analyzeChord(chordStr: string): ChordDetail {
    const match = chordStr.match(/^([A-G][b#]?)(.*)$/);

    if (!match) {
      return {
        raw: chordStr,
        root: '?',
        quality: '',
        notes: [],
        degree: '',
        romanNumeral: '',
        isDiatonic: false,
      };
    }

    const root = match[1];
    const quality = match[2] || '';

    const notes = this.getChordNotes(root, quality);
    const degree = this.calculateDegree(root);
    const isDiatonic = degree !== '' && degree !== 'Ext';

    return {
      raw: chordStr,
      root,
      quality,
      notes,
      degree,
      romanNumeral: this.degreeToRoman(degree, quality),
      isDiatonic,
    };
  }

  private getChordNotes(root: string, quality: string): string[] {
    let rootIndex = this.notesList.indexOf(root);
    if (rootIndex === -1) rootIndex = this.notesFlat.indexOf(root);
    if (rootIndex === -1) return [];

    const list = this.useFlats() ? this.notesFlat : this.notesList;
    const get = (semi: number) => list[(rootIndex + semi + 12) % 12];

    const intervals = CHORD_INTERVALS[quality] ?? CHORD_INTERVALS[''];
    return intervals.map(semi => get(semi));
  }

  private calculateDegree(root: string): string {
    const keyIndex = this.notesList.indexOf(this.selectedKey());
    let rootIndex = this.notesList.indexOf(root);
    if (rootIndex === -1) rootIndex = this.notesFlat.indexOf(root);
    if (keyIndex === -1 || rootIndex === -1) return '';

    const interval = (rootIndex - keyIndex + 12) % 12;
    const idx = this.majorScale.indexOf(interval);
    if (idx === -1) return 'Ext';

    return this.degreeLabels[idx];
  }

  private degreeToRoman(degree: string, quality: string): string {
    if (!degree) return '';

    let roman = degree.replace('°', '');
    if (quality.includes('7') && quality !== 'maj7') roman += '7';
    if (quality === 'maj7') roman += 'maj7';
    if (quality.includes('dim')) roman += '°';

    return roman;
  }

  /* ═══════════════════════════════════════════════════════════════════
     TRANSPOSITION
     ═══════════════════════════════════════════════════════════════════ */

  transpose(semitones: number): void {
    if (semitones === 0 && !this.rawInput().trim()) return;

    const transformed = this.rawInput().replace(
      /\[?([A-G][b#]?)([a-zA-Z0-9°+]*)\]?/g,
      (match, root, quality) => {
        const isBracketed = match.startsWith('[');
        let idx = this.notesList.indexOf(root);
        if (idx === -1) idx = this.notesFlat.indexOf(root);
        if (idx === -1) return match;

        const newIdx = (idx + semitones + 12) % 12;
        const list = this.useFlats() ? this.notesFlat : this.notesList;
        const newChord = `${list[newIdx]}${quality}`;
        return isBracketed ? `[${newChord}]` : newChord;
      }
    );

    this.rawInput.set(transformed);
    this.decodeGrid();
  }

  toggleFlats(): void {
    this.useFlats.update(v => !v);
    this.transpose(0);
  }

  /* ═══════════════════════════════════════════════════════════════════
     PRESETS & SAUVEGARDE
     ═══════════════════════════════════════════════════════════════════ */

  loadPreset(preset: Preset): void {
    this.rawInput.set(preset.grid);
    this.selectedKey.set(preset.key);
    this.decodeGrid();
    this.setStatus('success', `✨ Grille « ${preset.name} » chargée.`);
  }

  saveGrid(): void {
    const name = this.generateGridName();
    if (!name) return;

    const newGrid: SavedGrid = {
      name,
      content: this.rawInput(),
      key: this.selectedKey(),
      bpm: this.bpm(),
    };

    this.savedGrids.update(list => [...list, newGrid]);
    this.persistSaved();
    this.setStatus('success', `💾 Grille « ${name} » sauvegardée.`);
  }

  loadSavedGrid(g: SavedGrid): void {
    this.rawInput.set(g.content);
    this.selectedKey.set(g.key);
    this.bpm.set(g.bpm);
    this.decodeGrid();
    this.setStatus('success', `📂 Grille « ${g.name} » chargée.`);
  }

  deleteSaved(index: number): void {
    const grid = this.savedGrids()[index];
    this.savedGrids.update(list => list.filter((_, i) => i !== index));
    this.persistSaved();

    if (grid) {
      this.setStatus('success', `🗑 Grille « ${grid.name} » supprimée.`);
    }
  }

  clearAll(): void {
    this.rawInput.set('');
    this.decodeGrid();
    this.stopPlayback();
    this.stopLearningMode();
    this.setStatus('idle', '');
  }

  private generateGridName(): string {
    const now = new Date();
    const time = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Grille ${this.selectedKey()} — ${time}`;
  }

  private persistSaved(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.savedGrids()));
    } catch {
      this.setStatus('error', '⚠️ Impossible de sauvegarder (stockage plein).');
    }
  }

  private loadSaved(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        this.savedGrids.set(parsed as SavedGrid[]);
      }
    } catch {
      /* silencieux */
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     🎵 EXPORT MIDI — Arpeggio
     ─────────────────────────────────────────────────────────────────
     Génère un fichier MIDI type 0 (SMF) avec les accords joués
     EN ARPÈGE (notes décalées dans le temps) à la vitesse BPM.
     Compatible avec tous les séquenceurs (MuseScore, Logic, Ableton,
     GarageBand, FL Studio…).
     ═══════════════════════════════════════════════════════════════════ */

  exportMidi(): void {
    if (!this.hasBars()) {
      this.setStatus('error', '⚠️ Aucune grille à exporter.');
      return;
    }

    try {
      const bytes = this.buildMidiFile();

      const blob = new Blob(
        [bytes.buffer as ArrayBuffer],
        { type: 'audio/midi' }
      );

      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `grille-${this.selectedKey()}-${this.bpm()}bpm.mid`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      this.setStatus('success', '🎵 Fichier MIDI exporté (arpeggio).');
    } catch (error) {
      console.error('Export MIDI échoué :', error);
      this.setStatus('error', '⚠️ Impossible de générer le fichier MIDI.');
    }
  }

  /** Construit un fichier MIDI SMF type 0 avec arpeggio. */
  private buildMidiFile(): Uint8Array {
    const bpm = this.bpm();
    const ticksPerBeat = 480;
    const ticksPerBar = ticksPerBeat * this.beatsPerBar();

    /* Conversion BPM → microsecondes par noire */
    const microsecondsPerBeat = Math.round(60_000_000 / bpm);

    const events: { tick: number; data: number[] }[] = [];

    /* Parcours des mesures et accords */
    let globalTick = 0;

    this.parsedBars().forEach(bar => {
      const nb = bar.chords.length;
      if (nb === 0) {
        globalTick += ticksPerBar;
        return;
      }

      const ticksPerChord = Math.floor(ticksPerBar / nb);

      bar.chords.forEach(chord => {
        const notes = this.chordToMidiNotes(chord);

        /* ─── ARPEGGIO ───
         * Chaque note est décalée de ARPEGGIO_STEP_TICKS.
         * Elle dure ARPEGGIO_NOTE_DURATION_TICKS, sans dépasser
         * la fin de l'accord (ticksPerChord).
         */
        notes.forEach((note, i) => {
          const noteStart = globalTick + i * ARPEGGIO_STEP_TICKS;

          /* Durée = min(durée standard, temps restant dans l'accord) */
          const maxDuration = Math.max(
            30,
            ticksPerChord - i * ARPEGGIO_STEP_TICKS - 10
          );
          const noteDuration = Math.min(
            ARPEGGIO_NOTE_DURATION_TICKS,
            maxDuration
          );

          const noteEnd = noteStart + noteDuration;

          /* Note ON */
          events.push({
            tick: noteStart,
            data: [0x90, note, 80],
          });

          /* Note OFF */
          events.push({
            tick: noteEnd,
            data: [0x80, note, 0],
          });
        });

        globalTick += ticksPerChord;
      });
    });

    /* Tri par tick croissant */
    events.sort((a, b) => a.tick - b.tick);

    /* Construction des bytes MIDI */
    const track: number[] = [];

    /* Meta event : Tempo (FF 51 03 tttttt) */
    track.push(
      0x00,
      0xff, 0x51, 0x03,
      (microsecondsPerBeat >> 16) & 0xff,
      (microsecondsPerBeat >> 8) & 0xff,
      microsecondsPerBeat & 0xff,
    );

    /* Écriture des événements avec delta time */
    let lastTick = 0;
    for (const ev of events) {
      const delta = ev.tick - lastTick;
      lastTick = ev.tick;

      track.push(...this.encodeVarLen(delta));
      track.push(...ev.data);
    }

    /* End of Track */
    track.push(0x00, 0xff, 0x2f, 0x00);

    /* Header MThd */
    const header = [
      0x4d, 0x54, 0x68, 0x64,
      0x00, 0x00, 0x00, 0x06,
      0x00, 0x00,
      0x00, 0x01,
      (ticksPerBeat >> 8) & 0xff,
      ticksPerBeat & 0xff,
    ];

    /* Track MTrk */
    const trackHeader = [
      0x4d, 0x54, 0x72, 0x6b,
      (track.length >> 24) & 0xff,
      (track.length >> 16) & 0xff,
      (track.length >> 8) & 0xff,
      track.length & 0xff,
    ];

    return new Uint8Array([...header, ...trackHeader, ...track]);
  }

  /** Convertit un ChordDetail en notes MIDI (numéros 0-127). */
  private chordToMidiNotes(chord: ChordDetail): number[] {
    const rootSemitone = NOTE_TO_SEMITONE[chord.root];
    if (rootSemitone === undefined) return [];

    const intervals = CHORD_INTERVALS[chord.quality] ?? CHORD_INTERVALS[''];

    /* Octave 4 par défaut (C4 = 60 en MIDI) */
    const baseOctave = 60;

    return intervals.map(semi => {
      const midi = baseOctave + rootSemitone + semi;

      if (midi > 127) return midi - 12;
      if (midi < 0) return midi + 12;
      return midi;
    });
  }

  /** Encode un entier en Variable-Length Quantity (MIDI standard). */
  private encodeVarLen(value: number): number[] {
    if (value < 0) value = 0;

    const bytes: number[] = [value & 0x7f];
    value >>= 7;

    while (value > 0) {
      bytes.unshift((value & 0x7f) | 0x80);
      value >>= 7;
    }

    return bytes;
  }

  /* ═══════════════════════════════════════════════════════════════════
     🎓 MODE APPRENTISSAGE
     ═══════════════════════════════════════════════════════════════════ */

  toggleLearningMode(): void {
    if (this.playMode() === 'learning') {
      this.stopLearningMode();
      this.playMode.set('normal');
    } else {
      if (!this.hasBars()) {
        this.setStatus('error', "⚠️ Saisis une grille d'abord.");
        return;
      }
      this.stopPlayback();
      this.playMode.set('learning');
      this.startLearningMode();
    }
  }

  private startLearningMode(): void {
    if (!this.audioCtx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      if (Ctor) this.audioCtx = new Ctor();
    }

    this.learningBarIndex.set(0);
    this.learningChordIndex.set(0);
    this.learningProgress.set(0);

    this.scheduleNextChord();
  }

  private stopLearningMode(): void {
    this.learningBarIndex.set(-1);
    this.learningChordIndex.set(-1);
    this.learningProgress.set(0);

    if (this.learningTimeoutId !== null) {
      clearTimeout(this.learningTimeoutId);
      this.learningTimeoutId = null;
    }
  }

  private scheduleNextChord(): void {
    if (this.playMode() !== 'learning') return;

    const bars = this.parsedBars();
    const barIdx = this.learningBarIndex();
    const chordIdx = this.learningChordIndex();

    if (barIdx < 0 || barIdx >= bars.length) {
      this.setStatus('success', '🎓 Grille terminée !');
      this.stopLearningMode();
      this.playMode.set('normal');
      return;
    }

    const bar = bars[barIdx];
    if (chordIdx < 0 || chordIdx >= bar.chords.length) {
      this.learningBarIndex.set(barIdx + 1);
      this.learningChordIndex.set(0);
      this.learningProgress.set(0);

      this.learningTimeoutId = setTimeout(
        () => this.scheduleNextChord(),
        300
      );
      return;
    }

    const beatsPerChord = this.beatsPerBar() / bar.chords.length;
    const durationMs = (60 / this.bpm()) * beatsPerChord * 1000;

    const chord = bar.chords[chordIdx];
    this.playChordPreview(chord);

    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      this.learningProgress.set(pct);

      if (pct >= 100) {
        clearInterval(progressInterval);
      }
    }, 50);

    this.learningTimeoutId = setTimeout(() => {
      clearInterval(progressInterval);

      const nextChord = chordIdx + 1;
      if (nextChord >= bar.chords.length) {
        this.learningBarIndex.set(barIdx + 1);
        this.learningChordIndex.set(0);
      } else {
        this.learningChordIndex.set(nextChord);
      }

      this.learningProgress.set(0);
      this.scheduleNextChord();
    }, durationMs);
  }

  private playChordPreview(chord: ChordDetail): void {
    const ctx = this.audioCtx;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => { /* silencieux */ });
    }

    const midiNotes = this.chordToMidiNotes(chord);
    const now = ctx.currentTime;

    midiNotes.forEach((midiNote, idx) => {
      const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.0001, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.15, now + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.9);
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     PLAYBACK NORMAL
     ═══════════════════════════════════════════════════════════════════ */

  togglePlayback(): void {
    if (this.isPlaying()) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  }

  private startPlayback(): void {
    if (!this.hasBars()) return;

    if (this.playMode() === 'learning') {
      this.stopLearningMode();
      this.playMode.set('normal');
    }

    this.isPlaying.set(true);
    this.currentBarIndex.set(0);
    this.currentBeat.set(0);

    if (!this.audioCtx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      if (Ctor) this.audioCtx = new Ctor();
    }

    const beatDuration = (60 / this.bpm()) * 1000;

    this.intervalId = setInterval(() => {
      if (this.isMetronomeOn()) {
        this.playClick(this.currentBeat() === 0);
      }

      const nextBeat = this.currentBeat() + 1;

      if (nextBeat >= this.beatsPerBar()) {
        this.currentBeat.set(0);
        this.currentBarIndex.update(i => (i + 1) % this.parsedBars().length);
      } else {
        this.currentBeat.set(nextBeat);
      }
    }, beatDuration);
  }

  private stopPlayback(): void {
    this.isPlaying.set(false);
    this.currentBarIndex.set(-1);
    this.currentBeat.set(0);

    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private playClick(accent: boolean): void {
    const ctx = this.audioCtx;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => { /* silencieux */ });
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = accent ? 1200 : 800;
    gain.gain.value = accent ? 0.15 : 0.08;

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  onBpmChange(): void {
    if (this.isPlaying()) {
      this.stopPlayback();
      this.startPlayback();
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     HELPERS TEMPLATE
     ═══════════════════════════════════════════════════════════════════ */

  onRawInputChange(value: string): void {
    this.rawInput.set(value);
    this.decodeGrid();
  }

  onKeyChange(value: string): void {
    this.selectedKey.set(value);
    this.decodeGrid();
  }

  onBpmInput(value: number): void {
    this.bpm.set(value);
  }

  toggleMetronome(value: boolean): void {
    this.isMetronomeOn.set(value);
  }

  isChordActive(barIdx: number, chordIdx: number): boolean {
    if (this.playMode() === 'learning') {
      return (
        this.learningBarIndex() === barIdx &&
        this.learningChordIndex() === chordIdx
      );
    }
    if (this.isPlaying()) {
      return this.currentBarIndex() === barIdx;
    }
    return false;
  }

  private setStatus(kind: StatusKind, message: string): void {
    this.statusKind.set(kind);
    this.statusMessage.set(message);

    if (this.statusTimeoutId !== null) {
      clearTimeout(this.statusTimeoutId);
    }

    if (kind !== 'idle' && message) {
      this.statusTimeoutId = setTimeout(() => {
        this.statusKind.set('idle');
        this.statusMessage.set('');
      }, 3000);
    }
  }
}