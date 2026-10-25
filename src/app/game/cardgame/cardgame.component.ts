import {
  ChangeDetectionStrategy,  Component,
  DestroyRef,  afterNextRender,  computed,  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe, Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { CardData } from './CardData';
import { RdialogComponent, RdialogResult } from './rdialog/rdialog.component';
import { GamecardComponent } from './gamecard/gamecard.component';
import { VoiceService, SpeakOptions } from '../services/voice.service';
import { shuffleArray, pickMatchPhrase, pickWrongPhrase } from 'src/app/game/utils/cardgame.utils';
import { createIntervalScheduler } from 'src/app/game/utils/schedulers.util';
import { createTimeoutScheduler } from 'src/app/game/utils/timeout.util';

type SoundType = 'flip' | 'match' | 'wrong' | 'victory' | 'defeat';

const CHILD_VOICE: Required<Pick<SpeakOptions, 'pitch' | 'rate' | 'volume'>> = {
  pitch: 1.7,
  rate: 1.15,
  volume: 1.0,
};

const CARD_IMAGES: readonly string[] = [
  'assets/rouge.jpg',
  'assets/bleu.jpg',
  'assets/vert.jpg',
  'assets/rouge.jpg',
  'assets/noir.jpg',
  'assets/blanc.jpg',
];

const PV_PAR_COUP = 100;
const PV_PAR_PAIRE = 5000;
const PV_MAX = 10_000_000;
const FLIP_DELAY_MS = 800;
const LAST_MATCH_HIDE_MS = 3000;
const INTRO_DELAY_MS = 600;

@Component({
  selector: 'app-cardgame',
  imports: [GamecardComponent, DecimalPipe],
  templateUrl: './cardgame.component.html',
  styleUrls: ['./cardgame.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardgameComponent {

  /* ─── Dépendances ─── */
  private readonly dialog = inject(MatDialog);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly voice = inject(VoiceService);
  private readonly destroyRef = inject(DestroyRef);

  /* ─── Schedulers auto-nettoyés ─── */
  private readonly scheduleTimeout = createTimeoutScheduler(this.destroyRef);
  private readonly globalTimer = createIntervalScheduler(this.destroyRef);

  /* ─── État de jeu — signals ─── */
  readonly lavie = signal(0);
  readonly lebonus = signal(0);
  readonly pointdevies = signal(0);
  readonly matchedCount = signal(0);
  readonly moves = signal(0);
  readonly elapsedSeconds = signal(0);
  readonly lastMatchSeconds = signal(0);
  readonly soundEnabled = signal(true);
  readonly cards = signal<CardData[]>([]);

  /* ─── État interne — signals ─── */
  private readonly flippedCards = signal<CardData[]>([]);
  private readonly isProcessing = signal(false);

  /* ─── Constantes exposées au template ─── */
  readonly cardImages = CARD_IMAGES;

  /* ─── Computed ─── */
  readonly globalTimerDisplay = computed(() =>
    this.formatTime(this.elapsedSeconds())
  );

  readonly pvFillPercent = computed(() =>
    Math.min(100, (this.pointdevies() / PV_MAX) * 100)
  );

  readonly isPlaying = computed(() => this.pointdevies() < PV_MAX);

  readonly totalPairs = computed(() => this.cardImages.length);

  /* ─── Interne (non-signal) ─── */
  private gameStartTime = 0;
  private currentRoundStartTime = 0;
  private audioCtx?: AudioContext;
  private hasAnnouncedIntro = false;

  /* ═══════════════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════════════ */

  constructor() {
    /* Lecture des query params (SSR-safe via afterNextRender) */
    afterNextRender(() => {
      const params = this.activatedRoute.snapshot.queryParamMap;

      const initialPv = parseInt(params.get('vie') ?? '1000', 10);
      const initialBonus = parseInt(params.get('bonus') ?? '0', 10);

      this.pointdevies.set(initialPv);
      this.lavie.set(initialPv);
      this.lebonus.set(initialBonus);

      this.initAudio();
      this.setupCards();
      this.startGlobalTimer();
      this.announceGameRules();
    });

    /* Nettoyage de l'AudioContext */
    this.destroyRef.onDestroy(() => {
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        void this.audioCtx.close();
      }
      this.voice.stopSpeaking();
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ⏱️ CHRONOMÈTRES
     ═══════════════════════════════════════════════════════════════════ */

  private startGlobalTimer(): void {
    this.gameStartTime = Date.now();
    this.elapsedSeconds.set(0);

    this.globalTimer.start(() => {
      this.elapsedSeconds.set(
        Math.floor((Date.now() - this.gameStartTime) / 1000)
      );
    }, 1000);
  }

  private stopGlobalTimer(): void {
    this.globalTimer.stop();
  }

  private startRoundTimer(): void {
    this.currentRoundStartTime = Date.now();
  }

  private captureRoundTime(): void {
    if (this.currentRoundStartTime === 0) return;

    const duration = Math.floor(
      (Date.now() - this.currentRoundStartTime) / 1000
    );

    this.lastMatchSeconds.set(duration);

    this.scheduleTimeout(() => {
      this.lastMatchSeconds.set(0);
    }, LAST_MATCH_HIDE_MS);
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /* ═══════════════════════════════════════════════════════════════════
     🎙️ VOIX
     ═══════════════════════════════════════════════════════════════════ */

  private speakAsChild(
    text: string,
    overrides: Partial<typeof CHILD_VOICE> = {}
  ): Promise<void> {
    if (!this.soundEnabled()) return Promise.resolve();

    return this.voice.speak(text, {
      ...CHILD_VOICE,
      ...overrides,
      interrupt: true,
    });
  }

  private announceGameRules(): void {
    if (this.hasAnnouncedIntro) return;
    this.hasAnnouncedIntro = true;

    const intro =
      `Bienvenue dans Boubouni ! ` +
      `Retrouve toutes les paires cachées pour gagner le trésor ! ` +
      `Allez, c'est parti !`;

    this.scheduleTimeout(() => {
      void this.speakAsChild(intro, { rate: 1.05 });
    }, INTRO_DELAY_MS);
  }

  /* ═══════════════════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════════════════ */

  goToPlay(): void {
    this.voice.stopSpeaking();
    void this.router.navigate(['/game/play']);
  }

  goBack(): void {
    this.voice.stopSpeaking();
    this.location.back();
  }

  /* ═══════════════════════════════════════════════════════════════════
     🔊 AUDIO
     ═══════════════════════════════════════════════════════════════════ */

  private initAudio(): void {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (Ctor) {
      this.audioCtx = new Ctor();
    }
  }

  private playSound(type: SoundType): void {
    if (!this.soundEnabled() || !this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => { /* silencieux */ });
    }

    const now = this.audioCtx.currentTime;

    switch (type) {
      case 'flip':
        this.tone({ freq: 660, type: 'sine', duration: 0.08, volume: 0.15, now });
        break;

      case 'match':
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          this.tone({
            freq,
            type: 'triangle',
            duration: 0.15,
            volume: 0.18,
            now: now + i * 0.08,
          });
        });
        break;

      case 'wrong':
        this.tone({
          freq: 300,
          endFreq: 120,
          type: 'sawtooth',
          duration: 0.25,
          volume: 0.15,
          now,
        });
        break;

      case 'victory':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          this.tone({
            freq,
            type: 'triangle',
            duration: 0.3,
            volume: 0.2,
            now: now + i * 0.12,
          });
        });
        break;

      case 'defeat':
        this.tone({
          freq: 220,
          endFreq: 80,
          type: 'sawtooth',
          duration: 0.4,
          volume: 0.18,
          now,
        });
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

  toggleSound(): void {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);

    if (!next) {
      this.voice.stopSpeaking();
    } else {
      void this.speakAsChild('Son activé !');
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     🎴 LOGIQUE DU JEU
     ═══════════════════════════════════════════════════════════════════ */

  private setupCards(): void {
    const cardPairs: CardData[] = [];

    this.cardImages.forEach((image) => {
      cardPairs.push({ imageId: image, state: 'default' });
      cardPairs.push({ imageId: image, state: 'default' });
    });

    this.cards.set(shuffleArray(cardPairs));
    this.flippedCards.set([]);
    this.isProcessing.set(false);
    this.currentRoundStartTime = 0;
  }

  cardClicked(index: number): void {
    const list = this.cards();
    const cardInfo = list[index];

    if (this.isProcessing() || cardInfo.state !== 'default') return;

    this.playSound('flip');
    this.decrementervie();

    /* Mise à jour immutable */
    const updated: CardData = { ...cardInfo, state: 'flipped' };
    const newList = [...list];
    newList[index] = updated;
    this.cards.set(newList);

    const flipped = [...this.flippedCards(), updated];
    this.flippedCards.set(flipped);

    if (flipped.length === 1) {
      this.startRoundTimer();
    }

    if (flipped.length === 2) {
      this.moves.update((m) => m + 1);
      this.isProcessing.set(true);
      this.checkForCardMatch();
    }
  }

  private checkForCardMatch(): void {
    this.scheduleTimeout(() => {
      const flipped = this.flippedCards();
      const [cardOne, cardTwo] = flipped;

      if (cardOne.imageId === cardTwo.imageId) {
        this.handleMatch(cardOne, cardTwo);
      } else {
        this.handleMismatch(cardOne, cardTwo);
      }

      this.flippedCards.set([]);
      this.isProcessing.set(false);
    }, FLIP_DELAY_MS);
  }

  private handleMatch(cardOne: CardData, cardTwo: CardData): void {
    this.playSound('match');
    this.matchedCount.update((c) => c + 1);

    const list = this.cards();
    const newList = list.map((c) => {
      if (c === cardOne || c === cardTwo) {
        return { ...c, state: 'matched' as const };
      }
      return c;
    });
    this.cards.set(newList);

    this.captureRoundTime();
    void this.speakAsChild(pickMatchPhrase(), {
      pitch: 1.8,
      rate: 1.2,
    });

    if (this.matchedCount() === this.cardImages.length) {
      this.handleVictory();
    }
  }

  private handleMismatch(cardOne: CardData, cardTwo: CardData): void {
    this.playSound('wrong');

    const list = this.cards();
    const newList = list.map((c) => {
      if (c === cardOne || c === cardTwo) {
        return { ...c, state: 'default' as const };
      }
      return c;
    });
    this.cards.set(newList);

    this.currentRoundStartTime = 0;

    if (Math.random() < 0.5) {
      void this.speakAsChild(pickWrongPhrase(), {
        pitch: 1.5,
        rate: 1.1,
      });
    }
  }

  private handleVictory(): void {
    this.incrementervie();
    this.playSound('victory');
    this.stopGlobalTimer();

    void this.speakAsChild(
      `Youpi ! Tu as trouvé toutes les paires ! ` +
      `Temps total : ${this.formatTime(this.elapsedSeconds())} !`,
      { pitch: 1.85, rate: 1.15 }
    ).then(() => {
      this.openVictoryDialog();
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     🏆 MODALE DE VICTOIRE
     ═══════════════════════════════════════════════════════════════════ */

  private openVictoryDialog(): void {
    const dialogRef = this.dialog.open(RdialogComponent, {
      disableClose: true,
      panelClass: 'victory-dialog-container',
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result: RdialogResult | undefined) => {
        /* Fermeture sans résultat → on considère un "replay" */
        if (result === 'menu') {
          void this.speakAsChild('Retour au menu ! À bientôt !', { pitch: 1.8 });
          this.goToPlay();
          return;
        }

        /* result === 'replay' OU undefined */
        void this.speakAsChild("Nouvelle partie ! C'est reparti !", {
          pitch: 1.8,
        });
        this.restart();
      });
  }

  /* ═══════════════════════════════════════════════════════════════════
     💎 POINTS DE VIE
     ═══════════════════════════════════════════════════════════════════ */

  incrementervie(): void {
    const next = this.pointdevies() + PV_PAR_PAIRE;
    this.pointdevies.set(next);
    this.lavie.set(next);
  }

  decrementervie(): void {
    const next = Math.max(0, this.pointdevies() - PV_PAR_COUP);
    this.pointdevies.set(next);
    this.lavie.set(next);
  }

  restart(): void {
    this.matchedCount.set(0);
    this.moves.set(0);
    this.lastMatchSeconds.set(0);
    this.currentRoundStartTime = 0;
    this.setupCards();
    this.startGlobalTimer();
  }
}