// src/app/game/services/tictacduo.service.ts

import { Injectable, computed, signal } from '@angular/core';

import {
  ASSET_BOT,
  ASSET_PLAYER,
  GRID_MIN_SIZE,
  WINNING_STREAK,
} from '../constants/tictacduo.constants';

/* ═════════════════════════════════════════════════════════════════════
   TYPES
   ═════════════════════════════════════════════════════════════════════ */

/** Représentation immutable d'une case du plateau. */
export interface Block {
  readonly index: number;
  readonly free: boolean;
  readonly value: string;              // 'tick' (J1) ou 'cross' (J2)
  readonly symbol: string;             // 'done' ou 'close'
  readonly isWinningCell: boolean;
  readonly isNew: boolean;
}

/** Représentation immutable d'un joueur. */
export interface Player {
  readonly bot: boolean;
  readonly score: number;
  readonly name: string;
  readonly avatar: string;
}

/* ═════════════════════════════════════════════════════════════════════
   SERVICE
   ═════════════════════════════════════════════════════════════════════ */

@Injectable({ providedIn: 'root' })
export class TictacduoService {

  /* ═══════════════════════════════════════════════════════
     ÉTAT — SIGNALS PRIVÉS
     ═══════════════════════════════════════════════════════ */

  private readonly _gridSize = signal<number>(GRID_MIN_SIZE);
  private readonly _blocks = signal<readonly Block[]>(this.createBlocks(GRID_MIN_SIZE));
  private readonly _players = signal<readonly Player[]>(this.createPlayers());
  private readonly _turn = signal<number>(0);
  private readonly _draw = signal<number>(0);
  private readonly _freeBlocksRemaining = signal<number>(GRID_MIN_SIZE * GRID_MIN_SIZE);
  private readonly _scoredAlignments = signal<ReadonlySet<string>>(new Set());

  /* ═══════════════════════════════════════════════════════
     API PUBLIQUE — LECTURE (signals readonly)
     ═══════════════════════════════════════════════════════ */

  readonly gridSize = this._gridSize.asReadonly();
  readonly blocks = this._blocks.asReadonly();
  readonly players = this._players.asReadonly();
  readonly draw = this._draw.asReadonly();
  readonly turn = this._turn.asReadonly();
  readonly freeBlocksRemaining = this._freeBlocksRemaining.asReadonly();

  /** Constantes exposées. */
  readonly winningStreak = WINNING_STREAK;
  readonly GRID_MIN_SIZE = GRID_MIN_SIZE;

  /** Vrai lorsque la partie est terminée. */
  readonly isGameOver = computed(() => this._freeBlocksRemaining() <= 0);

  /* ═══════════════════════════════════════════════════════
     ACCÈS MUTABLE (setters)
     ═══════════════════════════════════════════════════════ */

  setTurn(value: number): void {
    this._turn.set(value);
  }

  /* ═══════════════════════════════════════════════════════
     INITIALISATION
     ═══════════════════════════════════════════════════════ */

  private createBlocks(size: number): readonly Block[] {
    const total = size * size;
    return Array.from({ length: total }, (_, index) => ({
      index,
      free: true,
      value: '',
      symbol: '',
      isWinningCell: false,
      isNew: false,
    }));
  }

  private createPlayers(): readonly Player[] {
    return [
      { bot: false, score: 0, name: 'JOUEUR 1', avatar: '🎸' },
      { bot: false, score: 0, name: 'JOUEUR 2', avatar: '🎸' },
    ];
  }

  initBlocks(size: number = this._gridSize()): void {
    const safeSize = Math.max(GRID_MIN_SIZE, size);
    this._gridSize.set(safeSize);
    this._blocks.set(this.createBlocks(safeSize));
    this._freeBlocksRemaining.set(safeSize * safeSize);
    this._scoredAlignments.set(new Set());
  }

  /* ═══════════════════════════════════════════════════════
     NIVEAUX
     ═══════════════════════════════════════════════════════ */

  nextLevel(): void {
    this.initBlocks(this._gridSize() + 1);
  }

  previousLevel(): void {
    if (this._gridSize() > GRID_MIN_SIZE) {
      this.initBlocks(this._gridSize() - 1);
    }
  }

  /* ═══════════════════════════════════════════════════════
     TOURS
     ═══════════════════════════════════════════════════════ */

  changeTurn(): number {
    const next = this._turn() === 0 ? 1 : 0;
    this._turn.set(next);
    return next;
  }

  /* ═══════════════════════════════════════════════════════
     JEU
     ═══════════════════════════════════════════════════════ */

  /**
   * Joue un coup sur la case d'index donné.
   *
   * @returns
   *   - `-1` si le coup est invalide (case occupée ou index hors limites)
   *   - `0`  si le coup est valide mais sans nouvel alignement
   *   - `>0` si `n` nouveaux alignements ont été marqués
   */
  playMove(index: number): number {
    const blocks = this._blocks();

    if (index < 0 || index >= blocks.length || !blocks[index].free) {
      return -1;
    }

    const symbol = this._turn() === 0 ? 'tick' : 'cross';
    const symbolName = symbol === 'tick' ? 'done' : 'close';

    const updatedBlocks: readonly Block[] = blocks.map((block, i) =>
      i === index
        ? {
            ...block,
            free: false,
            value: symbol,
            symbol: symbolName,
            isNew: true,
          }
        : block
    );

    this._blocks.set(updatedBlocks);
    this._freeBlocksRemaining.update((n) => Math.max(0, n - 1));

    const newAlignments = this.checkNewAlignments(index);
    if (newAlignments > 0) {
      this.updatePlayerScore(this._turn(), newAlignments);
    }

    return newAlignments;
  }

  /** Marque une case comme "plus nouvelle" (fin d'animation). */
  clearIsNew(index: number): void {
    this._blocks.update((blocks) =>
      blocks.map((b, i) => (i === index ? { ...b, isNew: false } : b))
    );
  }

  private updatePlayerScore(playerIndex: number, points: number): void {
    this._players.update((players) =>
      players.map((p, i) =>
        i === playerIndex ? { ...p, score: p.score + points } : p
      )
    );
  }

  /* ═══════════════════════════════════════════════════════
     ALIGNEMENTS
     ═══════════════════════════════════════════════════════ */

  checkNewAlignments(lastIndex: number): number {
    const N = this._gridSize();
    const K = WINNING_STREAK;
    const blocks = this._blocks();
    const scored = new Set(this._scoredAlignments());

    let newAlignmentsCount = 0;
    const newlyWinningIndices = new Set<number>();

    const checkAndScoreLine = (indices: readonly number[], lineKey: string): void => {
      const firstBlock = blocks[indices[0]];
      if (firstBlock.free || !firstBlock.value) return;

      const isMatch = indices.every(
        (idx) => !blocks[idx].free && blocks[idx].value === firstBlock.value
      );

      if (isMatch && !scored.has(lineKey)) {
        scored.add(lineKey);
        newAlignmentsCount++;
        indices.forEach((idx) => newlyWinningIndices.add(idx));
      }
    };

    const row = Math.floor(lastIndex / N);
    const col = lastIndex % N;

    /* 1. Horizontal */
    for (let c = Math.max(0, col - K + 1); c <= Math.min(N - K, col); c++) {
      checkAndScoreLine(
        [row * N + c, row * N + c + 1, row * N + c + 2],
        `h-${row}-${c}`
      );
    }

    /* 2. Vertical */
    for (let r = Math.max(0, row - K + 1); r <= Math.min(N - K, row); r++) {
      checkAndScoreLine(
        [r * N + col, (r + 1) * N + col, (r + 2) * N + col],
        `v-${r}-${col}`
      );
    }

    /* 3. Diagonale ↘ */
    for (let offset = -(K - 1); offset <= 0; offset++) {
      const r = row + offset;
      const c = col + offset;
      if (r >= 0 && r <= N - K && c >= 0 && c <= N - K) {
        checkAndScoreLine(
          [r * N + c, (r + 1) * N + c + 1, (r + 2) * N + c + 2],
          `d1-${r}-${c}`
        );
      }
    }

    /* 4. Diagonale ↙ */
    for (let offset = -(K - 1); offset <= 0; offset++) {
      const r = row + offset;
      const c = col - offset;
      if (r >= 0 && r <= N - K && c >= K - 1 && c < N) {
        checkAndScoreLine(
          [r * N + c, (r + 1) * N + c - 1, (r + 2) * N + c - 2],
          `d2-${r}-${c}`
        );
      }
    }

    this._scoredAlignments.set(scored);

    if (newlyWinningIndices.size > 0) {
      const winning = newlyWinningIndices;
      this._blocks.update((bs) =>
        bs.map((b, i) =>
          winning.has(i) ? { ...b, isWinningCell: true } : b
        )
      );
    }

    return newAlignmentsCount;
  }

  clearWinningHighlight(): void {
    this._blocks.update((blocks) =>
      blocks.map((b) => (b.isWinningCell ? { ...b, isWinningCell: false } : b))
    );
  }

  /* ═══════════════════════════════════════════════════════
     ASSETS
     ═══════════════════════════════════════════════════════ */

  getAssetForSymbol(symbol: string): string {
    return symbol === 'done' ? ASSET_PLAYER : ASSET_BOT;
  }

  /* ═══════════════════════════════════════════════════════
     RESET
     ═══════════════════════════════════════════════════════ */

  resetAll(): void {
    const size = this._gridSize();
    this._blocks.set(this.createBlocks(size));
    this._freeBlocksRemaining.set(size * size);
    this._scoredAlignments.set(new Set());
    this._players.update((players) =>
      players.map((p) => ({ ...p, score: 0 }))
    );
  }

  /* ═══════════════════════════════════════════════════════
     INCRÉMENTATION D'ÉGALITÉS
     ═══════════════════════════════════════════════════════ */

  incrementDraw(): void {
    this._draw.update((n) => n + 1);
  }
}