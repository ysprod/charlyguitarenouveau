import { Injectable, computed, signal } from '@angular/core';
import { ASSET_BOT, ASSET_PLAYER, GRID_MIN_SIZE, SYMBOL_BOT, SYMBOL_PLAYER, WINNING_STREAK } from './tictactoe.constants';

/* ═════════════════════════════════════════════════════════════════════
   MODÈLES IMMUTABLES
   ═════════════════════════════════════════════════════════════════════ */

export interface Block {
  readonly index: number;
  readonly free: boolean;
  readonly value: string;
  readonly symbol: string;
  readonly isWinningCell: boolean;
  readonly isNew: boolean;
}

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
export class TictactoeserviceService {

  /* ─── État interne (signals privés) ─── */
  private readonly _gridSize = signal<number>(GRID_MIN_SIZE);
  private readonly _blocks = signal<Block[]>(this.createBlocks(GRID_MIN_SIZE));
  private readonly _players = signal<Player[]>(this.createPlayers());
  private readonly _turn = signal<number>(0); // 0 = joueur, 1 = bot
  private readonly _draw = signal<number>(0);
  private readonly _freeBlocksRemaining = signal<number>(GRID_MIN_SIZE * GRID_MIN_SIZE);
  private readonly _isBotThinking = signal<boolean>(false);
  private readonly _scoredAlignments = signal<ReadonlySet<string>>(new Set());

  /* ─── API publique (lecture) ─── */
  readonly gridSize = this._gridSize.asReadonly();
  readonly blocks = this._blocks.asReadonly();
  readonly players = this._players.asReadonly();
  readonly turn = this._turn.asReadonly();
  readonly draw = this._draw.asReadonly();
  readonly isBotThinking = this._isBotThinking.asReadonly();
  readonly freeBlocksRemaining = this._freeBlocksRemaining.asReadonly();

  /** Constantes exposées. */
  readonly winningStreak = WINNING_STREAK;
  readonly GRID_MIN_SIZE = GRID_MIN_SIZE;

  /** Vrai lorsque toutes les cases sont occupées. */
  readonly isGameOver = computed(() => this._freeBlocksRemaining() <= 0);

  /* ═══════════════════════════════════════════════════════════════════
     INITIALISATION
     ═══════════════════════════════════════════════════════════════════ */

  private createBlocks(size: number): Block[] {
    const total = size * size;
    return Array.from({ length: total }, (_, index) => ({
      index,
      free: true,
      value: '',
      symbol: '',
      isWinningCell: false,
      isNew: false
    }));
  }

  private createPlayers(): Player[] {
    return [
      { bot: false, score: 0, name: 'VOUS', avatar: '🎸' },
      { bot: true, score: 0, name: 'LYKÖ LE SAGE', avatar: '🐵' }
    ];
  }

  initBlocks(size: number = this._gridSize()): void {
    const safeSize = Math.max(GRID_MIN_SIZE, size);
    this._gridSize.set(safeSize);
    this._blocks.set(this.createBlocks(safeSize));
    this._freeBlocksRemaining.set(safeSize * safeSize);
    this._scoredAlignments.set(new Set());
  }

  /* ═══════════════════════════════════════════════════════════════════
     NIVEAUX
     ═══════════════════════════════════════════════════════════════════ */

  nextLevel(): void {
    this.initBlocks(this._gridSize() + 1);
  }

  previousLevel(): void {
    if (this._gridSize() > GRID_MIN_SIZE) {
      this.initBlocks(this._gridSize() - 1);
    }
  }

  incrementDraw(): void {
  this._draw.update(n => n + 1);
}

  /* ═══════════════════════════════════════════════════════════════════
     TOURS
     ═══════════════════════════════════════════════════════════════════ */

  changeTurn(): number {
    const next = this._turn() === 0 ? 1 : 0;
    this._turn.set(next);
    return next;
  }

  setTurn(turn: number): void {
    this._turn.set(turn);
  }

  setBotThinking(value: boolean): void {
    this._isBotThinking.set(value);
  }

  /* ═══════════════════════════════════════════════════════════════════
     JEU
     ═══════════════════════════════════════════════════════════════════ */

  /**
   * Joue un coup sur la case d'index donné.
   * @returns le nombre d'alignements nouvellement marqués (0 si aucun).
   *          -1 si le coup est invalide.
   */
  playMove(index: number): number {
    const blocks = this._blocks();

    if (index < 0 || index >= blocks.length || !blocks[index].free) {
      return -1;
    }

    const symbol = this._turn() === 0 ? SYMBOL_PLAYER : SYMBOL_BOT;

    /* Mise à jour immutable de la case jouée */
    const updatedBlocks = blocks.map((block, i) =>
      i === index
        ? {
          ...block,
          free: false,
          value: symbol,
          symbol: symbol === SYMBOL_PLAYER ? 'done' : 'close',
          isNew: true
        }
        : block
    );

    this._blocks.set(updatedBlocks);
    this._freeBlocksRemaining.update(n => n - 1);

    /* Détection des nouveaux alignements */
    const newAlignments = this.checkNewAlignments(index);
    if (newAlignments > 0) {
      this.updatePlayerScore(this._turn(), newAlignments);
    }

    return newAlignments;
  }

  /** Réinitialise le flag `isNew` d'une case (appelé après animation). */
  clearIsNew(index: number): void {
    this._blocks.update(blocks =>
      blocks.map((b, i) => (i === index ? { ...b, isNew: false } : b))
    );
  }

  private updatePlayerScore(playerIndex: number, points: number): void {
    this._players.update(players =>
      players.map((p, i) =>
        i === playerIndex ? { ...p, score: p.score + points } : p
      )
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     DÉTECTION D'ALIGNEMENTS
     ═══════════════════════════════════════════════════════════════════ */

  checkNewAlignments(lastIndex: number): number {
    const N = this._gridSize();
    const K = WINNING_STREAK;
    const blocks = this._blocks();
    const scored = new Set(this._scoredAlignments());

    let newAlignmentsCount = 0;
    const newlyWinningIndices = new Set<number>();

    const checkAndScoreLine = (indices: number[], lineKey: string) => {
      const firstBlock = blocks[indices[0]];
      if (firstBlock.free || !firstBlock.value) return;

      const isMatch = indices.every(
        idx =>
          !blocks[idx].free && blocks[idx].value === firstBlock.value
      );

      if (isMatch && !scored.has(lineKey)) {
        scored.add(lineKey);
        newAlignmentsCount++;
        indices.forEach(idx => newlyWinningIndices.add(idx));
      }
    };

    const row = Math.floor(lastIndex / N);
    const col = lastIndex % N;

    /* Horizontales */
    for (let c = Math.max(0, col - K + 1); c <= Math.min(N - K, col); c++) {
      checkAndScoreLine(
        [row * N + c, row * N + c + 1, row * N + c + 2],
        `h-${row}-${c}`
      );
    }

    /* Verticales */
    for (let r = Math.max(0, row - K + 1); r <= Math.min(N - K, row); r++) {
      checkAndScoreLine(
        [r * N + col, (r + 1) * N + col, (r + 2) * N + col],
        `v-${r}-${col}`
      );
    }

    /* Diagonale ↘ */
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

    /* Diagonale ↙ */
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
      this._blocks.update(bs =>
        bs.map((b, i) =>
          winning.has(i) ? { ...b, isWinningCell: true } : b
        )
      );
    }

    return newAlignmentsCount;
  }

  clearWinningHighlight(): void {
    this._blocks.update(bs =>
      bs.map(b => (b.isWinningCell ? { ...b, isWinningCell: false } : b))
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     IA
     ═══════════════════════════════════════════════════════════════════ */

  figureBotMove(): number {
    /* 1. Chercher un coup gagnant */
    const winMove = this.findSmartMove(SYMBOL_BOT);
    if (winMove !== -1 && this._blocks()[winMove].free) return winMove;

    /* 2. Bloquer l'adversaire */
    const blockMove = this.findSmartMove(SYMBOL_PLAYER);
    if (blockMove !== -1 && this._blocks()[blockMove].free) return blockMove;

    /* 3. Prendre le centre si libre */
    const N = this._gridSize();
    const centerIdx = Math.floor((N * N) / 2);
    const centerBlock = this._blocks()[centerIdx];
    if (centerBlock && centerBlock.free) return centerIdx;

    /* 4. Case libre aléatoire */
    const freeIndices = this._blocks()
      .map((block, idx) => (block.free ? idx : -1))
      .filter(idx => idx !== -1);

    if (freeIndices.length > 0) {
      return freeIndices[Math.floor(Math.random() * freeIndices.length)];
    }

    return -1;
  }

  private findSmartMove(targetValue: string): number {
    const N = this._gridSize();
    const K = WINNING_STREAK;
    const blocks = this._blocks();

    const checkLine = (lineIndices: number[]): number => {
      const filled = lineIndices.filter(
        i => !blocks[i].free && blocks[i].value === targetValue
      );
      const empty = lineIndices.filter(i => blocks[i].free);
      if (filled.length === K - 1 && empty.length === 1) return empty[0];
      return -1;
    };

    for (let r = 0; r < N; r++) {
      for (let c = 0; c <= N - K; c++) {
        const res = checkLine([r * N + c, r * N + c + 1, r * N + c + 2]);
        if (res !== -1) return res;
      }
    }

    for (let c = 0; c < N; c++) {
      for (let r = 0; r <= N - K; r++) {
        const res = checkLine([r * N + c, (r + 1) * N + c, (r + 2) * N + c]);
        if (res !== -1) return res;
      }
    }

    for (let r = 0; r <= N - K; r++) {
      for (let c = 0; c <= N - K; c++) {
        const res = checkLine([
          r * N + c,
          (r + 1) * N + c + 1,
          (r + 2) * N + c + 2
        ]);
        if (res !== -1) return res;
      }
    }

    for (let r = 0; r <= N - K; r++) {
      for (let c = K - 1; c < N; c++) {
        const res = checkLine([
          r * N + c,
          (r + 1) * N + c - 1,
          (r + 2) * N + c - 2
        ]);
        if (res !== -1) return res;
      }
    }

    return -1;
  }

  /* ═══════════════════════════════════════════════════════════════════
     RESET
     ═══════════════════════════════════════════════════════════════════ */

  resetAll(): void {
    const size = this._gridSize();
    this._blocks.set(this.createBlocks(size));
    this._freeBlocksRemaining.set(size * size);
    this._scoredAlignments.set(new Set());
    this._players.update(players => players.map(p => ({ ...p, score: 0 })));
  }

  /* ═══════════════════════════════════════════════════════════════════
     ASSETS
     ═══════════════════════════════════════════════════════════════════ */

  getAssetForSymbol(symbol: string): string {
    return symbol === 'done' ? ASSET_PLAYER : ASSET_BOT;
  }
}