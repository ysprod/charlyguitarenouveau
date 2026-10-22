// src/app/charte/components/article-card.component.ts

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { Article } from '../charte-offoland.models';

@Component({
  selector: 'app-article-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="article-card">
      <div class="article-top">
        <span class="article-number">
          ARTICLE {{ article.number.toString().padStart(2, '0') }}
        </span>
        <span class="article-symbol" aria-hidden="true">
          {{ article.symbol }}
        </span>
      </div>
      <h3>{{ article.title }}</h3>
      <p>{{ article.content }}</p>
    </article>
  `,
  styles: [`
    :host {
      display: block;
      content-visibility: auto;
      contain-intrinsic-size: 240px;
      background: #fff;
    }

    .article-card {
      min-height: 245px;
      padding: 27px 24px;
      background: #fff;
    }

    .article-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 23px;
    }

    .article-number {
      color: #99783b;
      font-family: Arial, sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
    }

    .article-symbol {
      color: #c6a35b;
      font-size: 24px;
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
      .article-card { padding: 24px; min-height: auto; }
    }
  `],
})
export class ArticleCardComponent {
  @Input({ required: true }) article!: Article;
}