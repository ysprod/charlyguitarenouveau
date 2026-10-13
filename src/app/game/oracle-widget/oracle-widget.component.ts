import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { OracleGameService } from '../oracle-game.service';
import { ParticleService } from '../particle.service';

@Component({
  selector: 'app-oracle-widget',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './oracle-widget.component.html',
  styleUrls: ['./oracle-widget.component.scss']
})
export class OracleWidgetComponent implements OnDestroy {

  /* ─── Injection ─── */
  readonly game = inject(OracleGameService);
  readonly particles = inject(ParticleService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  /* ─── État local ─── */
  readonly textInput = signal('');

  /* ─── Refs canvas / input ─── */
  @ViewChild('visualizerCanvas', { static: true })
  private readonly canvasRef?: ElementRef<HTMLCanvasElement>;

  @ViewChild('particlesCanvas', { static: true })
  private readonly particlesCanvasRef?: ElementRef<HTMLCanvasElement>;

  @ViewChild('textInputElem')
  private readonly textInputElem?: ElementRef<HTMLInputElement>;

  /* ─── Boucles d'animation ─── */
  private waveAnimId: number | null = null;
  private particlesAnimId: number | null = null;

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */

  constructor() {
    /* Écoute les changements d'état vocal */
    effect(() => {
      const speaking = this.game.isSpeaking();
      const listening = this.game.isListening();

      this.ngZone.runOutsideAngular(() => {
        if (speaking || listening) {
          this.startWaveAnimation(speaking ? '#a855f7' : '#06b6d4');
        } else {
          this.stopWaveAnimation();
        }
      });
    });

    /* Configure les canvas après le prochain tick */
    queueMicrotask(() => {
      this.setupParticlesCanvas();
      this.setupVisualizerCanvas();
    });

    /* Lance la boucle de particules hors zone Angular */
    this.ngZone.runOutsideAngular(() => {
      this.startParticlesLoop();
    });
  }

  ngOnDestroy(): void {
    this.stopWaveAnimation();
    this.stopParticlesLoop();
  }

  /* ═══════════════════════════════════════════════════════
     CANVAS — SETUP HAUTE DÉFINITION (Retina)
     ═══════════════════════════════════════════════════════ */

  /**
   * Adapte la résolution du canvas des particules à la taille CSS
   * ET au devicePixelRatio (rendu net sur écrans Retina).
   */
  private setupParticlesCanvas(): void {
    const canvas = this.particlesCanvasRef?.nativeElement;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  /**
   * Le canvas du visualiseur audio a une taille fixe (280×40),
   * on ajuste juste pour la netteté Retina.
   */
  private setupVisualizerCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = 280;
    const logicalHeight = 40;

    canvas.width = Math.floor(logicalWidth * dpr);
    canvas.height = Math.floor(logicalHeight * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION & ACTIONS
     ═══════════════════════════════════════════════════════ */

  goBackToMenu(): void {
    this.game.playClick();
    void this.router.navigate(['/play']);
  }

  onMicClick(): void {
    if (this.game.canUseMicrophone() || this.game.microphonePermission() === 'prompt') {
      this.game.startListening();
    } else {
      this.textInputElem?.nativeElement.focus();
    }
  }

  submitText(): void {
    const val = this.textInput().trim();
    if (!val) return;
    this.game.submitTextAnswer(val);
    this.textInput.set('');
  }

  onTyping(): void {
    if (Math.random() > 0.7) this.game.playTyping();
  }

  onHover(): void {
    this.game.playHover();
  }

  /* ═══════════════════════════════════════════════════════
     VISUALISEUR AUDIO (onde sinusoïdale animée)
     ═══════════════════════════════════════════════════════ */

  private startWaveAnimation(color: string): void {
    this.stopWaveAnimation();

    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /* Dimensions LOGIQUES (indépendantes du DPR) */
    const width = 280;
    const height = 40;
    const centerY = height / 2;

    let step = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      /* Onde principale */
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, '#ffffff');
      gradient.addColorStop(1, color);

      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = gradient;
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;

      for (let x = 0; x <= width; x++) {
        const y = Math.sin((x + step) * 0.05) * 12 * Math.sin(x * 0.01) + centerY;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      /* Onde secondaire */
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = color;

      for (let x = 0; x <= width; x++) {
        const y = Math.sin((x + step * 1.5) * 0.04) * 8 * Math.sin(x * 0.008) + centerY;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      step += 4;
      this.waveAnimId = requestAnimationFrame(draw);
    };

    draw();
  }

  private stopWaveAnimation(): void {
    if (this.waveAnimId !== null) {
      cancelAnimationFrame(this.waveAnimId);
      this.waveAnimId = null;
    }

    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /* ═══════════════════════════════════════════════════════
     BOUCLE DE PARTICULES (60 FPS hors zone Angular)
     ═══════════════════════════════════════════════════════ */

  private startParticlesLoop(): void {
    const loop = () => {
      const canvas = this.particlesCanvasRef?.nativeElement;

      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          const logicalWidth = canvas.width / dpr;
          const logicalHeight = canvas.height / dpr;

          ctx.clearRect(0, 0, logicalWidth, logicalHeight);
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff';
          ctx.font = '16px serif';
          ctx.textBaseline = 'middle';

          const activeParticles = this.particles.particles();

          for (let i = 0; i < activeParticles.length; i++) {
            const p = activeParticles[i];
            ctx.globalAlpha = Math.max(0, p.life);

            if (p.emoji) {
              ctx.font = `${p.size * 3}px serif`;
              ctx.fillText(p.emoji, p.x, p.y);
            } else {
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.globalAlpha = 1;
        }
      }

      this.particles.update();
      this.particlesAnimId = requestAnimationFrame(loop);
    };

    loop();
  }

  private stopParticlesLoop(): void {
    if (this.particlesAnimId !== null) {
      cancelAnimationFrame(this.particlesAnimId);
      this.particlesAnimId = null;
    }
  }
}