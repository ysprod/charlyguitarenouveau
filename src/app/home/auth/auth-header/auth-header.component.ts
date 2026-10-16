// src/app/auth/auth-header/auth-header.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-header',
  imports: [RouterLink],
  templateUrl: './auth-header.component.html',
  styleUrls: ['./auth-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthHeaderComponent {

  /* ═══════════════════════════════════════════════════════
     ENTRÉES
     ═══════════════════════════════════════════════════════ */

  /** Titre principal (ex : "Bienvenue", "Créer un compte"). */
  readonly title = input.required<string>();

  /** Sous-titre descriptif. */
  readonly subtitle = input.required<string>();

  /** Texte d'invite (ex : "Pas encore de compte ?"). */
  readonly promptText = input.required<string>();

  /** Texte du lien d'action (ex : "Créer un compte"). */
  readonly linkLabel = input.required<string>();

  /** Route cible du lien. */
  readonly linkRoute = input.required<string>();

  /** URL de retour propagée en query param. */
  readonly returnUrl = input('/');
}