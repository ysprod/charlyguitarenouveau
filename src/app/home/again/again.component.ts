import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

export interface MembreEquipe {
  nom: string;
  role: string;
  icone: string;
  couleur: string;
  isFeatured?: boolean;
  anonyme?: boolean;
}


@Component({
  selector: 'app-again',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './again.component.html',
  styleUrls: ['./again.component.scss']
})
export class AgainComponent implements OnInit {

  membres: MembreEquipe[] = [
    {
      nom: "Kotchi Kacou Jean-Charles",
      role: "Direction Artistique",
      icone: "🎨",
      couleur: "#fbbf24",
      isFeatured: true
    },
    {
      nom: "Ahoulou Josiane née Koné",
      role: "Marketing",
      icone: "📈",
      couleur: "#ef4444"
    },
    {
      nom: "Simon Porquet",
      role: "Community Management",
      icone: "💬",
      couleur: "#3b82f6"
    },
    {
      nom: "Yaya Sidibé",
      role: "Informatique",
      icone: "💻",
      couleur: "#22c55e"
    },
    {
      nom: "Diakité Seydou",
      role: "Séquences & Dialogues",
      icone: "✍️",
      couleur: "#a855f7"
    },
    {
      nom: "Charly Guitare",
      role: "Musique du Jeu",
      icone: "🎸",
      couleur: "#f97316",
      isFeatured: true
    },
    {
      nom: "Lago Séry Patrick",
      role: "Décors",
      icone: "🏞️",
      couleur: "#10b981"
    },
    {
      nom: "Marcel Kouassi",
      role: "Animation",
      icone: "🎬",
      couleur: "#ec4899"
    },
    {
      nom: "Soumahoro Moussa",
      role: "Chef de Projet",
      icone: "👑",
      couleur: "#eab308",
      isFeatured: true
    },
    {
      nom: "Sidibé Dieudonné Chris Mohamed",
      role: "Bêta Testing",
      icone: "🧪",
      couleur: "#06b6d4"
    },
    {
      nom: "???",
      role: "Créateur de la Dimension Rouge",
      icone: "🔴",
      couleur: "#dc2626",
      anonyme: true
    }
  ];

  constructor() { }

  ngOnInit(): void { }

  get membresFeatured(): MembreEquipe[] {
    return this.membres.filter(m => m.isFeatured);
  }

  get membresStandard(): MembreEquipe[] {
    return this.membres.filter(m => !m.isFeatured);
  }
}
