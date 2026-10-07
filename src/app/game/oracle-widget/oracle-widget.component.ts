import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  effect,
  signal,
  OnDestroy,
  NgZone,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OracleGameService } from '../../services/oracle-game.service';
import { ParticleService } from '../../services/particle.service';

@Component({
  selector: 'app-oracle-widget',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './oracle-widget.component.html',
  styleUrl: './oracle-widget.component.css',
})
export class OracleWidgetComponent implements OnDestroy {
  public readonly game = inject(OracleGameService);
  public readonly particles = inject(ParticleService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  public textInput = signal<string>('');

  @ViewChild('visualizerCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('particlesCanvas') particlesCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('textInputElem') textInputElem?: ElementRef<HTMLInputElement>;

  private animFrameId: number | null = null;
  private particlesAnimId: number | null = null;

  constructor() {
    // Écoute les changements d'état vocal sans déclencher de cycle de détection inutile
    effect(() => {
      const speaking = this.game.isSpeaking();
      const listening = this.game.isListening();

      // Exécution hors zone Angular pour préserver le 60FPS sans saccades
      this.ngZone.runOutsideAngular(() => {
        if (speaking || listening) {
          this.startWaveAnimation(speaking ? '#a855f7' : '#06b6d4');
        } else {
          this.stopWaveAnimation();
        }
      });
    });

    // Lancer la boucle de particules hors zone Angular
    this.ngZone.runOutsideAngular(() => {
      this.startParticlesLoop();
    });
  }

  ngOnDestroy(): void {
    this.stopWaveAnimation();
    if (this.particlesAnimId !== null) {
      cancelAnimationFrame(this.particlesAnimId);
      this.particlesAnimId = null;
    }
  }

  /* ═══════════════════════════════════════════════════════
     NAVIGATION & ACTIONS
     ═══════════════════════════════════════════════════════ */
  goBackToMenu(): void {
    this.game.playClick();
    this.router.navigate(['/play']);
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
    if (val) {
      this.game.submitTextAnswer(val);
      this.textInput.set('');
    }
  }

  onTyping(): void {
    if (Math.random() > 0.7) this.game.playTyping();
  }

  onHover(): void {
    this.game.playHover();
  }

  /* ═══════════════════════════════════════════════════════
     MOTEURS DE RENDU CANVAS (60 FPS NATIVE OUTSIDE ANGULAR)
     ═══════════════════════════════════════════════════════ */
  private startWaveAnimation(color: string): void {
    this.stopWaveAnimation();
    let step = 0;

    const draw = () => {
      const canvas = this.canvasRef?.nativeElement;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, '#ffffff');
      gradient.addColorStop(1, color);

      // Onde Principale
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = gradient;
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;

      for (let x = 0; x < width; x++) {
        const y = Math.sin((x + step) * 0.05) * 12 * Math.sin(x * 0.01) + centerY;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Onde Secondaire
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = color;
      for (let x = 0; x < width; x++) {
        const y = Math.sin((x + step * 1.5) * 0.04) * 8 * Math.sin(x * 0.008) + centerY;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      step += 4;
      this.animFrameId = requestAnimationFrame(draw);
    };

    draw();
  }

  private stopWaveAnimation(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  private startParticlesLoop(): void {
    const loop = () => {
      const canvas = this.particlesCanvasRef?.nativeElement;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
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
}