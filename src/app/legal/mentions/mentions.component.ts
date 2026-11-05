import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
} from '@angular/core';

@Component({
  selector: 'app-mentions',
  standalone: true,
  imports: [],
  templateUrl: './mentions.component.html',
  styleUrls: ['./mentions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MentionsComponent {
  constructor() {
    afterNextRender(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
    });
  }
}