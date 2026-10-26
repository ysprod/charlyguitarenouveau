import { Component, OnInit, AfterViewInit } from '@angular/core';
import { TranslationService } from '../services/translation.service';
 
@Component({
  selector: 'app-translate',
  template: `
    <div class="translate-container">
      <div id="google_translate_element"></div>
    </div>
  `,
  styles: [`
    .translate-container {
      display: inline-block;
      margin-left: 1rem;
    }
    /* Masquer la bannière Google Translate */
    ::ng-deep .goog-te-banner-frame {
      display: none !important;
    }
    ::ng-deep body {
      top: 0 !important;
    }
    /* Styliser le menu déroulant pour qu'il s'intègre à votre design */
    ::ng-deep .goog-te-combo {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(242, 185, 94, 0.5);
      padding: 5px 10px;
      border-radius: 20px;
      font-family: inherit;
      font-size: 14px;
      outline: none;
    }
    ::ng-deep .goog-te-combo option {
      background: #101B35;
      color: white;
    }
  `]
})
export class TranslateComponent implements OnInit, AfterViewInit {
  constructor(private translationService: TranslationService) {}

  ngOnInit() {
    // Initialisation légèrement retardée pour s'assurer que le DOM est prêt
    setTimeout(() => {
      this.translationService.initTranslation();
    }, 0);
  }

  ngAfterViewInit() {
    // Une deuxième initialisation de sécurité
    this.translationService.initTranslation();
  }
}