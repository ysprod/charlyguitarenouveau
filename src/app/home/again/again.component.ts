// src/app/home/again/again.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';

import { MembreEquipe } from 'src/app/home/models/membre.model';
import { MEMBRES_EQUIPE } from '../data/equipe.data';
import { animationDelay } from '../utils/animations.util';

@Component({
  selector: 'app-again',
  imports: [],
  templateUrl: './again.component.html',
  styleUrls: ['./again.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgainComponent {

  /* ═══════════════════════════════════════════════════════
     DONNÉES
     ═══════════════════════════════════════════════════════ */

  /** Liste complète des membres. */
  readonly membres: readonly MembreEquipe[] = MEMBRES_EQUIPE;

  /** Membres mis en avant (section « Piliers »). */
  readonly membresFeatured: readonly MembreEquipe[] =
    this.membres.filter((m) => m.isFeatured);

  /** Membres standards (section « Gardiens »). */
  readonly membresStandard: readonly MembreEquipe[] =
    this.membres.filter((m) => !m.isFeatured);

  /* ═══════════════════════════════════════════════════════
     HELPERS (exposés au template)
     ═══════════════════════════════════════════════════════ */

  /** Fonction pure pour le délai d'animation. */
  readonly animationDelay = animationDelay;
}