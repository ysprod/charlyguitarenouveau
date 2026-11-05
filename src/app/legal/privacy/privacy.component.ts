import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
} from '@angular/core';

@Component({
  selector: 'app-legal-privacy',
  standalone: true,
  imports: [],
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyComponent {
  constructor() {
    afterNextRender(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
    });
  }
}