// src/app/offoland/dimensions/vert/vert.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  AVERTISSEMENT_FINAL,
  CORRESPONDANCES,
  FAIBLESSE_SIRENES,
  GREEN_PARTICLES,
  LEAVES,
  PHENOMENES,
  POUVOIRS_CHARLY_VERT,
  SIRENES,
} from '../../constants/vert.constants';

@Component({
  selector: 'app-vert',
  imports: [],
  templateUrl: './vert.component.html',
  styleUrls: ['./vert.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VertComponent {

  /* ═══════════════════════════════════════════════════════
     DONNÉES EXPOSÉES AU TEMPLATE
     ═══════════════════════════════════════════════════════ */

  readonly leaves = LEAVES;
  readonly greenParticles = GREEN_PARTICLES;

  readonly phenomenes = PHENOMENES;
  readonly sirenes = SIRENES;
  readonly pouvoirsCharlyVert = POUVOIRS_CHARLY_VERT;

  readonly correspondances = CORRESPONDANCES;

  readonly faiblesseSirenes = FAIBLESSE_SIRENES;
  readonly avertissementFinal = AVERTISSEMENT_FINAL;
}