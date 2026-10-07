/**
 * Hand-authored levels. Level 4 is the current playable board.
 * Add LEVEL_5 (and register it in LEVELS) to ship a new fixed puzzle.
 */

import { CellColor, LevelConfig } from './PuzzleTypes';

const Y = CellColor.Yellow;
const G = CellColor.Green;
const C = CellColor.Cyan;
const P = CellColor.Purple;
const K = CellColor.Pink;
const R = CellColor.Red;

/**
 * Level 4 — 6×6
 *
 * Y Y Y G C C
 * Y Y Y C C C   fixed Yellow at (1, 0)
 * Y Y Y C P C
 * Y K C C C C
 * C C C C C R
 * C C C C C C
 */
export const LEVEL_4: LevelConfig = {
    level: 4,
    rows: 6,
    cols: 6,
    colorGrid: [
        [Y, Y, Y, G, C, C],
        [Y, Y, Y, C, C, C],
        [Y, Y, Y, C, P, C],
        [Y, K, C, C, C, C],
        [C, C, C, C, C, R],
        [C, C, C, C, C, C],
    ],
    blocked: [],
    fixedSuspects: [{ row: 1, col: 0 }],
};

export const LEVELS: Record<number, LevelConfig> = {
    4: LEVEL_4,
    // 5: LEVEL_5,
};

/**
 * To add Level 5:
 * 1. Define LEVEL_5 with colorGrid + fixedSuspects (0-based).
 * 2. Register it in LEVELS above.
 * 3. Restart from Level 5, or tap Next Level after completing 4
 *    (generated unique boards are used when a number is not in LEVELS).
 */

export function getHandcraftedLevel(level: number): LevelConfig | null {
    return LEVELS[level] ?? null;
}
