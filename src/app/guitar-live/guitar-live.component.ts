import { Component, OnDestroy, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface GuitarString {
  index: number;      // 1 (E aiguë) à 6 (E grave)
  name: string;       // E, B, G, D, A, E
  gaugeMm: number;    // Épaisseur visuelle réelle
  baseMidi: number;   // Note à vide
  color: string;      // Couleur visuelle
}

interface PlayingVoice {
  source: AudioBufferSourceNode | OscillatorNode;
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

  // Accordage standard guitare acoustique
  readonly strings: GuitarString[] = [
    { index: 1, name: 'E', gaugeMm: 0.30, baseMidi: 64, color: '#E6C280' }, // Mi aigu
    { index: 2, name: 'B', gaugeMm: 0.41, baseMidi: 59, color: '#D4AF37' }, // Si
    { index: 3, name: 'G', gaugeMm: 0.61, baseMidi: 55, color: '#B8860B' }, // Sol
    { index: 4, name: 'D', gaugeMm: 0.81, baseMidi: 50, color: '#CD7F32' }, // Ré
    { index: 5, name: 'A', gaugeMm: 1.07, baseMidi: 45, color: '#8B5A2B' }, // La
    { index: 6, name: 'E', gaugeMm: 1.35, baseMidi: 40, color: '#5C4033' }  // Mi grave
  ];

  /** Les 12 cases (1 à 12) — chaque case est l'espace entre 2 frettes */
  readonly cases = Array.from({ length: 12 }, (_, i) => i + 1);

  /** Les 13 frettes (0 = sillet, 1 à 12 = frettes métalliques) */
  readonly frets = Array.from({ length: 13 }, (_, i) => i);

  // État d'animation
  activeVibratingString = signal<number>(-1);
  lastPlayedNote = signal<string>('');
  lastPlayedTime = signal<number>(0);

  // Audio
  private audioCtx?: AudioContext;
  private activeVoices: Map<number, PlayingVoice> = new Map();
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private isAudioReady = false;
  private readonly guitarBasePath = 'assets/audio/guitar-acoustic/';
  private readonly guitarSamples: Record<string, string> = {
    'E2': 'E2.ogg', 'A2': 'A2.ogg', 'D3': 'D3.ogg',
    'G3': 'G3.ogg', 'B3': 'B3.ogg', 'E4': 'E4.ogg'
  };

  private readonly noteToMidiOffset: Record<string, number> = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
  };

  /* ═══════════════════════════════════════════════════════
     ANTI-DOUBLON (click + touchstart / répétition)
     ═══════════════════════════════════════════════════════ */
  private lastTouchTime = 0;
  private lastPressKey = '';
  private lastPressTime = 0;
  private readonly PRESS_DEBOUNCE_MS = 120;
  private readonly TOUCH_GHOST_WINDOW_MS = 500;

  async ngOnInit(): Promise<void> {
    this.initAudioContext();
    await this.preloadSamples();
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
        // Fallback silencieux si sample manquant
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

    // ─── CAS 1 : Sample réel ───
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
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.008);
        gainNode.gain.setValueAtTime(volume, startTime + duration * 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        source.start(startTime);
        source.stop(startTime + duration + 0.1);

        this.activeVoices.set(stringIdx, { source, gainNode, stringIdx, startTime });
        return;
      }
    }

    // ─── CAS 2 : Synthèse fallback ───
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
    gainNode.gain.setValueAtTime(volume, startTime + duration * 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(bodyFilter);
    bodyFilter.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);

    this.activeVoices.set(stringIdx, { source: osc, gainNode, stringIdx, startTime });
  }

  /* ═══════════════════════════════════════════════════════
     INTERACTION JOUEUR — ANTI-DOUBLON
     ═══════════════════════════════════════════════════════ */

  /**
   * Point d'entrée unique pour mousedown + touchstart.
   * @param stringIdx index de la corde (1 à 6)
   * @param caseNum   numéro de case (1 à 12) — 0 = corde à vide
   */
  onFretPress(stringIdx: number, caseNum: number, event: Event): void {
    const isTouch = event.type === 'touchstart';
    const now = performance.now();

    // ─── 1. Ignore le click souris fantôme après un touch ───
    if (!isTouch && (now - this.lastTouchTime) < this.TOUCH_GHOST_WINDOW_MS) {
      return;
    }
    if (isTouch) {
      this.lastTouchTime = now;
    }

    // ─── 2. Anti-répétition sur la même cellule ───
    const key = `${stringIdx}-${caseNum}`;
    if (key === this.lastPressKey && (now - this.lastPressTime) < this.PRESS_DEBOUNCE_MS) {
      return;
    }
    this.lastPressKey = key;
    this.lastPressTime = now;

    // ─── 3. Lancer la note ───
    void this.onFretClick(stringIdx, caseNum);
  }

  /**
   * @param stringIdx index de la corde (1 à 6)
   * @param caseNum   numéro de case (1 à 12)
   */
  async onFretClick(stringIdx: number, caseNum: number): Promise<void> {
    await this.ensureAudioContextRunning();

    // Retour haptique léger sur mobile
    if (navigator.vibrate) {
      navigator.vibrate(8);
    }

    const toneNote = this.getToneNoteForCase(stringIdx, caseNum);

    this.playAcousticGuitarNote(stringIdx, toneNote, 3.5, 0.85);

    // Vibration visuelle
    this.activeVibratingString.set(stringIdx);
    setTimeout(() => {
      if (this.activeVibratingString() === stringIdx) {
        this.activeVibratingString.set(-1);
      }
    }, 450);

    // Affichage du nom de note jouée
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

  /**
   * Retourne la note (nom international) pour une corde + une case.
   * caseNum = 1 → 1ère case (1 demi-ton au-dessus de la corde à vide)
   */
  private getToneNoteForCase(stringIndex: number, caseNum: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const str = this.strings.find(s => s.index === stringIndex);
    if (!str) return 'C4';
    const midi = str.baseMidi + caseNum;
    const octave = Math.floor(midi / 12) - 1;
    return `${noteNames[midi % 12]}${octave}`;
  }

  /**
   * Nom français d'une note pour l'affichage.
   */
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

  ngOnDestroy(): void {
    this.activeVoices.forEach(v => {
      try { v.source.stop(); } catch {}
    });
    this.activeVoices.clear();
    this.audioBuffers.clear();
    if (this.audioCtx) this.audioCtx.close();
  }
}