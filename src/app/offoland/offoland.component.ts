
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  Portail
} from './models/offoland.model';

import {
  PORTAILS
} from './data/offoland.data';

/* ═════════════════════════════════════════════════════════════════════
   OFFOLAND — Portail d'entrée du royaume
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-offoland',
  imports: [RouterLink],
  templateUrl: './offoland.component.html',
  styleUrls: ['./offoland.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OffolandComponent {

  readonly portails: readonly Portail[] = PORTAILS;
}