import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { TictactoeserviceService } from '../../services/tictactoeservice.service';

@Component({
  selector: 'app-tictactoe',
  templateUrl: './tictactoe.component.html',
  styleUrls: ['./tictactoe.component.css']
})
export class TictactoeComponent implements OnInit, OnDestroy {

  lock = false;
  rejouer = false;
  etapedujeu: string = "0";
  lavie: number = 0;
  lebonus: number = 0;
  pointdevies: number = 0;
  pointdebonus: number = 0;
  messageLyko: string = "Lyko le Sage observe votre stratégie...";
  showConfetti = false;
  showVictoryOverlay = false;
  showDefeatOverlay = false;
  particles: number[] = [];

  /** PV gagnés par alignement (+10 PV par alignement) */
  readonly ALIGNMENT_REWARD = 10;

  private audioCtx?: AudioContext;
  private timeouts: number[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private snackBar: MatSnackBar,
    public gs: TictactoeserviceService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const vieParam = this.activatedRoute.snapshot.queryParamMap.get('vie');
    const bonusParam = this.activatedRoute.snapshot.queryParamMap.get('bonus');

    this.lavie = parseInt(vieParam || '500', 10);
    this.lebonus = parseInt(bonusParam || '0', 10);
    this.etapedujeu = this.activatedRoute.snapshot.queryParamMap.get('etape') || this.etapedujeu;

    this.pointdevies = this.lavie;
    this.pointdebonus = this.lebonus;

    this.initAudio();
    this.resetjeu();
  }

  ngOnDestroy(): void {
    // 1. Fermeture propre de l'AudioContext pour éviter les fuites mémoire
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
    // 2. Annulation de tous les timeouts actifs au moment de la destruction
    this.timeouts.forEach(t => clearTimeout(t));
  }

  private initAudio(): void {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) this.audioCtx = new AudioContextClass();
  }

  private playSound(type: 'click' | 'win' | 'lose' | 'draw' | 'levelup' | 'bot'): void {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

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

      case 'bot':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); 
        osc.stop(now + 0.15);
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

      case 'lose':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.4);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now); 
        osc.stop(now + 0.4);
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

  resetjeu(): void {
    this.rejouer = false;
    this.lock = false;
    this.showConfetti = false;
    this.showVictoryOverlay = false;
    this.showDefeatOverlay = false;

    this.gs.resetAll();
    this.gs.turn = 0;

    this.messageLyko = `Niveau ${this.gs.gridSize - 2} : Grille ${this.gs.gridSize}x${this.gs.gridSize} — Alignez ${this.gs.winningStreak} pions pour gagner +${this.ALIGNMENT_REWARD} PV !`;
  }

  prochainNiveau(): void {
    this.playSound('levelup');
    this.gs.nextLevel();
    this.resetjeu();
    this.snackBar.open(`🚀 Niveau Supérieur ! Grille ${this.gs.gridSize}x${this.gs.gridSize} !`, "Sensationnel !", { duration: 3000 });
  }

  precedentNiveau(): void {
    if (!this.yaprecedent()) return;
    this.playSound('levelup');
    this.gs.previousLevel();
    this.resetjeu();
    this.snackBar.open(`⏪ Niveau Précédent ! Grille ${this.gs.gridSize}x${this.gs.gridSize} !`, "Retour !", { duration: 2500 });
  }

  yaprecedent(): boolean {
    return this.gs.gridSize > 3;
  }

  /**
   * Action au clic de l'utilisateur sur une case
   */
  playerClick(i: number): void {
    if (this.lock || !this.gs.blocks[i].free || this.gs.turn !== 0) return;

    this.executeMove(i);
  }

  /**
   * Exécute le coup joué (Joueur ou Bot)
   */
  private executeMove(index: number): void {
    const currentTurn = this.gs.turn;
    const scoreBefore = this.gs.players[currentTurn].score;

    // Execution centralisée dans le service
    const played = this.gs.playMove(index);
    if (!played) return;

    if (currentTurn === 0) {
      this.playSound('click');
    } else {
      this.playSound('bot');
    }

    // Détection si de nouveaux alignements ont été formés
    const scoreAfter = this.gs.players[currentTurn].score;
    const newAlignments = scoreAfter - scoreBefore;

    if (newAlignments > 0) {
      this.handleAlignment(currentTurn, newAlignments);
    }

    // ✅ Vérification stricte : Fin de partie UNIQUEMENT si la grille est totalement pleine
    if (this.gs.isGameOver) {
      const timerId = window.setTimeout(() => this.handleDraw(), 400);
      this.timeouts.push(timerId);
      return;
    }

    // Passage au tour suivant
    this.changeTurn();
  }

  private changeTurn(): void {
    const current = this.gs.changeTurn();

    if (current === 1) {
      this.gs.isBotThinking = true;
      this.messageLyko = "🔮 Lyko Le Sage prépare son sortilège...";
      this.lock = true; // Empêche le clic joueur pendant la réflexion du bot

      const timerId = window.setTimeout(() => {
        this.gs.isBotThinking = false;
        this.botTurn();
      }, 700);
      this.timeouts.push(timerId);
    } else {
      this.lock = false;
      this.messageLyko = "🎯 À votre tour de jouer.";
    }
  }

  private botTurn(): void {
    if (this.gs.isGameOver) {
      this.lock = false;
      return;
    }

    const botIndex = this.gs.figureBotMove();
    if (botIndex >= 0 && this.gs.blocks[botIndex].free) {
      this.executeMove(botIndex);
    } else {
      this.lock = false;
    }
  }

  /** Un ou plusieurs alignements détectés (+10 PV par alignement) */
  private handleAlignment(playerTurn: number, count: number): void {
    const gain = count * this.ALIGNMENT_REWARD;

    // Seul le Joueur (index 0) gagne des PV cumulables dans la partie globale
    if (playerTurn === 0) {
      this.pointdevies += gain;
      this.lavie = this.pointdevies;
    }

    this.playSound('win');

    const joueur = playerTurn === 0 ? "🎸 VOUS" : "🐵 LYKÖ LE SAGE";
    this.messageLyko = `✨ ${count} alignement(s) de 3 par ${joueur} ! +${gain} PV !`;

    this.snackBar.open(`🎯 ${count} alignement(s) ${joueur} : +${gain} PV`, "Super !", { duration: 2000 });

    const timerId = window.setTimeout(() => this.gs.clearWinningHighlight(), 1200);
    this.timeouts.push(timerId);
  }

  /** Fin de manche : grille pleine. On compare les scores d'alignements. */
  private handleDraw(): void {
    if (this.lock && this.rejouer) return;
    this.lock = true;
    this.rejouer = true;
    this.gs.draw += 1;

    const scoreVous = this.gs.players[0].score;
    const scoreLyko = this.gs.players[1].score;

    if (scoreVous > scoreLyko) {
      this.playSound('win');
      this.triggerConfetti();
      this.showVictoryOverlay = true;
      this.messageLyko = `🏆 Grille terminée ! Vous remportez le duel (${scoreVous} - ${scoreLyko}) !`;
      this.snackBar.open(`🏆 VICTOIRE ${scoreVous} - ${scoreLyko} !`, "Bravo !", { duration: 3500 });
    } else if (scoreLyko > scoreVous) {
      this.playSound('lose');
      this.showDefeatOverlay = true;
      this.messageLyko = `💀 Grille terminée ! Lykö le Sage l'emporte (${scoreLyko} - ${scoreVous}).`;
      this.snackBar.open(`💀 DÉFAITE ${scoreLyko} - ${scoreVous}`, "Revanche !", { duration: 3000 });
    } else {
      this.playSound('draw');
      this.messageLyko = `⚖️ Grille terminée ! Égalité parfaite (${scoreVous} - ${scoreLyko}).`;
      this.snackBar.open(`⚖️ MATCH NUL ${scoreVous} - ${scoreLyko}`, "Égalité", { duration: 3000 });
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

  incrementervie(): void {
    this.pointdevies += 500 * (this.gs.gridSize - 2);
    this.lavie = this.pointdevies;
  }

  goToPlay(lavie: number, lebonus: number, letape: string): void {
    this.router.navigate(['/play'], { queryParams: { vie: lavie, bonus: lebonus, etape: letape } });
  }

  onrecommencer(): void {
    this.goToPlay(this.lavie, this.lebonus, this.etapedujeu);
  }
}