// src/app/game/chord/chord.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DEFAULT_INPUT, NOTES_SHARP, STORAGE_KEY } from 'src/app/game/chord.constants';
import { Preset, PRESETS } from 'src/app/game/data/chord.presets';

import {
  ChordDetail,
  GridBar,
  SavedGrid,
} from 'src/app/game/chord-decoder.model';
import { buildMidiFile, chordToMidiNotes } from 'src/app/game/chord-midi.utils';
import { analyzeChord, transposeGrid } from 'src/app/game/chord.utils';
import { createIntervalScheduler, createTimeoutScheduler } from 'src/app/game/schedulers.util';
 

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

type StatusKind = 'idle' | 'success' | 'error';
type PlayMode = 'normal' | 'learning';

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-chord',
  imports: [FormsModule],
  templateUrl: './chord.component.html',
  styleUrls: ['./chord.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChordComponent {

  /* ─── Dépendances ─── */
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /* ─── Schedulers auto-nettoyés ─── */
  private readonly scheduleTimeout = createTimeoutScheduler(this.destroyRef);
  private readonly playbackInterval = createIntervalScheduler(this.destroyRef);

  /* ═══════════════════════════════════════════════════════════════════
     ÉTAT — SIGNALS
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

  /* ─── Constantes exposées ─── */
  readonly notesList = NOTES_SHARP;
  readonly presets: readonly Preset[] = PRESETS;
  readonly beatsArray = [0, 1, 2, 3];

  /* ─── Computed ─── */
  readonly hasBars = computed(() => this.parsedBars().length > 0);

  readonly totalChords = computed(() =>
    this.parsedBars().reduce((sum, b) => sum + b.chords.length, 0)
  );

  readonly diatonicCount = computed(() =>
    this.parsedBars().reduce(
      (sum, b) => sum + b.chords.filter((c) => c.isDiatonic).length,
      0
    )
  );

  readonly diatonicPercentage = computed(() => {
    const total = this.totalChords();
    return total === 0 ? 0 : Math.round((this.diatonicCount() / total) * 100);
  });

  readonly uniqueChords = computed(() => {
    const set = new Set<string>();
    this.parsedBars().forEach((b) => b.chords.forEach((c) => set.add(c.raw)));
    return set.size;
  });

  /* ─── Ressources (non-signal) ─── */
  private audioCtx: AudioContext | null = null;
  private learningRafId: number | null = null;
  private learningTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /* ═══════════════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      this.decodeGrid();
      this.loadSaved();
    });

    this.destroyRef.onDestroy(() => {
      this.stopPlayback();
      this.stopLearningMode();

      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        void this.audioCtx.close();
      }
    });
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
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    const bars: GridBar[] = [];
    let barCounter = 1;

    for (const rawBar of rawBars) {
      const matches = rawBar.match(/\[(.*?)\]|([A-G][b#]?[a-zA-Z0-9°+]*)/g);
      if (!matches) continue;

      const chords: ChordDetail[] = matches.map((m) => {
        const clean = m.replace(/[\[\]]/g, '').trim();
        return analyzeChord(clean, this.selectedKey(), this.useFlats());
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

  /* ═══════════════════════════════════════════════════════════════════
     TRANSPOSITION
     ═══════════════════════════════════════════════════════════════════ */

  transpose(semitones: number): void {
    if (semitones === 0 && !this.rawInput().trim()) return;

    const transformed = transposeGrid(
      this.rawInput(),
      semitones,
      this.useFlats()
    );

    this.rawInput.set(transformed);
    this.decodeGrid();
  }

  toggleFlats(): void {
    this.useFlats.update((v) => !v);
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

    const newGrid: SavedGrid = {
      name,
      content: this.rawInput(),
      key: this.selectedKey(),
      bpm: this.bpm(),
    };

    this.savedGrids.update((list) => [...list, newGrid]);
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
    this.savedGrids.update((list) => list.filter((_, i) => i !== index));
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
     🎵 EXPORT MIDI
     ═══════════════════════════════════════════════════════════════════ */

  exportMidi(): void {
    if (!this.hasBars()) {
      this.setStatus('error', '⚠️ Aucune grille à exporter.');
      return;
    }

    try {
      const bytes = buildMidiFile(
        this.parsedBars(),
        this.bpm(),
        this.beatsPerBar()
      );

      const blob = new Blob([bytes.buffer as ArrayBuffer], {
        type: 'audio/midi',
      });

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
    this.ensureAudioContext();

    this.learningBarIndex.set(0);
    this.learningChordIndex.set(0);
    this.learningProgress.set(0);

    this.scheduleNextChord();
  }

  private stopLearningMode(): void {
    this.learningBarIndex.set(-1);
    this.learningChordIndex.set(-1);
    this.learningProgress.set(0);

    /* Annule le RAF en cours */
    if (this.learningRafId !== null) {
      cancelAnimationFrame(this.learningRafId);
      this.learningRafId = null;
    }

    /* Annule le timeout en cours */
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

      this.learningTimeoutId = setTimeout(() => {
        this.learningTimeoutId = null;
        this.scheduleNextChord();
      }, 300);
      return;
    }

    const beatsPerChord = this.beatsPerBar() / bar.chords.length;
    const durationMs = (60 / this.bpm()) * beatsPerChord * 1000;

    const chord = bar.chords[chordIdx];
    this.playChordPreview(chord);

    const startTime = performance.now();

    /* Progression via requestAnimationFrame */
    const tick = () => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      this.learningProgress.set(pct);

      if (pct >= 100) {
        this.learningRafId = null;
        return;
      }
      this.learningRafId = requestAnimationFrame(tick);
    };

    this.learningRafId = requestAnimationFrame(tick);

    this.learningTimeoutId = setTimeout(() => {
      this.learningTimeoutId = null;

      if (this.learningRafId !== null) {
        cancelAnimationFrame(this.learningRafId);
        this.learningRafId = null;
      }

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

    const midiNotes = chordToMidiNotes(chord);
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

    this.ensureAudioContext();

    const beatDuration = (60 / this.bpm()) * 1000;

    this.playbackInterval.start(() => {
      if (this.isMetronomeOn()) {
        this.playClick(this.currentBeat() === 0);
      }

      const nextBeat = this.currentBeat() + 1;

      if (nextBeat >= this.beatsPerBar()) {
        this.currentBeat.set(0);
        this.currentBarIndex.update((i) => (i + 1) % this.parsedBars().length);
      } else {
        this.currentBeat.set(nextBeat);
      }
    }, beatDuration);
  }

  private stopPlayback(): void {
    this.isPlaying.set(false);
    this.currentBarIndex.set(-1);
    this.currentBeat.set(0);
    this.playbackInterval.stop();
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

  private ensureAudioContext(): void {
    if (this.audioCtx) return;

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (Ctor) this.audioCtx = new Ctor();
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

    if (kind !== 'idle' && message) {
      this.scheduleTimeout(() => {
        this.statusKind.set('idle');
        this.statusMessage.set('');
      }, 3000);
    }
  }
}