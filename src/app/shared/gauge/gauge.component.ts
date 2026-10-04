import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gauge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gauge">
      <svg viewBox="0 0 120 120" class="gauge-svg">
        <defs>
          <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" [attr.stop-color]="colorFrom"/>
            <stop offset="100%" [attr.stop-color]="colorTo"/>
          </linearGradient>
        </defs>

        <!-- Cercle de fond -->
        <circle cx="60" cy="60" r="50" fill="none"
                stroke="rgba(255,255,255,0.06)" stroke-width="8"/>

        <!-- Arc de progression -->
        <circle cx="60" cy="60" r="50" fill="none"
                [attr.stroke]="'url(#' + gradientId + ')'"
                stroke-width="8"
                stroke-linecap="round"
                [attr.stroke-dasharray]="circumference"
                [attr.stroke-dashoffset]="dashOffset"
                transform="rotate(-90 60 60)"
                class="gauge-progress"/>

        <!-- Aiguille / Texte central -->
        <text x="60" y="58" text-anchor="middle"
              class="gauge-value">{{ displayValue }}</text>
        <text x="60" y="74" text-anchor="middle"
              class="gauge-unit">{{ unit }}</text>
      </svg>
      <div class="gauge-label">{{ label }}</div>
    </div>
  `,
  styleUrls: ['./gauge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GaugeComponent implements OnChanges {
  @Input() value = 0;         // 0-100
  @Input() label = '';
  @Input() unit = '%';
  @Input() colorFrom = '#FFD700';
  @Input() colorTo = '#FF8C00';

  gradientId = `gauge-gradient-${Math.random().toString(36).substr(2, 9)}`;
  circumference = 2 * Math.PI * 50;
  dashOffset = this.circumference;
  displayValue = '0';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.animateValue();
    }
  }

  private animateValue(): void {
    const clamped = Math.max(0, Math.min(100, this.value));
    const targetOffset = this.circumference - (clamped / 100) * this.circumference;

    const startOffset = this.dashOffset;
    const startValue = parseFloat(this.displayValue) || 0;
    const duration = 1200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);

      this.dashOffset = startOffset + (targetOffset - startOffset) * eased;
      this.displayValue = (startValue + (clamped - startValue) * eased).toFixed(1);

      if (t < 1) requestAnimationFrame(animate);
      else this.displayValue = clamped.toFixed(1);
    };
    requestAnimationFrame(animate);
  }
}