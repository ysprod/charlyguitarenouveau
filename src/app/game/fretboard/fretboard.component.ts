import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GameState } from '../../models/note-game.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fretboard',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './fretboard.component.html',
  styleUrls: ['./fretboard.component.scss'],
  animations: [
    trigger('feedbackAnim', [
      transition(':enter', [
        animate('600ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', keyframes([
          style({ transform: 'scale(0.3) rotate(-10deg)', opacity: 0, offset: 0 }),
          style({ transform: 'scale(1.3) rotate(5deg)', opacity: 1, offset: 0.4 }),
          style({ transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 0.7 }),
          style({ transform: 'scale(1.1) rotate(0deg)', opacity: 0, offset: 1 })
        ]))
      ])
    ]),
    trigger('modalAnim', [
      transition(':enter', [
        animate('500ms ease-out', keyframes([
          style({ transform: 'scale(0.7) translateY(50px)', opacity: 0, offset: 0 }),
          style({ transform: 'scale(1.05) translateY(-5px)', opacity: 1, offset: 0.6 }),
          style({ transform: 'scale(1) translateY(0)', opacity: 1, offset: 1 })
        ]))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        animate('400ms ease-out', keyframes([
          style({ transform: 'translateX(-30px)', opacity: 0, offset: 0 }),
          style({ transform: 'translateX(0)', opacity: 1, offset: 1 })
        ]))
      ])
    ])
  ]
})
export class FretboardComponent implements OnInit, OnDestroy {

  // Accordage standard
  strings = [
    { index: 1, name: 'E', baseNoteIndex: 4 },
    { index: 2, name: 'B', baseNoteIndex: 11 },
    { index: 3, name: 'G', baseNoteIndex: 7 },
    { index: 4, name: 'D', baseNoteIndex: 2 },
    { index: 5, name: 'A', baseNoteIndex: 9 },
    { index: 6, name: 'E', baseNoteIndex: 4 }
  ];

  notesList = ['DO', 'RÉ', 'MI', 'FA', 'SOL', 'LA', 'SI'];
  frets = Array.from({ length: 13 }, (_, i) => i);

  // États
  gameState: GameState = {
    score: 0,
    combo: 0,
    lives: 3,
    targetNote: '',
    timeLeft: 200,
    isPlaying: false,
    isGameOver: false
  };

  feedbackMessage: string | null = null;
  feedbackType: 'success' | 'error' = 'success';
  highScore: number = 0;
  difficulty: 'facile' | 'normal' | 'hardcore' = 'normal';
  streak: number = 0;

  // Particules et effets visuels
  particles: number[] = [];
  correctFretIndex: number = -1;
  lastClickedNode: { string: number, fret: number } | null = null;

  private timerInterval: any;
  private maxTime = 200;

  private audioCtx?: AudioContext;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.initAudio();
    this.loadHighScore();
  }

  // --- AUDIO SYNTHÉTISÉ (Web Audio API) ---
  private initAudio(): void {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) this.audioCtx = new AudioContextClass();
  }

  shouldShowNoteLabel(): boolean {
    return this.difficulty !== 'hardcore';
  }

  private playSound(type: 'success' | 'error' | 'click' | 'gameover' | 'start'): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    const now = this.audioCtx.currentTime;

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'success') {
      // Accord parfait
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const o = this.audioCtx!.createOscillator();
        const g = this.audioCtx!.createGain();
        o.type = 'triangle';
        o.connect(g); g.connect(this.audioCtx!.destination);
        o.frequency.setValueAtTime(freq, now + idx * 0.05);
        g.gain.setValueAtTime(0.15, now + idx * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.3);
        o.start(now + idx * 0.05); o.stop(now + idx * 0.05 + 0.3);
      });
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'start') {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const o = this.audioCtx!.createOscillator();
        const g = this.audioCtx!.createGain();
        o.type = 'sine';
        o.connect(g); g.connect(this.audioCtx!.destination);
        o.frequency.setValueAtTime(freq, now + idx * 0.08);
        g.gain.setValueAtTime(0.15, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
        o.start(now + idx * 0.08); o.stop(now + idx * 0.08 + 0.2);
      });
    } else if (type === 'gameover') {
      const notes = [392, 349.23, 329.63, 261.63];
      notes.forEach((freq, idx) => {
        const o = this.audioCtx!.createOscillator();
        const g = this.audioCtx!.createGain();
        o.type = 'sawtooth';
        o.connect(g); g.connect(this.audioCtx!.destination);
        o.frequency.setValueAtTime(freq, now + idx * 0.15);
        g.gain.setValueAtTime(0.2, now + idx * 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.3);
        o.start(now + idx * 0.15); o.stop(now + idx * 0.15 + 0.3);
      });
    }
  }

  // --- HIGH SCORE (localStorage) ---
  private loadHighScore(): void {
    const saved = localStorage.getItem('fretboard_highscore');
    if (saved) this.highScore = parseInt(saved, 10);
  }

  private saveHighScore(): void {
    if (this.gameState.score > this.highScore) {
      this.highScore = this.gameState.score;
      localStorage.setItem('fretboard_highscore', this.highScore.toString());
    }
  }

  // --- DIFFICULTÉ ---
  setDifficulty(d: 'facile' | 'normal' | 'hardcore'): void {
    this.difficulty = d;
    this.playSound('click');
  }

  private getTimeMultiplier(): number {
    switch (this.difficulty) {
      case 'facile': return 0.8;
      case 'hardcore': return 2;
      default: return 1.5;
    }
  }

  private getLivesStart(): number {
    switch (this.difficulty) {
      case 'facile': return 5;
      case 'hardcore': return 2;
      default: return 3;
    }
  }

  // --- DÉMARRAGE DU JEU ---
  startGame(): void {
    this.playSound('start');
    this.gameState = {
      score: 0,
      combo: 0,
      lives: this.getLivesStart(),
      targetNote: '',
      timeLeft: this.maxTime,
      isPlaying: true,
      isGameOver: false
    };
    this.streak = 0;
    this.nextRound();
    this.startTimer();
  }

  startTimer(): void {
    clearInterval(this.timerInterval);
    this.gameState.timeLeft = this.maxTime;

    this.timerInterval = setInterval(() => {
      if (!this.gameState.isPlaying) return;
      this.gameState.timeLeft -= this.getTimeMultiplier();
      if (this.gameState.timeLeft <= 0) {
        this.handleMiss(true);
      }
    }, 100);
  }

  nextRound(): void {
    const randomIndex = Math.floor(Math.random() * this.notesList.length);
    this.gameState.targetNote = this.notesList[randomIndex];
    this.correctFretIndex = -1;
    this.startTimer();
  }

  onFretClick(stringIdx: number, fretIdx: number): void {
    if (!this.gameState.isPlaying) return;

    this.lastClickedNode = { string: stringIdx, fret: fretIdx };
    const clickedNoteName = this.getNoteAt(stringIdx, fretIdx);

    if (clickedNoteName === this.gameState.targetNote) {
      this.handleSuccess(stringIdx, fretIdx);
    } else {
      this.handleMiss(false);
    }
  }

  handleSuccess(stringIdx: number, fretIdx: number): void {
    this.gameState.combo++;
    this.streak++;
    const points = 100 + (this.gameState.combo * 20);
    this.gameState.score += points;

    this.correctFretIndex = fretIdx;
    this.triggerParticles();

    this.playSound('success');
    this.showFeedback(`PARFAIT ! +${points}`, 'success');
    this.nextRound();
  }

  handleMiss(isTimeout: boolean): void {
    this.gameState.combo = 0;
    this.streak = 0;
    this.gameState.lives--;

    this.playSound('error');
    this.showFeedback(isTimeout ? 'TEMPS ÉCOULÉ !' : 'RATÉ !', 'error');

    if (this.gameState.lives <= 0) {
      this.endGame();
    } else {
      this.nextRound();
    }
  }

  showFeedback(msg: string, type: 'success' | 'error'): void {
    this.feedbackMessage = msg;
    this.feedbackType = type;
    setTimeout(() => { this.feedbackMessage = null; }, 700);
  }

  triggerParticles(): void {
    this.particles = Array.from({ length: 12 }, (_, i) => i);
    setTimeout(() => { this.particles = []; }, 1000);
  }

  endGame(): void {
    clearInterval(this.timerInterval);
    this.gameState.isPlaying = false;
    this.gameState.isGameOver = true;
    this.saveHighScore();
    this.playSound('gameover');
  }

  getNoteAt(stringIndex: number, fret: number): string {
    const noteSequence = ['DO', 'DO#', 'RÉ', 'RÉ#', 'MI', 'FA', 'FA#', 'SOL', 'SOL#', 'LA', 'LA#', 'SI'];
    const stringData = this.strings.find(s => s.index === stringIndex);
    if (!stringData) return '';

    const mapToFR: { [key: string]: number } = {
      'E': 4, 'B': 11, 'G': 7, 'D': 2, 'A': 9
    };

    const baseIndex = mapToFR[stringData.name];
    const totalIndex = (baseIndex + fret) % 12;
    const rawNote = noteSequence[totalIndex];
    return rawNote.replace('#', '');
  }

  // --- NAVIGATION ---
  goToPlay(): void {
    this.router.navigate(['/play']);
  }

  // --- UTILITAIRES ---
  getTimerColor(): string {
    if (this.gameState.timeLeft < 20) return 'linear-gradient(90deg, #ef4444, #f59e0b)';
    if (this.gameState.timeLeft < 50) return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
    return 'linear-gradient(90deg, #10b981, #06b6d4, #3b82f6)';
  }

  ngOnDestroy(): void {
    clearInterval(this.timerInterval);
    if (this.audioCtx) this.audioCtx.close();
  }
}