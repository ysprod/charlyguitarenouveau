import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { CardData } from './CardData';
import { RdialogComponent } from './rdialog/rdialog.component';
import { CommonModule } from '@angular/common';
import { MatGridListModule } from '@angular/material/grid-list';
import { GamecardComponent } from './gamecard/gamecard.component';

interface Particle {
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
}

interface Coin {
  left: number;
  delay: number;
  duration: number;
  symbol: string;
}

type SoundType = 'flip' | 'match' | 'wrong' | 'victory' | 'defeat';

@Component({
  selector: 'app-cardgame',
  standalone: true,
  imports: [
    CommonModule,
    MatGridListModule,
    GamecardComponent
  ],
  templateUrl: './cardgame.component.html',
  styleUrls: ['./cardgame.component.css']
})
export class CardgameComponent implements OnInit, OnDestroy {

  etapedujeu: string = "0";
  lavie: number = 0;
  lebonus: number = 0;
  pointdevies: number = 0;

  cardImages = [
    'assets/rouge.jpg',
    'assets/bleu.jpg',
    'assets/vert.jpg',
    'assets/rouge.jpg',
    'assets/noir.jpg',
    'assets/blanc.jpg'
  ];

  cards: CardData[] = [];
  flippedCards: CardData[] = [];
  matchedCount = 0;
  moves = 0;
  isProcessing = false;

  /* Décor */
  particles: Particle[] = [];
  coins: Coin[] = [];

  private readonly PARTICLE_COLORS = ['#6366f1', '#10b981', '#facc15', '#f472b6', '#38bdf8'];
  private readonly COIN_SYMBOLS = ['🪙', '💰', '💎', '⭐', '🍌', '🏆'];

  /* Audio */
  private audioCtx?: AudioContext;
  soundEnabled = true;

  constructor(
    private dialog: MatDialog,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    const queryVie = this.activatedRoute.snapshot.queryParamMap.get('vie');
    const queryBonus = this.activatedRoute.snapshot.queryParamMap.get('bonus');
    const queryEtape = this.activatedRoute.snapshot.queryParamMap.get('etape');

    this.pointdevies = queryVie ? parseInt(queryVie, 10) : 1000;
    this.lavie = this.pointdevies;
    this.lebonus = queryBonus ? parseInt(queryBonus, 10) : 0;
    this.etapedujeu = queryEtape || "0";

    this.initAudio();
    this.generateDecor();
    this.setupCards();
  }

  ngOnDestroy(): void {
    // Fermer le contexte audio proprement
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => { /* ignore */ });
    }
  }

  /* ============================================================
     AUDIO — Générateur de sons via Web Audio API
     ============================================================ */
  private initAudio(): void {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (AudioContextClass) this.audioCtx = new AudioContextClass();
  }

  /**
   * Joue un son prédéfini via oscillateurs + gain.
   * Aucun fichier externe n'est nécessaire.
   */
  private playSound(type: SoundType): void {
    if (!this.soundEnabled || !this.audioCtx) return;

    // Reprise du contexte si suspendu (politique navigateur)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => { /* ignore */ });
    }

    const now = this.audioCtx.currentTime;

    switch (type) {
      case 'flip':
        // Petit "blip" rapide et discret au retournement
        this.tone({ freq: 660, type: 'sine', duration: 0.08, volume: 1, now });
        break;

      case 'match':
        // Arpège ascendant joyeux quand une paire est trouvée
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          this.tone({
            freq,
            type: 'triangle',
            duration: 0.15,
            volume: 1,
            now: now + i * 0.08
          });
        });
        break;

      case 'wrong':
        // Son descendant grave pour signaler l'erreur
        this.tone({
          freq: 300,
          endFreq: 120,
          type: 'sawtooth',
          duration: 0.25,
          volume: 1,
          now
        });
        break;

      case 'victory':
        // Fanfare victorieuse
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          this.tone({
            freq,
            type: 'triangle',
            duration: 0.3,
            volume: 1,
            now: now + i * 0.12
          });
        });
        break;

      case 'defeat':
        this.tone({
          freq: 220,
          endFreq: 80,
          type: 'sawtooth',
          duration: 0.4,
          volume: 1,
          now
        });
        break;
    }
  }

  /**
   * Générateur de note simple via OscillatorNode + GainNode.
   */
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
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(0.01, opts.endFreq),
        opts.now + opts.duration
      );
    }

    // Enveloppe ADSR simplifiée : attaque rapide + release exponentielle
    gain.gain.setValueAtTime(0.0001, opts.now);
    gain.gain.exponentialRampToValueAtTime(opts.volume, opts.now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, opts.now + opts.duration);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(opts.now);
    osc.stop(opts.now + opts.duration + 0.05);
  }

  /* ============================================================
     DÉCOR
     ============================================================ */
  private generateDecor(): void {
    this.particles = Array.from({ length: 30 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 8,
      size: 2 + Math.random() * 4,
      color: this.PARTICLE_COLORS[
        Math.floor(Math.random() * this.PARTICLE_COLORS.length)
      ]
    }));

    this.coins = Array.from({ length: 10 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 12 + Math.random() * 8,
      symbol: this.COIN_SYMBOLS[
        Math.floor(Math.random() * this.COIN_SYMBOLS.length)
      ]
    }));
  }

  /* ============================================================
     JEU
     ============================================================ */
  shuffleArray<T>(array: T[]): T[] {
    return array
      .map(item => ({ sort: Math.random(), value: item }))
      .sort((a, b) => a.sort - b.sort)
      .map(item => item.value);
  }

  setupCards(): void {
    const cardPairs: CardData[] = [];
    this.cardImages.forEach((image) => {
      cardPairs.push({ imageId: image, state: 'default' });
      cardPairs.push({ imageId: image, state: 'default' });
    });
    this.cards = this.shuffleArray(cardPairs);
    this.flippedCards = [];
    this.isProcessing = false;
  }

  cardClicked(index: number): void {
    const cardInfo = this.cards[index];

    if (this.isProcessing || cardInfo.state !== 'default') {
      return;
    }

    // 🔊 Son au clic
    this.playSound('flip');

    this.decrementervie();
    cardInfo.state = 'flipped';
    this.flippedCards.push(cardInfo);

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.isProcessing = true;
      this.checkForCardMatch();
    }
  }

  checkForCardMatch(): void {
    setTimeout(() => {
      const [cardOne, cardTwo] = this.flippedCards;

      if (cardOne.imageId === cardTwo.imageId) {
        // ✅ Paire trouvée
        this.playSound('match');
        cardOne.state = 'matched';
        cardTwo.state = 'matched';
        this.matchedCount++;

        if (this.matchedCount === this.cardImages.length) {
          this.incrementervie();
          this.playSound('victory');
          this.openVictoryDialog();
        }
      } else {
        // ❌ Mauvaise paire
        this.playSound('wrong');
        cardOne.state = 'default';
        cardTwo.state = 'default';
      }

      this.flippedCards = [];
      this.isProcessing = false;
    }, 800);
  }

  openVictoryDialog(): void {
    const dialogRef = this.dialog.open(RdialogComponent, {
      disableClose: true,
      panelClass: 'victory-dialog-container'
    });

    dialogRef.afterClosed().subscribe(() => {
      this.restart();
    });
  }

  incrementervie(): void {
    this.pointdevies += 5000;
    this.lavie = this.pointdevies;
  }

  decrementervie(): void {
    this.pointdevies = Math.max(0, this.pointdevies - 100);
    this.lavie = this.pointdevies;
  }

  restart(): void {
    this.matchedCount = 0;
    this.moves = 0;
    this.setupCards();
  }

  /** 🔇 Bouton optionnel pour couper le son */
  toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
  }

  onrecommencer(): void {
    if (this.lavie !== undefined && this.lebonus !== undefined) {
      this.goToPlay(this.lavie, this.lebonus, this.etapedujeu);
    }
  }

  goToPlay(lavie: number, lebonus: number, letape: string): void {
    this.router.navigate(['/play'], {
      queryParams: { vie: lavie, bonus: lebonus, etape: letape }
    });
  }

  gagnant(): boolean {
    return this.pointdevies > 0;
  }

  casuffit(): boolean {
    return this.pointdevies >= 10000000;
  }

  oncontinue(): boolean {
    return this.pointdevies < 10000000;
  }
}