import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MembreEquipe } from 'src/app/home/models/membre.model';
import { MEMBRES_EQUIPE } from '../data/equipe.data';

@Component({
  selector: 'app-again',
  imports: [],
  templateUrl: './again.component.html',
  styleUrls: ['./again.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgainComponent {
  readonly membres: readonly MembreEquipe[] = MEMBRES_EQUIPE;
  readonly membresFeatured: readonly MembreEquipe[] = this.membres.filter((m) => m.isFeatured);
  readonly membresStandard: readonly MembreEquipe[] = this.membres.filter((m) => !m.isFeatured);
}