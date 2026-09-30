import { CommonModule, DecimalPipe, NgClass } from '@angular/common';
import { Component, OnInit } from '@angular/core';

interface GameStats {
  level: number;
  levelTitle: string;
  currentXp: number;
  maxXp: number;
  points: number;
  gems: number;
  rewardsCount: number;
  health: number;
  maxHealth: number;
  bonusTitle: string;
  bonusTimer: string;
}

@Component({
  selector: 'app-lyko',
  standalone: true,
  imports: [
    DecimalPipe,
    NgClass, CommonModule
  ],
  templateUrl: './lyko.component.html',
  styleUrls: ['./lyko.component.scss']
})
export class LykoComponent implements OnInit {
  userProfile = {
    name: 'Charly G',
    avatarUrl: 'assets/images/charly-avatar.jpg'
  };

  stats: GameStats = {
    level: 3,
    levelTitle: 'Initié',
    currentXp: 245,
    maxXp: 500,
    points: 2450,
    gems: 85,
    rewardsCount: 3,
    health: 6,
    maxHealth: 10,
    bonusTitle: '+ 20% de points pendant 1h',
    bonusTimer: '58 min'
  };

  navItems = [
    { label: 'Accueil', icon: '🏠', route: '/accueil', active: false },
    { label: 'Jeux', icon: '🎮', route: '/jeux', active: true },
    { label: 'Méthode', icon: '📖', route: '/methode', active: false },
    { label: 'Académie', icon: '🎓', route: '/academie', active: false }
  ];

  menuGrid = [
    { id: 'missions', label: 'MISSIONS', sublabel: 'Relève les défis', icon: '🗺️', color: 'gold' },
    { id: 'enigmes', label: 'ÉNIGMES', sublabel: 'Teste ta logique', icon: '🧠', color: 'purple' },
    { id: 'aventure', label: 'AVENTURE', sublabel: 'Explore les mondes', icon: '🏃', color: 'blue' },
    { id: 'classement', label: 'CLASSEMENT', sublabel: 'Affronte les joueurs', icon: '🏆', color: 'orange' },
    { id: 'recompenses', label: 'RÉCOMPENSES', sublabel: 'Gagne des bonus', icon: '🎁', color: 'red' }
  ];

  constructor() { }

  ngOnInit(): void { }

  onPlay(): void {
    console.log('Lancement de la partie !');
  }

  onWatchTutorial(): void {
    console.log('Ouverture du tutoriel');
  }

  addGems(): void {
    this.stats.gems += 10;
  }

  addPoints(): void {
    this.stats.points += 100;
  }
}
