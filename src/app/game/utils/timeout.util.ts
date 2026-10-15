// src/app/features/oracle-game/utils/timeout.util.ts

import { DestroyRef } from '@angular/core';

/* ═════════════════════════════════════════════════════════════════════
   TIMEOUT UTIL — setTimeout auto-nettoyé à la destruction
   ═════════════════════════════════════════════════════════════════════ */

/**
 * Crée une fonction `scheduleTimeout` qui :
 * - stocke tous les `setTimeout` actifs ;
 * - les annule automatiquement quand `destroyRef` est détruit.
 *
 * Usage :
 * ```ts
 * const scheduleTimeout = createTimeoutScheduler(this.destroyRef);
 * scheduleTimeout(() => doSomething(), 500);
 * ```
 */
export function createTimeoutScheduler(
  destroyRef: DestroyRef
): (callback: () => void, delay: number) => void {

  const timeouts = new Set<ReturnType<typeof setTimeout>>();

  destroyRef.onDestroy(() => {
    for (const id of timeouts) {
      clearTimeout(id);
    }
    timeouts.clear();
  });

  return (callback: () => void, delay: number): void => {
    const id = setTimeout(() => {
      timeouts.delete(id);
      callback();
    }, delay);

    timeouts.add(id);
  };
}