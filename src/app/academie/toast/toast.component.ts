// src/app/features/documents/shared/toast/toast.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { ToastService } from 'src/app/academie/toast.service';

 

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
}