import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RevealDirective } from '../shared/reveal.directive';
import { CharlyguitaregameComponent } from './charlyguitaregame/charlyguitaregame.component';

/* ═════════════════════════════════════════════════════════════════════
   OFFLOLAND — Portail d'entrée du royaume
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-offoland',
  standalone: true,
  imports: [
    RouterLink,
    RevealDirective,
    CharlyguitaregameComponent
  ],
  templateUrl: './offoland.component.html',
  styleUrls: ['./offoland.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OffolandComponent {}