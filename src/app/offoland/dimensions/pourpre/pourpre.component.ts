// src/app/offoland/dimensions/pourpre/pourpre.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DIMENSION_POURPRE } from '../../constants/pourpre.constants';

@Component({
  selector: 'app-pourpre',
  imports: [],
  templateUrl: './pourpre.component.html',
  styleUrls: ['./pourpre.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PourpreComponent {

  /* ═══════════════════════════════════════════════════════
     DONNÉES EXPOSÉES AU TEMPLATE
     ═══════════════════════════════════════════════════════ */

  readonly dimension = DIMENSION_POURPRE;
}