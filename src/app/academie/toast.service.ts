// src/app/features/documents/shared/toast/toast.service.ts

import {
  Injectable,
  signal,
} from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastState {
  readonly show: boolean;
  readonly message: string;
  readonly type: ToastType;
}

const INITIAL_STATE: ToastState = {
  show: false,
  message: '',
  type: 'info',
};

const TOAST_DURATION_MS = 4000;

/* ═════════════════════════════════════════════════════════════════════
   TOAST SERVICE — Gestion globale des notifications
   ═════════════════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class ToastService {

  private readonly _toast = signal<ToastState>(INITIAL_STATE);
  readonly toast = this._toast.asReadonly();

  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  /* ═══════════════════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════════════════ */

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  show(message: string, type: ToastType = 'info'): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this._toast.set({ show: true, message, type });

    this.timeoutId = setTimeout(() => {
      this._toast.update((t) => ({ ...t, show: false }));
      this.timeoutId = null;
    }, TOAST_DURATION_MS);
  }

  hide(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this._toast.update((t) => ({ ...t, show: false }));
  }
}