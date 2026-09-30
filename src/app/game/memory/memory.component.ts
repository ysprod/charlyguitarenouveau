import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ChordShape, MolkkyGameState, Difficulty } from '../../models/memory-chord.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-memory',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './memory.component.html',
  styleUrls: ['./memory.component.scss']
})
export class MemoryComponent implements OnInit, OnDestroy {

  // ========== BASE DE DONNÉES D'ACCORDS (Méthode Charly Guitare) ==========
  chordCatalog: ChordShape[] = [
    // === NIVEAU FACILE ===
    { id: '1', name: 'C', fullName: 'Do Majeur', frets: [-1, 3, 2, 0, 1, 0], baseFret: 1, points: 1, difficulty: 'facile', category: 'majeur' },
    { id: '2', name: 'Am', fullName: 'La mineur', frets: [-1, 0, 2, 2, 1, 0], baseFret: 1, points: 2, difficulty: 'facile', category: 'mineur' },
    { id: '3', name: 'G', fullName: 'Sol Majeur', frets: [3, 2, 0, 0, 0, 3], baseFret: 1, points: 3, difficulty: 'facile', category: 'majeur' },
    { id: '4', name: 'Em', fullName: 'Mi mineur', frets: [0, 2, 2, 0, 0, 0], baseFret: 1, points: 4, difficulty: 'facile', category: 'mineur' },

    // === NIVEAU NORMAL ===
    { id: '5', name: 'Dm', fullName: 'Ré mineur', frets: [-1, -1, 0, 2, 3, 1], baseFret: 1, points: 5, difficulty: 'normal', category: 'mineur' },
    { id: '6', name: 'E', fullName: 'Mi Majeur', frets: [0, 2, 2, 1, 0, 0], baseFret: 1, points: 6, difficulty: 'normal', category: 'majeur' },
    { id: '7', name: 'A', fullName: 'La Majeur', frets: [-1, 0, 2, 2, 2, 0], baseFret: 1, points: 7, difficulty: 'normal', category: 'majeur' },
    { id: '8', name: 'D', fullName: 'Ré Majeur', frets: [-1, -1, 0, 2, 3, 2], baseFret: 1, points: 8, difficulty: 'normal', category: 'majeur' },

    // === NIVEAU DIFFICILE ===
    { id: '9', name: 'F', fullName: 'Fa Majeur (Barré)', frets: [1, 3, 3, 2, 1, 1], baseFret: 1, points: 9, difficulty: 'difficile', category: 'majeur' },
    { id: '10', name: 'B7', fullName: 'Si 7ème', frets: [-1, 2, 1, 2, 0, 2], baseFret: 1, points: 10, difficulty: 'difficile', category: 'septieme' },
    { id: '11', name: 'C7', fullName: 'Do 7ème', frets: [-1, 3, 2, 3, 1, 0], baseFret: 1, points: 11, difficulty: 'difficile', category: 'septieme' },
    { id: '12', name: 'G7', fullName: 'Sol 7ème', frets: [3, 2, 0, 0, 0, 1], baseFret: 1, points: 12, difficulty: 'difficile', category: 'septieme' }
  ];

  pins: { chord: ChordShape; isDown: boolean; isRevealed: boolean; isShaking: boolean }[] = [];
  filteredCatalog: ChordShape[] = [];

  gameState: MolkkyGameState = {
    score: 0,
    strikes: 0,
    targetChord: null,
    isPlaying: false,
    isGameOver: false,
    isVictory: false,
    difficulty: 'normal',
    timeLeft: 100,
    roundNumber: 0,
    perfectRounds: 0,
    bonusMultiplier: 1
  };

  feedbackMessage: string | null = null;
  feedbackType: 'success' | 'error' = 'success';
  particles: number[] = [];

  private audioCtx?: AudioContext;
  private timerInterval: any;
  private maxTime = 100;

  // Configuration par difficulté
  difficulties = [
    {
      id: 'facile' as Difficulty,
      nom: 'FACILE',
      icone: '🌱',
      description: '6 accords simples • Timer lent • 5 erreurs autorisées',
      couleur: '#10b981',
      strikeLimit: 5,
      timeMultiplier: 0.6,
      pinCount: 6
    },
    {
      id: 'normal' as Difficulty,
      nom: 'NORMAL',
      icone: '⚡',
      description: '9 accords • Timer moyen • 3 erreurs autorisées',
      couleur: '#f59e0b',
      strikeLimit: 3,
      timeMultiplier: 1,
      pinCount: 9
    },
    {
      id: 'difficile' as Difficulty,
      nom: 'DIFFICILE',
      icone: '⚡',
      description: '12 accords • Timer rapide • 2 erreurs autorisées',
      couleur: '#ef4444',
      strikeLimit: 2,
      timeMultiplier: 0.5,
      pinCount: 12
    }
  ];

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.initAudio();
    this.loadDifficulty();
  }

  // ========== AUDIO ==========
  private initAudio(): void {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) this.audioCtx = new AudioContextClass();
  }

  private playSound(type: 'hit' | 'miss' | 'win' | 'over' | 'click' | 'tick'): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    const now = this.audioCtx.currentTime;

    if (type === 'hit') {
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const o = this.audioCtx!.createOscillator();
        const g = this.audioCtx!.createGain();
        o.type = 'triangle';
        o.connect(g); g.connect(this.audioCtx!.destination);
        o.frequency.setValueAtTime(freq, now + idx * 0.06);
        g.gain.setValueAtTime(0.18, now + idx * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
        o.start(now + idx * 0.06); o.stop(now + idx * 0.06 + 0.25);
      });
    } else if (type === 'miss') {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain); gain.connect(this.audioCtx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'win') {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const o = this.audioCtx!.createOscillator();
        const g = this.audioCtx!.createGain();
        o.type = 'sine';
        o.connect(g); g.connect(this.audioCtx!.destination);
        o.frequency.setValueAtTime(freq, now + idx * 0.1);
        g.gain.setValueAtTime(0.2, now + idx * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.4);
        o.start(now + idx * 0.1); o.stop(now + idx * 0.1 + 0.4);
      });
    } else if (type === 'over') {
      [392, 349.23, 329.63, 261.63].forEach((freq, idx) => {
        const o = this.audioCtx!.createOscillator();
        const g = this.audioCtx!.createGain();
        o.type = 'sawtooth';
        o.connect(g); g.connect(this.audioCtx!.destination);
        o.frequency.setValueAtTime(freq, now + idx * 0.15);
        g.gain.setValueAtTime(0.2, now + idx * 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.3);
        o.start(now + idx * 0.15); o.stop(now + idx * 0.15 + 0.3);
      });
    } else if (type === 'click') {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain); gain.connect(this.audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'tick') {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain); gain.connect(this.audioCtx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now); osc.stop(now + 0.05);
    }
  }

  // ========== DIFFICULTÉ ==========
  private loadDifficulty(): void {
    const saved = localStorage.getItem('molkky_difficulty') as Difficulty;
    if (saved && this.difficulties.some(d => d.id === saved)) {
      this.gameState.difficulty = saved;
    }
  }

  setDifficulty(d: Difficulty): void {
    this.gameState.difficulty = d;
    localStorage.setItem('molkky_difficulty', d);
    this.playSound('click');
  }

  getCurrentDifficulty() {
    return this.difficulties.find(d => d.id === this.gameState.difficulty)!;
  }

  // ========== DÉMARRAGE ==========
  startGame(): void {
    this.playSound('click');
    const config = this.getCurrentDifficulty();

    // Filtrer les accords selon la difficulté
    const filtered = this.chordCatalog.filter(c => {
      if (this.gameState.difficulty === 'facile') return c.difficulty === 'facile';
      if (this.gameState.difficulty === 'normal') return c.difficulty === 'facile' || c.difficulty === 'normal';
      return true; // difficile = tout
    });

    // Mélanger et limiter
    const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, config.pinCount);

    this.pins = shuffled.map(chord => ({
      chord,
      isDown: false,
      isRevealed: false,
      isShaking: false
    }));

    this.gameState = {
      score: 0,
      strikes: 0,
      targetChord: null,
      isPlaying: true,
      isGameOver: false,
      isVictory: false,
      difficulty: this.gameState.difficulty,
      timeLeft: this.maxTime,
      roundNumber: 0,
      perfectRounds: 0,
      bonusMultiplier: 1
    };

    this.nextRound();
    this.startTimer();
  }

  // ========== TIMER ==========
  startTimer(): void {
    clearInterval(this.timerInterval);
    this.gameState.timeLeft = this.maxTime;

    this.timerInterval = setInterval(() => {
      if (!this.gameState.isPlaying) return;

      const multiplier = this.getCurrentDifficulty().timeMultiplier;
      this.gameState.timeLeft -= multiplier;

      // Tick sonore quand < 30
      if (this.gameState.timeLeft < 30 && Math.floor(this.gameState.timeLeft) % 10 === 0) {
        this.playSound('tick');
      }

      if (this.gameState.timeLeft <= 0) {
        this.handleMiss(true);
      }
    }, 100);
  }

  // ========== MANCHE ==========
  nextRound(): void {
    const activePins = this.pins.filter(p => !p.isDown);
    if (activePins.length === 0) {
      this.checkEndCondition();
      return;
    }

    // Choisir une cible parmi les quilles actives
    const randomIndex = Math.floor(Math.random() * activePins.length);
    this.gameState.targetChord = activePins[randomIndex].chord;
    this.gameState.roundNumber++;

    // Restaurer le timer
    this.gameState.timeLeft = this.maxTime;

    // Reset visuel
    this.pins.forEach(p => p.isRevealed = false);
  }

  // ========== CLIC SUR UNE QUILLE ==========
  onPinClick(pin: { chord: ChordShape; isDown: boolean; isRevealed: boolean; isShaking: boolean }): void {
    if (!this.gameState.isPlaying || pin.isDown) return;

    pin.isRevealed = true;

    if (pin.chord.id === this.gameState.targetChord?.id) {
      // ✅ SUCCÈS
      pin.isDown = true;
      this.gameState.strikes = 0;
      this.gameState.perfectRounds++;

      // Calcul des points avec bonus combo
      const comboBonus = this.gameState.perfectRounds >= 3 ? 1.5 : 1;
      const points = Math.round(pin.chord.points * comboBonus);
      this.gameState.score += points;

      this.playSound('hit');
      this.triggerParticles();
      this.showFeedback(`EXCELLENT ! +${points} PTS`, 'success');

      // Règle Mölkky : 50 exact = victoire, > 50 = retour à 25
      if (this.gameState.score === 50) {
        this.endGame(true);
        return;
      } else if (this.gameState.score > 50) {
        this.gameState.score = 25;
        this.showFeedback(`DÉPASSÉ ! RETOUR À 25 PTS`, 'error');
      }

      setTimeout(() => this.nextRound(), 400);

    } else {
      // ❌ ÉCHEC
      pin.isShaking = true;
      setTimeout(() => {
        pin.isShaking = false;
        pin.isRevealed = false;
      }, 800);

      this.handleMiss(false);
    }
  }

  handleMiss(isTimeout: boolean): void {
    this.gameState.strikes++;
    this.gameState.perfectRounds = 0;
    this.playSound('miss');

    const remaining = this.getCurrentDifficulty().strikeLimit - this.gameState.strikes;
    this.showFeedback(
      isTimeout ? `TEMPS ÉCOULÉ ! (${remaining} essais)` : `RATÉ ! (${remaining} essais)`,
      'error'
    );

    if (this.gameState.strikes >= this.getCurrentDifficulty().strikeLimit) {
      this.endGame(false);
    } else {
      // Nouvelle cible mais on garde les quilles
      setTimeout(() => {
        this.nextRound();
        this.startTimer();
      }, 500);
    }
  }

  // ========== CONDITIONS DE FIN ==========
  private checkEndCondition(): void {
    const remainingPins = this.pins.filter(p => !p.isDown);

    if (remainingPins.length === 0) {
      if (this.gameState.score === 50) {
        this.endGame(true);
      } else {
        // Plus de quilles mais pas 50 points = défaite
        this.endGame(false);
      }
    }
  }

  endGame(isVictory: boolean): void {
    clearInterval(this.timerInterval);
    this.gameState.isPlaying = false;
    this.gameState.isGameOver = !isVictory;
    this.gameState.isVictory = isVictory;
    this.playSound(isVictory ? 'win' : 'over');

    if (isVictory) {
      this.triggerParticles();
    }
  }

  // ========== UTILITAIRES ==========
  showFeedback(msg: string, type: 'success' | 'error'): void {
    this.feedbackMessage = msg;
    this.feedbackType = type;
    setTimeout(() => { this.feedbackMessage = null; }, 1000);
  }

  triggerParticles(): void {
    this.particles = Array.from({ length: 20 }, (_, i) => i);
    setTimeout(() => { this.particles = []; }, 1500);
  }

  goToPlay(): void {
    this.router.navigate(['/play']);
  }

  getTimerColor(): string {
    if (this.gameState.timeLeft < 20) return 'linear-gradient(90deg, #ef4444, #dc2626)';
    if (this.gameState.timeLeft < 50) return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
    return 'linear-gradient(90deg, #10b981, #06b6d4)';
  }

  getStrikeLimit(): number {
    return this.getCurrentDifficulty().strikeLimit;
  }

  ngOnDestroy(): void {
    clearInterval(this.timerInterval);
    if (this.audioCtx) this.audioCtx.close();
  }
}