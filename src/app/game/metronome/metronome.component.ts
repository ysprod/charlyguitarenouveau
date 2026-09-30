import {
  Component,
  HostListener,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  GameResults,
  TapRecord,
  BeatResult,
  GameState,
  DifficultyMode,
  DifficultyConfig,
  SessionHistory
} from '../../models/metronome-challenge.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-metronome',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './metronome.component.html',
  styleUrls: ['./metronome.component.scss']
})
export class MetronomeComponent implements OnInit, OnDestroy {

  // ============================================================
  // CONFIGURATION
  // ============================================================
  bpm: number = 100;
  totalBeatsToPlay: number = 16;
  beatsPerBar: number = 4;
  difficulty: DifficultyMode = 'NORMAL';
  latencyOffsetMs: number = 0;      // compensation manuelle (audio output delay)
  subdivision: 1 | 2 | 4 = 1;       // 1 = temps, 2 = croches, 4 = doubles

  // ============================================================
  // MODES DE DIFFICULTÉ
  // ============================================================
  difficulties: DifficultyConfig[] = [
    {
      mode: 'EASY', label: 'Facile', emoji: '🌱',
      perfectThreshold: 50, greatThreshold: 100, okThreshold: 150,
      description: 'Tolérance large — pour découvrir'
    },
    {
      mode: 'NORMAL', label: 'Normal', emoji: '🎯',
      perfectThreshold: 25, greatThreshold: 50, okThreshold: 90,
      description: 'Équilibré — pour progresser'
    },
    {
      mode: 'HARD', label: 'Difficile', emoji: '🔥',
      perfectThreshold: 15, greatThreshold: 30, okThreshold: 60,
      description: 'Précision requise — pour affiner'
    },
    {
      mode: 'EXPERT', label: 'Expert', emoji: '💎',
      perfectThreshold: 8, greatThreshold: 18, okThreshold: 40,
      description: 'Millimétrique — pour les pros'
    }
  ];

  get currentDifficulty(): DifficultyConfig {
    return this.difficulties.find(d => d.mode === this.difficulty)!;
  }

  // ============================================================
  // ÉTAT DU JEU
  // ============================================================
  gameState: GameState = 'IDLE';
  countdownValue: number = 4;
  currentBeatIndex: number = 0;
  currentSubBeat: number = 0;
  isBarAccent: boolean = true;

  // ============================================================
  // CHRONOMÉTRAGE
  // ============================================================
  private startTime: number = 0;
  private intervalId: any = null;
  private countdownIntervalId: any = null;
  private lastTapTime: number = 0;
  private animationFrameId: number | null = null;

  // ============================================================
  // RÉSULTATS
  // ============================================================
  tapRecords: TapRecord[] = [];
  beatResults: BeatResult[] = [];
  gameResults: GameResults | null = null;
  liveScore: number = 0;
  liveStreak: number = 0;
  bestStreak: number = 0;

  // Persistance
  bestScoreEver: number = 0;
  bestAvgDeltaEver: number = 0;
  sessions: SessionHistory[] = [];

  // Audio
  private audioCtx: AudioContext | null = null;

  // ============================================================
  // CYCLE DE VIE
  // ============================================================
  ngOnInit(): void {
    this.loadPersistedData();
  }

  ngOnDestroy(): void {
    this.stopGame();
    this.audioCtx?.close();
  }

  private loadPersistedData(): void {
    try {
      this.bestScoreEver = Number(localStorage.getItem('metronome_bestScore') || 0);
      this.bestAvgDeltaEver = Number(localStorage.getItem('metronome_bestAvg') || 0);
      const raw = localStorage.getItem('metronome_sessions');
      this.sessions = raw ? JSON.parse(raw) : [];
    } catch { /* ignore */ }
  }

  private persistResults(): void {
    if (!this.gameResults) return;

    if (this.gameResults.scorePercentage > this.bestScoreEver) {
      this.bestScoreEver = this.gameResults.scorePercentage;
      localStorage.setItem('metronome_bestScore', String(this.bestScoreEver));
    }

    if (
      this.bestAvgDeltaEver === 0 ||
      (this.gameResults.avgDeltaMs > 0 && this.gameResults.avgDeltaMs < this.bestAvgDeltaEver)
    ) {
      this.bestAvgDeltaEver = this.gameResults.avgDeltaMs;
      localStorage.setItem('metronome_bestAvg', String(this.bestAvgDeltaEver));
    }

    const session: SessionHistory = {
      date: new Date().toISOString(),
      bpm: this.bpm,
      score: this.gameResults.scorePercentage,
      accuracy: this.gameResults.avgDeltaMs,
      difficulty: this.difficulty
    };
    this.sessions.unshift(session);
    this.sessions = this.sessions.slice(0, 10); // garde les 10 dernières
    localStorage.setItem('metronome_sessions', JSON.stringify(this.sessions));
  }

  // ============================================================
  // CLAVIER
  // ============================================================
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      if (this.gameState === 'PLAYING') {
        this.registerTap();
      } else if (this.gameState === 'IDLE') {
        this.startGame();
      } else if (this.gameState === 'FINISHED') {
        this.gameState = 'IDLE';
      }
    }
    if (event.code === 'Escape' && this.gameState === 'PLAYING') {
      this.abortGame();
    }
  }

  // ============================================================
  // DÉMARRAGE
  // ============================================================
  startGame(): void {
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.gameState = 'COUNTDOWN';
    this.countdownValue = 4;
    this.tapRecords = [];
    this.beatResults = [];
    this.gameResults = null;
    this.currentBeatIndex = 0;
    this.currentSubBeat = 0;
    this.liveScore = 0;
    this.liveStreak = 0;
    this.bestStreak = 0;

    const beatIntervalMs = (60 / this.bpm) * 1000;

    this.playClickSound(880, 0.12, 0.04);
    this.countdownIntervalId = setInterval(() => {
      this.countdownValue--;
      if (this.countdownValue > 0) {
        this.playClickSound(880, 0.12, 0.04);
      } else {
        clearInterval(this.countdownIntervalId);
        this.launchPlayback(beatIntervalMs);
      }
    }, beatIntervalMs);
  }

  private launchPlayback(beatIntervalMs: number): void {
    this.gameState = 'PLAYING';
    // Petit délai pour laisser l'UI se stabiliser
    setTimeout(() => {
      this.startTime = performance.now();
      this.currentBeatIndex = 0;
      this.currentSubBeat = 0;
      this.playClickSound(1320, 0.18, 0.05);

      // Grille de référence : on programme tous les clics à l'avance
      const totalSubBeats = this.totalBeatsToPlay * this.subdivision;
      const subInterval = beatIntervalMs / this.subdivision;

      for (let i = 0; i < totalSubBeats; i++) {
        const beatIdx = Math.floor(i / this.subdivision);
        const subIdx = i % this.subdivision;
        const isBarStart = beatIdx % this.beatsPerBar === 0 && subIdx === 0;
        const freq = isBarStart ? 1320 : (subIdx === 0 ? 990 : 660);
        const delay = i * subInterval;
        setTimeout(() => {
          if (this.gameState === 'PLAYING') {
            this.playClickSound(freq, isBarStart ? 0.2 : 0.12, 0.04);
            this.currentBeatIndex = beatIdx;
            this.currentSubBeat = subIdx;
            this.isBarAccent = isBarStart;
          }
        }, delay);
      }

      // Fin de partie
      setTimeout(() => {
        if (this.gameState === 'PLAYING') this.finishGame();
      }, totalSubBeats * subInterval + 200);
    }, 50);
  }

  // ============================================================
  // ENREGISTREMENT D'UN TAP
  // ============================================================
  registerTap(): void {
    if (this.gameState !== 'PLAYING') return;

    const now = performance.now();
    const elapsedTime = now - this.startTime - this.latencyOffsetMs;
    const beatIntervalMs = (60 / this.bpm) * 1000;
    const subInterval = beatIntervalMs / this.subdivision;

    // Beat attendu le plus proche (en subdiv)
    const estimatedSubIndex = Math.round(elapsedTime / subInterval);
    const expectedTime = estimatedSubIndex * subInterval;
    const deltaMs = elapsedTime - expectedTime;

    // Anti-double-tap : 80 ms minimum entre deux taps
    if (now - this.lastTapTime < 80) return;
    this.lastTapTime = now;

    // Éviter doublons sur le même sub-beat
    const alreadyRecorded = this.tapRecords.some(
      r => r.beatNumber === estimatedSubIndex
    );
    if (alreadyRecorded) return;

    const absDelta = Math.abs(deltaMs);
    const cfg = this.currentDifficulty;
    let accuracy: TapRecord['accuracy'] = 'MISSED';

    if (absDelta <= cfg.perfectThreshold) accuracy = 'PERFECT';
    else if (absDelta <= cfg.greatThreshold) accuracy = 'GREAT';
    else if (absDelta <= cfg.okThreshold) accuracy = 'OK';
    else accuracy = deltaMs > 0 ? 'LATE' : 'EARLY';

    this.tapRecords.push({
      beatNumber: estimatedSubIndex,
      expectedTime,
      actualTime: elapsedTime,
      deltaMs: Math.round(deltaMs),
      accuracy
    });

    // Score live
    if (accuracy === 'PERFECT') {
      this.liveScore += 100;
      this.liveStreak++;
    } else if (accuracy === 'GREAT') {
      this.liveScore += 75;
      this.liveStreak++;
    } else if (accuracy === 'OK') {
      this.liveScore += 40;
      this.liveStreak++;
    } else {
      this.liveScore = Math.max(0, this.liveScore - 20);
      this.liveStreak = 0;
    }

    this.bestStreak = Math.max(this.bestStreak, this.liveStreak);
  }

  // ============================================================
  // FIN DE PARTIE
  // ============================================================
  private finishGame(): void {
    this.stopGame();
    this.gameState = 'FINISHED';
    this.buildBeatResults();
    this.calculateResults();
    this.persistResults();
  }

  abortGame(): void {
    this.stopGame();
    this.gameState = 'IDLE';
    this.tapRecords = [];
    this.beatResults = [];
  }

  private stopGame(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.countdownIntervalId) clearInterval(this.countdownIntervalId);
    this.intervalId = null;
    this.countdownIntervalId = null;
  }

  // ============================================================
  // CONSTRUCTION DES RÉSULTATS PAR BEAT (avec taps manqués)
  // ============================================================
  private buildBeatResults(): void {
    this.beatResults = [];
    const totalSub = this.totalBeatsToPlay * this.subdivision;

    for (let i = 0; i < totalSub; i++) {
      const tap = this.tapRecords.find(r => r.beatNumber === i);
      if (tap) {
        this.beatResults.push({
          beatNumber: i,
          expectedTime: tap.expectedTime,
          actualTime: tap.actualTime,
          deltaMs: tap.deltaMs,
          accuracy: tap.accuracy
        });
      } else {
        this.beatResults.push({
          beatNumber: i,
          expectedTime: i * ((60 / this.bpm) * 1000 / this.subdivision),
          actualTime: null,
          deltaMs: null,
          accuracy: 'MISSED'
        });
      }
    }
  }

  // ============================================================
  // CALCUL DES STATS
  // ============================================================
  private calculateResults(): void {
    const totalBeats = this.totalBeatsToPlay * this.subdivision;

    if (this.tapRecords.length === 0) {
      this.gameResults = {
        totalBeats,
        playedBeats: 0,
        missedBeats: totalBeats,
        scorePercentage: 0,
        avgDeltaMs: 0,
        medianDeltaMs: 0,
        stdDeviationMs: 0,
        bestDeltaMs: 0,
        worstDeltaMs: 0,
        perfectCount: 0,
        greatCount: 0,
        okCount: 0,
        rankTitle: 'Rythmeur Fantôme',
        rankEmoji: '👻',
        isNewRecord: false
      };
      return;
    }

    const perfects = this.tapRecords.filter(r => r.accuracy === 'PERFECT').length;
    const greats = this.tapRecords.filter(r => r.accuracy === 'GREAT').length;
    const oks = this.tapRecords.filter(r => r.accuracy === 'OK').length;

    // Score pondéré
    const scorePoints = perfects * 100 + greats * 75 + oks * 40;
    const maxPoints = totalBeats * 100;
    const scorePercentage = Math.min(100, Math.round((scorePoints / maxPoints) * 100));

    // Deltas absolus
    const deltas = this.tapRecords.map(r => Math.abs(r.deltaMs));
    const totalDelta = deltas.reduce((a, b) => a + b, 0);
    const avgDeltaMs = Math.round(totalDelta / deltas.length);

    // Médiane
    const sorted = [...deltas].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const medianDeltaMs = sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];

    // Écart-type
    const variance = deltas.reduce((acc, d) => acc + Math.pow(d - avgDeltaMs, 2), 0) / deltas.length;
    const stdDeviationMs = Math.round(Math.sqrt(variance));

    const bestDeltaMs = Math.min(...deltas);
    const worstDeltaMs = Math.max(...deltas);

    // Rang
    let rankTitle = 'Débutant Rythmique';
    let rankEmoji = '🥁';
    if (scorePercentage >= 95) { rankTitle = 'Horloge Suisse'; rankEmoji = '⏱️'; }
    else if (scorePercentage >= 85) { rankTitle = 'Groove Master'; rankEmoji = '🎸'; }
    else if (scorePercentage >= 70) { rankTitle = 'Batteur Solide'; rankEmoji = '🥁'; }
    else if (scorePercentage >= 50) { rankTitle = 'Apprenti Rythmique'; rankEmoji = '🎵'; }
    else if (scorePercentage >= 25) { rankTitle = 'En Progrès'; rankEmoji = '📈'; }

    const isNewRecord = scorePercentage > this.bestScoreEver;

    this.gameResults = {
      totalBeats,
      playedBeats: this.tapRecords.length,
      missedBeats: totalBeats - this.tapRecords.length,
      scorePercentage,
      avgDeltaMs,
      medianDeltaMs,
      stdDeviationMs,
      bestDeltaMs,
      worstDeltaMs,
      perfectCount: perfects,
      greatCount: greats,
      okCount: oks,
      rankTitle,
      rankEmoji,
      isNewRecord
    };
  }

  // ============================================================
  // AUDIO
  // ============================================================
  private playClickSound(freq: number, gainValue: number = 0.15, duration: number = 0.04): void {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(gainValue, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain).connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) { /* silent */ }
  }

  // ============================================================
  // HELPERS POUR LE TEMPLATE
  // ============================================================
  get progressPercent(): number {
    const total = this.totalBeatsToPlay * this.subdivision;
    return total === 0 ? 0 : (this.currentBeatIndex * this.subdivision + this.currentSubBeat) / total * 100;
  }

  get liveAccuracy(): number {
    const played = this.tapRecords.length;
    if (played === 0) return 0;
    const good = this.tapRecords.filter(r => r.accuracy !== 'MISSED' && r.accuracy !== 'EARLY' && r.accuracy !== 'LATE').length;
    return Math.round((good / played) * 100);
  }

  get beatLabel(): string {
    return `Temps ${this.currentBeatIndex + 1} / ${this.totalBeatsToPlay}`;
  }

  get subBeatLabel(): string {
    if (this.subdivision === 1) return '';
    return `· ${this.currentSubBeat + 1}/${this.subdivision}`;
  }

  resetToIdle(): void {
    this.gameState = 'IDLE';
    this.gameResults = null;
    this.tapRecords = [];
    this.beatResults = [];
  }

  clearHistory(): void {
    this.sessions = [];
    localStorage.removeItem('metronome_sessions');
  }

  /**
 * Calcule la hauteur de la barre (0-100%) à partir du décalage en ms.
 * Utilisé dans le template car `Math` n'est pas accessible en Angular.
 */
  getBeatBarHeight(deltaMs: number | null): number {
    if (deltaMs === null) return 100; // tap manqué → barre pleine
    return Math.min(100, Math.abs(deltaMs));
  }
}