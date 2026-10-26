import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { translatorWidget, TranslatorWidgetLayout } from 'google-translate-widget';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private isInitialized = false;
  private currentLang = 'fr'; // Langue par défaut

  constructor(private router: Router) {
    // Surveiller les changements de route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Attendre que le DOM soit mis à jour après le changement de route
      setTimeout(() => {
        this.refreshTranslation();
      }, 500);
    });
  }

  initTranslation() {
    if (this.isInitialized) return;

    translatorWidget({
      element: 'google_translate_element',
      includedLanguages: ['fr', 'en', 'zh-CN', 'es', 'de'],
      defaultLanguage: 'fr',
      layout: TranslatorWidgetLayout.SIMPLE
    });

    this.isInitialized = true;

    // Optionnel : écouter les changements de langue pour les stocker
    // (Google Translate modifie un cookie, on peut s'en servir pour retrouver la langue)
    this.detectCurrentLanguage();
  }

  private detectCurrentLanguage() {
    // Google Translate stocke la langue dans un cookie 'googtrans'
    const match = document.cookie.match(/googtrans=\/auto\/([a-zA-Z-]+)/);
    if (match && match[1]) {
      this.currentLang = match[1];
    }
  }

  private refreshTranslation() {
    // Si une langue autre que le français est sélectionnée, forcer la re-traduction
    this.detectCurrentLanguage();
    if (this.currentLang && this.currentLang !== 'fr') {
      const selectElement = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (selectElement && selectElement.value !== this.currentLang) {
        selectElement.value = this.currentLang;
        selectElement.dispatchEvent(new Event('change'));
      }
    }
  }

  changeLanguage(langCode: string) {
    const selectElement = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (selectElement) {
      selectElement.value = langCode;
      selectElement.dispatchEvent(new Event('change'));
      this.currentLang = langCode;
    }
  }
}