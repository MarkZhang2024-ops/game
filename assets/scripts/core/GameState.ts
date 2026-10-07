/**
 * Cluedoku! - Mutable per-level state.
 */

import { BoardData, LevelConfig, countSuspects, distinctColors } from '../puzzle/PuzzleTypes';

export interface SaveData {
    currentLevel: number;
    highScore: number;
    soundOn: boolean;
    musicOn: boolean;
    vibrationOn: boolean;
    bellOn: boolean;
    /** Consecutive clears. A failed level resets it. */
    winStreak: number;
    playerName: string;
    avatarId: string;
}

export class GameState {
    public currentLevel = 4;
    public lives = 3;
    public maxLives = 3;
    public elapsedTime = 0;
    public hints = 3;
    public maxHints = 3;
    public score = 0;
    public levelCompleted = false;
    public level: LevelConfig | null = null;
    public board: BoardData | null = null;

    public resetForLevel(level: LevelConfig, board: BoardData, maxLives: number, maxHints: number): void {
        this.level = level;
        this.board = board;
        this.currentLevel = level.level;
        this.maxLives = maxLives;
        this.lives = maxLives;
        this.maxHints = maxHints;
        this.hints = maxHints;
        this.elapsedTime = 0;
        this.levelCompleted = false;
        this.score = 0;
    }

    public getSuspectCount(): number {
        return this.board ? countSuspects(this.board) : 0;
    }

    public getRequiredSuspectCount(): number {
        return this.board ? distinctColors(this.board).length : 0;
    }
}
