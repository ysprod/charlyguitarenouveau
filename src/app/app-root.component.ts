// src/app/app-root.component.ts

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Composant racine minimal de l'application.
 *
 * Il ne fait QUE `<router-outlet />` — aucun layout, aucune sidebar,
 * aucun header.
 *
 * Les layouts sont appliqués AU NIVEAU DES ROUTES :
 *  - `/legal/*`, `/login`, `/register` → pas de layout (pages standalone)
 *  - `/home`, `/game`, `/academie`, `/user` → AppComponent (sidebar + header)
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppRootComponent {}