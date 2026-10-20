// src/app/academie/academie.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Formation, LiveCard } from './models/academie.model';
import { FORMATIONS, LIVE_CARDS } from './data/academie.data';
import { OffresComponent } from './offres/offres.component';

/* ═════════════════════════════════════════════════════════════════════
   ACADEMIE — Offolomou Ecosysteme Academie
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-academie',
  imports: [
    RouterLink,
    OffresComponent,
  ],
  templateUrl: './academie.component.html',
  styleUrls: ['./academie.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademieComponent {

  /* ═══════════════════════════════════════════════════════
     DONNÉES — Immuables
     ═══════════════════════════════════════════════════════ */

   readonly liveCards: readonly LiveCard[] = LIVE_CARDS;
}