import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CharlyguitaregameComponent } from './dimensions/charlyguitaregame/charlyguitaregame.component';
import { AccordOrigine, NoteSacree, Portail } from './models/offoland.model';
import { MELODIE_ORIGINES, PORTAILS, SEPT_NOTES } from './data/offoland.data';

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

  readonly melodie: readonly AccordOrigine[] = MELODIE_ORIGINES;
  readonly notes: readonly NoteSacree[] = SEPT_NOTES;
  readonly portails: readonly Portail[] = PORTAILS;
}