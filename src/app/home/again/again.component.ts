import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MEMBRES_EQUIPE } from 'src/app/home/equipe.data';
import { MembreEquipe } from 'src/app/home/membre.model';

@Component({
  selector: 'app-again',
  standalone: true,
  imports: [],
  templateUrl: './again.component.html',
  styleUrls: ['./again.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgainComponent {

  /** Liste complète des membres */
  readonly membres: MembreEquipe[] = MEMBRES_EQUIPE;

  /** Membres mis en avant (section "Piliers") */
  readonly membresFeatured: MembreEquipe[] =
    this.membres.filter(m => m.isFeatured);

  /** Membres standards (section "Gardiens") */
  readonly membresStandard: MembreEquipe[] =
    this.membres.filter(m => !m.isFeatured);

  /** Helper pour éviter l'appel répété à (i * delay) dans le template */
  animationDelay(index: number, step: number): string {
    return `${index * step}s`;
  }
}