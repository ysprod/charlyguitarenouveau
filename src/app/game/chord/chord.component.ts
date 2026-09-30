import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GridBar, SavedGrid, ChordDetail } from 'src/app/models/chord-decoder.model';

@Component({
  selector: 'app-chord',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './chord.component.html',
  styleUrls: ['./chord.component.scss']
})
export class ChordComponent implements OnInit, OnDestroy {

  // ---------- Saisie ----------
  rawInput: string = '[C] [Am] | [F] [G] |\n[C] [Em] | [Dm] [G7]';
  selectedKey: string = 'C';
  bpm: number = 90;
  beatsPerBar: number = 4;

  // ---------- Notes & gammes ----------
  notesList: string[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  notesFlat: string[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  useFlats: boolean = false;

  // Gammes majeures (intervalles en demi-tons)
  private majorScale: number[] = [0, 2, 4, 5, 7, 9, 11];
  private degreeLabels: string[] = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

  // ---------- Grille décodée ----------
  parsedBars: GridBar[] = [];

  // ---------- Playback ----------
  isPlaying: boolean = false;
  isMetronomeOn: boolean = true;
  currentBarIndex: number = -1;
  currentBeat: number = 0;      // 0..3
  private intervalId: any = null;
  private audioCtx: AudioContext | null = null;

  // ---------- Suggestions ----------
  presets: { name: string; grid: string; key: string }[] = [
    { name: 'Pop I-V-vi-IV', grid: '[C] [G] | [Am] [F]', key: 'C' },
    { name: 'Blues 12 mesures', grid: '[C7] | [F7] | [C7] | [G7] |\n[F7] | [C7] | [G7] | [C7]', key: 'C' },
    { name: 'ii-V-I Jazz', grid: '[Dm7] [G7] | [Cmaj7]', key: 'C' },
    { name: 'Anatole (Rhythm)', grid: '[Cmaj7] [Am7] | [Dm7] [G7]', key: 'C' },
    { name: 'Andalouse', grid: '[Am] [G] | [F] [E7]', key: 'A' },
  ];

  savedGrids: SavedGrid[] = [];

  // ---------- Cycle de vie ----------
  ngOnInit(): void {
    this.decodeGrid();
    this.loadSaved();
  }

  ngOnDestroy(): void {
    this.stopPlayback();
    this.audioCtx?.close();
  }

  // ============================================================
  // DÉCODAGE
  // ============================================================
  decodeGrid(): void {
    this.parsedBars = [];
    const rawBars = this.rawInput
      .split(/\||\n/)
      .map(b => b.trim())
      .filter(b => b.length > 0);

    let barCounter = 1;
    for (const rawBar of rawBars) {
      const matches = rawBar.match(/\[(.*?)\]|([A-G][b#]?[a-zA-Z0-9°+]*)/g);
      if (!matches) continue;

      const chords: ChordDetail[] = matches.map(m => {
        const clean = m.replace(/[\[\]]/g, '').trim();
        return this.analyzeChord(clean);
      });

      this.parsedBars.push({
        barNumber: barCounter++,
        chords,
        duration: this.beatsPerBar
      });
    }
  }

  // ============================================================
  // ANALYSE D'UN ACCORD
  // ============================================================
  private analyzeChord(chordStr: string): ChordDetail {
    const regex = /^([A-G][b#]?)(.*)$/;
    const match = chordStr.match(regex);

    if (!match) {
      return { raw: chordStr, root: '?', quality: '', notes: [], degree: '', romanNumeral: '', isDiatonic: false };
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

  // ============================================================
  // NOTES DE L'ACCORD (selon qualité)
  // ============================================================
  private getChordNotes(root: string, quality: string): string[] {
    let rootIndex = this.notesList.indexOf(root);
    if (rootIndex === -1) {
      rootIndex = this.notesFlat.indexOf(root);
    }
    if (rootIndex === -1) return [];

    const list = this.useFlats ? this.notesFlat : this.notesList;
    const get = (semi: number) => list[(rootIndex + semi + 12) % 12];

    switch (quality) {
      case 'm': case 'min': return [root, get(3), get(7)];
      case '7': return [root, get(4), get(7), get(10)];
      case 'maj7': case 'M7': return [root, get(4), get(7), get(11)];
      case 'm7': case 'min7': return [root, get(3), get(7), get(10)];
      case 'dim': case '°': return [root, get(3), get(6)];
      case 'dim7': case '°7': return [root, get(3), get(6), get(9)];
      case 'aug': case '+': return [root, get(4), get(8)];
      case 'sus2': return [root, get(2), get(7)];
      case 'sus4': return [root, get(5), get(7)];
      case '6': return [root, get(4), get(7), get(9)];
      case 'm6': return [root, get(3), get(7), get(9)];
      case '9': return [root, get(4), get(7), get(10), get(14)];
      case 'm9': return [root, get(3), get(7), get(10), get(14)];
      case 'add9': return [root, get(4), get(7), get(14)];
      case 'm7b5': case 'ø': return [root, get(3), get(6), get(10)];
      default: return [root, get(4), get(7)]; // majeur
    }
  }

  // ============================================================
  // DEGRÉ HARMONIQUE
  // ============================================================
  private calculateDegree(root: string): string {
    const keyIndex = this.notesList.indexOf(this.selectedKey);
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
    // Ajouts selon la qualité
    if (quality.includes('7') && quality !== 'maj7') roman += '7';
    if (quality === 'maj7') roman += 'maj7';
    if (quality.includes('dim')) roman += '°';
    return roman;
  }

  // ============================================================
  // TRANSPOSITION
  // ============================================================
  transpose(semitones: number): void {
    this.rawInput = this.rawInput.replace(
      /\[?([A-G][b#]?)([a-zA-Z0-9°+]*)\]?/g,
      (match, root, quality) => {
        const isBracketed = match.startsWith('[');
        let idx = this.notesList.indexOf(root);
        if (idx === -1) idx = this.notesFlat.indexOf(root);
        if (idx === -1) return match;

        const newIdx = (idx + semitones + 12) % 12;
        const list = this.useFlats ? this.notesFlat : this.notesList;
        const newChord = `${list[newIdx]}${quality}`;
        return isBracketed ? `[${newChord}]` : newChord;
      }
    );
    this.decodeGrid();
  }

  transposeTo(targetKey: string): void {
    const currentIdx = this.notesList.indexOf(this.selectedKey);
    const targetIdx = this.notesList.indexOf(targetKey);
    if (currentIdx === -1 || targetIdx === -1) return;
    let diff = (targetIdx - currentIdx + 12) % 12;
    if (diff > 6) diff -= 12;
    this.transpose(diff);
    this.selectedKey = targetKey;
    this.decodeGrid();
  }

  toggleFlats(): void {
    this.useFlats = !this.useFlats;
    // Retranscrire toute la grille en bémols/dièses
    this.transpose(0);
  }

  // ============================================================
  // PRESETS & SAUVEGARDE
  // ============================================================
  loadPreset(preset: { name: string; grid: string; key: string }): void {
    this.rawInput = preset.grid;
    this.selectedKey = preset.key;
    this.decodeGrid();
  }

  saveGrid(): void {
    const name = prompt('Nom de la grille :');
    if (!name) return;
    this.savedGrids.push({
      name,
      content: this.rawInput,
      key: this.selectedKey,
      bpm: this.bpm
    });
    localStorage.setItem('chordGrids', JSON.stringify(this.savedGrids));
  }

  private loadSaved(): void {
    const raw = localStorage.getItem('chordGrids');
    if (raw) {
      try { this.savedGrids = JSON.parse(raw); } catch { this.savedGrids = []; }
    }
  }

  loadSavedGrid(g: SavedGrid): void {
    this.rawInput = g.content;
    this.selectedKey = g.key;
    this.bpm = g.bpm;
    this.decodeGrid();
  }

  deleteSaved(index: number): void {
    this.savedGrids.splice(index, 1);
    localStorage.setItem('chordGrids', JSON.stringify(this.savedGrids));
  }

  clearAll(): void {
    this.rawInput = '';
    this.decodeGrid();
    this.stopPlayback();
  }

  // ============================================================
  // PLAYBACK (métronome + défilement)
  // ============================================================
  togglePlayback(): void {
    this.isPlaying ? this.stopPlayback() : this.startPlayback();
  }

  private startPlayback(): void {
    if (this.parsedBars.length === 0) return;

    this.isPlaying = true;
    this.currentBarIndex = 0;
    this.currentBeat = 0;

    this.audioCtx = this.audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();

    const beatDuration = (60 / this.bpm) * 1000;

    this.intervalId = setInterval(() => {
      if (this.isMetronomeOn) this.playClick(this.currentBeat === 0);
      this.currentBeat++;
      if (this.currentBeat >= this.beatsPerBar) {
        this.currentBeat = 0;
        this.currentBarIndex = (this.currentBarIndex + 1) % this.parsedBars.length;
      }
    }, beatDuration);
  }

  private stopPlayback(): void {
    this.isPlaying = false;
    this.currentBarIndex = -1;
    this.currentBeat = 0;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private playClick(accent: boolean): void {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.frequency.value = accent ? 1200 : 800;
    gain.gain.value = accent ? 0.15 : 0.08;
    osc.connect(gain).connect(this.audioCtx.destination);
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.05);
  }

  onBpmChange(): void {
    if (this.isPlaying) {
      this.stopPlayback();
      this.startPlayback();
    }
  }

  // ============================================================
  // STATISTIQUES
  // ============================================================
  get totalChords(): number {
    return this.parsedBars.reduce((sum, b) => sum + b.chords.length, 0);
  }

  get diatonicCount(): number {
    return this.parsedBars.reduce(
      (sum, b) => sum + b.chords.filter(c => c.isDiatonic).length, 0
    );
  }

  get diatonicPercentage(): number {
    return this.totalChords === 0
      ? 0
      : Math.round((this.diatonicCount / this.totalChords) * 100);
  }

  get uniqueChords(): number {
    const set = new Set<string>();
    this.parsedBars.forEach(b => b.chords.forEach(c => set.add(c.raw)));
    return set.size;
  }
}