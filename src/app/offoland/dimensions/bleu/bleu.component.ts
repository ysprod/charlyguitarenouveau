// src/app/offoland/dimensions/bleu/bleu.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  BLUE_PARTICLES,
  CHARLY_BLEU,
  CLIMATS,
  CLOUDS,
  CORRESPONDANCES,
  CONTEXTE_HISTOIRE,
  CREATURES,
  FAIBLESSE_CREATURES,
  PIEGES,
  REGLE_POINTS,
} from '../../constants/bleu.constants';

@Component({
  selector: 'app-bleu',
  imports: [],
  templateUrl: './bleu.component.html',
  styleUrls: ['./bleu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BleuComponent {

  /* ═══════════════════════════════════════════════════════
     DONNÉES EXPOSÉES AU TEMPLATE
     ═══════════════════════════════════════════════════════ */

  readonly clouds = CLOUDS;
  readonly blueParticles = BLUE_PARTICLES;

  readonly creatures = CREATURES;
  readonly pieges = PIEGES;
  readonly climats = CLIMATS;
  readonly charlyBleu = CHARLY_BLEU;

  readonly correspondances = CORRESPONDANCES;

  readonly faiblesseCreatures = FAIBLESSE_CREATURES;
  readonly reglePoints = REGLE_POINTS;
  readonly contexteHistoire = CONTEXTE_HISTOIRE;
}