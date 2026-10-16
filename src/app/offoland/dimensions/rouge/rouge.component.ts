// src/app/offoland/dimensions/rouge/rouge.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  CLANS,
  CORRESPONDANCES,
  FAIBLESSE,
  HEARTS,
  POUVOIRS,
  RED_PARTICLES,
} from '../../constants/rouge.constants';

@Component({
  selector: 'app-rouge',
  imports: [],
  templateUrl: './rouge.component.html',
  styleUrls: ['./rouge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RougeComponent {

  /* ═══════════════════════════════════════════════════════
     DONNÉES EXPOSÉES AU TEMPLATE
     ═══════════════════════════════════════════════════════ */

  readonly hearts = HEARTS;
  readonly redParticles = RED_PARTICLES;

  readonly clans = CLANS;
  readonly pouvoirs = POUVOIRS;
  readonly faiblesse = FAIBLESSE;

  readonly correspondances = CORRESPONDANCES;
}