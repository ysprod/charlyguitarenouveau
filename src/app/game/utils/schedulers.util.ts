// src/app/game/cardgame/shared/schedulers.util.ts

import { DestroyRef } from '@angular/core';

/* ═════════════════════════════════════════════════════════════════════
   TIMEOUT SCHEDULER — setTimeout auto-nettoyé
   ═════════════════════════════════════════════════════════════════════ */

export function createTimeoutScheduler2(
  destroyRef: DestroyRef
): (callback: () => void, delay: number) => void {

  const timeouts = new Set<ReturnType<typeof setTimeout>>();

  destroyRef.onDestroy(() => {
    for (const id of timeouts) clearTimeout(id);
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

/* ═════════════════════════════════════════════════════════════════════
   INTERVAL SCHEDULER — setInterval auto-nettoyé
   ═════════════════════════════════════════════════════════════════════ */

export interface IntervalScheduler {
  start(callback: () => void, interval: number): void;
  stop(): void;
}

export function createIntervalScheduler2(
  destroyRef: DestroyRef
): IntervalScheduler {

  let intervalId: ReturnType<typeof setInterval> | null = null;

  destroyRef.onDestroy(() => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  });

  return {
    start(callback: () => void, interval: number): void {
      if (intervalId !== null) clearInterval(intervalId);
      intervalId = setInterval(callback, interval);
    },
    stop(): void {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };
}


/* ═════════════════════════════════════════════════════════════════════
   TIMEOUT SCHEDULER — setTimeout auto-nettoyé
   ═════════════════════════════════════════════════════════════════════ */

export function createTimeoutScheduler(
  destroyRef: DestroyRef
): (callback: () => void, delay: number) => void {

  const timeouts = new Set<ReturnType<typeof setTimeout>>();

  destroyRef.onDestroy(() => {
    for (const id of timeouts) clearTimeout(id);
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

/* ═════════════════════════════════════════════════════════════════════
   INTERVAL SCHEDULER — setInterval auto-nettoyé
   ═════════════════════════════════════════════════════════════════════ */

export interface IntervalScheduler {
  start(callback: () => void, interval: number): void;
  stop(): void;
}

export function createIntervalScheduler(
  destroyRef: DestroyRef
): IntervalScheduler {

  let intervalId: ReturnType<typeof setInterval> | null = null;

  destroyRef.onDestroy(() => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  });

  return {
    start(callback: () => void, interval: number): void {
      if (intervalId !== null) clearInterval(intervalId);
      intervalId = setInterval(callback, interval);
    },
    stop(): void {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    },
  };
}