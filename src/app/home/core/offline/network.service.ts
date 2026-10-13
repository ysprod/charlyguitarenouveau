import {
  Injectable,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NetworkService implements OnDestroy {

  /** État actuel : vrai si en ligne. */
  readonly isOnline = signal<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  /** Signal dérivé : vrai si hors ligne. */
  readonly isOffline = computed(() => !this.isOnline());

  private readonly onOnline  = () => this.isOnline.set(true);
  private readonly onOffline = () => this.isOnline.set(false);

  constructor() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
  }

  ngOnDestroy(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }
}