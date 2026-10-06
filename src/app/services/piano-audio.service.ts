import { Injectable, signal, computed, OnDestroy, inject, NgZone } from '@angular/core';

interface AudioVoice {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

interface PrecomputedSample {
  buffer: AudioBuffer;
  playbackRate: number;
}

/**
 * Table fixe pour la conversion Note -> MIDI sans Regex.
 */
const NOTE_OFFSETS: Record<string, number> = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
};

/** Cache O(1) Note -> MIDI (ex: "C4" -> 60) */
const NOTE_MIDI_CACHE = new Map<string, number>();

function noteToMidiFast(note: string): number {
  let midi = NOTE_MIDI_CACHE.get(note);
  if (midi !== undefined) return midi;

  const len = note.length;
  if (len < 2) return 60;

  const isSharp = note.charAt(1) === '#';
  const pitch = isSharp ? note.substring(0, 2) : note.charAt(0);
  const octStr = note.substring(isSharp ? 2 : 1);
  const oct = parseInt(octStr, 10);

  const pitchOffset = NOTE_OFFSETS[pitch] ?? 0;
  midi = (oct + 1) * 12 + pitchOffset;

  NOTE_MIDI_CACHE.set(note, midi);
  return midi;
}

/**
 * Service audio du piano optimisé pour une latence minimale.
 */
@Injectable({ providedIn: 'root' })
export class PianoAudioService implements OnDestroy {
  private readonly ngZone = inject(NgZone);

  // ═══════════════════════════════════════════════════════
  // ÉTAT EXPOSÉ (Signaux)
  // ═══════════════════════════════════════════════════════
  private readonly _isReady = signal(false);
  readonly isReady = this._isReady.asReadonly();

  private readonly _loadedCount = signal(0);
  private readonly _totalCount = signal(0);
  readonly loadProgress = computed(() => {
    const total = this._totalCount();
    return total === 0 ? 0 : Math.round((this._loadedCount() / total) * 100);
  });

  private readonly _isMuted = signal(false);
  readonly isMuted = this._isMuted.asReadonly();

  // ═══════════════════════════════════════════════════════
  // INTERNES
  // ═══════════════════════════════════════════════════════
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  /** Table indexée par numéro MIDI (0–127) précalculée pour un accès O(1) direct */
  private readonly midiLookupTable: Array<PrecomputedSample | null> = new Array(128).fill(null);

  /** Voix actuellement actives : note -> voice */
  private readonly activeVoices = new Map<string, AudioVoice>();

  private readonly basePath = 'assets/audio/piano/';

  private readonly sampleFiles: Record<string, string> = {
    'C3':  'C3.ogg',
    'D#3': 'Ds3.ogg',
    'F#3': 'Fs3.ogg',
    'A3':  'A3.ogg',
    'C4':  'C4.ogg',
    'D#4': 'Ds4.ogg',
    'F#4': 'Fs4.ogg',
    'A4':  'A4.ogg',
    'C5':  'C5.ogg'
  };

  private initPromise: Promise<void> | null = null;

  // ═══════════════════════════════════════════════════════
  // INITIALISATION
  // ═══════════════════════════════════════════════════════
  init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    const Ctor = window.AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      
    if (!Ctor) {
      console.warn('[PianoAudio] AudioContext non supporté.');
      return;
    }

    this.ctx = new Ctor({ latencyHint: 'interactive' });
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.9;
    this.masterGain.connect(this.ctx.destination);

    const entries = Object.entries(this.sampleFiles);
    this._totalCount.set(entries.length);

    const loadedBuffers: Array<{ midi: number; buffer: AudioBuffer }> = [];

    // Chargement parallèle des échantillons
    await Promise.all(entries.map(async ([note, file]) => {
      try {
        const res = await fetch(this.basePath + file);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arr = await res.arrayBuffer();
        const decoded = await this.ctx!.decodeAudioData(arr);
        
        loadedBuffers.push({ midi: noteToMidiFast(note), buffer: decoded });
        this._loadedCount.update(n => n + 1);
      } catch (err) {
        console.warn(`[PianoAudio] Échec chargement ${file}`, err);
      }
    }));

    if (loadedBuffers.length > 0) {
      loadedBuffers.sort((a, b) => a.midi - b.midi);
      this.buildLookupTable(loadedBuffers);
      this._isReady.set(true);
    }
  }

  /**
   * Construit la table 0–127 O(1) contenant le buffer le plus proche et le ratio de pitch.
   */
  private buildLookupTable(samples: Array<{ midi: number; buffer: AudioBuffer }>): void {
    for (let targetMidi = 0; targetMidi < 128; targetMidi++) {
      let best = samples[0];
      let bestDist = Math.abs(best.midi - targetMidi);

      for (let i = 1; i < samples.length; i++) {
        const dist = Math.abs(samples[i].midi - targetMidi);
        if (dist < bestDist) {
          best = samples[i];
          bestDist = dist;
        }
      }

      const playbackRate = Math.pow(2, (targetMidi - best.midi) / 12);
      this.midiLookupTable[targetMidi] = {
        buffer: best.buffer,
        playbackRate
      };
    }
  }

  async unlock(): Promise<void> {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }
  }

  // ═══════════════════════════════════════════════════════
  // JEU (Chemin critique O(1))
  // ═══════════════════════════════════════════════════════
  noteOn(note: string, velocity = 0.85): void {
    if (!this.ctx || !this.masterGain || !this._isReady() || this._isMuted()) return;

    const midi = noteToMidiFast(note);
    const sample = this.midiLookupTable[midi];
    if (!sample) return;

    // Exécution hors de la Zone Angular pour isoler les événements WebAudio de la CD
    this.ngZone.runOutsideAngular(() => {
      // Couper la voix existante sur la même note si nécessaire
      const existing = this.activeVoices.get(note);
      if (existing) {
        this.stopVoice(existing, 0.02);
      }

      const now = this.ctx!.currentTime;
      const source = this.ctx!.createBufferSource();
      source.buffer = sample.buffer;
      source.playbackRate.value = sample.playbackRate;

      const gain = this.ctx!.createGain();
      const peak = velocity < 0.05 ? 0.05 : (velocity > 1 ? 1 : velocity);

      // Enveloppe d'attaque rapide (5ms)
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.005);

      source.connect(gain);
      gain.connect(this.masterGain!);

      source.start(now);

      const voice: AudioVoice = { source, gain };
      this.activeVoices.set(note, voice);

      // Nettoyage automatique en fin d'échantillon
      source.onended = () => {
        if (this.activeVoices.get(note) === voice) {
          this.activeVoices.delete(note);
        }
        try {
          source.disconnect();
          gain.disconnect();
        } catch { /* noop */ }
      };
    });
  }

  noteOff(note: string): void {
    const voice = this.activeVoices.get(note);
    if (!voice) return;

    this.activeVoices.delete(note);
    this.ngZone.runOutsideAngular(() => {
      this.stopVoice(voice, 0.18);
    });
  }

  allNotesOff(): void {
    this.ngZone.runOutsideAngular(() => {
      for (const [, voice] of this.activeVoices) {
        this.stopVoice(voice, 0.1);
      }
      this.activeVoices.clear();
    });
  }

  setMuted(muted: boolean): void {
    this._isMuted.set(muted);
    if (muted) this.allNotesOff();
  }

  toggleMute(): void {
    this.setMuted(!this._isMuted());
  }

  setVolume(v: number): void {
    if (!this.masterGain || !this.ctx) return;
    const val = Math.min(1, Math.max(0, v));
    this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.01);
  }

  // ═══════════════════════════════════════════════════════
  // OUTILS INTERNES
  // ═══════════════════════════════════════════════════════
  private stopVoice(voice: AudioVoice, releaseSec: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.linearRampToValueAtTime(0, now + releaseSec);
      voice.source.stop(now + releaseSec + 0.01);
    } catch {
      // Déjà arrêtée
    }
  }

  // Ajouter à PianoAudioService
getCurrentTime(): number {
  return this.ctx?.currentTime ?? 0;
}

/** Joue une note pendant une durée précise (pour le playback de partition) */
playNoteFor(note: string, durationSec: number, velocity = 0.85): void {
  this.noteOn(note, velocity);
  setTimeout(() => this.noteOff(note), durationSec * 1000);
}

  ngOnDestroy(): void {
    this.allNotesOff();
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
  }
} 