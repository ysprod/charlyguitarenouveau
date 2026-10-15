// src/app/shared/google-button/google-button.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-google-button',
  templateUrl: './google-button.component.html',
  styleUrls: ['./google-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleButtonComponent {

  /* ═══════════════════════════════════════════════════════
     ENTRÉES
     ═══════════════════════════════════════════════════════ */

  readonly label = input.required<string>();
  readonly disabled = input(false);

  /* ═══════════════════════════════════════════════════════
     SORTIES
     ═══════════════════════════════════════════════════════ */

  readonly clicked = output<void>();
}