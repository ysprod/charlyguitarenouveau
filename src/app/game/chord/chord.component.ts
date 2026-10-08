import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GridBar, SavedGrid, ChordDetail } from 'src/app/models/chord-decoder.model';

/* ═════════════════════════════════════════════════════════════════════
   TYPES INTERNES
   ═════════════════════════════════════════════════════════════════════ */
interface Preset {
  name: string;
  grid: string;
  key: string;
}

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */
@Component({
  selector: 'app-chord',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './chord.component.html',
  styleUrls: ['./chord.component.scss']
})
export class ChordComponent implements OnInit, OnDestroy {

  private readonly router = inject(Router);

  /* ═══════════════════════════════════════════════════════════════════
     ÉTAT (signals)
     ═══════════════════════════════════════════════════════════════════ */
  readonly rawInput = signal<string>('[C] [Am] | [F] [G] |\n[C] [Em] | [Dm] [G7]');
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

  /* ─── Notes & gammes ─── */
  readonly notesList = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  readonly notesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  private readonly majorScale = [0, 2, 4, 5, 7, 9, 11];
  private readonly degreeLabels = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

  /* ─── Presets ─── */
  readonly presets: Preset[] = [
    { name: 'Pop I-V-vi-IV',       grid: '[C] [G] | [Am] [F]',                              key: 'C' },
    { name: 'Blues 12 mesures',    grid: '[C7] | [F7] | [C7] | [G7] |\n[F7] | [C7] | [G7] | [C7]', key: 'C' },
    { name: 'ii-V-I Jazz',         grid: '[Dm7] [G7] | [Cmaj7]',                            key: 'C' },
    { name: 'Anatole (Rhythm)',    grid: '[Cmaj7] [Am7] | [Dm7] [G7]',                      key: 'C' },
    { name: 'Andalouse',           grid: '[Am] [G] | [F] [E7]',                             key: 'A' }
  ];

  /* ─── Computed ─── */
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

  /* ─── Ressources ─── */
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private audioCtx: AudioContext | null = null;

  /* ═══════════════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════════════ */
  ngOnInit(): void {
    this.decodeGrid();
    this.loadSaved();
  }

  ngOnDestroy(): void {
    this.stopPlayback();
    this.audioCtx?.close();
  }

  /* ═══════════════════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════════════════ */
  goToPlay(): void {
    this.stopPlayback();
    this.router.navigate(['/play']);
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
        duration: this.beatsPerBar()
      });
    }

    this.parsedBars.set(bars);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ANALYSE D'UN ACCORD
     ═══════════════════════════════════════════════════════════════════ */
  private analyzeChord(chordStr: string): ChordDetail {
    const regex = /^([A-G][b#]?)(.*)$/;
    const match = chordStr.match(regex);

    if (!match) {
      return {
        raw: chordStr, root: '?', quality: '',
        notes: [], degree: '', romanNumeral: '', isDiatonic: false
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
      isDiatonic
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     NOTES DE L'ACCORD
     ═══════════════════════════════════════════════════════════════════ */
  private getChordNotes(root: string, quality: string): string[] {
    let rootIndex = this.notesList.indexOf(root);
    if (rootIndex === -1) rootIndex = this.notesFlat.indexOf(root);
    if (rootIndex === -1) return [];

    const list = this.useFlats() ? this.notesFlat : this.notesList;
    const get = (semi: number) => list[(rootIndex + semi + 12) % 12];

    switch (quality) {
      case 'm': case 'min':       return [root, get(3), get(7)];
      case '7':                   return [root, get(4), get(7), get(10)];
      case 'maj7': case 'M7':     return [root, get(4), get(7), get(11)];
      case 'm7': case 'min7':     return [root, get(3), get(7), get(10)];
      case 'dim': case '°':       return [root, get(3), get(6)];
      case 'dim7': case '°7':     return [root, get(3), get(6), get(9)];
      case 'aug': case '+':       return [root, get(4), get(8)];
      case 'sus2':                return [root, get(2), get(7)];
      case 'sus4':                return [root, get(5), get(7)];
      case '6':                   return [root, get(4), get(7), get(9)];
      case 'm6':                  return [root, get(3), get(7), get(9)];
      case '9':                   return [root, get(4), get(7), get(10), get(14)];
      case 'm9':                  return [root, get(3), get(7), get(10), get(14)];
      case 'add9':                return [root, get(4), get(7), get(14)];
      case 'm7b5': case 'ø':      return [root, get(3), get(6), get(10)];
      default:                    return [root, get(4), get(7)];
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     DEGRÉ HARMONIQUE
     ═══════════════════════════════════════════════════════════════════ */
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
  }

  saveGrid(): void {
    const name = prompt('Nom de la grille :');
    if (!name) return;

    const newGrid: SavedGrid = {
      name,
      content: this.rawInput(),
      key: this.selectedKey(),
      bpm: this.bpm()
    };

    this.savedGrids.update(list => [...list, newGrid]);
    this.persistSaved();
  }

  loadSavedGrid(g: SavedGrid): void {
    this.rawInput.set(g.content);
    this.selectedKey.set(g.key);
    this.bpm.set(g.bpm);
    this.decodeGrid();
  }

  deleteSaved(index: number): void {
    this.savedGrids.update(list => list.filter((_, i) => i !== index));
    this.persistSaved();
  }

  clearAll(): void {
    this.rawInput.set('');
    this.decodeGrid();
    this.stopPlayback();
  }

  private persistSaved(): void {
    try {
      localStorage.setItem('chordGrids', JSON.stringify(this.savedGrids()));
    } catch { /* ignore quota errors */ }
  }

  private loadSaved(): void {
    const raw = localStorage.getItem('chordGrids');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) this.savedGrids.set(parsed);
    } catch { /* ignore */ }
  }

  /* ═══════════════════════════════════════════════════════════════════
     PLAYBACK
     ═══════════════════════════════════════════════════════════════════ */
  togglePlayback(): void {
    this.isPlaying() ? this.stopPlayback() : this.startPlayback();
  }

  private startPlayback(): void {
    if (this.parsedBars().length === 0) return;

    this.isPlaying.set(true);
    this.currentBarIndex.set(0);
    this.currentBeat.set(0);

    /* Init audio */
    if (!this.audioCtx) {
      const Ctor = window.AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctor) this.audioCtx = new Ctor();
    }

    const beatDuration = (60 / this.bpm()) * 1000;

    this.intervalId = setInterval(() => {
      if (this.isMetronomeOn()) this.playClick(this.currentBeat() === 0);

      const nextBeat = this.currentBeat() + 1;

      if (nextBeat >= this.beatsPerBar()) {
        this.currentBeat.set(0);
        this.currentBarIndex.update(i =>
          (i + 1) % this.parsedBars().length
        );
      } else {
        this.currentBeat.set(nextBeat);
      }
    }, beatDuration);
  }

  private stopPlayback(): void {
    this.isPlaying.set(false);
    this.currentBarIndex.set(-1);
    this.currentBeat.set(0);

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private playClick(accent: boolean): void {
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => { /* ignore */ });
    }

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.frequency.value = accent ? 1200 : 800;
    gain.gain.value = accent ? 0.15 : 0.08;

    osc.connect(gain).connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.05);
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
}