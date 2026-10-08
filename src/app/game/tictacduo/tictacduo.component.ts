import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TictacduoService } from '../../services/tictacduo.service';
import { VoiceService } from '../../services/voice.service';

@Component({
  selector: 'app-tictacduo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tictacduo.component.html',
  styleUrls: ['./tictacduo.component.css']
})
export class TictacduoComponent implements OnInit, OnDestroy {

  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly voice = inject(VoiceService);
  public readonly gs = inject(TictacduoService);

  /* ─── État ─── */
  lock = false;
  rejouer = false;
  etapedujeu = '0';
  lavie = 0;
  lebonus = 0;
  pointdevies = 0;
  pointdebonus = 0;
  messageLyko = 'Au tour du Joueur 1...';
  showConfetti = false;
  showVictoryOverlay = false;
  particles: number[] = [];

  readonly ALIGNMENT_REWARD = 10;

  /* ─── Son (voix + effets) ─── */
  readonly soundEnabled = signal<boolean>(true);
  private readonly SOUND_PREF_KEY = 'tictacduo_sound_enabled';

  private audioCtx?: AudioContext;
  private timeouts: number[] = [];

  /* ═══════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════ */
  ngOnInit(): void {
    const vieParam = this.activatedRoute.snapshot.queryParamMap.get('vie');
    const bonusParam = this.activatedRoute.snapshot.queryParamMap.get('bonus');

    this.lavie = parseInt(vieParam || '500', 10);
    this.lebonus = parseInt(bonusParam || '0', 10);
    this.etapedujeu = this.activatedRoute.snapshot.queryParamMap.get('etape') || this.etapedujeu;

    this.pointdevies = this.lavie;
    this.pointdebonus = this.lebonus;

    this.initAudio();
    this.loadSoundPreference();
    this.resetjeu();

    /* Message d'accueil vocal */
    const timerId = window.setTimeout(() => {
      this.voice.speak(
        `Bienvenue dans Lyko Duel ! ` +
        `Le Joueur 1 commence. Clique sur n'importe quelle case vide de la grille pour y déposer un pion. Alignez trois pions pour gagner des points. Bonne chance à vous deux !`
      );
    }, 700);
    this.timeouts.push(timerId);
  }

  ngOnDestroy(): void {
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
    this.timeouts.forEach(t => clearTimeout(t));
    this.voice.stopSpeaking();
  }

  /* ═══════════════════════════════════════════════════════
     SON — Toggle & persistance
     ═══════════════════════════════════════════════════════ */
  private loadSoundPreference(): void {
    const saved = localStorage.getItem(this.SOUND_PREF_KEY);
    if (saved === 'false') {
      this.soundEnabled.set(false);
    }
  }

  toggleSound(): void {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);
    localStorage.setItem(this.SOUND_PREF_KEY, String(next));

    if (!next) {
      this.voice.stopSpeaking();
    } else {
      this.voice.speak('Son activé.');
    }
  }

  /* ═══════════════════════════════════════════════════════
     AUDIO (effets sonores)
     ═══════════════════════════════════════════════════════ */
  private initAudio(): void {
    const AudioContextClass = window.AudioContext
      || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      this.audioCtx = new AudioContextClass();
    }
  }

  private playSound(type: 'click' | 'win' | 'draw' | 'levelup'): void {
    if (!this.soundEnabled() || !this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    const now = this.audioCtx.currentTime;

    switch (type) {
      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
        break;

      case 'win':
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const o = this.audioCtx!.createOscillator();
          const g = this.audioCtx!.createGain();
          o.type = 'triangle';
          o.connect(g);
          g.connect(this.audioCtx!.destination);
          o.frequency.setValueAtTime(freq, now + idx * 0.1);
          g.gain.setValueAtTime(0.2, now + idx * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);
          o.start(now + idx * 0.1);
          o.stop(now + idx * 0.1 + 0.3);
        });
        break;

      case 'draw':
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;

      case 'levelup':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
    }
  }

  /* ═══════════════════════════════════════════════════════
     JEU
     ═══════════════════════════════════════════════════════ */
  resetjeu(): void {
    this.rejouer = false;
    this.lock = false;
    this.showConfetti = false;
    this.showVictoryOverlay = false;

    this.gs.resetAll();
    this.gs.turn = 0;

    this.messageLyko = `Niveau ${this.gs.gridSize - 2} : Grille ${this.gs.gridSize}x${this.gs.gridSize} — Alignez 3 pions pour gagner +${this.ALIGNMENT_REWARD} PV !`;
  }

  prochainNiveau(): void {
    this.playSound('levelup');
    this.gs.nextLevel();
    this.resetjeu();
    this.snackBar.open(`🚀 Niveau Supérieur ! Grille ${this.gs.gridSize}x${this.gs.gridSize} !`, "Super !", { duration: 2500 });

    /* Annonce vocale */
    this.voice.speak(
      `Niveau supérieur ! Nouvelle grille ${this.gs.gridSize} sur ${this.gs.gridSize}. Au tour du Joueur 1.`
    );
  }

  precedentNiveau(): void {
    if (!this.yaprecedent()) return;
    this.playSound('levelup');
    this.gs.previousLevel();
    this.resetjeu();
    this.snackBar.open(`⏪ Niveau Précédent ! Grille ${this.gs.gridSize}x${this.gs.gridSize} !`, "Retour !", { duration: 2500 });

    this.voice.speak(
      `Retour au niveau précédent. Grille ${this.gs.gridSize} sur ${this.gs.gridSize}.`
    );
  }

  playerClick(i: number): void {
    if (this.lock || !this.gs.blocks[i].free) return;

    const playerTurn = this.gs.turn;
    const played = this.gs.playMove(i);

    if (!played) return;

    this.playSound('click');

    /* Détection d'éventuels alignements */
    const newAlignments = this.gs.checkNewAlignments();
    if (newAlignments > 0) {
      this.handleAlignment(playerTurn, newAlignments);
    }

    /* Fin de partie : toutes les cases remplies */
    if (this.gs.isGameOver) {
      const timerId = window.setTimeout(() => this.handleEndGame(), 500);
      this.timeouts.push(timerId);
      return;
    }

    this.changeTurn();
  }

  private handleAlignment(playerTurn: number, count: number): void {
    const gain = count * this.ALIGNMENT_REWARD;
    this.pointdevies += gain;
    this.lavie = this.pointdevies;

    this.playSound('win');

    const joueur = playerTurn === 0 ? 'JOUEUR 1' : 'JOUEUR 2';
    this.messageLyko = `✨ ${count} alignement(s) pour ${joueur} ! +${gain} PV !`;

    this.snackBar.open(`🎯 ${count} alignement(s) ${joueur} : +${gain} PV`, "Bravo !", { duration: 2000 });

    /* Annonce vocale personnalisée */
    const plural = count > 1 ? 's' : '';
    const phrases = [
      'Bien joué',
      'Excellent',
      'Bravo',
      'Superbe',
      'Magnifique'
    ];
    const praise = phrases[Math.floor(Math.random() * phrases.length)];
    this.voice.speak(
      `${praise} ! ${count} alignement${plural} pour le ${joueur}. Plus ${gain} points de vie.`
    );

    const timerId = window.setTimeout(() => this.gs.clearWinningHighlight(), 1200);
    this.timeouts.push(timerId);
  }

  private handleEndGame(): void {
    if (this.lock) return;
    this.lock = true;
    this.rejouer = true;
    this.gs.draw += 1;
    this.playSound('draw');

    const scoreJ1 = this.gs.players[0].score;
    const scoreJ2 = this.gs.players[1].score;

    if (scoreJ1 > scoreJ2) {
      this.triggerConfetti();
      this.showVictoryOverlay = true;
      this.messageLyko = `🏆 Le JOUEUR 1 remporte le duel (${scoreJ1} - ${scoreJ2}) !`;
      this.snackBar.open(`🏆 VICTOIRE JOUEUR 1 : ${scoreJ1} - ${scoreJ2} !`, "Félicitations !", { duration: 3500 });

      this.voice.speak(
        `Victoire du Joueur 1 ! ${scoreJ1} contre ${scoreJ2}. Félicitations !`
      );
    } else if (scoreJ2 > scoreJ1) {
      this.triggerConfetti();
      this.showVictoryOverlay = true;
      this.messageLyko = `🏆 Le JOUEUR 2 remporte le duel (${scoreJ2} - ${scoreJ1}) !`;
      this.snackBar.open(`🏆 VICTOIRE JOUEUR 2 : ${scoreJ2} - ${scoreJ1} !`, "Félicitations !", { duration: 3500 });

      this.voice.speak(
        `Victoire du Joueur 2 ! ${scoreJ2} contre ${scoreJ1}. Félicitations !`
      );
    } else {
      this.messageLyko = `⚖️ Égalité parfaite (${scoreJ1} - ${scoreJ2}) !`;
      this.snackBar.open(`⚖️ MATCH NUL ${scoreJ1} - ${scoreJ2}`, "Égalité", { duration: 3000 });

      this.voice.speak(
        `Match nul, ${scoreJ1} partout. Belle partie !`
      );
    }
  }

  private triggerConfetti(): void {
    this.showConfetti = true;
    this.particles = Array.from({ length: 60 }, (_, i) => i);
    const timerId = window.setTimeout(() => {
      this.showConfetti = false;
      this.showVictoryOverlay = false;
    }, 4500);
    this.timeouts.push(timerId);
  }

  private changeTurn(): void {
    const current = this.gs.changeTurn();
    this.messageLyko = current === 1
      ? '🎯 Au tour du JOUEUR 2'
      : '🎯 Au tour du JOUEUR 1';

    /* Annonce vocale du tour */
    const joueur = current === 1 ? 'Joueur 2' : 'Joueur 1';
    /* On évite de spammer : uniquement si la voix est active */
    if (this.soundEnabled()) {
      this.voice.speak(`Au tour du ${joueur}.`);
    }
  }

  yaprecedent(): boolean {
    return this.gs.gridSize > 3;
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════ */
  goToPlay(lavie: number, lebonus: number, letape: string): void {
    this.voice.stopSpeaking();
    this.router.navigate(['/play'], { queryParams: { vie: lavie, bonus: lebonus, etape: letape } });
  }

  onrecommencer(): void {
    this.goToPlay(this.lavie, this.lebonus, this.etapedujeu);
  }
}