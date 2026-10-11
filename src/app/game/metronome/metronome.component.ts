import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { fromEvent, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  BeatResult,
  DifficultyConfig,
  DifficultyMode,
  GameResults,
  GameState,
  SessionHistory,
  TapRecord
} from '../../models/metronome-challenge.model';

import {
  METRONOME_BEAT_OPTIONS,
  METRONOME_BPM_PRESETS,
  METRONOME_DEFAULTS,
  METRONOME_DIFFICULTIES,
  METRONOME_HISTORY_LIMIT,
  METRONOME_LIMITS,
  METRONOME_RANKS,
  METRONOME_SCORING,
  METRONOME_SOUNDS,
  METRONOME_STORAGE_KEYS,
  METRONOME_SUBDIVISION_OPTIONS
} from '../../constants/metronome.constants';

import { MetronomeAudioService } from '../../services/metronome-audio.service';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-metronome',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './metronome.component.html',
  styleUrls: ['./metronome.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetronomeComponent implements OnInit, OnDestroy {

  /* ─── Injection ─── */
  private readonly router = inject(Router);
  private readonly audio = inject(MetronomeAudioService);
  private readonly storage = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);

  /* ─── Constantes exposées au template ─── */
  readonly difficulties = METRONOME_DIFFICULTIES;
  readonly bpmPresets = METRONOME_BPM_PRESETS;
  readonly beatOptions = METRONOME_BEAT_OPTIONS;
  readonly subdivisionOptions = METRONOME_SUBDIVISION_OPTIONS;
  readonly limits = METRONOME_LIMITS;

  /* ─── Configuration (signals) ─── */
  readonly bpm = signal(METRONOME_DEFAULTS.BPM);
  readonly totalBeatsToPlay = signal(METRONOME_DEFAULTS.TOTAL_BEATS);
  readonly beatsPerBar = signal(METRONOME_DEFAULTS.BEATS_PER_BAR);
  readonly difficulty = signal<DifficultyMode>('NORMAL');
  readonly latencyOffsetMs = signal(METRONOME_DEFAULTS.LATENCY_OFFSET_MS);
  readonly subdivision = signal<1 | 2 | 4>(1);

  /* ─── État du jeu ─── */
  readonly gameState = signal<GameState>('IDLE');
  readonly countdownValue = signal(METRONOME_DEFAULTS.COUNTDOWN_SECONDS);
  readonly currentBeatIndex = signal(0);
  readonly currentSubBeat = signal(0);
  readonly isBarAccent = signal(true);

  /* ─── Résultats en cours ─── */
  readonly tapRecords = signal<TapRecord[]>([]);
  readonly beatResults = signal<BeatResult[]>([]);
  readonly gameResults = signal<GameResults | null>(null);
  readonly liveScore = signal(0);
  readonly liveStreak = signal(0);
  readonly bestStreak = signal(0);

  /* ─── Persistance ─── */
  readonly bestScoreEver = signal(0);
  readonly bestAvgDeltaEver = signal(0);
  readonly sessions = signal<SessionHistory[]>([]);
  readonly soundEnabled = signal(true);

  /* ─── Computed ─── */
  readonly currentDifficulty = computed<DifficultyConfig>(() => {
    const mode = this.difficulty();
    return this.difficulties.find(d => d.mode === mode) ?? this.difficulties[1];
  });

  readonly progressPercent = computed(() => {
    const total = this.totalBeatsToPlay() * this.subdivision();
    if (total === 0) return 0;
    const current = this.currentBeatIndex() * this.subdivision() + this.currentSubBeat();
    return (current / total) * 100;
  });

  readonly liveAccuracy = computed(() => {
    const records = this.tapRecords();
    if (records.length === 0) return 0;
    const good = records.filter(r =>
      r.accuracy !== 'MISSED' && r.accuracy !== 'EARLY' && r.accuracy !== 'LATE'
    ).length;
    return Math.round((good / records.length) * 100);
  });

  readonly beatLabel = computed(
    () => `Temps ${this.currentBeatIndex() + 1} / ${this.totalBeatsToPlay()}`
  );

  readonly subBeatLabel = computed(() => {
    const sub = this.subdivision();
    if (sub === 1) return '';
    return `· ${this.currentSubBeat() + 1}/${sub}`;
  });

  /* ─── Timers & cleanup ─── */
  private startTime = 0;
  private lastTapTime = 0;
  private countdownIntervalId?: ReturnType<typeof setInterval>;
  private playbackTimeoutId?: ReturnType<typeof setTimeout>;
  private readonly scheduledUiTimeouts = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    /* Écoute clavier globale (Espace / Entrée / Échap) */
    fromEvent<KeyboardEvent>(window, 'keydown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.handleKeyDown(event));
  }

  ngOnInit(): void {
    this.loadPersistedData();
    this.loadSoundPreference();
  }

  ngOnDestroy(): void {
    this.stopAllTimers();
  }

  /* ═══════════════════════════════════════════════════════
     PERSISTANCE
     ═══════════════════════════════════════════════════════ */

  private loadPersistedData(): void {
    const bestScore = this.storage.getNumber(METRONOME_STORAGE_KEYS.BEST_SCORE, 0);
    const bestAvg = this.storage.getNumber(METRONOME_STORAGE_KEYS.BEST_AVG, 0);
    this.bestScoreEver.set(bestScore);
    this.bestAvgDeltaEver.set(bestAvg);

    const raw = this.storage.getString(METRONOME_STORAGE_KEYS.SESSIONS, '');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as SessionHistory[];
        this.sessions.set(parsed);
      } catch {
        this.sessions.set([]);
      }
    }
  }

  private loadSoundPreference(): void {
    const enabled = this.storage.getBoolean(METRONOME_STORAGE_KEYS.SOUND_ENABLED, true);
    this.soundEnabled.set(enabled);
  }

  private persistResults(): void {
    const results = this.gameResults();
    if (!results) return;

    if (results.scorePercentage > this.bestScoreEver()) {
      this.bestScoreEver.set(results.scorePercentage);
      this.storage.setNumber(METRONOME_STORAGE_KEYS.BEST_SCORE, results.scorePercentage);
    }

    if (
      this.bestAvgDeltaEver() === 0 ||
      (results.avgDeltaMs > 0 && results.avgDeltaMs < this.bestAvgDeltaEver())
    ) {
      this.bestAvgDeltaEver.set(results.avgDeltaMs);
      this.storage.setNumber(METRONOME_STORAGE_KEYS.BEST_AVG, results.avgDeltaMs);
    }

    const session: SessionHistory = {
      date: new Date().toISOString(),
      bpm: this.bpm(),
      score: results.scorePercentage,
      accuracy: results.avgDeltaMs,
      difficulty: this.difficulty()
    };

    const updated = [session, ...this.sessions()].slice(0, METRONOME_HISTORY_LIMIT);
    this.sessions.set(updated);
    this.storage.setString(METRONOME_STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
  }

  /* ═══════════════════════════════════════════════════════
     SON
     ═══════════════════════════════════════════════════════ */

  toggleSound(): void {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);
    this.storage.setBoolean(METRONOME_STORAGE_KEYS.SOUND_ENABLED, next);

    if (next) {
      this.audio.playClickImmediate(METRONOME_SOUNDS.BAR_START, 0.15, 0.05);
    }
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════ */

  goToPlay(): void {
    this.stopAllTimers();
    void this.router.navigate(['/play']);
  }

  /* ═══════════════════════════════════════════════════════
     CLAVIER
     ═══════════════════════════════════════════════════════ */

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      const state = this.gameState();
      if (state === 'PLAYING')      this.registerTap();
      else if (state === 'IDLE')    void this.startGame();
      else if (state === 'FINISHED') this.gameState.set('IDLE');
    }
    if (event.code === 'Escape' && this.gameState() === 'PLAYING') {
      this.abortGame();
    }
  }

  /* ═══════════════════════════════════════════════════════
     DÉMARRAGE
     ═══════════════════════════════════════════════════════ */

  async startGame(): Promise<void> {
    await this.audio.ensureReady();

    this.stopAllTimers();

    this.gameState.set('COUNTDOWN');
    this.countdownValue.set(METRONOME_DEFAULTS.COUNTDOWN_SECONDS);
    this.tapRecords.set([]);
    this.beatResults.set([]);
    this.gameResults.set(null);
    this.currentBeatIndex.set(0);
    this.currentSubBeat.set(0);
    this.liveScore.set(0);
    this.liveStreak.set(0);
    this.bestStreak.set(0);

    const beatIntervalMs = (60 / this.bpm()) * 1000;

    this.playCountdownClick();
    this.countdownIntervalId = setInterval(() => {
      const next = this.countdownValue() - 1;
      this.countdownValue.set(next);

      if (next > 0) {
        this.playCountdownClick();
      } else {
        clearInterval(this.countdownIntervalId);
        this.countdownIntervalId = undefined;
        this.launchPlayback(beatIntervalMs);
      }
    }, beatIntervalMs);
  }

  private playCountdownClick(): void {
    if (this.soundEnabled()) {
      this.audio.playClickImmediate(METRONOME_SOUNDS.COUNTDOWN, 0.12, 0.04);
    }
  }

  private launchPlayback(beatIntervalMs: number): void {
    this.gameState.set('PLAYING');

    this.playbackTimeoutId = setTimeout(() => {
      const sub = this.subdivision();
      const totalSubBeats = this.totalBeatsToPlay() * sub;
      const subIntervalMs = beatIntervalMs / sub;
      const subIntervalSec = subIntervalMs / 1000;

      this.startTime = performance.now();

      /* ─── Planifie TOUS les clics audio à l'avance ─── */
      if (this.soundEnabled()) {
        this.audio.scheduleSequence(
          totalSubBeats,
          subIntervalSec,
          (index) => this.resolveClickFreq(index)
        );
      }

      /* ─── Planifie les mises à jour UI (dots, labels) ─── */
      for (let i = 0; i < totalSubBeats; i++) {
        const beatIdx = Math.floor(i / sub);
        const subIdx = i % sub;
        const isBarStart = beatIdx % this.beatsPerBar() === 0 && subIdx === 0;
        const delayMs = i * subIntervalMs;

        const timeoutId = setTimeout(() => {
          this.scheduledUiTimeouts.delete(timeoutId);
          if (this.gameState() !== 'PLAYING') return;
          this.currentBeatIndex.set(beatIdx);
          this.currentSubBeat.set(subIdx);
          this.isBarAccent.set(isBarStart);
        }, delayMs);

        this.scheduledUiTimeouts.add(timeoutId);
      }

      /* ─── Fin de partie ─── */
      this.playbackTimeoutId = setTimeout(() => {
        if (this.gameState() === 'PLAYING') this.finishGame();
      }, totalSubBeats * subIntervalMs + 200);
    }, 50);
  }

  private resolveClickFreq(index: number): number {
    const sub = this.subdivision();
    const beatIdx = Math.floor(index / sub);
    const subIdx = index % sub;
    const isBarStart = beatIdx % this.beatsPerBar() === 0 && subIdx === 0;

    if (isBarStart) return METRONOME_SOUNDS.BAR_START;
    if (subIdx === 0) return METRONOME_SOUNDS.BEAT;
    return METRONOME_SOUNDS.SUB_BEAT;
  }

  /* ═══════════════════════════════════════════════════════
     TAP
     ═══════════════════════════════════════════════════════ */

  registerTap(): void {
    if (this.gameState() !== 'PLAYING') return;

    const now = performance.now();
    const elapsedTime = now - this.startTime - this.latencyOffsetMs();
    const beatIntervalMs = (60 / this.bpm()) * 1000;
    const subInterval = beatIntervalMs / this.subdivision();

    if (now - this.lastTapTime < METRONOME_DEFAULTS.TAP_DEBOUNCE_MS) return;
    this.lastTapTime = now;

    const estimatedSubIndex = Math.round(elapsedTime / subInterval);
    const expectedTime = estimatedSubIndex * subInterval;
    const deltaMs = elapsedTime - expectedTime;

    const records = this.tapRecords();
    if (records.some(r => r.beatNumber === estimatedSubIndex)) return;

    const accuracy = this.computeAccuracy(deltaMs);

    const record: TapRecord = {
      beatNumber: estimatedSubIndex,
      expectedTime,
      actualTime: elapsedTime,
      deltaMs: Math.round(deltaMs),
      accuracy
    };

    this.tapRecords.set([...records, record]);

    /* Mise à jour du score live */
    switch (accuracy) {
      case 'PERFECT':
        this.liveScore.update(s => s + METRONOME_SCORING.PERFECT_POINTS);
        this.liveStreak.update(s => s + 1);
        break;
      case 'GREAT':
        this.liveScore.update(s => s + METRONOME_SCORING.GREAT_POINTS);
        this.liveStreak.update(s => s + 1);
        break;
      case 'OK':
        this.liveScore.update(s => s + METRONOME_SCORING.OK_POINTS);
        this.liveStreak.update(s => s + 1);
        break;
      default:
        this.liveScore.update(s => Math.max(0, s - METRONOME_SCORING.MISSED_PENALTY));
        this.liveStreak.set(0);
    }

    if (this.liveStreak() > this.bestStreak()) {
      this.bestStreak.set(this.liveStreak());
    }
  }

  private computeAccuracy(deltaMs: number): TapRecord['accuracy'] {
    const cfg = this.currentDifficulty();
    const absDelta = Math.abs(deltaMs);

    if (absDelta <= cfg.perfectThreshold) return 'PERFECT';
    if (absDelta <= cfg.greatThreshold)   return 'GREAT';
    if (absDelta <= cfg.okThreshold)      return 'OK';
    return deltaMs > 0 ? 'LATE' : 'EARLY';
  }

  /* ═══════════════════════════════════════════════════════
     FIN DE PARTIE
     ═══════════════════════════════════════════════════════ */

  private finishGame(): void {
    this.stopAllTimers();
    this.gameState.set('FINISHED');
    this.buildBeatResults();
    this.calculateResults();
    this.persistResults();
  }

  abortGame(): void {
    this.stopAllTimers();
    this.gameState.set('IDLE');
    this.tapRecords.set([]);
    this.beatResults.set([]);
  }

  private stopAllTimers(): void {
    clearInterval(this.countdownIntervalId);
    clearTimeout(this.playbackTimeoutId);
    this.countdownIntervalId = undefined;
    this.playbackTimeoutId = undefined;

    this.scheduledUiTimeouts.forEach(id => clearTimeout(id));
    this.scheduledUiTimeouts.clear();
  }

  /* ═══════════════════════════════════════════════════════
     RÉSULTATS
     ═══════════════════════════════════════════════════════ */

  private buildBeatResults(): void {
    const totalSub = this.totalBeatsToPlay() * this.subdivision();
    const records = this.tapRecords();
    const subInterval = (60 / this.bpm()) * 1000 / this.subdivision();

    const results: BeatResult[] = [];
    for (let i = 0; i < totalSub; i++) {
      const tap = records.find(r => r.beatNumber === i);
      if (tap) {
        results.push({
          beatNumber: i,
          expectedTime: tap.expectedTime,
          actualTime: tap.actualTime,
          deltaMs: tap.deltaMs,
          accuracy: tap.accuracy
        });
      } else {
        results.push({
          beatNumber: i,
          expectedTime: i * subInterval,
          actualTime: null,
          deltaMs: null,
          accuracy: 'MISSED'
        });
      }
    }

    this.beatResults.set(results);
  }

  private calculateResults(): void {
    const totalBeats = this.totalBeatsToPlay() * this.subdivision();
    const records = this.tapRecords();

    if (records.length === 0) {
      this.gameResults.set(this.buildEmptyResults(totalBeats));
      return;
    }

    const perfects = records.filter(r => r.accuracy === 'PERFECT').length;
    const greats   = records.filter(r => r.accuracy === 'GREAT').length;
    const oks      = records.filter(r => r.accuracy === 'OK').length;

    const scorePoints = perfects * METRONOME_SCORING.PERFECT_POINTS
                      + greats   * METRONOME_SCORING.GREAT_POINTS
                      + oks      * METRONOME_SCORING.OK_POINTS;
    const maxPoints = totalBeats * METRONOME_SCORING.PERFECT_POINTS;
    const scorePercentage = Math.min(100, Math.round((scorePoints / maxPoints) * 100));

    const deltas = records.map(r => Math.abs(r.deltaMs));
    const totalDelta = deltas.reduce((a, b) => a + b, 0);
    const avgDeltaMs = Math.round(totalDelta / deltas.length);

    const sorted = [...deltas].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const medianDeltaMs = sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];

    const variance = deltas.reduce((acc, d) => acc + Math.pow(d - avgDeltaMs, 2), 0) / deltas.length;
    const stdDeviationMs = Math.round(Math.sqrt(variance));

    const bestDeltaMs = Math.min(...deltas);
    const worstDeltaMs = Math.max(...deltas);

    const rank = METRONOME_RANKS.find(r => scorePercentage >= r.minScore)
      ?? METRONOME_RANKS[METRONOME_RANKS.length - 1];

    const isNewRecord = scorePercentage > this.bestScoreEver();

    this.gameResults.set({
      totalBeats,
      playedBeats: records.length,
      missedBeats: totalBeats - records.length,
      scorePercentage,
      avgDeltaMs,
      medianDeltaMs,
      stdDeviationMs,
      bestDeltaMs,
      worstDeltaMs,
      perfectCount: perfects,
      greatCount: greats,
      okCount: oks,
      rankTitle: rank.title,
      rankEmoji: rank.emoji,
      isNewRecord
    });
  }

  private buildEmptyResults(totalBeats: number): GameResults {
    const rank = METRONOME_RANKS[METRONOME_RANKS.length - 1];
    return {
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
      rankTitle: rank.title,
      rankEmoji: rank.emoji,
      isNewRecord: false
    };
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS TEMPLATE
     ═══════════════════════════════════════════════════════ */

  resetToIdle(): void {
    this.gameState.set('IDLE');
    this.gameResults.set(null);
    this.tapRecords.set([]);
    this.beatResults.set([]);
  }

  clearHistory(): void {
    this.sessions.set([]);
    this.storage.remove(METRONOME_STORAGE_KEYS.SESSIONS);
  }

  getBeatBarHeight(deltaMs: number | null): number {
    if (deltaMs === null) return 100;
    return Math.min(100, Math.abs(deltaMs));
  }
}