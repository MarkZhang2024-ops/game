/**
 * Rule engine + DFS solver. Independent of UI.
 *
 * Constraints:
 *   1. One suspect per color
 *   2. One suspect per row
 *   3. One suspect per column
 *   4. No 8-direction adjacency
 */

import {
    BoardData,
    CellColor,
    Position,
    SuspectPosition,
    cloneBoard,
    collectSuspects,
    distinctColors,
} from './PuzzleTypes';

const DIR8: ReadonlyArray<readonly [number, number]> = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1],
];

export class PuzzleSolver {
    public static inBounds(board: BoardData, row: number, col: number): boolean {
        return row >= 0 && col >= 0 && row < board.rows && col < board.cols;
    }

    public static canPlace(board: BoardData, row: number, col: number): boolean {
        if (!this.inBounds(board, row, col)) return false;
        const cell = board.cells[row][col];
        if (cell.blocked) return false;
        if (cell.hasSuspect) return false;

        for (let c = 0; c < board.cols; c++) {
            if (board.cells[row][c].hasSuspect) return false;
        }
        for (let r = 0; r < board.rows; r++) {
            if (board.cells[r][col].hasSuspect) return false;
        }
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                if (board.cells[r][c].hasSuspect && board.cells[r][c].color === cell.color) {
                    return false;
                }
            }
        }
        for (const [dr, dc] of DIR8) {
            const nr = row + dr;
            const nc = col + dc;
            if (this.inBounds(board, nr, nc) && board.cells[nr][nc].hasSuspect) {
                return false;
            }
        }
        return true;
    }

    public static isComplete(board: BoardData): boolean {
        const colors = distinctColors(board);
        const colorCount = new Map<CellColor, number>();
        const rowCount = new Array<number>(board.rows).fill(0);
        const colCount = new Array<number>(board.cols).fill(0);
        const suspects: Position[] = [];

        for (const color of colors) colorCount.set(color, 0);

        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                const cell = board.cells[r][c];
                if (!cell.hasSuspect) continue;
                suspects.push({ row: r, col: c });
                rowCount[r]++;
                colCount[c]++;
                colorCount.set(cell.color, (colorCount.get(cell.color) || 0) + 1);
            }
        }

        for (const color of colors) {
            if (colorCount.get(color) !== 1) return false;
        }
        for (let r = 0; r < board.rows; r++) {
            if (rowCount[r] !== 1) return false;
        }
        for (let c = 0; c < board.cols; c++) {
            if (colCount[c] !== 1) return false;
        }
        for (let i = 0; i < suspects.length; i++) {
            for (let j = i + 1; j < suspects.length; j++) {
                const a = suspects[i];
                const b = suspects[j];
                if (Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1) {
                    return false;
                }
            }
        }
        return true;
    }

    public static candidatesForColor(board: BoardData, color: CellColor): Position[] {
        const result: Position[] = [];
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                if (board.cells[r][c].color !== color) continue;
                if (this.canPlace(board, r, c)) {
                    result.push({ row: r, col: c });
                }
            }
        }
        return result;
    }

    public static solve(board: BoardData): SuspectPosition[] | null {
        const work = cloneBoard(board);
        return this.searchOne(work);
    }

    /**
     * Count solutions up to `maxSolutions` (default 2 for uniqueness checks).
     * Stops as soon as the cap is reached.
     */
    public static countSolutions(board: BoardData, maxSolutions = 2): number {
        const work = cloneBoard(board);
        const found = { count: 0 };
        this.searchCount(work, maxSolutions, found);
        return found.count;
    }

    public static hasUniqueSolution(board: BoardData): boolean {
        return this.countSolutions(board, 2) === 1;
    }

    private static missingColors(board: BoardData): CellColor[] {
        const colors = distinctColors(board);
        const placed = new Set<CellColor>();
        for (let r = 0; r < board.rows; r++) {
            for (let c = 0; c < board.cols; c++) {
                if (board.cells[r][c].hasSuspect) {
                    placed.add(board.cells[r][c].color);
                }
            }
        }
        return colors.filter((color) => !placed.has(color));
    }

    /** MRV: pick the unplaced color with the fewest legal cells. */
    private static pickMrvColor(board: BoardData): { color: CellColor; candidates: Position[] } | null {
        const missing = this.missingColors(board);
        if (missing.length === 0) return null;
        let bestColor = missing[0];
        let best = this.candidatesForColor(board, bestColor);
        for (let i = 1; i < missing.length; i++) {
            const color = missing[i];
            const cands = this.candidatesForColor(board, color);
            if (cands.length < best.length) {
                bestColor = color;
                best = cands;
            }
        }
        return { color: bestColor, candidates: best };
    }

    private static searchOne(board: BoardData): SuspectPosition[] | null {
        const missing = this.missingColors(board);
        if (missing.length === 0) {
            return this.isComplete(board) ? collectSuspects(board) : null;
        }
        const mrv = this.pickMrvColor(board);
        if (!mrv || mrv.candidates.length === 0) return null;
        for (const pos of mrv.candidates) {
            board.cells[pos.row][pos.col].hasSuspect = true;
            const solved = this.searchOne(board);
            if (solved) return solved;
            board.cells[pos.row][pos.col].hasSuspect = false;
        }
        return null;
    }

    private static searchCount(
        board: BoardData,
        maxSolutions: number,
        found: { count: number }
    ): void {
        if (found.count >= maxSolutions) return;
        const missing = this.missingColors(board);
        if (missing.length === 0) {
            if (this.isComplete(board)) found.count++;
            return;
        }
        const mrv = this.pickMrvColor(board);
        if (!mrv || mrv.candidates.length === 0) return;
        for (const pos of mrv.candidates) {
            board.cells[pos.row][pos.col].hasSuspect = true;
            this.searchCount(board, maxSolutions, found);
            board.cells[pos.row][pos.col].hasSuspect = false;
            if (found.count >= maxSolutions) return;
        }
    }
}
