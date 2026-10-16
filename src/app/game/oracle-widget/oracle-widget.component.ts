// src/app/game/oracle/oracle-widget.component.ts

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { OracleGameService } from '../services/oracle-game.service';
import { ParticleService } from '../services/particle.service';

/* ═══════════════════════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════════════════════ */

const VISUALIZER_WIDTH = 280;
const VISUALIZER_HEIGHT = 40;

/* ═══════════════════════════════════════════════════════════
   COMPOSANT
   ═══════════════════════════════════════════════════════════ */

@Component({
  selector: 'app-oracle-widget',
  imports: [FormsModule],
  templateUrl: './oracle-widget.component.html',
  styleUrls: ['./oracle-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OracleWidgetComponent {

  /* ═══════════════════════════════════════════════════════
     INJECTION
     ═══════════════════════════════════════════════════════ */

  readonly game = inject(OracleGameService);
  readonly particles = inject(ParticleService);

  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  /* ═══════════════════════════════════════════════════════
     ÉTAT LOCAL
     ═══════════════════════════════════════════════════════ */

  readonly textInput = signal('');

  /* ═══════════════════════════════════════════════════════
     RÉFÉRENCES CANVAS / INPUT
     ═══════════════════════════════════════════════════════ */

  private readonly canvasRef =
    viewChild<ElementRef<HTMLCanvasElement>>('visualizerCanvas');

  private readonly particlesCanvasRef =
    viewChild<ElementRef<HTMLCanvasElement>>('particlesCanvas');

  private readonly textInputElem =
    viewChild<ElementRef<HTMLInputElement>>('textInputElem');

  /* ═══════════════════════════════════════════════════════
     BOUCLES D'ANIMATION
     ═══════════════════════════════════════════════════════ */

  private waveAnimId: number | null = null;
  private particlesAnimId: number | null = null;

  /** `ResizeObserver` pour le canvas des particules. */
  private resizeObserver: ResizeObserver | null = null;

  /** Vrai si l'utilisateur préfère les animations réduites. */
  private readonly prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */

  constructor() {
    /* Écoute les changements d'état vocal */
    effect(() => {
      const speaking = this.game.isSpeaking();
      const listening = this.game.isListening();

      if (this.prefersReducedMotion) {
        this.stopWaveAnimation();
        return;
      }

      this.ngZone.runOutsideAngular(() => {
        if (speaking || listening) {
          this.startWaveAnimation(speaking ? '#a855f7' : '#06b6d4');
        } else {
          this.stopWaveAnimation();
        }
      });
    });

    /* Configure les canvas après le prochain rendu */
    afterNextRender(() => {
      this.setupParticlesCanvas();
      this.setupVisualizerCanvas();
      this.observeParticlesCanvasResize();

      /* Lance la boucle de particules hors zone Angular */
      if (!this.prefersReducedMotion) {
        this.ngZone.runOutsideAngular(() => {
          this.startParticlesLoop();
        });
      }
    });

    /* Nettoyage à la destruction */
    this.destroyRef.onDestroy(() => {
      this.stopWaveAnimation();
      this.stopParticlesLoop();
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
    });
  }

  /* ═══════════════════════════════════════════════════════
     CANVAS — SETUP HAUTE DÉFINITION (RETINA)
     ═══════════════════════════════════════════════════════ */

  private setupParticlesCanvas(): void {
    const canvas = this.particlesCanvasRef()?.nativeElement;
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

  private setupVisualizerCanvas(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(VISUALIZER_WIDTH * dpr);
    canvas.height = Math.floor(VISUALIZER_HEIGHT * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  private observeParticlesCanvasResize(): void {
    const canvas = this.particlesCanvasRef()?.nativeElement;
    if (!canvas || typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => {
      this.setupParticlesCanvas();
    });

    this.resizeObserver.observe(canvas);
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION & ACTIONS
     ═══════════════════════════════════════════════════════ */

 

  onMicClick(): void {
    if (this.game.canUseMicrophone() || this.game.microphonePermission() === 'prompt') {
      this.game.startListening();
    } else {
      this.textInputElem()?.nativeElement.focus();
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

    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = VISUALIZER_WIDTH;
    const height = VISUALIZER_HEIGHT;
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

    const canvas = this.canvasRef()?.nativeElement;
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
      const canvas = this.particlesCanvasRef()?.nativeElement;

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