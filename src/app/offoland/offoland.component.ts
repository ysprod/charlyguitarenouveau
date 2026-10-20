// src/app/offoland/offoland.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/* ═════════════════════════════════════════════════════════════════════
   OFFOLAND — Portail d'entrée du royaume
   ─────────────────────────────────────────────────────────────────────
   Deux points d'entrée :
   - /offoland/dimensions/charlyguitaregame → Les 7 Dimensions
   - /offoland/vie                        → La Vie d'Offoland (BCO, Finance…)
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-offoland',
  imports: [RouterLink],
  templateUrl: './offoland.component.html',
  styleUrls: ['./offoland.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffolandComponent {}