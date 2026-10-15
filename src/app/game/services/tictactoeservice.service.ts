import { Injectable, computed, signal } from '@angular/core';
import { ASSET_BOT, ASSET_PLAYER, GRID_MIN_SIZE, SYMBOL_BOT, SYMBOL_PLAYER, WINNING_STREAK } from '../constants/tictactoe.constants';

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
     IA AMÉLIORÉE (STRATÉGIQUE)
     ═══════════════════════════════════════════════════════════════════ */

  figureBotMove(): number {
    const blocks = this._blocks();
    const N = this._gridSize();

    // 1. PRIORITÉ ABSOLUE : Gagner immédiatement si possible
    const winMove = this.findSmartMove(SYMBOL_BOT);
    if (winMove !== -1 && blocks[winMove].free) return winMove;

    // 2. PRIORITÉ HAUTE : Bloquer le joueur s'il est sur le point de marquer
    const blockMove = this.findSmartMove(SYMBOL_PLAYER);
    if (blockMove !== -1 && blocks[blockMove].free) return blockMove;

    // 3. STRATÉGIE AVANCÉE : Créer une double menace (fourchette) pour Lykö
    const forkMove = this.findForkMove(SYMBOL_BOT);
    if (forkMove !== -1 && blocks[forkMove].free) return forkMove;

    // 4. PRÉVENTION : Empêcher le joueur de créer une fourchette
    const blockForkMove = this.findForkMove(SYMBOL_PLAYER);
    if (blockForkMove !== -1 && blocks[blockForkMove].free) return blockForkMove;

    // 5. ÉVALUATION HEURISTIQUE : Choisir la case maximisant le potentiel d'alignement
    let bestScore = -Infinity;
    let bestMoves: number[] = [];

    blocks.forEach((block, idx) => {
      if (!block.free) return;

      let score = 0;
      // Bonus pour le centre et les zones proches du centre
      const r = Math.floor(idx / N);
      const c = idx % N;
      const center = (N - 1) / 2;
      score += (N - (Math.abs(r - center) + Math.abs(c - center)));

      // Évaluer le potentiel de la case pour le Bot
      score += this.evaluateCellPotential(idx, SYMBOL_BOT) * 2;
      // Évaluer le danger si le joueur la prend
      score += this.evaluateCellPotential(idx, SYMBOL_PLAYER) * 1.5;

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [idx];
      } else if (score === bestScore) {
        bestMoves.push(idx);
      }
    });

    if (bestMoves.length > 0) {
      return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    // 6. Repli sur une case libre aléatoire
    const freeIndices = blocks
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

    // Lignes
    for (let r = 0; r < N; r++) {
      for (let c = 0; c <= N - K; c++) {
        const indices = Array.from({ length: K }, (_, i) => r * N + c + i);
        const res = checkLine(indices);
        if (res !== -1) return res;
      }
    }

    // Colonnes
    for (let c = 0; c < N; c++) {
      for (let r = 0; r <= N - K; r++) {
        const indices = Array.from({ length: K }, (_, i) => (r + i) * N + c);
        const res = checkLine(indices);
        if (res !== -1) return res;
      }
    }

    // Diagonale ↘
    for (let r = 0; r <= N - K; r++) {
      for (let c = 0; c <= N - K; c++) {
        const indices = Array.from({ length: K }, (_, i) => (r + i) * N + c + i);
        const res = checkLine(indices);
        if (res !== -1) return res;
      }
    }

    // Diagonale ↙
    for (let r = 0; r <= N - K; r++) {
      for (let c = K - 1; c < N; c++) {
        const indices = Array.from({ length: K }, (_, i) => (r + i) * N + c - i);
        const res = checkLine(indices);
        if (res !== -1) return res;
      }
    }

    return -1;
  }

  /**
   * Cherche un coup qui crée une "fourchette" (plusieurs opportunités d'alignement simultanées).
   */
  private findForkMove(targetValue: string): number {
    const blocks = this._blocks();
    for (let i = 0; i < blocks.length; i++) {
      if (!blocks[i].free) continue;

      const testBlocks = [...blocks];
      testBlocks[i] = { ...testBlocks[i], free: false, value: targetValue };

      if (this.countPotentialWinningLines(testBlocks, targetValue) >= 2) {
        return i;
      }
    }
    return -1;
  }

  private countPotentialWinningLines(blocks: Block[], targetValue: string): number {
    const N = this._gridSize();
    const K = WINNING_STREAK;
    let count = 0;

    const check = (indices: number[]) => {
      const filled = indices.filter(i => !blocks[i].free && blocks[i].value === targetValue);
      const empty = indices.filter(i => blocks[i].free);
      if (filled.length === K - 1 && empty.length === 1) count++;
    };

    for (let r = 0; r < N; r++) {
      for (let c = 0; c <= N - K; c++) {
        check(Array.from({ length: K }, (_, i) => r * N + c + i));
      }
    }
    for (let c = 0; c < N; c++) {
      for (let r = 0; r <= N - K; r++) {
        check(Array.from({ length: K }, (_, i) => (r + i) * N + c));
      }
    }
    for (let r = 0; r <= N - K; r++) {
      for (let c = 0; c <= N - K; c++) {
        check(Array.from({ length: K }, (_, i) => (r + i) * N + c + i));
      }
    }
    for (let r = 0; r <= N - K; r++) {
      for (let c = K - 1; c < N; c++) {
        check(Array.from({ length: K }, (_, i) => (r + i) * N + c - i));
      }
    }

    return count;
  }

  private evaluateCellPotential(index: number, targetValue: string): number {
    const blocks = this._blocks();
    const N = this._gridSize();
    const K = WINNING_STREAK;
    let potential = 0;

    const r = Math.floor(index / N);
    const c = index % N;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        
        let lineScore = 0;
        let blocked = false;
        
        for (let step = 1; step < K; step++) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          if (nr < 0 || nr >= N || nc < 0 || nc >= N) {
            blocked = true;
            break;
          }
          const idx = nr * N + nc;
          if (!blocks[idx].free) {
            if (blocks[idx].value === targetValue) {
              lineScore++;
            } else {
              blocked = true;
              break;
            }
          }
        }
        if (!blocked) {
          potential += lineScore;
        }
      }
    }

    return potential;
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