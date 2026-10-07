/**
 * Procedural unique-solution generator.
 * Level 4 uses hand-authored LevelData; later levels can call generateLevel().
 */

import { MathUtils } from '../utils/MathUtils';
import { PuzzleSolver } from './PuzzleSolver';
import { applyDeduction, findUniqueNextMoves, logInvalidLevel, traceLevelUniqueReasoning } from './UniqueReasoning';
import {
    CellColor,
    LevelConfig,
    Position,
    SuspectPosition,
    createBoardData,
} from './PuzzleTypes';

const DIR4: ReadonlyArray<readonly [number, number]> = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
];

const MAX_GENERATE_ATTEMPTS = 1000;

function shuffleWith<T>(arr: readonly T[], next: () => number): T[] {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
    }
    return copy;
}

/** Deterministic stream for level 11+ only. Levels 1-10 keep Math.random. */
function mulberry32(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export class PuzzleGenerator {
    public static generateLevel(rows: number, cols: number, maxAttempts = 80): LevelConfig | null {
        if (rows < 4 || cols < 4 || rows !== cols) return null;
        const n = rows;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const answer = this.randomAnswer(n);
            if (!answer) continue;
            const colorGrid = this.paintRegions(n, answer);
            if (!colorGrid) continue;

            let config: LevelConfig = {
                level: 0,
                rows: n,
                cols: n,
                colorGrid,
                blocked: [],
                fixedSuspects: [],
            };

            let board = createBoardData(config);
            let solutions = PuzzleSolver.countSolutions(board, 2);
            if (solutions === 0) continue;

            if (solutions > 1) {
                const extra = this.pickFixedClue(answer, colorGrid);
                if (!extra) continue;
                config = { ...config, fixedSuspects: [extra] };
                board = createBoardData(config);
                solutions = PuzzleSolver.countSolutions(board, 2);
            }

            if (solutions === 1) return config;
        }
        return null;
    }

    /**
     * Levels 1-10. Paints a color grid with the existing chain painter, then
     * keeps it only when every reasoning step has exactly one deduction.
     * A failed grid is discarded whole. Colors are never edited to force a step,
     * and the answer coordinates are never used as that step.
     */
    public static generateUniqueReasoningLevel(n: number, level = 1): LevelConfig | null {
        if (n < 4) return null;
        const answerTries = [200, 1000];
        for (let pass = 0; pass < answerTries.length; pass++) {
            let emptyFails = 0;
            let multipleFails = 0;
            for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
                const colorGrid = this.buildUniqueChainColors(n, answerTries[pass], level);
                if (!colorGrid) {
                    emptyFails++;
                    continue;
                }
                const config: LevelConfig = {
                    level: 0,
                    rows: n,
                    cols: n,
                    colorGrid,
                    blocked: [],
                    fixedSuspects: [],
                };
                const trace = traceLevelUniqueReasoning(config);
                if (!trace.valid) {
                    if (trace.invalidReason === 'multiple') multipleFails++;
                    else emptyFails++;
                    continue;
                }
                config.solutionPath = trace.solutionPath.map((step) => ({
                    row: step.row,
                    col: step.col,
                    value: step.value,
                }));
                return config;
            }
            if (multipleFails > 0) logInvalidLevel('multiple');
            if (emptyFails > 0) logInvalidLevel('empty');
            if (pass + 1 < answerTries.length) {
                console.warn(
                    '[UniqueReasoning] generation exceeded 1000 attempts. Adjusting generation parameters and retrying.',
                );
            }
        }
        return null;
    }

    /**
     * Level 11+. Same color painter, seeded so Restart rebuilds the same grid.
     * The opening board has no placed suspect. The next cell comes from
     * findUniqueNextMoves, never from solution[0].
     */
    public static generateOpenUniqueLevel(n: number, seed: number, level: number): LevelConfig | null {
        if (n < 4) return null;
        const next = mulberry32(seed);
        const answerTries = [200, 1000];
        for (let pass = 0; pass < answerTries.length; pass++) {
            for (let attempt = 0; attempt < MAX_GENERATE_ATTEMPTS; attempt++) {
                const colorGrid = this.buildUniqueChainColors(n, answerTries[pass], level, next);
                if (!colorGrid) continue;
                const config: LevelConfig = {
                    level,
                    rows: n,
                    cols: n,
                    colorGrid,
                    blocked: [],
                    fixedSuspects: [],
                    seed,
                    initialSuspects: [],
                };
                const opened = this.acceptOpenChain(config);
                if (!opened) continue;
                config.solution = opened.solution;
                config.initialSuspects = [];
                config.nextUniqueMove = opened.move;
                config.solutionPath = opened.path;
                return config;
            }
            if (pass + 1 < answerTries.length) {
                console.warn(
                    '[UniqueReasoning] generation exceeded 1000 attempts. Adjusting generation parameters and retrying.',
                );
            }
        }
        return null;
    }

    /**
     * Walks the empty board. A step is kept only when the solver reports one move.
     * The finished solution is compared afterwards.
     */
    private static acceptOpenChain(config: LevelConfig): {
        move: { row: number; col: number; colorId: number };
        solution: SuspectPosition[];
        path: Array<{ row: number; col: number; value: number }>;
    } | null {
        const board = createBoardData(config);
        const path: Array<{ row: number; col: number; value: number }> = [];
        let guard = 0;
        while (!PuzzleSolver.isComplete(board)) {
            if (++guard > board.rows * board.cols) return null;
            const moves = findUniqueNextMoves(board);
            if (moves.length !== 1) return null;
            const move = moves[0];
            path.push({ row: move.row, col: move.col, value: move.colorId });
            applyDeduction(board, {
                row: move.row,
                col: move.col,
                value: move.colorId,
                reason: 'HiddenSingle',
            });
        }
        const fresh = createBoardData(config);
        if (!PuzzleSolver.hasUniqueSolution(fresh)) return null;
        const solution = PuzzleSolver.solve(fresh);
        if (!solution || solution.length !== path.length) return null;
        const same = solution.every((suspect) => path.some((step) =>
            step.row === suspect.row && step.col === suspect.col && step.value === suspect.color));
        if (!same) return null;
        const opening = findUniqueNextMoves(createBoardData(config));
        if (opening.length !== 1) return null;
        return { move: opening[0], solution, path };
    }

    /**
     * Non-main colors other than the opening singleton.
     * The opening color stays at 1: an empty board has a first deduction
     * only when some color has a single cell.
     */
    private static otherColorCountRange(level: number, n: number): { min: number; max: number } {
        const min = 2;
        let max = 3;
        if (level >= 4 && level <= 6) max = 4;
        else if (level >= 7) max = 5;
        const randomized = Math.max(1, n - 2);
        const maxFit = Math.floor((n * n - 2) / randomized);
        max = Math.max(min, Math.min(max, maxFit, n));
        return { min, max };
    }

    /** Candidate colors only. Acceptance is validateLevelUniqueReasoning. */
    private static buildUniqueChainColors(
        n: number,
        answerTries = 200,
        level = 1,
        next?: () => number,
    ): CellColor[][] | null {
        const answer = this.randomAnswer(n, answerTries, next);
        if (!answer) return null;
        const order = next ? shuffleWith(answer, next) : MathUtils.shuffle(answer);
        const grid: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
        const used = new Set<string>();
        order.forEach((cell, index) => {
            grid[cell.row][cell.col] = index;
            used.add(`${cell.row},${cell.col}`);
        });

        const range = this.otherColorCountRange(level, n);
        const target = new Array<number>(n).fill(1);
        for (let color = 1; color <= n - 2; color++) {
            target[color] = next
                ? Math.floor(next() * (range.max - range.min + 1)) + range.min
                : MathUtils.randInt(range.min, range.max);
        }

        const placed: Position[] = [];
        for (let k = 1; k < n; k++) {
            const prev = order[k - 1];
            const zone: Position[] = [];
            for (let r = 0; r < n; r++) {
                for (let c = 0; c < n; c++) {
                    if (used.has(`${r},${c}`)) continue;
                    if (this.geometryOpen(placed, r, c) && !this.geometryOpen(placed.concat(prev), r, c)) {
                        zone.push({ row: r, col: c });
                    }
                }
            }
            if (zone.length === 0) return null;
            const decoy = next ? zone[Math.floor(next() * zone.length)] : MathUtils.pick(zone);
            grid[decoy.row][decoy.col] = k;
            used.add(`${decoy.row},${decoy.col}`);

            if (k < n - 1) {
                const extra = target[k] - 2;
                if (extra > 0) {
                    const closed = this.closedCells(n, placed.concat(prev), used);
                    if (closed.length < extra) return null;
                    const picks = (next ? shuffleWith(closed, next) : MathUtils.shuffle(closed)).slice(0, extra);
                    for (const cell of picks) {
                        grid[cell.row][cell.col] = k;
                        used.add(`${cell.row},${cell.col}`);
                    }
                }
            }
            placed.push(prev);
        }

        const colorGrid: CellColor[][] = [];
        for (let r = 0; r < n; r++) {
            colorGrid[r] = [];
            for (let c = 0; c < n; c++) {
                if (grid[r][c] < 0) grid[r][c] = n - 1;
                colorGrid[r][c] = grid[r][c] as CellColor;
            }
        }
        return colorGrid;
    }

    /** Cells already shut by placed suspects. Extra color blocks are drawn from here. */
    private static closedCells(n: number, suspects: readonly Position[], used: ReadonlySet<string>): Position[] {
        const cells: Position[] = [];
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (used.has(`${r},${c}`)) continue;
                if (this.geometryOpen(suspects, r, c)) continue;
                cells.push({ row: r, col: c });
            }
        }
        return cells;
    }

    /** Row, column, and touch only. Used while painting a candidate, not while deducing. */
    private static geometryOpen(placed: readonly Position[], row: number, col: number): boolean {
        for (const cell of placed) {
            if (cell.row === row || cell.col === col) return false;
            if (Math.abs(cell.row - row) <= 1 && Math.abs(cell.col - col) <= 1) return false;
        }
        return true;
    }

    /** One suspect per row/col, consecutive rows at least 2 columns apart. */
    private static randomAnswer(n: number, tries = 200, next?: () => number): Position[] | null {
        for (let t = 0; t < tries; t++) {
            const source = Array.from({ length: n }, (_, i) => i);
            const cols = next ? shuffleWith(source, next) : MathUtils.shuffle(source);
            let ok = true;
            for (let r = 0; r < n - 1; r++) {
                if (Math.abs(cols[r] - cols[r + 1]) <= 1) {
                    ok = false;
                    break;
                }
            }
            if (!ok) continue;
            return cols.map((col, row) => ({ row, col }));
        }
        return null;
    }

    /** Grow a connected color region around each answer cell. */
    private static paintRegions(n: number, answer: Position[]): CellColor[][] | null {
        const grid: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(-1));
        const frontiers: number[][] = Array.from({ length: n }, () => []);
        const sizes = new Array<number>(n).fill(0);

        for (let id = 0; id < n; id++) {
            const { row, col } = answer[id];
            grid[row][col] = id;
            sizes[id] = 1;
            for (const [dr, dc] of DIR4) {
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
                    frontiers[id].push(nr * n + nc);
                }
            }
        }

        let guard = 0;
        const unassigned = n * n - n;
        let filled = 0;
        while (filled < unassigned && guard++ < n * n * 12) {
            const order = MathUtils.shuffle(Array.from({ length: n }, (_, i) => i));
            let progress = false;
            for (const id of order) {
                while (frontiers[id].length > 0) {
                    const idx = Math.floor(Math.random() * frontiers[id].length);
                    const cell = frontiers[id].splice(idx, 1)[0];
                    const r = Math.floor(cell / n);
                    const c = cell % n;
                    if (grid[r][c] !== -1) continue;
                    grid[r][c] = id;
                    sizes[id]++;
                    filled++;
                    progress = true;
                    for (const [dr, dc] of DIR4) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] === -1) {
                            frontiers[id].push(nr * n + nc);
                        }
                    }
                    break;
                }
            }
            if (!progress) {
                for (let r = 0; r < n; r++) {
                    for (let c = 0; c < n; c++) {
                        if (grid[r][c] !== -1) continue;
                        const neighbors: number[] = [];
                        for (const [dr, dc] of DIR4) {
                            const nr = r + dr;
                            const nc = c + dc;
                            if (nr >= 0 && nr < n && nc >= 0 && nc < n && grid[nr][nc] !== -1) {
                                neighbors.push(grid[nr][nc]);
                            }
                        }
                        if (neighbors.length === 0) continue;
                        grid[r][c] = neighbors[Math.floor(Math.random() * neighbors.length)];
                        filled++;
                        progress = true;
                    }
                }
                if (!progress) return null;
            }
        }

        for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) {
                if (grid[r][c] < 0) return null;
            }
        }

        const colorGrid: CellColor[][] = [];
        for (let r = 0; r < n; r++) {
            colorGrid[r] = [];
            for (let c = 0; c < n; c++) {
                colorGrid[r][c] = grid[r][c] as CellColor;
            }
        }
        return colorGrid;
    }

    private static pickFixedClue(answer: Position[], colorGrid: CellColor[][]): Position | null {
        const uniqueColors = answer.filter((pos) => {
            let count = 0;
            for (const row of colorGrid) {
                for (const color of row) {
                    if (color === colorGrid[pos.row][pos.col]) count++;
                }
            }
            return count === 1;
        });
        const pool = uniqueColors.length > 0 ? uniqueColors : answer;
        if (pool.length === 0) return null;
        return pool[Math.floor(Math.random() * pool.length)];
    }
}
