/**
 * Back-compat wrapper. Prefer PuzzleGenerator.generateLevel().
 */

import { PuzzleGenerator } from './PuzzleGenerator';
import { LevelConfig } from './PuzzleTypes';

export class LevelGenerator {
    public static generate(size: number, maxAttempts = 50): LevelConfig | null {
        return PuzzleGenerator.generateLevel(size, size, maxAttempts);
    }
}
