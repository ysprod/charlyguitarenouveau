import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DocumentsComponent } from './documents/documents.component';

import { Formation, LiveCard } from './models/academie.model';
import { FORMATIONS, LIVE_CARDS } from './data/academie.data';

/* ═════════════════════════════════════════════════════════════════════
   ACADEMIE — Offolomou Ecosysteme Academie
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-academie',
  imports: [
    RouterLink,
    DocumentsComponent,
  ],
  templateUrl: './academie.component.html',
  styleUrls: ['./academie.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademieComponent {

  /* ═══════════════════════════════════════════════════════
     DONNÉES — Immuables
     ═══════════════════════════════════════════════════════ */

  readonly formations: readonly Formation[] = FORMATIONS;
  readonly liveCards: readonly LiveCard[] = LIVE_CARDS;
}