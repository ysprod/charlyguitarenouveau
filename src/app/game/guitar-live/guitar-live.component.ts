import { Component, OnDestroy, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface GuitarString {
  index: number;      // 1 (E aiguë) à 6 (E grave)
  name: string;       // E, B, G, D, A, E
  gaugeMm: number;    // Épaisseur visuelle
  baseMidi: number;   // Note à vide
  color: string;      // Couleur visuelle
}

interface PlayingVoice {
  source: OscillatorNode;
  gainNode: GainNode;
  stringIdx: number;
  startTime: number;
}

@Component({
  selector: 'app-guitar-live',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guitar-live.component.html',
  styleUrls: ['./guitar-live.component.scss']
})
export class GuitarLiveComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  /* ═══════════════════════════════════════════════════════
     ACCORDAGE STANDARD GUITARE ACOUSTIQUE
     ═══════════════════════════════════════════════════════ */
  readonly strings: GuitarString[] = [
    { index: 1, name: 'E', gaugeMm: 0.30, baseMidi: 64, color: '#E6C280' },
    { index: 2, name: 'B', gaugeMm: 0.41, baseMidi: 59, color: '#D4AF37' },
    { index: 3, name: 'G', gaugeMm: 0.61, baseMidi: 55, color: '#B8860B' },
    { index: 4, name: 'D', gaugeMm: 0.81, baseMidi: 50, color: '#CD7F32' },
    { index: 5, name: 'A', gaugeMm: 1.07, baseMidi: 45, color: '#8B5A2B' },
    { index: 6, name: 'E', gaugeMm: 1.35, baseMidi: 40, color: '#5C4033' }
  ];

  readonly cases = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly frets = Array.from({ length: 13 }, (_, i) => i);

  /* ═══════════════════════════════════════════════════════
     ÉTAT
     ═══════════════════════════════════════════════════════ */
  activeVibratingString = signal(-1);
  lastPlayedNote = signal('');
  lastPlayedTime = signal(0);

  /* ═══════════════════════════════════════════════════════
     AUDIO (synthèse pure — aucun sample)
     ═══════════════════════════════════════════════════════ */
  private audioCtx?: AudioContext;
  private activeVoices: Map<number, PlayingVoice> = new Map();

  private readonly noteToMidiOffset: Record<string, number> = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
  };

  /* ─── Anti-doublon tactile / souris ─── */
  private lastTouchTime = 0;
  private lastPressKey = '';
  private lastPressTime = 0;
  private readonly PRESS_DEBOUNCE_MS = 120;
  private readonly TOUCH_GHOST_WINDOW_MS = 500;

  ngOnInit(): void {
    this.initAudioContext();
  }

  ngOnDestroy(): void {
    this.activeVoices.forEach(v => {
      try { v.source.stop(); } catch {}
    });
    this.activeVoices.clear();
    if (this.audioCtx) this.audioCtx.close();
  }

  /* ═══════════════════════════════════════════════════════
     MOTEUR AUDIO
     ═══════════════════════════════════════════════════════ */
  private initAudioContext(): void {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctor) this.audioCtx = new Ctor();
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

  /**
   * Étouffe la note précédente sur la même corde (comme un vrai guitariste).
   */
  private dampPreviousStringNote(stringIdx: number, dampingDuration = 0.05): void {
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

  /**
   * Synthèse réaliste de guitare acoustique :
   *  - 3 oscillateurs (fondamentale + 2 harmoniques) = son riche
   *  - Filtre peaking (brillance du médiator)
   *  - Filtre lowpass (résonance de caisse)
   *  - Enveloppe ADSR naturelle (attaque rapide + decay organique)
   *  - Léger vibrato (LFO) pour un rendu humain
   */
  private playAcousticGuitarNote(
    stringIdx: number,
    toneNote: string,
    duration = 3.5,
    volume = 0.85
  ): void {
    if (!this.audioCtx) return;

    this.dampPreviousStringNote(stringIdx);

    const targetMidi = this.noteToMidiIndex(toneNote);
    const targetFreq = 440 * Math.pow(2, (targetMidi - 69) / 12);
    const startTime = this.audioCtx.currentTime;

    /* ─── Nœuds principaux ─── */
    const gainNode = this.audioCtx.createGain();
    const bodyFilter = this.audioCtx.createBiquadFilter();
    const pickFilter = this.audioCtx.createBiquadFilter();

    /* Caisse (bois) */
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(targetFreq * 4, startTime);
    bodyFilter.frequency.exponentialRampToValueAtTime(
      targetFreq * 1.5,
      startTime + duration * 0.6
    );
    bodyFilter.Q.value = 1.2;

    /* Médiator (brillance) */
    pickFilter.type = 'peaking';
    pickFilter.frequency.value = targetFreq * 6;
    pickFilter.Q.value = 0.8;
    pickFilter.gain.value = 4;

    /* Enveloppe ADSR */
    const isBassString = stringIdx >= 5;
    const attack = isBassString ? 0.004 : 0.002;
    const decay = 0.08;
    const sustainLevel = 0.45;

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(
      volume * sustainLevel,
      startTime + attack + decay
    );
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    /* 3 oscillateurs (harmoniques) */
    const harmonics: Array<{ type: OscillatorType; ratio: number; gain: number }> = [
      { type: 'triangle', ratio: 1,    gain: 0.6  },
      { type: 'sine',     ratio: 2,    gain: 0.25 },
      { type: 'sine',     ratio: 3.01, gain: 0.15 }
    ];

    const oscillators: OscillatorNode[] = [];

    harmonics.forEach(({ type, ratio, gain: hGain }) => {
      const osc = this.audioCtx!.createOscillator();
      const hGainNode = this.audioCtx!.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(targetFreq * ratio, startTime);

      /* Vibrato léger naturel */
      const lfo = this.audioCtx!.createOscillator();
      const lfoGain = this.audioCtx!.createGain();
      lfo.frequency.value = 4.5 + Math.random() * 1.5;
      lfoGain.gain.value = targetFreq * 0.003;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(startTime);
      lfo.stop(startTime + duration);

      hGainNode.gain.value = hGain;
      osc.connect(hGainNode);
      hGainNode.connect(pickFilter);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
      oscillators.push(osc);
    });

    /* Chaîne : osc → pick → body → master → destination */
    pickFilter.connect(bodyFilter);
    bodyFilter.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    this.activeVoices.set(stringIdx, {
      source: oscillators[0],
      gainNode,
      stringIdx,
      startTime
    });
  }

  /* ═══════════════════════════════════════════════════════
     INTERACTION JOUEUR — ANTI-DOUBLON
     ═══════════════════════════════════════════════════════ */
  onFretPress(stringIdx: number, caseNum: number, event: Event): void {
    const isTouch = event.type === 'touchstart';
    const now = performance.now();

    /* 1. Ignore le "ghost click" après un touch */
    if (!isTouch && (now - this.lastTouchTime) < this.TOUCH_GHOST_WINDOW_MS) {
      return;
    }
    if (isTouch) this.lastTouchTime = now;

    /* 2. Anti-répétition sur la même cellule */
    const key = `${stringIdx}-${caseNum}`;
    if (key === this.lastPressKey && (now - this.lastPressTime) < this.PRESS_DEBOUNCE_MS) {
      return;
    }
    this.lastPressKey = key;
    this.lastPressTime = now;

    /* 3. Lancer la note */
    void this.onFretClick(stringIdx, caseNum);
  }

  private async onFretClick(stringIdx: number, caseNum: number): Promise<void> {
    await this.ensureAudioContextRunning();

    if (navigator.vibrate) navigator.vibrate(8);

    const toneNote = this.getToneNoteForCase(stringIdx, caseNum);
    this.playAcousticGuitarNote(stringIdx, toneNote, 3.5, 0.85);

    /* Vibration visuelle */
    this.activeVibratingString.set(stringIdx);
    setTimeout(() => {
      if (this.activeVibratingString() === stringIdx) {
        this.activeVibratingString.set(-1);
      }
    }, 450);

    /* Affichage de la note jouée */
    const displayName = this.getNoteDisplayName(stringIdx, caseNum);
    this.lastPlayedNote.set(displayName);
    this.lastPlayedTime.set(Date.now());
    setTimeout(() => {
      if (Date.now() - this.lastPlayedTime() >= 1400) {
        this.lastPlayedNote.set('');
      }
    }, 1500);
  }

  /* ═══════════════════════════════════════════════════════
     THÉORIE MUSICALE
     ═══════════════════════════════════════════════════════ */
  private getToneNoteForCase(stringIndex: number, caseNum: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const str = this.strings.find(s => s.index === stringIndex);
    if (!str) return 'C4';
    const midi = str.baseMidi + caseNum;
    const octave = Math.floor(midi / 12) - 1;
    return `${noteNames[midi % 12]}${octave}`;
  }

  getNoteDisplayName(stringIndex: number, caseNum: number): string {
    const noteFr = ['DO', 'DO#', 'RÉ', 'RÉ#', 'MI', 'FA', 'FA#', 'SOL', 'SOL#', 'LA', 'LA#', 'SI'];
    const str = this.strings.find(s => s.index === stringIndex);
    if (!str) return '';
    const midi = str.baseMidi + caseNum;
    return noteFr[midi % 12];
  }

  getStringColor(stringIdx: number): string {
    const str = this.strings.find(s => s.index === stringIdx);
    return str ? str.color : '#D4AF37';
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════ */
  goBack(): void {
    this.router.navigate(['/play']);
  }
}