// src/app/shared/promo-modal/promo-modal.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Injector,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { BodyScrollService } from 'src/app/home/services/body-scroll.service';

 
/* ═════════════════════════════════════════════════════════════════════
   COMPOSANT — Modale Code Promo
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

  readonly isSaving = input<boolean>(false);
  readonly errorMessage = input<string>('');
  readonly title = input<string>('Code Promo obligatoire');
  readonly message = input<string>(
    'Pour continuer, saisissez un code promo valide, puis cliquez sur Continuer.',
  );

  /* ═══════════════════════════════════════════════════════
     OUTPUTS
     ═══════════════════════════════════════════════════════ */

  readonly codeSubmitted = output<string>();
  readonly closed = output<void>();

  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  private readonly injector = inject(Injector);
  private readonly bodyScroll = inject(BodyScrollService);

  /* ═══════════════════════════════════════════════════════
     ÉTAT
     ═══════════════════════════════════════════════════════ */

  readonly codeValue = signal('');

  /** ✅ Empêche la soumission d'un code vide */
  readonly canSubmit = signal(false);

  /** ✅ IDs uniques pour l'accessibilité (plusieurs modales possibles) */
  private readonly uid = `promo-${Math.random().toString(36).slice(2, 9)}`;
  readonly titleId = `${this.uid}-title`;
  readonly descId = `${this.uid}-desc`;
  readonly inputId = `${this.uid}-input`;

  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');
  private readonly cardRef = viewChild<ElementRef<HTMLDivElement>>('cardRef');

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */

  constructor() {
    /* ✅ Focus auto sur l'input à l'ouverture */
    afterNextRender(() => {
      this.codeInput()?.nativeElement.focus();
    });

    /* ✅ Bloque le scroll du body */
    this.bodyScroll.lock();
  }

  /* ✅ Débloque le scroll à la destruction */
  ngOnDestroy(): void {
    this.bodyScroll.unlock();
  }

  /* ═══════════════════════════════════════════════════════
     EVENTS
     ═══════════════════════════════════════════════════════ */

  /** ✅ Escape ferme la modale (sauf si en cours de sauvegarde) */
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (!this.isSaving()) {
      this.close();
    }
  }

  /** ✅ Tab trap : garde le focus dans la modale */
  @HostListener('document:keydown.tab', ['$event'])
  onTabKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    const card = this.cardRef()?.nativeElement;
    if (!card) return;

    const focusable = card.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (keyboardEvent.shiftKey && active === first) {
      last.focus();
      keyboardEvent.preventDefault();
    } else if (!keyboardEvent.shiftKey && active === last) {
      first.focus();
      keyboardEvent.preventDefault();
    }
  }

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  /** Met à jour le code + le bouton "Continuer" */
  onCodeChange(value: string): void {
    this.codeValue.set(value);
    this.canSubmit.set(value.trim().length > 0);
  }

  submit(): void {
    if (this.isSaving()) return;
    const code = this.codeValue().trim();
    if (!code) return;
    this.codeSubmitted.emit(code);
  }

  close(): void {
    if (this.isSaving()) return;
    this.closed.emit();
  }
}