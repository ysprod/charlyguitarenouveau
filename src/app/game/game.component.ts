import { Component, inject, signal, computed } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { GameSoundService } from './services/game-sound.service';

 

@Component({
  selector: 'app-game',
  imports: [RouterOutlet],
  templateUrl: './game.component.html',
  styleUrl: './game.component.css',
})
export class GameComponent {
  private readonly router = inject(Router);
  private readonly sound = inject(GameSoundService);

  /** Réexposé pour le template. */
  readonly soundOn = this.sound.enabled;
  readonly soundIcon = this.sound.icon;
  readonly soundAriaLabel = this.sound.ariaLabel;

  readonly helpOpen = signal(false);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly isChildRoute = computed(() => {
    const url = this.currentUrl().split('?')[0].split('#')[0];
    return /^\/game\/.+/.test(url);
  });

  goBack(): void {
    if (this.isChildRoute()) {
      this.router.navigate(['/game']);
    }
  }

  toggleSound(): void {
    this.sound.toggle();
  }

  toggleHelp(): void {
    this.helpOpen.update((v) => !v);
  }
}