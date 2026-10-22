// src/app/charte/components/dimension-card.component.ts

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { Dimension } from '../charte-offoland.models';

@Component({
  selector: 'app-dimension-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="dimension-card" [class.pending]="pending">
      <span class="dimension-note">{{ dimension.note }}</span>
      <h3>{{ dimension.name }}</h3>
      <p>{{ dimension.principle }}</p>
      <span class="dimension-color">{{ dimension.color }}</span>
    </article>
  `,
  styles: [`
    :host {
      display: block;
      content-visibility: auto;
      contain-intrinsic-size: 200px;
    }

    .dimension-card {
      display: flex;
      min-height: 210px;
      flex-direction: column;
      align-items: flex-start;
      padding: 23px 19px;
      border: 1px solid rgba(198, 163, 91, 0.35);
      background: #fff;
    }

    .dimension-note {
      color: #b8860b;
      font-size: 31px;
    }

    h3 {
      margin: 18px 0 0;
      color: #0f172a;
      font-family: 'Georgia', serif;
      font-size: 22px;
      font-weight: 400;
      line-height: 1.3;
    }

    p {
      margin: 13px 0 0;
      color: #4a5660;
      font-family: Arial, sans-serif;
      font-size: 13px;
      line-height: 1.85;
    }

    .dimension-color {
      margin-top: auto;
      padding-top: 20px;
      color: #b8860b;
      font-family: Arial, sans-serif;
      font-size: 11px;
      font-weight: 600;
    }

    .dimension-card.pending {
      border-style: dashed;
      opacity: 0.85;
    }

    @media (max-width: 560px) {
      .dimension-card { min-height: 185px; }
    }
  `],
})
export class DimensionCardComponent {
  @Input({ required: true }) dimension!: Dimension;
  @Input() pending = false;
}