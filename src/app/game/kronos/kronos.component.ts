import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

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

@Component({
	selector: 'app-kronos',
	standalone: true,
	imports: [
		DecimalPipe, CommonModule
	],
	templateUrl: './kronos.component.html',
	styleUrls: ['./kronos.component.scss']
})
export class KronosComponent implements OnInit {
	rejouer = false;
	isRolling = false;
	etapedujeu: string = "0";
	lavie: number = 0;
	lebonus: number = 0;
	randomnumber: number = 0;
	pointdevies: number = 0;
	pointdebonus: number = 0;
	historique: { face: number, avant: number, apres: number, date: Date, powerUsed?: string }[] = [];
	messageKronos: string = "Le Maître du Temps vous observe...";
	derniereFace: number = 0;
	comboStreak: number = 0;
	multiplierBonus: number = 1;

	private audioCtx?: AudioContext;
	readonly SEUIL_LYKO = 1000000000;
	readonly COUT_LANCER = 2000;

	powers: PowerUp[] = [
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

	faces = [
		{ value: 1, symbol: '⚀', name: 'Le Commencement' },
		{ value: 2, symbol: '⚁', name: 'Le Doute' },
		{ value: 3, symbol: '⚂', name: 'La Trinité' },
		{ value: 4, symbol: '⚃', name: 'Les Fondations' },
		{ value: 5, symbol: '⚄', name: 'Le Changement' },
		{ value: 6, symbol: '⚅', name: 'L\'Harmonie' },
		{ value: 7, symbol: '✦', name: 'La Chance' },
		{ value: 8, symbol: '✧', name: 'L\'Infini' },
		{ value: 9, symbol: '❂', name: 'La Sagesse' },
		{ value: 10, symbol: '❖', name: 'La Puissance' },
		{ value: 11, symbol: '✵', name: 'Le Destin' },
		{ value: 12, symbol: '✹', name: 'L\'Apothéose' }
	];

	constructor(private activatedRoute: ActivatedRoute, private router: Router) { }

	ngOnInit(): void {
		this.lavie = 5000;
		this.lebonus = 100;
		this.etapedujeu = this.activatedRoute.snapshot.queryParamMap.get('etape') || this.etapedujeu;

		this.pointdevies = this.lavie;
		this.pointdebonus = this.lebonus;

		this.router.routeReuseStrategy.shouldReuseRoute = () => false;
		this.router.onSameUrlNavigation = 'reload';
		this.rejouer = false;

		this.initAudio();
	}

	private initAudio(): void {
		const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		if (AudioContextClass) {
			this.audioCtx = new AudioContextClass();
		}
	}

	private playSound(type: 'roll' | 'win' | 'power'): void {
		if (!this.audioCtx) return;

		if (this.audioCtx.state === 'suspended') {
			this.audioCtx.resume();
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

	activatePower(power: PowerUp): void {
		if (power.currentCooldown > 0 || this.pointdebonus < power.cost || power.active) return;

		this.pointdebonus -= power.cost;
		power.active = true;
		this.playSound('power');
		this.messageKronos = `Pouvoir activé : ${power.name} !`;
	}

	resetjeu(): void {
		if (this.pointdevies < this.COUT_LANCER) {
			this.messageKronos = "Vous n'avez pas assez de points de vie pour défier Kronos.";
			return;
		}

		this.isRolling = true;
		this.messageKronos = "Les rouages du temps s'élancent...";

		let compteur = 0;
		const interval = setInterval(() => {
			this.randomnumber = this.randomInteger(1, 12);
			this.playSound('roll');
			compteur++;

			if (compteur > 18) {
				clearInterval(interval);
				this.finaliserLancer();
			}
		}, 80);
	}

	private finaliserLancer(): void {
		this.isRolling = false;
		this.rejouer = true;

		const avant = this.pointdevies;
		const presageActive = this.powers.find(p => p.id === 'presage')?.active;

		// Calcul du tirage avec la règle du presage
		let minRoll = presageActive ? 6 : 1;
		this.randomnumber = this.randomInteger(minRoll, 12);

		// Verifier Inversion Chrono si tirage faible
		const rewindPower = this.powers.find(p => p.id === 'rewind');
		if (rewindPower?.active && this.randomnumber < 5) {
			this.messageKronos = "Inversion Temporelle ! Nouveau tirage automatique...";
			this.randomnumber = this.randomInteger(5, 12);
		}

		this.derniereFace = this.randomnumber;

		// Gestion du bouclier
		const shieldActive = this.powers.find(p => p.id === 'shield')?.active;
		let coutEffectif = this.COUT_LANCER;
		if (shieldActive && this.randomnumber < 4) {
			coutEffectif = 0;
			this.messageKronos = "Bouclier actif : Coût de lancer absorbé !";
		}

		// Calcul des PV et des combos
		if (this.randomnumber >= 7) {
			this.comboStreak++;
			this.multiplierBonus = 1 + (this.comboStreak * 0.1);
			this.playSound('win');
		} else {
			this.comboStreak = 0;
			this.multiplierBonus = 1;
		}

		const calculBrut = (this.pointdevies - coutEffectif) * this.randomnumber;
		this.pointdevies = Math.round(calculBrut * this.multiplierBonus);
		this.lavie = this.pointdevies;

		// Réduction des temps de recharge
		this.updateCooldowns();

		// Narration dynamique
		const faceInfo = this.getFaceInfo(this.randomnumber);
		if (this.randomnumber >= 10) {
			this.messageKronos = `APOTHÉOSE ! Face ${this.randomnumber} (${faceInfo?.name}). Combo x${this.multiplierBonus.toFixed(1)} !`;
		} else if (this.randomnumber >= 5) {
			this.messageKronos = `Victoire ! Face ${this.randomnumber} (${faceInfo?.name}). Le temps vous favorise.`;
		} else {
			this.messageKronos = `Épreuve ! Face ${this.randomnumber} (${faceInfo?.name}). Persévérez.`;
		}

		// Historique
		this.historique.unshift({
			face: this.randomnumber,
			avant: avant,
			apres: this.pointdevies,
			date: new Date()
		});

		if (this.historique.length > 5) this.historique.pop();

		if (this.pointdevies >= this.SEUIL_LYKO) {
			this.messageKronos = "Seuil suprême atteint ! Lykö s'incline devant votre maestria.";
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

	onrecommencer(): void {
		this.router.navigate(['/play'], {
			queryParams: { vie: this.lavie, bonus: this.lebonus, etape: this.etapedujeu }
		});
	}

	gagnant(): boolean {
		return this.rejouer && this.randomnumber >= 5;
	}

	casuffit(): boolean {
		return this.pointdevies >= this.SEUIL_LYKO;
	}

	get progressionSeuil(): number {
		return Math.min((this.pointdevies / this.SEUIL_LYKO) * 100, 100);
	}

	randomInteger(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	getFaceInfo(value: number) {
		return this.faces.find(f => f.value === value);
	}
}