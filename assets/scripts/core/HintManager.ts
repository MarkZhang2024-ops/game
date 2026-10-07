/**
 * Picks one missing solution suspect and the cells that suspect rules out.
 * Rules stay in PuzzleSolver. This class does not place marks or draw the popup.
 */

import { Board } from '../board/Board';
import { PuzzleSolver } from '../puzzle/PuzzleSolver';
import { BoardData, Position } from '../puzzle/PuzzleTypes';

export interface HintCell {
    row: number;
    column: number;
}

export interface HintResult {
    suspectId: string;
    row: number;
    column: number;
    excludedCells: HintCell[];
    reason: string;
}

const HINT_REASON = 'No other suspect can share this row, column\nor any touching cell — exclude them.';

export class HintManager {
    /**
     * One unplaced solution cell, chosen from the current board.
     * `canMark` rejects suspects, existing X marks, and locked cells.
     */
    /** One solution cell that does not already hold a suspect. */
    public static pickAvailableSuspect(board: BoardData): Position | null {
        const solution = PuzzleSolver.solve(board);
        if (!solution) return null;
        const missing = solution.filter((pos) => !board.cells[pos.row][pos.col].hasSuspect);
        if (missing.length === 0) return null;
        return missing[Math.floor(Math.random() * missing.length)];
    }

    public static findHint(
        board: BoardData,
        canMark: (row: number, col: number) => boolean,
    ): HintResult | null {
        const pos = this.pickAvailableSuspect(board);
        if (!pos) return null;
        return {
            suspectId: `suspect_${pos.row}_${pos.col}`,
            row: pos.row,
            column: pos.col,
            excludedCells: this.excludedBySuspect(board, pos, canMark),
            reason: HINT_REASON,
        };
    }

    public static playHint(boardView: Board, pos: Position): void {
        boardView.playHint(pos.row, pos.col);
    }

    /**
     * Cells this suspect rules out: same row, same column, same color, or touching.
     * Skips the suspect itself, blocked cells, placed suspects, and cells `canMark` rejects.
     */
    private static excludedBySuspect(
        board: BoardData,
        suspect: Position,
        canMark: (row: number, col: number) => boolean,
    ): HintCell[] {
        const origin = board.cells[suspect.row][suspect.col];
        const found: HintCell[] = [];
        for (let row = 0; row < board.rows; row++) {
            for (let col = 0; col < board.cols; col++) {
                if (row === suspect.row && col === suspect.col) continue;
                if (!PuzzleSolver.inBounds(board, row, col)) continue;
                const cell = board.cells[row][col];
                if (cell.blocked || cell.hasSuspect) continue;
                if (!canMark(row, col)) continue;
                const sameRow = row === suspect.row;
                const sameColumn = col === suspect.col;
                const sameColor = cell.color === origin.color;
                const touching = Math.abs(row - suspect.row) <= 1 && Math.abs(col - suspect.col) <= 1;
                if (!sameRow && !sameColumn && !sameColor && !touching) continue;
                found.push({ row, column: col });
            }
        }
        return found;
    }
}
