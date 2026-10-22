// src/app/core/services/analytics.service.ts

import { Injectable, inject, DestroyRef } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { environment } from '../../../environments/environment';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

declare const gtag: (
  command: 'event' | 'config' | 'js' | 'set',
  target: string | Date,
  params?: Record<string, unknown>,
) => void;

export type AnalyticsEventParams = Record<string, unknown>;

/* ═════════════════════════════════════════════════════════════════════
   SERVICE
   ═════════════════════════════════════════════════════════════════════ */

/**
 * Service de tracking GA4 manuel.
 *
 * ✅ Charge dynamiquement `gtag.js` depuis `environment.firebase.measurementId`.
 * ✅ Désactive `send_page_view` → envoi manuel sur `NavigationEnd`.
 * ✅ Fournit `trackEvent()` pour les événements personnalisés.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly destroyRef = inject(DestroyRef);

  private readonly measurementId = environment.firebase.measurementId;
  private initialized = false;
  private scriptLoaded = false;

  /* ═══════════════════════════════════════════════════════
     INITIALISATION
     ═══════════════════════════════════════════════════════ */

  initPageTracking(): void {
    if (this.initialized) return;
    this.initialized = true;

    /* ✅ Charge gtag.js dynamiquement */
    this.loadGtagScript();

    /* ✅ Écoute les navigations Angular */
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => {
        this.sendPageView(e.urlAfterRedirects);
      });

    /* ✅ Envoie la page initiale (après chargement du script) */
    this.sendPageView(this.router.url);
  }

  /* ═══════════════════════════════════════════════════════
     CHARGEMENT DYNAMIQUE DU SCRIPT
     ═══════════════════════════════════════════════════════ */

  private loadGtagScript(): void {
    if (this.scriptLoaded || !this.measurementId) return;

    /* Initialise le dataLayer + gtag stub si absent */
    if (typeof window !== 'undefined') {
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).gtag = (window as any).gtag || function () {
        (window as any).dataLayer.push(arguments);
      };

      (window as any).gtag('js', new Date());
      (window as any).gtag('config', this.measurementId, {
        send_page_view: false,
      });
    }

    /* Injecte le script async */
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    script.onload = () => { this.scriptLoaded = true; };
    document.head.appendChild(script);
  }

  /* ═══════════════════════════════════════════════════════
     PAGE VIEW
     ═══════════════════════════════════════════════════════ */

  private sendPageView(url: string): void {
    if (typeof gtag !== 'function') return;

    const pagePath = url.split('?')[0].split('#')[0];
    const pageLocation = window.location.origin + url;
    const pageTitle = this.title.getTitle();

    gtag('event', 'page_view', {
      page_location: pageLocation,
      page_path: pagePath,
      page_title: pageTitle,
    });
  }

  /* ═══════════════════════════════════════════════════════
     ÉVÉNEMENTS PERSONNALISÉS
     ═══════════════════════════════════════════════════════ */

  trackEvent(eventName: string, params?: AnalyticsEventParams): void {
    if (typeof gtag !== 'function') return;
    gtag('event', eventName, params ?? {});
  }
}