import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-promo-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './promo-modal.component.html',
  styleUrls: ['./promo-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromoModalComponent {

  @Input() isSaving = false;
  @Input() errorMessage = '';
  @Input() title = 'Code Promo obligatoire';
  @Input() message =
    'Pour continuer, saisissez un code promo valide, puis cliquez sur Continuer.';

  @Output() codeSubmitted = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  codeValue = '';

  onInputChange(event: Event): void {
    this.codeValue = (event.target as HTMLInputElement).value;
  }

  submit(): void {
    if (this.isSaving) return;
    this.codeSubmitted.emit(this.codeValue);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.submit();
    }
  }

  close(): void {
    if (this.isSaving) return;
    this.closed.emit();
  }
}