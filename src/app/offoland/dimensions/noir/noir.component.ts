// src/app/offoland/dimensions/noir/noir.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UpperCasePipe } from '@angular/common';

import {
  DARK_PARTICLES,
  DIVINITES,
  PASSAGES,
} from '../../constants/noir.constants';

@Component({
  selector: 'app-noir',
  imports: [UpperCasePipe],
  templateUrl: './noir.component.html',
  styleUrls: ['./noir.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoirComponent {

  /* ═══════════════════════════════════════════════════════
     DONNÉES EXPOSÉES AU TEMPLATE
     ═══════════════════════════════════════════════════════ */

  readonly darkParticles = DARK_PARTICLES;
  readonly divinites = DIVINITES;
  readonly passages = PASSAGES;
}