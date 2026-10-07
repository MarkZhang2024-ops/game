/**
 * Shared puzzle data types. Rules live in PuzzleSolver, not here.
 */

export enum CellColor {
    Yellow = 0,
    Green = 1,
    Cyan = 2,
    Purple = 3,
    Pink = 4,
    Red = 5,
    Orange = 6,
    Lime = 7,
    Brown = 8,
    Navy = 9,
    Teal = 10,
    Magenta = 11,
    Ivory = 12,
    Slate = 13,
    Coral = 14,
    Olive = 15,
}

export const CELL_COLOR_HEX: Record<CellColor, string> = {
    [CellColor.Yellow]: '#F4D03F',
    [CellColor.Green]: '#58D68D',
    [CellColor.Cyan]: '#5DADE2',
    [CellColor.Purple]: '#AF7AC5',
    [CellColor.Pink]: '#F48FB1',
    [CellColor.Red]: '#E74C3C',
    [CellColor.Orange]: '#E67E22',
    [CellColor.Lime]: '#A3E635',
    [CellColor.Brown]: '#C4A574',
    [CellColor.Navy]: '#5B7C99',
    [CellColor.Teal]: '#1ABC9C',
    [CellColor.Magenta]: '#C39BD3',
    [CellColor.Ivory]: '#F5E6C8',
    [CellColor.Slate]: '#7F8C9A',
    [CellColor.Coral]: '#F1948A',
    [CellColor.Olive]: '#BFC66A',
};

export interface Position {
    row: number;
    col: number;
}

export interface CellData {
    row: number;
    col: number;
    color: CellColor;
    blocked: boolean;
    hasSuspect: boolean;
    /** Pre-placed suspect that the player cannot remove. */
    locked: boolean;
}

export interface BoardData {
    rows: number;
    cols: number;
    cells: CellData[][];
}

export interface SuspectPosition {
    row: number;
    col: number;
    color: CellColor;
}

export interface LevelConfig {
    level: number;
    rows: number;
    cols: number;
    colorGrid: CellColor[][];
    blocked: Position[];
    fixedSuspects: Position[];
}

export function cloneBoard(board: BoardData): BoardData {
    return {
        rows: board.rows,
        cols: board.cols,
        cells: board.cells.map((row) => row.map((cell) => ({ ...cell }))),
    };
}

export function createBoardData(config: LevelConfig): BoardData {
    const blocked = new Set(config.blocked.map((p) => `${p.row},${p.col}`));
    const fixed = new Set(config.fixedSuspects.map((p) => `${p.row},${p.col}`));
    const cells: CellData[][] = [];
    for (let r = 0; r < config.rows; r++) {
        cells[r] = [];
        for (let c = 0; c < config.cols; c++) {
            const key = `${r},${c}`;
            const isFixed = fixed.has(key);
            cells[r][c] = {
                row: r,
                col: c,
                color: config.colorGrid[r][c],
                blocked: blocked.has(key),
                hasSuspect: isFixed,
                locked: isFixed,
            };
        }
    }
    return { rows: config.rows, cols: config.cols, cells };
}

export function collectSuspects(board: BoardData): SuspectPosition[] {
    const result: SuspectPosition[] = [];
    for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
            const cell = board.cells[r][c];
            if (cell.hasSuspect) {
                result.push({ row: r, col: c, color: cell.color });
            }
        }
    }
    return result;
}

export function countSuspects(board: BoardData): number {
    return collectSuspects(board).length;
}

export function distinctColors(board: BoardData): CellColor[] {
    const set = new Set<CellColor>();
    for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
            set.add(board.cells[r][c].color);
        }
    }
    return Array.from(set.values());
}
