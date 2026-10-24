import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LiveCard } from '../models/academie.model';
import { LIVE_CARDS } from '../data/live.data'; // Ou '../data/academie.data'

@Component({
  selector: 'app-live',
  imports: [RouterLink],
  templateUrl: './live.component.html',
  styleUrls: ['./live.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveComponent {
  readonly liveCards: readonly LiveCard[] = LIVE_CARDS;
}