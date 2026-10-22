// src/app/charte/components/principle-card.component.ts

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { Principle } from '../charte-offoland.models';

@Component({
  selector: 'app-principle-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="principle-card">
      <span class="card-number">{{ principle.number }}</span>
      <span class="principle-symbol" aria-hidden="true">
        {{ principle.symbol }}
      </span>
      <h3>{{ principle.title }}</h3>
      <p>{{ principle.text }}</p>
    </article>
  `,
  styles: [`
    :host {
      display: block;
      content-visibility: auto;
      contain-intrinsic-size: 240px;
    }

    .principle-card {
      position: relative;
      min-height: 245px;
      padding: 29px 25px;
      border: 1px solid #e9e1d2;
      background: #fff;
    }

    .card-number {
      color: #9b7a3d;
      font-family: Arial, sans-serif;
      font-size: 11px;
      letter-spacing: 0.12em;
    }

    .principle-symbol {
      display: block;
      margin: 18px 0;
      color: #c6a35b;
      font-size: 36px;
    }

    h3 {
      margin: 0;
      color: #132b39;
      font-family: 'Georgia', serif;
      font-size: 22px;
      font-weight: 400;
      line-height: 1.3;
    }

    p {
      margin: 13px 0 0;
      color: #647078;
      font-family: Arial, sans-serif;
      font-size: 13px;
      line-height: 1.85;
    }

    @media (max-width: 560px) {
      .principle-card { padding: 24px; min-height: auto; }
    }
  `],
})
export class PrincipleCardComponent {
  @Input({ required: true }) principle!: Principle;
}