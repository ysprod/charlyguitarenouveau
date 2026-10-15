// src/app/shared/promo-modal/promo-modal.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { FormsModule } from '@angular/forms';

/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-promo-modal',
  imports: [FormsModule],
  templateUrl: './promo-modal.component.html',
  styleUrls: ['./promo-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoModalComponent {

  /* ═══════════════════════════════════════════════════════
     INPUTS
     ═══════════════════════════════════════════════════════ */

  /** Vrai pendant la vérification du code. */
  readonly isSaving = input<boolean>(false);

  /** Message d'erreur à afficher (vide si aucun). */
  readonly errorMessage = input<string>('');

  /** Titre de la modale. */
  readonly title = input<string>('Code Promo obligatoire');

  /** Message descriptif de la modale. */
  readonly message = input<string>(
    'Pour continuer, saisissez un code promo valide, puis cliquez sur Continuer.'
  );

  /* ═══════════════════════════════════════════════════════
     OUTPUTS
     ═══════════════════════════════════════════════════════ */

  /** Émis lors de la soumission du code. */
  readonly codeSubmitted = output<string>();

  /** Émis lors de la fermeture. */
  readonly closed = output<void>();

  /* ═══════════════════════════════════════════════════════
     ÉTAT INTERNE
     ═══════════════════════════════════════════════════════ */

  /** Valeur du champ code (two-way binding). */
  readonly codeValue = signal('');

  /* ═══════════════════════════════════════════════════════
     FOCUS AUTO
     ═══════════════════════════════════════════════════════ */

  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');

  constructor() {
    afterNextRender(() => {
      this.codeInput()?.nativeElement.focus();
    });
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  submit(): void {
    if (this.isSaving()) return;
    this.codeSubmitted.emit(this.codeValue());
  }

  close(): void {
    if (this.isSaving()) return;
    this.closed.emit();
  }
}