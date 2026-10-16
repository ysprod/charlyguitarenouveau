// src/app/game/kronos/kronos.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { HistoryEntry, PowerUp, SoundType } from '../models/kronos.model';

import {
  COUT_LANCER,
  FACES,
  SEUIL_LYKO,
  SOUND_PREF_KEY,
} from '../constants/kronos.constants';

import { formatNumber, getFaceInfo } from '../utils/kronos.util';

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-kronos',
  imports: [],
  templateUrl: './kronos.component.html',
  styleUrls: ['./kronos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KronosComponent {

  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /* ═══════════════════════════════════════════════════════
     CONSTANTES EXPOSÉES
     ═══════════════════════════════════════════════════════ */

  readonly SEUIL_LYKO = SEUIL_LYKO;
  readonly COUT_LANCER = COUT_LANCER;

  /** Helpers exposés au template. */
  readonly getFaceInfo = getFaceInfo;

  /* ═══════════════════════════════════════════════════════
     ÉTAT — SIGNALS
     ═══════════════════════════════════════════════════════ */

  readonly pointdevies = signal(5_000);
  readonly pointdebonus = signal(100);
  readonly randomnumber = signal(0);
  readonly derniereFace = signal(0);
  readonly isRolling = signal(false);
  readonly messageKronos = signal('Le Maître du Temps vous observe…');
  readonly comboStreak = signal(0);
  readonly multiplierBonus = signal(1);
  readonly historique = signal<HistoryEntry[]>([]);
  readonly rejouer = signal(false);
  readonly etapedujeu = signal('0');
  readonly soundEnabled = signal(true);

  /* ═══════════════════════════════════════════════════════
     COMPUTED — FORMATAGE
     ═══════════════════════════════════════════════════════ */

  readonly pointdeviesFormatted = computed(() =>
    formatNumber(this.pointdevies())
  );

  readonly pointdebonusFormatted = computed(() =>
    formatNumber(this.pointdebonus())
  );

  readonly seuilFormatted = computed(() => formatNumber(SEUIL_LYKO));

  readonly coutLancerFormatted = computed(() => formatNumber(COUT_LANCER));

  /* ═══════════════════════════════════════════════════════
     COMPUTED — JEU
     ═══════════════════════════════════════════════════════ */

  readonly progressionSeuil = computed(() =>
    Math.min((this.pointdevies() / SEUIL_LYKO) * 100, 100)
  );

  readonly gagnant = computed(
    () => this.rejouer() && this.randomnumber() >= 5
  );

  readonly casuffit = computed(
    () => this.pointdevies() >= SEUIL_LYKO
  );

  /** Symbole de la face courante (si > 0). */
  readonly currentFaceSymbol = computed(
    () => getFaceInfo(this.randomnumber())?.symbol ?? ''
  );

  /** Nom de la face courante (si > 0). */
  readonly currentFaceName = computed(
    () => getFaceInfo(this.derniereFace())?.name ?? ''
  );

  /* ═══════════════════════════════════════════════════════
     DONNÉES
     ═══════════════════════════════════════════════════════ */

  readonly faces = FACES;

  readonly powers: PowerUp[] = [
    {
      id: 'shield',
      name: 'Bouclier Temporel',
      icon: 'shield',
      cost: 300,
      description: 'Annule la déduction de coût si la face est < 4.',
      cooldown: 3,
      currentCooldown: 0,
      active: false,
    },
    {
      id: 'rewind',
      name: 'Inversion Chrono',
      icon: 'replay',
      cost: 500,
      description: 'Relance le dé si le résultat est inférieur à 5.',
      cooldown: 4,
      currentCooldown: 0,
      active: false,
    },
    {
      id: 'presage',
      name: 'Vision du Destin',
      icon: 'visibility',
      cost: 800,
      description: 'Garantit un score entre 6 et 12 au prochain lancer.',
      cooldown: 5,
      currentCooldown: 0,
      active: false,
    },
  ];

  /* ═══════════════════════════════════════════════════════
     AUDIO
     ═══════════════════════════════════════════════════════ */

  private audioCtx?: AudioContext;
  private rollIntervalId: ReturnType<typeof setInterval> | null = null;

  /* ═══════════════════════════════════════════════════════
     CONSTRUCTEUR
     ═══════════════════════════════════════════════════════ */

  constructor() {
    afterNextRender(() => {
      this.etapedujeu.set(
        this.activatedRoute.snapshot.queryParamMap.get('etape') ?? '0'
      );
      this.initAudio();
      this.loadSoundPreference();
    });

    this.destroyRef.onDestroy(() => {
      if (this.rollIntervalId !== null) {
        clearInterval(this.rollIntervalId);
        this.rollIntervalId = null;
      }

      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        void this.audioCtx.close();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     SON
     ═══════════════════════════════════════════════════════ */

  private initAudio(): void {
    if (typeof window === 'undefined') return;

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (Ctor) {
      this.audioCtx = new Ctor();
    }
  }

  private loadSoundPreference(): void {
    try {
      const saved = localStorage.getItem(SOUND_PREF_KEY);
      if (saved === 'false') {
        this.soundEnabled.set(false);
      }
    } catch {
      /* silencieux */
    }
  }

  toggleSound(): void {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);

    try {
      localStorage.setItem(SOUND_PREF_KEY, String(next));
    } catch {
      /* silencieux */
    }

    if (next) {
      this.playSound('power');
    }
  }

  private playSound(type: SoundType): void {
    const ctx = this.audioCtx;
    if (!this.soundEnabled() || !ctx) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {
        /* silencieux */
      });
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'roll') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'win') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'power') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(600, now + 0.2);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  }

  /* ═══════════════════════════════════════════════════════
     POUVOIRS
     ═══════════════════════════════════════════════════════ */

  activatePower(power: PowerUp): void {
    if (
      power.currentCooldown > 0 ||
      this.pointdebonus() < power.cost ||
      power.active
    ) {
      return;
    }

    this.pointdebonus.update((v) => v - power.cost);
    power.active = true;
    this.playSound('power');
    this.messageKronos.set(`Pouvoir activé : ${power.name} !`);
  }

  /* ═══════════════════════════════════════════════════════
     LANCER
     ═══════════════════════════════════════════════════════ */

  resetjeu(): void {
    if (this.pointdevies() < COUT_LANCER) {
      this.messageKronos.set(
        "Vous n'avez pas assez de points de vie pour défier Kronos."
      );
      return;
    }

    this.isRolling.set(true);
    this.messageKronos.set("Les rouages du temps s'élancent…");

    let compteur = 0;
    this.rollIntervalId = setInterval(() => {
      this.randomnumber.set(this.randomInteger(1, 12));
      this.playSound('roll');
      compteur++;

      if (compteur > 18) {
        if (this.rollIntervalId !== null) {
          clearInterval(this.rollIntervalId);
          this.rollIntervalId = null;
        }
        this.finaliserLancer();
      }
    }, 80);
  }

  private finaliserLancer(): void {
    this.isRolling.set(false);
    this.rejouer.set(true);

    const avant = this.pointdevies();
    const presageActive = this.powers.find((p) => p.id === 'presage')?.active;

    const minRoll = presageActive ? 6 : 1;
    let roll = this.randomInteger(minRoll, 12);

    const rewindPower = this.powers.find((p) => p.id === 'rewind');
    if (rewindPower?.active && roll < 5) {
      this.messageKronos.set(
        'Inversion Temporelle ! Nouveau tirage automatique…'
      );
      roll = this.randomInteger(5, 12);
    }

    this.randomnumber.set(roll);
    this.derniereFace.set(roll);

    const shieldActive = this.powers.find((p) => p.id === 'shield')?.active;
    let coutEffectif = COUT_LANCER;
    if (shieldActive && roll < 4) {
      coutEffectif = 0;
      this.messageKronos.set('Bouclier actif : Coût de lancer absorbé !');
    }

    if (roll >= 7) {
      this.comboStreak.update((s) => s + 1);
      this.multiplierBonus.set(1 + this.comboStreak() * 0.1);
      this.playSound('win');
    } else {
      this.comboStreak.set(0);
      this.multiplierBonus.set(1);
    }

    const calculBrut = (this.pointdevies() - coutEffectif) * roll;
    const nouveauScore = Math.round(calculBrut * this.multiplierBonus());
    this.pointdevies.set(nouveauScore);

    this.updateCooldowns();

    const faceInfo = getFaceInfo(roll);
    if (roll >= 10) {
      this.messageKronos.set(
        `APOTHÉOSE ! Face ${roll} (${faceInfo?.name}). Combo x${this.multiplierBonus().toFixed(1)} !`
      );
    } else if (roll >= 5) {
      this.messageKronos.set(
        `Victoire ! Face ${roll} (${faceInfo?.name}). Le temps vous favorise.`
      );
    } else {
      this.messageKronos.set(
        `Épreuve ! Face ${roll} (${faceInfo?.name}). Persévérez.`
      );
    }

    this.historique.update((list) => {
      const updated = [
        { face: roll, avant, apres: nouveauScore, date: new Date() },
        ...list,
      ];
      return updated.slice(0, 5);
    });

    if (this.pointdevies() >= SEUIL_LYKO) {
      this.messageKronos.set(
        "Seuil suprême atteint ! Lykö s'incline devant votre maestria."
      );
    }
  }

  private updateCooldowns(): void {
    this.powers.forEach((p) => {
      if (p.active) {
        p.active = false;
        p.currentCooldown = p.cooldown;
      } else if (p.currentCooldown > 0) {
        p.currentCooldown--;
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════ */

  onrecommencer(): void {
    void this.router.navigate(['/play'], {
      queryParams: {
        vie: this.pointdevies(),
        bonus: this.pointdebonus(),
        etape: this.etapedujeu(),
      },
    });
  }

  /* ═══════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════ */

  private randomInteger(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}