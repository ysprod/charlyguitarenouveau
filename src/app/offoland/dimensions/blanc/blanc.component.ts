// src/app/offoland/dimensions/blanc/blanc.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  CARACTERISTIQUES,
  CORRESPONDANCES,
  FAIBLESSES,
  FORCES,
  REGLE_POINTS,
  SAND_PARTICLES,
} from '../../constants/blanc.constants';

@Component({
  selector: 'app-blanc',
  imports: [],
  templateUrl: './blanc.component.html',
  styleUrls: ['./blanc.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlancComponent {

  /* ═══════════════════════════════════════════════════════
     DONNÉES EXPOSÉES AU TEMPLATE
     ═══════════════════════════════════════════════════════ */

  readonly sandParticles = SAND_PARTICLES;
  readonly caracteristiques = CARACTERISTIQUES;
  readonly forces = FORCES;
  readonly faiblesses = FAIBLESSES;
  readonly correspondances = CORRESPONDANCES;
  readonly reglePoints = REGLE_POINTS;
}