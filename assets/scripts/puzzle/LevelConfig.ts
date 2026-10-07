/**
 * Compatibility shim. New code should import from PuzzleTypes / LevelData.
 */

export type {
    CellData,
    LevelConfig,
    BoardData,
    Position,
    SuspectPosition,
} from './PuzzleTypes';
export { CellColor } from './PuzzleTypes';
export { LEVEL_4, getHandcraftedLevel, LEVELS } from './LevelData';

import type { LevelConfig } from './PuzzleTypes';
import { getHandcraftedLevel, LEVEL_4 } from './LevelData';

export function getLevelConfig(level: number): LevelConfig {
    return getHandcraftedLevel(level) ?? LEVEL_4;
}

export function getTotalLevels(): number {
    return 1;
}
