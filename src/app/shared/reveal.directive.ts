// src/app/shared/directives/reveal.directive.ts
import { Directive, ElementRef, OnInit, OnDestroy, inject, input } from '@angular/core';

@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  /** Délai d'animation en ms (permet un effet cascade) */
  readonly revealDelay = input<number>(0);

  ngOnInit(): void {
    const host = this.el.nativeElement;
    host.classList.add('reveal-init');
    host.style.transitionDelay = `${this.revealDelay()}ms`;

    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            host.classList.add('reveal-in');
            this.observer?.unobserve(host);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );

    this.observer.observe(host);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}