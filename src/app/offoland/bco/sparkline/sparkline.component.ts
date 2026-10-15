// src/app/shared/sparkline/sparkline.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-sparkline',
  imports: [],
  templateUrl: './sparkline.component.html',
  styleUrls: ['./sparkline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SparklineComponent {

  /* ═══════════════════════════════════════════════════════
     ENTRÉES
     ═══════════════════════════════════════════════════════ */

  readonly data = input<readonly number[]>([]);
  readonly color = input('#FFD700');
  readonly width = input(200);
  readonly height = input(60);

  /* ═══════════════════════════════════════════════════════
     ID DE GRADIENT (stable par instance)
     ═══════════════════════════════════════════════════════ */

  readonly gradientId = `spark-gradient-${Math.random().toString(36).slice(2, 11)}`;

  /* ═══════════════════════════════════════════════════════
     COMPUTED — GÉOMÉTRIE DU TRACÉ
     ═══════════════════════════════════════════════════════ */

  /** Points calculés à partir des données et des dimensions. */
  private readonly points = computed(() => {
    const data = this.data();
    const w = this.width();
    const h = this.height();

    if (!data || data.length < 2) return [];

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = w / (data.length - 1);

    return data.map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * (h - 8) - 4;
      return { x, y };
    });
  });

  /** Path SVG du tracé lissé (bezier). */
  readonly linePath = computed(() => {
    const pts = this.points();
    if (pts.length < 2) return '';

    let line = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cx = (prev.x + curr.x) / 2;
      line += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return line;
  });

  /** Path SVG de l'aire (sous le tracé). */
  readonly areaPath = computed(() => {
    const line = this.linePath();
    if (!line) return '';
    const h = this.height();
    const w = this.width();
    return `${line} L ${w} ${h} L 0 ${h} Z`;
  });

  /** Coordonnée X du dernier point. */
  readonly lastX = computed(() => {
    const pts = this.points();
    return pts.length ? pts[pts.length - 1].x : 0;
  });

  /** Coordonnée Y du dernier point. */
  readonly lastY = computed(() => {
    const pts = this.points();
    return pts.length ? pts[pts.length - 1].y : 0;
  });

  /** ViewBox du SVG (pré-calculé). */
  readonly viewBox = computed(() => `0 0 ${this.width()} ${this.height()}`);

  /** Valeur du `stroke-dasharray` (basée sur la largeur réelle). */
  readonly dashArray = computed(() => {
    const w = this.width();
    const h = this.height();
    /* Longueur approximative du tracé : diagonale du viewBox × 1.2 */
    return Math.ceil(Math.hypot(w, h) * 1.2);
  });
}