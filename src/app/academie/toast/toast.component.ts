import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';

import { ToastService } from 'src/app/academie/services/toast.service';

/* ═════════════════════════════════════════════════════════════════════
   TOAST COMPONENT — Affichage global des notifications
   ═════════════════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-toast',
  imports: [],
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  private readonly toastService = inject(ToastService);

  readonly toast = this.toastService.toast;

  /** ✅ Fermeture manuelle (délègue au service si disponible) */
  dismiss(): void {
    const service = this.toastService as { dismiss?: () => void };
    if (typeof service.dismiss === 'function') {
      service.dismiss();
    }
  }
}