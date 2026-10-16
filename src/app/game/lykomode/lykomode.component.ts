import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import {
  ROUTE_BACK_TO_MENU,
  ROUTE_LOCAL_DUO,
  ROUTE_VS_AI,
} from '../constants/lykomode.constants';

const TUTORIAL_URL = 'https://www.youtube.com/shorts/vzPQl0VVNvw';

@Component({
  selector: 'app-lykomode',
  imports: [],
  templateUrl: './lykomode.component.html',
  styleUrls: ['./lykomode.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LykomodeComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly primaryBtn = viewChild<ElementRef<HTMLButtonElement>>('primaryBtn');

  constructor() {
    afterNextRender(() => {
      this.primaryBtn()?.nativeElement.focus();
    });

    this.destroyRef.onDestroy(() => {
      /* placeholder pour futurs cleanups */
    });
  }

  playAgainstAI(): void {
    void this.router.navigate([ROUTE_VS_AI]);
  }

  playWithFriend(): void {
    void this.router.navigate([ROUTE_LOCAL_DUO]);
  }

  backToMenu(): void {
    void this.router.navigate([ROUTE_BACK_TO_MENU]);
  }

  showTutorial(): void {
    window.open(TUTORIAL_URL, '_blank', 'noopener,noreferrer');
  }
}