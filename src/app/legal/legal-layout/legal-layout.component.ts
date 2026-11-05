import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-legal-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './legal-layout.component.html',
  styleUrls: ['./legal-layout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalLayoutComponent {
  readonly currentYear = new Date().getFullYear();

  constructor() {
    afterNextRender(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
    });
  }
}