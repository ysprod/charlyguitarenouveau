// src/app/auth/auth-input/auth-input.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { AuthInputIcon } from '../../models/auth-input.model';

@Component({
  selector: 'app-auth-input',
  imports: [FormsModule],
  templateUrl: './auth-input.component.html',
  styleUrls: ['./auth-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthInputComponent {

  /* ═══════════════════════════════════════════════════════
     ENTRÉES
     ═══════════════════════════════════════════════════════ */

  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly type = input<'email' | 'password' | 'text'>('text');
  readonly autocomplete = input('off');
  readonly icon = input<AuthInputIcon>('email');
  readonly disabled = input(false);
  readonly required = input(true);

  /** Message d'erreur affiché sous le champ (vide = pas d'erreur). */
  readonly error = input('');

  /** Affiche le bouton œil (uniquement pour type password). */
  readonly withPasswordToggle = input(false);

  /* ═══════════════════════════════════════════════════════
     TWO-WAY BINDINGS
     ═══════════════════════════════════════════════════════ */

  /** État partagé du toggle password (two-way binding avec le parent). */
  readonly showPassword = model(false);

  /** Valeur liée au champ (two-way binding avec le parent). */
  readonly value = model.required<string>();

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }
}