import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg #svg class="sparkline" [attr.viewBox]="'0 0 ' + width + ' ' + height" preserveAspectRatio="none">
      <defs>
        <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" [attr.stop-color]="color" stop-opacity="0.4"/>
          <stop offset="100%" [attr.stop-color]="color" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path [attr.d]="areaPath" [attr.fill]="'url(#' + gradientId + ')'" class="sparkline-area"/>
      <path [attr.d]="linePath" [attr.stroke]="color" fill="none" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" class="sparkline-line"/>
      <circle [attr.cx]="lastX" [attr.cy]="lastY" r="3" [attr.fill]="color" class="sparkline-dot"/>
    </svg>
  `,
  styleUrls: ['./sparkline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SparklineComponent implements AfterViewInit, OnChanges {
  @Input() data: number[] = [];
  @Input() color = '#FFD700';
  @Input() width = 200;
  @Input() height = 60;

  @ViewChild('svg', { static: true }) svg!: ElementRef<SVGSVGElement>;

  gradientId = `spark-gradient-${Math.random().toString(36).substr(2, 9)}`;
  linePath = '';
  areaPath = '';
  lastX = 0;
  lastY = 0;

  ngAfterViewInit(): void {
    this.buildPaths();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.buildPaths();
    }
  }

  private buildPaths(): void {
    if (!this.data || this.data.length < 2) {
      this.linePath = '';
      this.areaPath = '';
      return;
    }

    const min = Math.min(...this.data);
    const max = Math.max(...this.data);
    const range = max - min || 1;
    const stepX = this.width / (this.data.length - 1);

    const points = this.data.map((v, i) => {
      const x = i * stepX;
      const y = this.height - ((v - min) / range) * (this.height - 8) - 4;
      return { x, y };
    });

    // Smooth path (bezier)
    let line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      line += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    this.linePath = line;

    const last = points[points.length - 1];
    this.lastX = last.x;
    this.lastY = last.y;

    this.areaPath = `${line} L ${this.width} ${this.height} L 0 ${this.height} Z`;
  }
}