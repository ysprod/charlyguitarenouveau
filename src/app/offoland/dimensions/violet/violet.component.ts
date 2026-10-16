// src/app/offoland/dimensions/violet/violet.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DIMENSION_VIOLET } from '../../constants/violet.constants';

@Component({
  selector: 'app-violet',
  imports: [],
  templateUrl: './violet.component.html',
  styleUrls: ['./violet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VioletComponent {

  /* ═══════════════════════════════════════════════════════
     DONNÉES EXPOSÉES AU TEMPLATE
     ═══════════════════════════════════════════════════════ */

  readonly dimension = DIMENSION_VIOLET;
}