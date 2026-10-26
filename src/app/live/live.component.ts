import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ImmersiveCarouselComponent } from '../shared/immersive-carousel/immersive-carousel.component';
import { LIVE_CARDS } from './data/live.data';
import { LiveCard } from './models/live.model';
import { StreamingComponent } from './streaming/streaming.component';

@Component({
  selector: 'app-live',
  imports: [ImmersiveCarouselComponent, StreamingComponent],
  templateUrl: './live.component.html',
  styleUrls: ['./live.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveComponent { 
  readonly cards: readonly LiveCard[] = LIVE_CARDS;
 }