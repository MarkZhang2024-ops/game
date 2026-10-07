/**
 * Lightweight wrapper around PuzzleSolver for existing callers.
 */

import { PuzzleSolver } from './PuzzleSolver';
import { BoardData } from './PuzzleTypes';

export interface ValidationResult {
    valid: boolean;
    completed: boolean;
}

export class PuzzleValidator {
    public static validate(board: BoardData): ValidationResult {
        const completed = PuzzleSolver.isComplete(board);
        return { valid: completed, completed };
    }
}
