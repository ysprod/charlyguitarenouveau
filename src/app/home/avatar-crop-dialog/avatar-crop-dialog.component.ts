import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { ImageCropService } from '../image-crop.service';
import { CropArea, CropResult } from '../models/avatar-crop.model';

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-avatar-crop-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './avatar-crop-dialog.component.html',
  styleUrls: ['./avatar-crop-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvatarCropDialogComponent implements AfterViewInit, OnDestroy {

  private readonly cropService = inject(ImageCropService);

  /** Fichier image source. */
  @Input({ required: true }) sourceFile!: File;

  /** Émis quand l'utilisateur valide. */
  @Output() validated = new EventEmitter<CropResult>();

  /** Émis quand l'utilisateur annule. */
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('canvasRef', { static: false })
  private readonly canvasRef?: ElementRef<HTMLCanvasElement>;

  /* ─── État ─── */
  readonly isReady = signal(false);
  readonly isProcessing = signal(false);
  readonly errorMessage = signal('');

  /** Zoom (1 = ajusté au cadre). */
  readonly zoom = signal(1);

  /** Décalage en pixels canvas. */
  private offset: Point = { x: 0, y: 0 };

  /** Image native chargée. */
  private image?: HTMLImageElement;

  /** Taille logique du canvas d'aperçu (carré). */
  private readonly VIEWPORT_SIZE = 340;

  /** Taille minimum du crop en px natifs (évite les micro-crops). */
  private readonly MIN_CROP_PX = 60;

  /* ─── Drag ─── */
  private isDragging = false;
  private dragStart: Point = { x: 0, y: 0 };
  private offsetStart: Point = { x: 0, y: 0 };
  private readonly activePointers = new Map<number, Point>();
  private initialPinchDistance = 0;
  private initialPinchZoom = 1;

  /* ═══════════════════════════════════════════════════════
     CYCLE DE VIE
     ═══════════════════════════════════════════════════════ */

  ngAfterViewInit(): void {
    void this.initialize();
  }

  ngOnDestroy(): void {
    this.image = undefined;
  }

  /* ═══════════════════════════════════════════════════════
     INITIALISATION
     ═══════════════════════════════════════════════════════ */

  private async initialize(): Promise<void> {
    try {
      this.image = await this.cropService.loadImage(this.sourceFile);

      /* Réinitialise le zoom et le décalage */
      this.zoom.set(1);
      this.offset = { x: 0, y: 0 };

      this.isReady.set(true);
      this.draw();
    } catch (error) {
      console.error('Erreur chargement image :', error);
      this.errorMessage.set('Impossible de charger cette image.');
    }
  }

  /* ═══════════════════════════════════════════════════════
     DESSIN DU CANVAS
     ═══════════════════════════════════════════════════════ */

  private draw(): void {
    const canvas = this.canvasRef?.nativeElement;
    const img = this.image;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = this.VIEWPORT_SIZE;

    /* Adapte la résolution */
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* Fond neutre */
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, size, size);

    /* Calcule la taille d'affichage de l'image */
    const displayed = this.getDisplayedSize();
    const drawX = this.offset.x + (size - displayed.width) / 2;
    const drawY = this.offset.y + (size - displayed.height) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    /* Ombre */
    ctx.shadowColor = 'rgba(15, 23, 42, .15)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    ctx.drawImage(img, drawX, drawY, displayed.width, displayed.height);

    /* Reset ombre */
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    /* Grille des tiers (règle des tiers) */
    this.drawThirds(ctx, size);

    /* Cadre circulaire */
    this.drawCircleMask(ctx, size);
  }

  private getDisplayedSize(): { width: number; height: number } {
    const img = this.image;
    if (!img) return { width: 0, height: 0 };

    const size = this.VIEWPORT_SIZE;

    /* Taille de base : l'image tient dans le viewport (fit inside) */
    const baseScale = Math.min(size / img.width, size / img.height);

    /* Applique le zoom utilisateur */
    const scale = baseScale * this.zoom();

    return {
      width: img.width * scale,
      height: img.height * scale
    };
  }

  private drawThirds(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, .35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let i = 1; i <= 2; i++) {
      const pos = (size / 3) * i;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCircleMask(ctx: CanvasRenderingContext2D, size: number): void {
    const radius = size / 2 - 10;

    /* Assombrit l'extérieur du cercle */
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, .55)';

    ctx.beginPath();
    ctx.rect(0, 0, size, size);
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.restore();

    /* Contour blanc */
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  /* ═══════════════════════════════════════════════════════
     INTERACTIONS
     ═══════════════════════════════════════════════════════ */

  onZoomChange(value: number | string): void {
    const v = typeof value === 'string' ? parseFloat(value) : value;
    this.zoom.set(Math.max(1, Math.min(3, v)));
    this.constrainOffset();
    this.draw();
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const next = Math.max(1, Math.min(3, this.zoom() + delta));
    this.zoom.set(next);
    this.constrainOffset();
    this.draw();
  }

  onPointerDown(event: PointerEvent): void {
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);

    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.activePointers.size === 1) {
      this.isDragging = true;
      this.dragStart = { x: event.clientX, y: event.clientY };
      this.offsetStart = { ...this.offset };
    } else if (this.activePointers.size === 2) {
      /* Pinch-to-zoom */
      this.isDragging = false;
      const [p1, p2] = [...this.activePointers.values()];
      this.initialPinchDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      this.initialPinchZoom = this.zoom();
    }
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.activePointers.has(event.pointerId)) return;

    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    /* Pinch */
    if (this.activePointers.size === 2) {
      const [p1, p2] = [...this.activePointers.values()];
      const distance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const ratio = distance / this.initialPinchDistance;
      const next = Math.max(1, Math.min(3, this.initialPinchZoom * ratio));
      this.zoom.set(next);
      this.constrainOffset();
      this.draw();
      return;
    }

    /* Drag simple */
    if (this.isDragging) {
      const dx = event.clientX - this.dragStart.x;
      const dy = event.clientY - this.dragStart.y;
      this.offset = {
        x: this.offsetStart.x + dx,
        y: this.offsetStart.y + dy
      };
      this.constrainOffset();
      this.draw();
    }
  }

  onPointerUp(event: PointerEvent): void {
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size < 2) {
      this.initialPinchDistance = 0;
    }
    if (this.activePointers.size === 0) {
      this.isDragging = false;
    }
  }

  /* ═══════════════════════════════════════════════════════
     CONTRAINTES
     ═══════════════════════════════════════════════════════ */

  /**
   * Empêche l'image de sortir du cadre circulaire :
   * elle doit toujours couvrir entièrement le cercle.
   */
  private constrainOffset(): void {
    const img = this.image;
    if (!img) return;

    const size = this.VIEWPORT_SIZE;
    const displayed = this.getDisplayedSize();

    /* L'image doit couvrir tout le carré (min dimension >= size) */
    const maxOffsetX = Math.max(0, (displayed.width - size) / 2);
    const maxOffsetY = Math.max(0, (displayed.height - size) / 2);

    this.offset.x = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.offset.x));
    this.offset.y = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.offset.y));
  }

  /* ═══════════════════════════════════════════════════════
     VALIDATION
     ═══════════════════════════════════════════════════════ */

  async onValidate(): Promise<void> {
    const img = this.image;
    if (!img || this.isProcessing()) return;

    this.isProcessing.set(true);

    try {
      const area = this.computeCropArea();
      const result = await this.cropService.cropToSquare(img, area);
      this.validated.emit(result);
    } catch (error) {
      console.error('Erreur recadrage :', error);
      this.errorMessage.set('Échec du recadrage. Réessayez.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  onCancel(): void {
    if (this.isProcessing()) return;
    this.cancelled.emit();
  }

  /**
   * Convertit l'état (zoom + offset en px canvas) en zone de crop
   * dans le repère de l'image NATIVE.
   */
  private computeCropArea(): CropArea {
    const img = this.image!;
    const size = this.VIEWPORT_SIZE;
    const displayed = this.getDisplayedSize();

    /* Position du coin supérieur gauche de l'image affichée */
    const drawX = this.offset.x + (size - displayed.width) / 2;
    const drawY = this.offset.y + (size - displayed.height) / 2;

    /* Facteur d'échelle canvas → natif */
    const scale = img.width / displayed.width;

    /* Zone native (reconvertit le carré 0..size en coordonnées natives) */
    const nativeX = (0 - drawX) * scale;
    const nativeY = (0 - drawY) * scale;
    const nativeSize = size * scale;

    /* Clamp dans les limites de l'image */
    const safeX = Math.max(0, Math.min(img.width - nativeSize, nativeX));
    const safeY = Math.max(0, Math.min(img.height - nativeSize, nativeY));
    const safeSize = Math.max(this.MIN_CROP_PX, Math.min(img.width, img.height, nativeSize));

    return {
      x: safeX,
      y: safeY,
      width: safeSize,
      height: safeSize
    };
  }
}