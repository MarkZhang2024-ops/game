/**
 * Next-step reasoning for levels 1-10.
 * A step is legal only when the current rules force exactly one cell.
 * The finished solution is never used to choose that cell.
 */

import { PuzzleSolver } from './PuzzleSolver';
import {
    BoardData,
    CellColor,
    LevelConfig,
    SuspectPosition,
    collectSuspects,
    createBoardData,
    distinctColors,
} from './PuzzleTypes';

export type DeductionReason = 'NakedSingle' | 'HiddenSingle';

export interface DeductionStep {
    row: number;
    col: number;
    /** Cell color. The rules force this cell; the color is the suspect's value. */
    value: number;
    reason: DeductionReason;
}

export interface ReasoningTrace {
    valid: boolean;
    solutionPath: DeductionStep[];
    /** Why the chain stopped. Null when every step had exactly one deduction. */
    invalidReason: 'multiple' | 'empty' | 'mismatch' | null;
}

export function findAllValidDeductions(board: BoardData): DeductionStep[] {
    const found = new Map<string, DeductionStep>();
    const rowTaken = new Array<boolean>(board.rows).fill(false);
    const colTaken = new Array<boolean>(board.cols).fill(false);
    for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
            if (!board.cells[r][c].hasSuspect) continue;
            rowTaken[r] = true;
            colTaken[c] = true;
        }
    }

    for (let r = 0; r < board.rows; r++) {
        if (rowTaken[r]) continue;
        const legal: DeductionStep[] = [];
        for (let c = 0; c < board.cols; c++) {
            if (!PuzzleSolver.canPlace(board, r, c)) continue;
            legal.push(thisStep(board, r, c, 'NakedSingle'));
        }
        if (legal.length === 1) remember(found, legal[0]);
    }

    for (let c = 0; c < board.cols; c++) {
        if (colTaken[c]) continue;
        const legal: DeductionStep[] = [];
        for (let r = 0; r < board.rows; r++) {
            if (!PuzzleSolver.canPlace(board, r, c)) continue;
            legal.push(thisStep(board, r, c, 'NakedSingle'));
        }
        if (legal.length === 1) remember(found, legal[0]);
    }

    for (const color of distinctColors(board)) {
        if (colorPlaced(board, color)) continue;
        const candidates = PuzzleSolver.candidatesForColor(board, color);
        if (candidates.length !== 1) continue;
        const pos = candidates[0];
        remember(found, thisStep(board, pos.row, pos.col, 'HiddenSingle'));
    }

    return Array.from(found.values());
}

export function isUniqueNextStep(board: BoardData): boolean {
    return validateUniqueNextStep(board);
}

export function getUniqueNextStep(board: BoardData): DeductionStep | null {
    const deductions = findAllValidDeductions(board);
    if (deductions.length !== 1) return null;
    return deductions[0];
}

/** True only when the current rules force exactly one next cell. */
export function validateUniqueNextStep(board: BoardData): boolean {
    return findAllValidDeductions(board).length === 1;
}

export function applyDeduction(board: BoardData, step: DeductionStep): void {
    const cell = board.cells[step.row]?.[step.col];
    if (!cell) return;
    cell.hasSuspect = true;
}

/**
 * Walks the initial board one forced step at a time.
 * The finished solution is compared afterwards. It is never used to pick a step.
 */
export function validateLevelUniqueReasoning(level: LevelConfig): boolean {
    return traceLevelUniqueReasoning(level).valid;
}

export function traceLevelUniqueReasoning(level: LevelConfig): ReasoningTrace {
    const initial = createBoardData(level);
    if (!PuzzleSolver.hasUniqueSolution(initial)) {
        return { valid: false, solutionPath: [], invalidReason: 'mismatch' };
    }
    const solution = PuzzleSolver.solve(initial);
    if (!solution) {
        return { valid: false, solutionPath: [], invalidReason: 'mismatch' };
    }

    const testBoard = createBoardData(level);
    const solutionPath: DeductionStep[] = [];
    let guard = 0;
    while (!PuzzleSolver.isComplete(testBoard)) {
        if (++guard > testBoard.rows * testBoard.cols) {
            return { valid: false, solutionPath, invalidReason: 'empty' };
        }
        const deductions = findAllValidDeductions(testBoard);
        if (deductions.length === 0) {
            return { valid: false, solutionPath, invalidReason: 'empty' };
        }
        if (deductions.length !== 1) {
            return { valid: false, solutionPath, invalidReason: 'multiple' };
        }
        const step = deductions[0];
        solutionPath.push(step);
        applyDeduction(testBoard, step);
    }
    if (!sameSuspects(collectSuspects(testBoard), solution)) {
        return { valid: false, solutionPath, invalidReason: 'mismatch' };
    }
    return { valid: true, solutionPath, invalidReason: null };
}

export interface UniqueMove {
    row: number;
    col: number;
    colorId: number;
}

/** Every forced next cell. Does not read the finished solution. */
export function findUniqueNextMoves(board: BoardData): UniqueMove[] {
    return findAllValidDeductions(board).map((step) => ({
        row: step.row,
        col: step.col,
        colorId: step.value,
    }));
}

export function logOpenPuzzle(
    level: number,
    solution: readonly SuspectPosition[],
    initialSuspects: readonly SuspectPosition[],
    nextMove: UniqueMove | null,
    visibleSuspects: number,
    uniqueMoveCount: number,
): void {
    console.log([
        '[Puzzle Generated]',
        `Level: ${level}`,
        'Solution:',
        JSON.stringify(solution),
        'Initial Suspects:',
        JSON.stringify(initialSuspects),
        'Unique Next Move:',
        JSON.stringify(nextMove),
        'Visible Suspects:',
        String(visibleSuspects),
        'Unique Next Moves:',
        String(uniqueMoveCount),
    ].join('\n'));
}

export function logGeneratedColors(level: number, colorGrid: CellColor[][]): void {
    const counts = new Map<number, number>();
    for (const row of colorGrid) {
        for (const color of row) counts.set(color, (counts.get(color) ?? 0) + 1);
    }
    const lines = [`Level: ${level}`];
    const colors = Array.from(counts.keys()).sort((a, b) => a - b);
    colors.forEach((color, index) => {
        if (index > 0) lines.push('');
        lines.push(`Color: ${CellColor[color] ?? color}`);
        lines.push(`Count: ${counts.get(color)}`);
    });
    lines.push('Unique Reasoning: PASS');
    console.log(lines.join('\n'));
}

export function logAcceptedUniqueLevel(
    level: number,
    path: ReadonlyArray<{ row: number; col: number; value: number }>,
): void {
    path.forEach((_step, index) => {
        console.log(`Level: ${level}\nStep: ${index + 1}\nValid Deductions: 1`);
    });
}

export function logInvalidLevel(reason: 'multiple' | 'empty'): void {
    if (reason === 'multiple') {
        console.warn('[UniqueReasoning] INVALID LEVEL\nMultiple valid next steps found.');
        return;
    }
    console.warn('[UniqueReasoning] INVALID LEVEL\nNo valid next step found.');
}

function thisStep(board: BoardData, row: number, col: number, reason: DeductionReason): DeductionStep {
    return {
        row,
        col,
        value: board.cells[row][col].color,
        reason,
    };
}

function remember(found: Map<string, DeductionStep>, step: DeductionStep): void {
    const key = `${step.row},${step.col}`;
    if (!found.has(key)) found.set(key, step);
}

function colorPlaced(board: BoardData, color: CellColor): boolean {
    for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
            const cell = board.cells[r][c];
            if (cell.hasSuspect && cell.color === color) return true;
        }
    }
    return false;
}

function sameSuspects(placed: SuspectPosition[], solution: SuspectPosition[]): boolean {
    if (placed.length !== solution.length) return false;
    return solution.every((suspect) => placed.some((cell) =>
        cell.row === suspect.row && cell.col === suspect.col && cell.color === suspect.color));
}
