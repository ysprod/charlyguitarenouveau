import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {

  /** Année courante pour le copyright */
  readonly currentYear: number = new Date().getFullYear();

  /**
   * Retour en haut de page avec scroll fluide.
   * Respecte `prefers-reduced-motion` : scroll instantané si l'utilisateur
   * a désactivé les animations.
   */
  scrollToTop(): void {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
  }
}