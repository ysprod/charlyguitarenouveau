import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */
interface PowerUp {
  id: string;
  name: string;
  icon: string;
  cost: number;
  description: string;
  cooldown: number;
  currentCooldown: number;
  active: boolean;
}

interface HistoryEntry {
  face: number;
  avant: number;
  apres: number;
  date: Date;
}

interface DiceFace {
  value: number;
  symbol: string;
  name: string;
}

type SoundType = 'roll' | 'win' | 'power';

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */
@Component({
  selector: 'app-kronos',
  standalone: true,
  imports: [DecimalPipe, CommonModule],
  templateUrl: './kronos.component.html',
  styleUrls: ['./kronos.component.scss']
})
export class KronosComponent implements OnInit, OnDestroy {

  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /* ═══════════════════════════════════════════════════════════════════
     CONSTANTES
     ═══════════════════════════════════════════════════════════════════ */
  readonly SEUIL_LYKO = 1_000_000_000;
  readonly COUT_LANCER = 2_000;

  /* ═══════════════════════════════════════════════════════════════════
     ÉTAT
     ═══════════════════════════════════════════════════════════════════ */
  readonly pointdevies = signal(5_000);
  readonly pointdebonus = signal(100);
  readonly randomnumber = signal(0);
  readonly derniereFace = signal(0);
  readonly isRolling = signal(false);
  readonly messageKronos = signal('Le Maître du Temps vous observe...');
  readonly comboStreak = signal(0);
  readonly multiplierBonus = signal(1);
  readonly historique = signal<HistoryEntry[]>([]);
  readonly rejouer = signal(false);
  readonly etapedujeu = signal('0');

  /* ─── Son (persistance localStorage) ─── */
  readonly soundEnabled = signal<boolean>(true);

  /* ─── Computed ─── */
  readonly progressionSeuil = computed(() =>
    Math.min((this.pointdevies() / this.SEUIL_LYKO) * 100, 100)
  );

  readonly gagnant = computed(() =>
    this.rejouer() && this.randomnumber() >= 5
  );

  readonly casuffit = computed(() =>
    this.pointdevies() >= this.SEUIL_LYKO
  );

  /* ═══════════════════════════════════════════════════════════════════
     DONNÉES
     ═══════════════════════════════════════════════════════════════════ */
  readonly powers: PowerUp[] = [
    {
      id: 'shield',
      name: 'Bouclier Temporel',
      icon: 'shield',
      cost: 300,
      description: 'Annule la déduction de coût si la face est < 4.',
      cooldown: 3,
      currentCooldown: 0,
      active: false
    },
    {
      id: 'rewind',
      name: 'Inversion Chrono',
      icon: 'replay',
      cost: 500,
      description: 'Relance le dé si le résultat est inférieur à 5.',
      cooldown: 4,
      currentCooldown: 0,
      active: false
    },
    {
      id: 'presage',
      name: 'Vision du Destin',
      icon: 'visibility',
      cost: 800,
      description: 'Garantit un score entre 6 et 12 au prochain lancer.',
      cooldown: 5,
      currentCooldown: 0,
      active: false
    }
  ];

  readonly faces: DiceFace[] = [
    { value: 1,  symbol: '⚀', name: 'Le Commencement' },
    { value: 2,  symbol: '⚁', name: 'Le Doute' },
    { value: 3,  symbol: '⚂', name: 'La Trinité' },
    { value: 4,  symbol: '⚃', name: 'Les Fondations' },
    { value: 5,  symbol: '⚄', name: 'Le Changement' },
    { value: 6,  symbol: '⚅', name: 'L\'Harmonie' },
    { value: 7,  symbol: '✦', name: 'La Chance' },
    { value: 8,  symbol: '✧', name: 'L\'Infini' },
    { value: 9,  symbol: '❂', name: 'La Sagesse' },
    { value: 10, symbol: '❖', name: 'La Puissance' },
    { value: 11, symbol: '✵', name: 'Le Destin' },
    { value: 12, symbol: '✹', name: 'L\'Apothéose' }
  ];

  /* ─── Audio ─── */
  private audioCtx?: AudioContext;
  private rollIntervalId?: ReturnType<typeof setInterval>;

  /* ═══════════════════════════════════════════════════════════════════
     LIFECYCLE
     ═══════════════════════════════════════════════════════════════════ */
  ngOnInit(): void {
    this.etapedujeu.set(
      this.activatedRoute.snapshot.queryParamMap.get('etape') ?? '0'
    );

    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.onSameUrlNavigation = 'reload';

    this.initAudio();
    this.loadSoundPreference();
  }

  ngOnDestroy(): void {
    if (this.rollIntervalId) clearInterval(this.rollIntervalId);
    this.audioCtx?.close();
  }

  /* ═══════════════════════════════════════════════════════════════════
     SON
     ═══════════════════════════════════════════════════════════════════ */
  private initAudio(): void {
    const Ctor = window.AudioContext
      || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctor) this.audioCtx = new Ctor();
  }

  private loadSoundPreference(): void {
    const saved = localStorage.getItem('kronos_sound_enabled');
    if (saved === 'false') this.soundEnabled.set(false);
  }

  toggleSound(): void {
    const next = !this.soundEnabled();
    this.soundEnabled.set(next);
    localStorage.setItem('kronos_sound_enabled', String(next));

    if (next) {
      this.playSound('power'); // Feedback sonore à la réactivation
    }
  }

  private playSound(type: SoundType): void {
    if (!this.soundEnabled() || !this.audioCtx) return;  // ⬅️ Garde-fou son

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => { /* ignore */ });
    }

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;

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

  /* ═══════════════════════════════════════════════════════════════════
     POUVOIRS
     ═══════════════════════════════════════════════════════════════════ */
  activatePower(power: PowerUp): void {
    if (power.currentCooldown > 0 || this.pointdebonus() < power.cost || power.active) return;

    this.pointdebonus.update(v => v - power.cost);
    power.active = true;
    this.playSound('power');
    this.messageKronos.set(`Pouvoir activé : ${power.name} !`);
  }

  /* ═══════════════════════════════════════════════════════════════════
     LANCER
     ═══════════════════════════════════════════════════════════════════ */
  resetjeu(): void {
    if (this.pointdevies() < this.COUT_LANCER) {
      this.messageKronos.set('Vous n\'avez pas assez de points de vie pour défier Kronos.');
      return;
    }

    this.isRolling.set(true);
    this.messageKronos.set('Les rouages du temps s\'élancent...');

    let compteur = 0;
    this.rollIntervalId = setInterval(() => {
      this.randomnumber.set(this.randomInteger(1, 12));
      this.playSound('roll');
      compteur++;

      if (compteur > 18) {
        clearInterval(this.rollIntervalId);
        this.finaliserLancer();
      }
    }, 80);
  }

  private finaliserLancer(): void {
    this.isRolling.set(false);
    this.rejouer.set(true);

    const avant = this.pointdevies();
    const presageActive = this.powers.find(p => p.id === 'presage')?.active;

    /* Tirage avec Vision du Destin */
    const minRoll = presageActive ? 6 : 1;
    let roll = this.randomInteger(minRoll, 12);

    /* Inversion Chrono */
    const rewindPower = this.powers.find(p => p.id === 'rewind');
    if (rewindPower?.active && roll < 5) {
      this.messageKronos.set('Inversion Temporelle ! Nouveau tirage automatique...');
      roll = this.randomInteger(5, 12);
    }

    this.randomnumber.set(roll);
    this.derniereFace.set(roll);

    /* Bouclier Temporel */
    const shieldActive = this.powers.find(p => p.id === 'shield')?.active;
    let coutEffectif = this.COUT_LANCER;
    if (shieldActive && roll < 4) {
      coutEffectif = 0;
      this.messageKronos.set('Bouclier actif : Coût de lancer absorbé !');
    }

    /* Combos */
    if (roll >= 7) {
      this.comboStreak.update(s => s + 1);
      this.multiplierBonus.set(1 + (this.comboStreak() * 0.1));
      this.playSound('win');
    } else {
      this.comboStreak.set(0);
      this.multiplierBonus.set(1);
    }

    /* Calcul des PV */
    const calculBrut = (this.pointdevies() - coutEffectif) * roll;
    const nouveauScore = Math.round(calculBrut * this.multiplierBonus());
    this.pointdevies.set(nouveauScore);

    /* Cooldowns */
    this.updateCooldowns();

    /* Narration */
    const faceInfo = this.getFaceInfo(roll);
    if (roll >= 10) {
      this.messageKronos.set(`APOTHÉOSE ! Face ${roll} (${faceInfo?.name}). Combo x${this.multiplierBonus().toFixed(1)} !`);
    } else if (roll >= 5) {
      this.messageKronos.set(`Victoire ! Face ${roll} (${faceInfo?.name}). Le temps vous favorise.`);
    } else {
      this.messageKronos.set(`Épreuve ! Face ${roll} (${faceInfo?.name}). Persévérez.`);
    }

    /* Historique */
    this.historique.update(list => {
      const updated = [{ face: roll, avant, apres: nouveauScore, date: new Date() }, ...list];
      return updated.slice(0, 5);
    });

    if (this.pointdevies() >= this.SEUIL_LYKO) {
      this.messageKronos.set('Seuil suprême atteint ! Lykö s\'incline devant votre maestria.');
    }
  }

  private updateCooldowns(): void {
    this.powers.forEach(p => {
      if (p.active) {
        p.active = false;
        p.currentCooldown = p.cooldown;
      } else if (p.currentCooldown > 0) {
        p.currentCooldown--;
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     NAVIGATION
     ═══════════════════════════════════════════════════════════════════ */
  onrecommencer(): void {
    this.router.navigate(['/play'], {
      queryParams: {
        vie: this.pointdevies(),
        bonus: this.pointdebonus(),
        etape: this.etapedujeu()
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════════════════ */
  randomInteger(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getFaceInfo(value: number): DiceFace | undefined {
    return this.faces.find(f => f.value === value);
  }
}