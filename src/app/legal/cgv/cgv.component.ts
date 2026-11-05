import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
} from '@angular/core';

@Component({
  selector: 'app-cgv',
  imports: [],
  templateUrl: './cgv.component.html',
  styleUrls: ['./cgv.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CgvComponent {
  readonly lastUpdated = '4 novembre 2026';

  constructor() {
    afterNextRender(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
    });
  }
}