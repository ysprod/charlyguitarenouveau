// src/app/home/services/body-scroll.service.ts

import { DOCUMENT, Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BodyScrollService {
  private readonly document = inject(DOCUMENT);
  private lockCount = 0;
  private previousOverflow = '';

  lock(): void {
    this.lockCount++;
    if (this.lockCount === 1) {
      const body = this.document.body;
      this.previousOverflow = body.style.overflow;
      body.style.overflow = 'hidden';
    }
  }

  unlock(): void {
    if (this.lockCount === 0) return;
    this.lockCount--;
    if (this.lockCount === 0) {
      this.document.body.style.overflow = this.previousOverflow;
    }
  }
}