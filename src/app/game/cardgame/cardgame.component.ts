import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { MatGridListModule } from '@angular/material/grid-list';
import { CardData } from './CardData';
import { RdialogComponent, RdialogResult } from './rdialog/rdialog.component';
import { GamecardComponent } from './gamecard/gamecard.component';
import { VoiceService, SpeakOptions } from '../../services/voice.service';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */
type SoundType = 'flip' | 'match' | 'wrong' | 'victory' | 'defeat';

/* ═════════════════════════════════════════════════════════════════════
   VOIX D'ENFANT — Paramètres dédiés à cette page
   ═════════════════════════════════════════════════════════════════════ */
const CHILD_VOICE: Required<Pick<SpeakOptions, 'pitch' | 'rate' | 'volume'>> = {
  pitch: 1.7,
  rate: 1.15,
  volume: 1.0,
};

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */
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

  /* ─── Dépendances ─── */
  private readonly dialog = inject(MatDialog);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly voice = inject(VoiceService);

  /* ─── État de jeu ─── */
  lavie = 0;
  lebonus = 0;
  pointdevies = 0;

  readonly cardImages = [
    'assets/rouge.jpg',
    'assets/bleu.jpg',
    'assets/vert.jpg',
    'assets/rouge.jpg',
    'assets/noir.jpg',
    'assets/blanc.jpg'
  ];

  cards: CardData[] = [];
  private flippedCards: CardData[] = [];
  matchedCount = 0;
  moves = 0;
  private isProcessing = false;

  /* ═══════════════════════════════════════════════════════════════════
     ⏱️ CHRONOMÈTRES
     ═══════════════════════════════════════════════════════════════════ */

  /** Temps total écoulé depuis le démarrage de la partie (secondes) */
  elapsedSeconds = 0;

  /** Temps de la dernière trouvaille (secondes) — affiché temporairement */
  lastMatchSeconds = 0;

  /** Affichage formaté "MM:SS" du chrono global */
  get globalTimerDisplay(): string {
    return this.formatTime(this.elapsedSeconds);
  }

  private globalTimerInterval?: ReturnType<typeof setInterval>;
  private gameStartTime = 0;
  private currentRoundStartTime = 0;
  private lastMatchHideTimeout?: ReturnType<typeof setTimeout>;

  /* ─── Audio ─── */
  private audioCtx?: AudioContext;
  soundEnabled = true;

  /* ─── Constantes ─── */
  private readonly PV_PAR_COUP = 100;
  private readonly PV_PAR_PAIRE = 5000;
  private readonly PV_MAX = 10_000_000;
  private readonly FLIP_DELAY_MS = 800;
  private readonly LAST_MATCH_HIDE_MS = 3000;

  /* ─── Timers ─── */
  private timeouts: number[] = [];
  private hasAnnouncedIntro = false;

  /* ═══════════════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════════════ */
  ngOnInit(): void {
    const params = this.activatedRoute.snapshot.queryParamMap;
    this.pointdevies = parseInt(params.get('vie') ?? '1000', 10);
    this.lavie = this.pointdevies;
    this.lebonus = parseInt(params.get('bonus') ?? '0', 10);

    this.initAudio();
    this.setupCards();
    this.startGlobalTimer();
    this.announceGameRules();
  }

  ngOnDestroy(): void {
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
    this.stopGlobalTimer();
    if (this.lastMatchHideTimeout) clearTimeout(this.lastMatchHideTimeout);
    this.timeouts.forEach(t => clearTimeout(t));
    this.voice.stopSpeaking();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ⏱️ GESTION DES CHRONOMÈTRES
     ═══════════════════════════════════════════════════════════════════ */

  /** Démarre (ou redémarre) le chrono global */
  private startGlobalTimer(): void {
    this.stopGlobalTimer();

    this.gameStartTime = Date.now();
    this.elapsedSeconds = 0;

    this.globalTimerInterval = setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.gameStartTime) / 1000);
    }, 1000);
  }

  /** Arrête le chrono global */
  private stopGlobalTimer(): void {
    if (this.globalTimerInterval) {
      clearInterval(this.globalTimerInterval);
      this.globalTimerInterval = undefined;
    }
  }

  /** Démarre le chrono de la réflexion en cours */
  private startRoundTimer(): void {
    this.currentRoundStartTime = Date.now();
  }

  /** Capture le temps de la réflexion et l'expose temporairement */
  private captureRoundTime(): void {
    if (this.currentRoundStartTime === 0) return;

    const duration = Math.floor((Date.now() - this.currentRoundStartTime) / 1000);
    this.lastMatchSeconds = duration;

    if (this.lastMatchHideTimeout) clearTimeout(this.lastMatchHideTimeout);
    this.lastMatchHideTimeout = setTimeout(() => {
      this.lastMatchSeconds = 0;
    }, this.LAST_MATCH_HIDE_MS);
  }

  /** Formate un nombre de secondes en "MM:SS" */
  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /* ═══════════════════════════════════════════════════════════════════
     🎙️ HELPER VOIX D'ENFANT
     ═══════════════════════════════════════════════════════════════════ */
  private speakAsChild(
    text: string,
    overrides: Partial<typeof CHILD_VOICE> = {}
  ): Promise<void> {
    return this.voice.speak(text, {
      ...CHILD_VOICE,
      ...overrides,
      interrupt: true,
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ANNONCE VOCALE D'INTRODUCTION
     ═══════════════════════════════════════════════════════════════════ */
  private announceGameRules(): void {
    if (this.hasAnnouncedIntro) return;
    this.hasAnnouncedIntro = true;

    const intro =
      `Coucou ! Bienvenue dans Boubouni ! ` +
      `Retrouve toutes les paires cachées pour gagner le trésor ! ` +
      `Chaque coup te coûte cent points de vie, ` +
      `mais une paire trouvée t'en rapporte cinq mille ! ` +
      `Tu as ${this.pointdevies} points. ` +
      `Le chrono tourne ! Allez, c'est parti !`;

    const timerId = window.setTimeout(() => {
      this.speakAsChild(intro, { rate: 1.05 });
    }, 600);
    this.timeouts.push(timerId);
  }

  /* ═══════════════════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════════════════ */
  goToPlay(): void {
    this.voice.stopSpeaking();
    this.router.navigate(['/play']);
  }

  goBack(): void {
    this.voice.stopSpeaking();
    this.location.back();
  }

  onrecommencer(): void {
    this.goToPlay();
  }

  /* ═══════════════════════════════════════════════════════════════════
     AUDIO — Effets sonores
     ═══════════════════════════════════════════════════════════════════ */
  private initAudio(): void {
    const Ctor = window.AudioContext
      || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctor) this.audioCtx = new Ctor();
  }

  private playSound(type: SoundType): void {
    if (!this.soundEnabled || !this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => { /* ignore */ });
    }

    const now = this.audioCtx.currentTime;

    switch (type) {
      case 'flip':
        this.tone({ freq: 660, type: 'sine', duration: 0.08, volume: 0.15, now });
        break;

      case 'match':
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          this.tone({ freq, type: 'triangle', duration: 0.15, volume: 0.18, now: now + i * 0.08 });
        });
        break;

      case 'wrong':
        this.tone({ freq: 300, endFreq: 120, type: 'sawtooth', duration: 0.25, volume: 0.15, now });
        break;

      case 'victory':
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          this.tone({ freq, type: 'triangle', duration: 0.3, volume: 0.2, now: now + i * 0.12 });
        });
        break;

      case 'defeat':
        this.tone({ freq: 220, endFreq: 80, type: 'sawtooth', duration: 0.4, volume: 0.18, now });
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
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(0.01, opts.endFreq),
        opts.now + opts.duration
      );
    }

    gain.gain.setValueAtTime(0.0001, opts.now);
    gain.gain.exponentialRampToValueAtTime(opts.volume, opts.now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, opts.now + opts.duration);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(opts.now);
    osc.stop(opts.now + opts.duration + 0.05);
  }

  /* ═══════════════════════════════════════════════════════════════════
     TOGGLE SON
     ═══════════════════════════════════════════════════════════════════ */
  toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;

    if (!this.soundEnabled) {
      this.voice.stopSpeaking();
    } else {
      this.speakAsChild('Son activé !');
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     LOGIQUE DU JEU
     ═══════════════════════════════════════════════════════════════════ */
  private shuffleArray<T>(array: T[]): T[] {
    return array
      .map(item => ({ sort: Math.random(), value: item }))
      .sort((a, b) => a.sort - b.sort)
      .map(item => item.value);
  }

  setupCards(): void {
    const cardPairs: CardData[] = [];
    this.cardImages.forEach(image => {
      cardPairs.push({ imageId: image, state: 'default' });
      cardPairs.push({ imageId: image, state: 'default' });
    });
    this.cards = this.shuffleArray(cardPairs);
    this.flippedCards = [];
    this.isProcessing = false;
    this.currentRoundStartTime = 0;
  }

  cardClicked(index: number): void {
    const cardInfo = this.cards[index];
    if (this.isProcessing || cardInfo.state !== 'default') return;

    this.playSound('flip');
    this.decrementervie();
    cardInfo.state = 'flipped';
    this.flippedCards.push(cardInfo);

    /* ⏱️ Démarre le chrono de la réflexion dès la 1ère carte retournée */
    if (this.flippedCards.length === 1) {
      this.startRoundTimer();
    }

    if (this.flippedCards.length === 2) {
      this.moves++;
      this.isProcessing = true;
      this.checkForCardMatch();
    }
  }

  private checkForCardMatch(): void {
    const timerId = window.setTimeout(() => {
      const [cardOne, cardTwo] = this.flippedCards;

      if (cardOne.imageId === cardTwo.imageId) {
        /* ✅ Paire trouvée */
        this.playSound('match');
        cardOne.state = 'matched';
        cardTwo.state = 'matched';
        this.matchedCount++;

        /* ⏱️ Capture le temps de la trouvaille */
        this.captureRoundTime();

        this.speakAsChild(this.pickMatchPhrase(), { pitch: 1.8, rate: 1.2 });

        if (this.matchedCount === this.cardImages.length) {
          this.incrementervie();
          this.playSound('victory');
          this.stopGlobalTimer();

          this.speakAsChild(
            `Youpi ! Tu as trouvé toutes les paires ! ` +
            `Tu gagnes cinq mille points bonus ! ` +
            `Ton trésor est maintenant de ${this.pointdevies} points ! ` +
            `Temps total : ${this.formatTime(this.elapsedSeconds)} !`,
            { pitch: 1.85, rate: 1.15 }
          ).then(() => {
            this.openVictoryDialog();
          });
        }
      } else {
        /* ❌ Mauvaise paire */
        this.playSound('wrong');
        cardOne.state = 'default';
        cardTwo.state = 'default';

        /* ⏱️ Réinitialise le chrono de round */
        this.currentRoundStartTime = 0;

        if (Math.random() < 0.5) {
          this.speakAsChild(this.pickWrongPhrase(), { pitch: 1.5, rate: 1.1 });
        }
      }

      this.flippedCards = [];
      this.isProcessing = false;
    }, this.FLIP_DELAY_MS);

    this.timeouts.push(timerId);
  }

  private pickMatchPhrase(): string {
    const phrases = [
      'Bien joué !',
      'Super !',
      'Trop fort !',
      'Youpi !',
      'Encore une !',
      'Génial !',
      'Bravo !',
      'Wow, quelle mémoire !'
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  private pickWrongPhrase(): string {
    const phrases = [
      'Oups, raté !',
      'Presque !',
      'Essaie encore !',
      'Pas grave, retente !',
      'Hop, essaie encore !',
      'Tu vas y arriver !'
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  /* ═══════════════════════════════════════════════════════════════════
     MODALE DE VICTOIRE — Gestion des 2 sorties
     ═══════════════════════════════════════════════════════════════════ */
  private openVictoryDialog(): void {
    const dialogRef = this.dialog.open(RdialogComponent, {
      disableClose: true,
      panelClass: 'victory-dialog-container'
    });

    dialogRef.afterClosed().subscribe((result: RdialogResult | undefined) => {
      if (result === 'menu') {
        /* Le joueur veut retourner au menu des jeux */
        this.speakAsChild('Retour au menu ! À bientôt !', { pitch: 1.8 });
        this.goToPlay();
        return;
      }

      /* Par défaut (replay ou fermeture forcée) : nouvelle partie */
      this.speakAsChild('Nouvelle partie ! C\'est reparti !', { pitch: 1.8 });
      this.restart();
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     POINTS DE VIE
     ═══════════════════════════════════════════════════════════════════ */
  incrementervie(): void {
    this.pointdevies += this.PV_PAR_PAIRE;
    this.lavie = this.pointdevies;
  }

  decrementervie(): void {
    this.pointdevies = Math.max(0, this.pointdevies - this.PV_PAR_COUP);
    this.lavie = this.pointdevies;
  }

  restart(): void {
    this.matchedCount = 0;
    this.moves = 0;
    this.lastMatchSeconds = 0;
    this.currentRoundStartTime = 0;
    this.setupCards();
    this.startGlobalTimer();
  }

  oncontinue(): boolean {
    return this.pointdevies < this.PV_MAX;
  }
}