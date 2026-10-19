// src/app/shared/promo-modal/promo-modal.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Injector,
  OnDestroy,
  afterNextRender,
  computed,
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
export class PromoModalComponent implements OnDestroy {

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

  /** ✅ `computed` : jamais de désynchronisation, pas de `set` manuel */
  readonly canSubmit = computed(
    () => this.codeValue().trim().length > 0 && !this.isSaving(),
  );

  /** ✅ IDs uniques pour l'accessibilité (plusieurs modales possibles) */
  private readonly uid = `promo-${Math.random().toString(36).slice(2, 9)}`;
  readonly titleId = `${this.uid}-title`;
  readonly descId = `${this.uid}-desc`;
  readonly inputId = `${this.uid}-input`;

  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');
  private readonly cardRef = viewChild<ElementRef<HTMLDivElement>>('cardRef');

  /** ✅ Mémorise l'élément qui avait le focus avant l'ouverture */
  private previousActiveElement: HTMLElement | null = null;

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */

  constructor() {
    /* ✅ Mémorise l'élément actif pour restauration à la fermeture */
    if (typeof document !== 'undefined') {
      this.previousActiveElement = document.activeElement as HTMLElement | null;
    }

    /* ✅ Focus auto sur l'input à l'ouverture */
    afterNextRender(() => {
      this.codeInput()?.nativeElement.focus();
    });

    /* ✅ Bloque le scroll du body */
    this.bodyScroll.lock();
  }

  ngOnDestroy(): void {
    this.bodyScroll.unlock();

    /* ✅ Restaure le focus sur l'élément qui l'avait avant */
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      try {
        this.previousActiveElement.focus();
      } catch {
        /* silencieux — l'élément a pu être supprimé */
      }
    }
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

    /* ✅ Si le focus est sorti de la modale, on le ramène dedans */
    if (!active || !card.contains(active)) {
      first.focus();
      keyboardEvent.preventDefault();
      return;
    }

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

  /** Met à jour le code (le `canSubmit` se recalcule automatiquement) */
  onCodeChange(value: string): void {
    this.codeValue.set(value);
  }

  /** ✅ `submit` blindé : vérifie aussi `canSubmit` (empêche Enter sur code vide) */
  submit(): void {
    if (!this.canSubmit()) return;
    const code = this.codeValue().trim();
    if (!code) return;
    this.codeSubmitted.emit(code);
  }

  close(): void {
    if (this.isSaving()) return;
    this.closed.emit();
  }
}