import {
  ChangeDetectionStrategy,
  Component,
  input,
  model
} from '@angular/core';

import { FormsModule } from '@angular/forms';

export type AuthInputIcon = 'email' | 'lock' | 'check';

@Component({
  selector: 'app-auth-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth-input.component.html',
  styleUrls: ['./auth-input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthInputComponent {
  readonly inputId = input.required<string>();
  readonly label = input.required<string>();
  readonly placeholder = input<string>('');
  readonly type = input<'email' | 'password' | 'text'>('text');
  readonly autocomplete = input<string>('off');
  readonly icon = input<AuthInputIcon>('email');
  readonly disabled = input<boolean>(false);
  readonly required = input<boolean>(true);

  /** Affiche le bouton œil (uniquement pour type password). */
  readonly withPasswordToggle = input<boolean>(false);

  /** État partagé du toggle password (two-way binding avec le parent). */
  readonly showPassword = model<boolean>(false);

  /** Valeur liée au champ (two-way binding avec le parent). */
  readonly value = model.required<string>();

  /** Bascule l'état de visibilité du mot de passe. */
  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }
}