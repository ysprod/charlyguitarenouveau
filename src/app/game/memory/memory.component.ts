import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ChordShape, MolkkyGameState, Difficulty } from '../../models/memory-chord.model';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */
type SoundType = 'hit' | 'miss' | 'win' | 'over' | 'click' | 'tick';
type FeedbackType = 'success' | 'error';

interface PinState {
  chord: ChordShape;
  isDown: boolean;
  isRevealed: boolean;
  isShaking: boolean;
}

interface DifficultyConfig {
  id: Difficulty;
  nom: string;
  icone: string;
  description: string;
  couleur: string;
  strikeLimit: number;
  timeMultiplier: number;
  pinCount: number;
}

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */
@Component({
  selector: 'app-memory',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memory.component.html',
  styleUrls: ['./memory.component.scss']
})
export class MemoryComponent implements OnInit, OnDestroy {

  private readonly router = inject(Router);

  /* ═══════════════════════════════════════════════════════════════════
     CATALOGUE D'ACCORDS (Méthode Charly Guitare)
     ═══════════════════════════════════════════════════════════════════ */
  readonly chordCatalog: ChordShape[] = [
    // Facile
    { id: '1', name: 'C',  fullName: 'Do Majeur',    frets: [-1, 3, 2, 0, 1, 0], baseFret: 1, points: 1,  difficulty: 'facile',    category: 'majeur' },
    { id: '2', name: 'Am', fullName: 'La mineur',    frets: [-1, 0, 2, 2, 1, 0], baseFret: 1, points: 2,  difficulty: 'facile',    category: 'mineur' },
    { id: '3', name: 'G',  fullName: 'Sol Majeur',   frets: [ 3, 2, 0, 0, 0, 3], baseFret: 1, points: 3,  difficulty: 'facile',    category: 'majeur' },
    { id: '4', name: 'Em', fullName: 'Mi mineur',    frets: [ 0, 2, 2, 0, 0, 0], baseFret: 1, points: 4,  difficulty: 'facile',    category: 'mineur' },
    // Normal
    { id: '5', name: 'Dm', fullName: 'Ré mineur',    frets: [-1, -1, 0, 2, 3, 1], baseFret: 1, points: 5, difficulty: 'normal',    category: 'mineur' },
    { id: '6', name: 'E',  fullName: 'Mi Majeur',    frets: [ 0, 2, 2, 1, 0, 0],  baseFret: 1, points: 6, difficulty: 'normal',    category: 'majeur' },
    { id: '7', name: 'A',  fullName: 'La Majeur',    frets: [-1, 0, 2, 2, 2, 0],  baseFret: 1, points: 7, difficulty: 'normal',    category: 'majeur' },
    { id: '8', name: 'D',  fullName: 'Ré Majeur',    frets: [-1, -1, 0, 2, 3, 2], baseFret: 1, points: 8, difficulty: 'normal',    category: 'majeur' },
    // Difficile
    { id: '9',  name: 'F',  fullName: 'Fa Majeur',   frets: [1, 3, 3, 2, 1, 1],  baseFret: 1, points: 9,  difficulty: 'difficile', category: 'majeur' },
    { id: '10', name: 'B7', fullName: 'Si 7ème',     frets: [-1, 2, 1, 2, 0, 2], baseFret: 1, points: 10, difficulty: 'difficile', category: 'septieme' },
    { id: '11', name: 'C7', fullName: 'Do 7ème',     frets: [-1, 3, 2, 3, 1, 0], baseFret: 1, points: 11, difficulty: 'difficile', category: 'septieme' },
    { id: '12', name: 'G7', fullName: 'Sol 7ème',    frets: [3, 2, 0, 0, 0, 1],  baseFret: 1, points: 12, difficulty: 'difficile', category: 'septieme' }
  ];

  /* ═══════════════════════════════════════════════════════════════════
     CONFIGURATION PAR DIFFICULTÉ
     ═══════════════════════════════════════════════════════════════════ */
  readonly difficulties: DifficultyConfig[] = [
    {
      id: 'facile',
      nom: 'FACILE',
      icone: '🌱',
      description: '6 accords simples · Timer lent · 5 erreurs autorisées',
      couleur: '#10b981',
      strikeLimit: 5,
      timeMultiplier: 0.6,
      pinCount: 6
    },
    {
      id: 'normal',
      nom: 'NORMAL',
      icone: '⚡',
      description: '9 accords · Timer moyen · 3 erreurs autorisées',
      couleur: '#f59e0b',
      strikeLimit: 3,
      timeMultiplier: 1,
      pinCount: 9
    },
    {
      id: 'difficile',
      nom: 'DIFFICILE',
      icone: '🔥',
      description: '12 accords · Timer rapide · 2 erreurs autorisées',
      couleur: '#ef4444',
      strikeLimit: 2,
      timeMultiplier: 0.5,
      pinCount: 12
    }
  ];

  /* ═══════════════════════════════════════════════════════════════════
     ÉTAT DE JEU (signals)
     ═══════════════════════════════════════════════════════════════════ */
  readonly pins = signal<PinState[]>([]);
  readonly score = signal(0);
  readonly strikes = signal(0);
  readonly targetChord = signal<ChordShape | null>(null);
  readonly isPlaying = signal(false);
  readonly isGameOver = signal(false);
  readonly isVictory = signal(false);
  readonly difficulty = signal<Difficulty>('normal');
  readonly timeLeft = signal(100);
  readonly roundNumber = signal(0);
  readonly perfectRounds = signal(0);
  readonly feedbackMessage = signal<string | null>(null);
  readonly feedbackType = signal<FeedbackType>('success');
  readonly particles = signal<number[]>([]);

  /* ─── Computed ─── */
  readonly currentDifficulty = computed<DifficultyConfig>(() => {
    const id = this.difficulty();
    return this.difficulties.find(d => d.id === id) ?? this.difficulties[1];
  });

  readonly strikeLimit = computed(() => this.currentDifficulty().strikeLimit);

  readonly strikeArray = computed(() =>
    Array.from({ length: this.strikeLimit() }, (_, i) => i)
  );

  readonly hasCombo = computed(() => this.perfectRounds() >= 3);

  readonly timerColor = computed(() => {
    const t = this.timeLeft();
    if (t < 20) return 'linear-gradient(90deg, #ef4444, #dc2626)';
    if (t < 50) return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
    return 'linear-gradient(90deg, #10b981, #06b6d4)';
  });

  readonly showNoteLabels = computed(() => this.difficulty() !== 'difficile');

  /* ─── Constantes privées ─── */
  private readonly MAX_TIME = 100;
  private readonly SCORE_TARGET = 50;
  private readonly SCORE_PENALTY = 25;

  /* ─── Ressources ─── */
  private audioCtx?: AudioContext;
  private timerInterval?: ReturnType<typeof setInterval>;
  private feedbackTimeout?: ReturnType<typeof setTimeout>;
  private particlesTimeout?: ReturnType<typeof setTimeout>;

  /* ═══════════════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════════════ */
  ngOnInit(): void {
    this.initAudio();
    this.loadDifficulty();
  }

  ngOnDestroy(): void {
    clearInterval(this.timerInterval);
    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
    if (this.particlesTimeout) clearTimeout(this.particlesTimeout);
    this.audioCtx?.close();
  }

  /* ═══════════════════════════════════════════════════════════════════
     AUDIO (Web Audio API — aucune dépendance)
     ═══════════════════════════════════════════════════════════════════ */
  private initAudio(): void {
    const Ctor = window.AudioContext
      || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctor) this.audioCtx = new Ctor();
  }

  private playSound(type: SoundType): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => { /* ignore */ });
    }

    const now = this.audioCtx.currentTime;

    switch (type) {
      case 'hit':
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          this.tone({ freq, type: 'triangle', duration: 0.25, volume: 0.18, now: now + idx * 0.06 });
        });
        break;

      case 'miss':
        this.tone({ freq: 180, endFreq: 90, type: 'sawtooth', duration: 0.25, volume: 0.2, now });
        break;

      case 'win':
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          this.tone({ freq, type: 'sine', duration: 0.4, volume: 0.2, now: now + idx * 0.1 });
        });
        break;

      case 'over':
        [392, 349.23, 329.63, 261.63].forEach((freq, idx) => {
          this.tone({ freq, type: 'sawtooth', duration: 0.3, volume: 0.2, now: now + idx * 0.15 });
        });
        break;

      case 'click':
        this.tone({ freq: 880, type: 'sine', duration: 0.08, volume: 0.1, now });
        break;

      case 'tick':
        this.tone({ freq: 1200, type: 'square', duration: 0.05, volume: 0.05, now });
        break;
    }
  }

  private tone(opts: {
    freq: number;
    endFreq?: number;
    type: OscillatorType;
    duration: number;
    volume: number;
    now: number;
  }): void {
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = opts.type;
    osc.frequency.setValueAtTime(opts.freq, opts.now);

    if (opts.endFreq !== undefined) {
      osc.frequency.linearRampToValueAtTime(opts.endFreq, opts.now + opts.duration);
    }

    gain.gain.setValueAtTime(opts.volume, opts.now);
    gain.gain.exponentialRampToValueAtTime(0.001, opts.now + opts.duration);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(opts.now);
    osc.stop(opts.now + opts.duration + 0.05);
  }

  /* ═══════════════════════════════════════════════════════════════════
     DIFFICULTÉ
     ═══════════════════════════════════════════════════════════════════ */
  private loadDifficulty(): void {
    const saved = localStorage.getItem('molkky_difficulty') as Difficulty | null;
    if (saved && this.difficulties.some(d => d.id === saved)) {
      this.difficulty.set(saved);
    }
  }

  setDifficulty(d: Difficulty): void {
    this.difficulty.set(d);
    localStorage.setItem('molkky_difficulty', d);
    this.playSound('click');
  }

  /* ═══════════════════════════════════════════════════════════════════
     DÉMARRAGE
     ═══════════════════════════════════════════════════════════════════ */
  startGame(): void {
    this.playSound('click');
    const config = this.currentDifficulty();

    /* Filtre selon la difficulté */
    const filtered = this.chordCatalog.filter(c => {
      const diff = this.difficulty();
      if (diff === 'facile') return c.difficulty === 'facile';
      if (diff === 'normal') return c.difficulty === 'facile' || c.difficulty === 'normal';
      return true;
    });

    const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, config.pinCount);

    this.pins.set(shuffled.map(chord => ({
      chord,
      isDown: false,
      isRevealed: false,
      isShaking: false
    })));

    this.score.set(0);
    this.strikes.set(0);
    this.targetChord.set(null);
    this.isPlaying.set(true);
    this.isGameOver.set(false);
    this.isVictory.set(false);
    this.timeLeft.set(this.MAX_TIME);
    this.roundNumber.set(0);
    this.perfectRounds.set(0);

    this.nextRound();
    this.startTimer();
  }

  /* ═══════════════════════════════════════════════════════════════════
     TIMER
     ═══════════════════════════════════════════════════════════════════ */
  private startTimer(): void {
    clearInterval(this.timerInterval);
    this.timeLeft.set(this.MAX_TIME);

    this.timerInterval = setInterval(() => {
      if (!this.isPlaying()) return;

      const multiplier = this.currentDifficulty().timeMultiplier;
      const next = this.timeLeft() - multiplier;
      this.timeLeft.set(next);

      /* Tick sonore quand < 30 */
      if (next < 30 && next > 0 && Math.floor(next) % 10 === 0) {
        this.playSound('tick');
      }

      if (next <= 0) {
        this.handleMiss(true);
      }
    }, 100);
  }

  /* ═══════════════════════════════════════════════════════════════════
     MANCHE
     ═══════════════════════════════════════════════════════════════════ */
  private nextRound(): void {
    const activePins = this.pins().filter(p => !p.isDown);
    if (activePins.length === 0) {
      this.checkEndCondition();
      return;
    }

    const randomIndex = Math.floor(Math.random() * activePins.length);
    this.targetChord.set(activePins[randomIndex].chord);
    this.roundNumber.update(n => n + 1);
    this.timeLeft.set(this.MAX_TIME);

    /* Reset visuel */
    this.pins.update(pins => pins.map(p => ({ ...p, isRevealed: false })));
  }

  /* ═══════════════════════════════════════════════════════════════════
     INTERACTION
     ═══════════════════════════════════════════════════════════════════ */
  onPinClick(pin: PinState, index: number): void {
    if (!this.isPlaying() || pin.isDown) return;

    /* Marque la quille comme révélée */
    this.pins.update(pins => pins.map((p, i) =>
      i === index ? { ...p, isRevealed: true } : p
    ));

    if (pin.chord.id === this.targetChord()?.id) {
      /* ✅ Succès */
      this.pins.update(pins => pins.map((p, i) =>
        i === index ? { ...p, isDown: true, isRevealed: true } : p
      ));

      this.strikes.set(0);
      this.perfectRounds.update(n => n + 1);

      const comboBonus = this.perfectRounds() >= 3 ? 1.5 : 1;
      const points = Math.round(pin.chord.points * comboBonus);
      const newScore = this.score() + points;
      this.score.set(newScore);

      this.playSound('hit');
      this.triggerParticles();
      this.showFeedback(`EXCELLENT ! +${points} PTS`, 'success');

      if (newScore === this.SCORE_TARGET) {
        this.endGame(true);
        return;
      }
      if (newScore > this.SCORE_TARGET) {
        this.score.set(this.SCORE_PENALTY);
        this.showFeedback(`DÉPASSÉ ! RETOUR À ${this.SCORE_PENALTY} PTS`, 'error');
      }

      setTimeout(() => this.nextRound(), 400);

    } else {
      /* ❌ Échec */
      this.pins.update(pins => pins.map((p, i) =>
        i === index ? { ...p, isShaking: true } : p
      ));

      setTimeout(() => {
        this.pins.update(pins => pins.map((p, i) =>
          i === index ? { ...p, isShaking: false, isRevealed: false } : p
        ));
      }, 800);

      this.handleMiss(false);
    }
  }

  private handleMiss(isTimeout: boolean): void {
    this.strikes.update(n => n + 1);
    this.perfectRounds.set(0);
    this.playSound('miss');

    const remaining = this.strikeLimit() - this.strikes();
    this.showFeedback(
      isTimeout
        ? `TEMPS ÉCOULÉ ! (${remaining} essai${remaining > 1 ? 's' : ''})`
        : `RATÉ ! (${remaining} essai${remaining > 1 ? 's' : ''})`,
      'error'
    );

    if (this.strikes() >= this.strikeLimit()) {
      this.endGame(false);
    } else {
      setTimeout(() => {
        this.nextRound();
        this.startTimer();
      }, 500);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     CONDITIONS DE FIN
     ═══════════════════════════════════════════════════════════════════ */
  private checkEndCondition(): void {
    const remaining = this.pins().filter(p => !p.isDown).length;
    if (remaining === 0) {
      this.endGame(this.score() === this.SCORE_TARGET);
    }
  }

  private endGame(isVictory: boolean): void {
    clearInterval(this.timerInterval);
    this.isPlaying.set(false);
    this.isGameOver.set(!isVictory);
    this.isVictory.set(isVictory);
    this.playSound(isVictory ? 'win' : 'over');

    if (isVictory) this.triggerParticles();
  }

  /* ═══════════════════════════════════════════════════════════════════
     UI HELPERS
     ═══════════════════════════════════════════════════════════════════ */
  private showFeedback(msg: string, type: FeedbackType): void {
    if (this.feedbackTimeout) clearTimeout(this.feedbackTimeout);
    this.feedbackMessage.set(msg);
    this.feedbackType.set(type);
    this.feedbackTimeout = setTimeout(() => this.feedbackMessage.set(null), 1000);
  }

  private triggerParticles(): void {
    if (this.particlesTimeout) clearTimeout(this.particlesTimeout);
    this.particles.set(Array.from({ length: 24 }, (_, i) => i));
    this.particlesTimeout = setTimeout(() => this.particles.set([]), 1500);
  }

  /* ═══════════════════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════════════════ */
  goToPlay(): void {
    this.router.navigate(['/play']);
  }
}