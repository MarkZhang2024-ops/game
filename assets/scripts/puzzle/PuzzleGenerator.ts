/**
 * Procedural unique-solution generator.
 * Level 4 uses hand-authored LevelData; later levels can call generateLevel().
 */

import { MathUtils } from '../utils/MathUtils';
import { PuzzleSolver } from './PuzzleSolver';
import {
    CellColor,
    LevelConfig,
    Position,
    createBoardData,
} from './PuzzleTypes';

const DIR4: ReadonlyArray<readonly [number, number]> = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
];

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

    /** One suspect per row/col, consecutive rows at least 2 columns apart. */
    private static randomAnswer(n: number): Position[] | null {
        for (let t = 0; t < 200; t++) {
            const cols = MathUtils.shuffle(Array.from({ length: n }, (_, i) => i));
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
