// src/app/offoland/offoland.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CharlyguitaregameComponent } from './dimensions/charlyguitaregame/charlyguitaregame.component';

import {
  AccordOrigine,
  CheminSection,
  Divinite,
  NoteSacree,
  OffolandQuote,
  Portail,
} from './models/offoland.model';

import {
  CHEMIN_SECTION,
  DIVINITES,
  HERO_QUOTE,
  MELODIE_ORIGINES,
  OFFLOLAND_BASELINE,
  PORTAILS,
  PORTAILS_INTRO,
  SEPT_NOTES,
} from './data/offoland.data';

/* ═════════════════════════════════════════════════════════════════════
   OFFLOLAND — Portail d'entrée du royaume
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-offoland',
  imports: [
    RouterLink,
    CharlyguitaregameComponent,
  ],
  templateUrl: './offoland.component.html',
  styleUrls: ['./offoland.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffolandComponent {

  /* ═══════════════════════════════════════════════════════
     DONNÉES — Immuables
     ═══════════════════════════════════════════════════════ */

  readonly baseline = OFFLOLAND_BASELINE;
  readonly melodie: readonly AccordOrigine[] = MELODIE_ORIGINES;
  readonly notes: readonly NoteSacree[] = SEPT_NOTES;
  readonly portailsIntro = PORTAILS_INTRO;
  readonly portails: readonly Portail[] = PORTAILS;
  readonly quote: OffolandQuote = HERO_QUOTE;
  readonly divinites: readonly Divinite[] = DIVINITES;
  readonly chemin: CheminSection = CHEMIN_SECTION;
}