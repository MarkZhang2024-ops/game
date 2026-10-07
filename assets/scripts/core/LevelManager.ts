/**
 * Saved progress and the board currently being played.
 * currentLevel is the unlocked frontier. A replay does not move it backward.
 * Board size always comes from LEVEL_TIERS.
 */

import { getHandcraftedLevel, LEVEL_4 } from '../puzzle/LevelData';
import { PuzzleGenerator } from '../puzzle/PuzzleGenerator';
import {
    findUniqueNextMoves,
    logAcceptedUniqueLevel,
    logGeneratedColors,
    logInvalidLevel,
    logOpenPuzzle,
} from '../puzzle/UniqueReasoning';
import { LevelConfig, countSuspects, createBoardData } from '../puzzle/PuzzleTypes';
import { SaveManager } from './SaveManager';
import {
    LeaderboardTierDisplay,
    LEVEL_TIERS,
    LevelTierConfig,
    tierById,
    tierByLevel,
    tierCompletedCount,
    tierProgress,
    tierTotalCount,
} from './LevelTierConfig';

export class LevelManager {
    /** Set by the lobby before the game scene loads. Not written into the save. */
    private static targetLevel: number | null = null;

    private playingLevel = 1;
    /** Seed for the level currently open. Used only when level >= 11. */
    private openSeed: number | null = null;
    private openSeedLevel = 0;

    constructor() {
        const target = LevelManager.takeTargetLevel();
        this.playingLevel = target ?? LevelManager.getCurrentLevel();
    }

    public static getCurrentLevel(): number {
        const saved = SaveManager.load().currentLevel;
        return saved > 0 ? Math.floor(saved) : 1;
    }

    public static setCurrentLevel(level: number): void {
        const next = Math.max(1, Math.floor(level) || 1);
        SaveManager.update({ currentLevel: next });
    }

    public static setTargetLevel(level: number): void {
        const next = Math.max(1, Math.floor(level) || 1);
        if (!LevelManager.isLevelUnlocked(next)) return;
        LevelManager.targetLevel = next;
    }

    public static getTierByLevel(level: number): LevelTierConfig {
        return tierByLevel(level);
    }

    public static getTierById(tierId: number): LevelTierConfig | null {
        return tierById(tierId);
    }

    public static getCurrentTier(): LevelTierConfig {
        return tierByLevel(LevelManager.getCurrentLevel());
    }

    public static getBoardSize(level: number): number {
        return tierByLevel(level).boardSize;
    }

    public static getCurrentBoardSize(): number {
        return LevelManager.getBoardSize(LevelManager.getCurrentLevel());
    }

    /** Levels reached inside this tier, including the current level before it is cleared. */
    public static getTierCompletedCount(tierId: number): number {
        const tier = tierById(tierId);
        if (!tier) return 0;
        return tierCompletedCount(LevelManager.getCurrentLevel(), tier);
    }

    public static getTierTotalCount(tierId: number): number {
        const tier = tierById(tierId);
        if (!tier) return 0;
        return tierTotalCount(tier);
    }

    /** 0..1. currentLevel counts inside its tier before that level is cleared. */
    public static getTierProgress(tierId: number): number {
        const total = LevelManager.getTierTotalCount(tierId);
        if (total <= 0) return 0;
        return LevelManager.getTierCompletedCount(tierId) / total;
    }

    /** The picture for a tier shows once currentLevel reaches that tier. */
    public static hasReachedTier(tierId: number): boolean {
        const tier = tierById(tierId);
        if (!tier) return false;
        return LevelManager.getCurrentLevel() >= tier.minLevel;
    }

    /** 0..100. Same rule as getTierProgress. */
    public static getTierProgressPercent(tierId: number): number {
        return LevelManager.getTierProgress(tierId) * 100;
    }

    /** Position of a level inside its configured tier. Total is the tier length, not a fixed 10. */
    public static getTierSlot(level: number): { step: number; total: number; progress: number } {
        const safe = Math.max(1, Math.floor(level) || 1);
        const tier = tierByLevel(safe);
        const total = Math.max(1, tierTotalCount(tier));
        const step = Math.max(1, Math.min(total, safe - tier.minLevel + 1));
        return { step, total, progress: step / total };
    }

    public static describeTier(tierId: number, level: number): LeaderboardTierDisplay | null {
        const tier = tierById(tierId);
        if (!tier) return null;
        return {
            tierId: tier.tierId,
            minLevel: tier.minLevel,
            maxLevel: tier.maxLevel,
            boardSize: tier.boardSize,
            progress: tierProgress(level, tier),
        };
    }

    public static listTierDisplays(level: number): LeaderboardTierDisplay[] {
        return LEVEL_TIERS.map((tier) => ({
            tierId: tier.tierId,
            minLevel: tier.minLevel,
            maxLevel: tier.maxLevel,
            boardSize: tier.boardSize,
            progress: tierProgress(level, tier),
        }));
    }

    /** Advance only when the finished level is the current frontier. */
    public static completeLevel(level: number): void {
        const completed = Math.max(1, Math.floor(level) || 1);
        const current = LevelManager.getCurrentLevel();
        if (completed >= current) {
            LevelManager.setCurrentLevel(completed + 1);
        }
    }

    public static isLevelUnlocked(level: number): boolean {
        const next = Math.floor(level);
        return next >= 1 && next <= LevelManager.getCurrentLevel();
    }

    public getCurrentLevel(): number {
        return LevelManager.getCurrentLevel();
    }

    public getPlayingLevel(): number {
        return this.playingLevel;
    }

    public loadLevel(level: number, reuseSeed = false): LevelConfig {
        this.playingLevel = Math.max(1, Math.floor(level) || 1);
        if (this.playingLevel <= 10) {
            const unique = PuzzleGenerator.generateUniqueReasoningLevel(5, this.playingLevel);
            if (unique?.solutionPath && unique.solutionPath.length > 0) {
                logGeneratedColors(this.playingLevel, unique.colorGrid);
                logAcceptedUniqueLevel(this.playingLevel, unique.solutionPath);
                return { ...unique, level: this.playingLevel };
            }
            logInvalidLevel('empty');
            console.warn(
                '[UniqueReasoning] generation exceeded 1000 attempts. Adjusting generation parameters and retrying.',
            );
            const retry = PuzzleGenerator.generateUniqueReasoningLevel(5, this.playingLevel);
            if (retry?.solutionPath && retry.solutionPath.length > 0) {
                logGeneratedColors(this.playingLevel, retry.colorGrid);
                logAcceptedUniqueLevel(this.playingLevel, retry.solutionPath);
                return { ...retry, level: this.playingLevel };
            }
            logInvalidLevel('empty');
            throw new Error('[UniqueReasoning] INVALID LEVEL');
        }
        if (this.playingLevel >= 11) {
            return this.loadOpenUniqueLevel(reuseSeed);
        }
        const size = LevelManager.getBoardSize(this.playingLevel);
        const handcrafted = getHandcraftedLevel(this.playingLevel);
        if (handcrafted && handcrafted.rows === size && handcrafted.cols === size) {
            return { ...handcrafted, level: this.playingLevel };
        }
        for (let attempt = 0; attempt < 4; attempt++) {
            const generated = PuzzleGenerator.generateLevel(size, size, 80);
            if (generated) return { ...generated, level: this.playingLevel };
        }
        console.warn('[LevelManager] generation failed for', this.playingLevel, size);
        return { ...LEVEL_4, level: this.playingLevel };
    }

    public loadCurrentLevel(): LevelConfig {
        return this.loadLevel(this.playingLevel);
    }

    public nextLevel(): LevelConfig {
        LevelManager.completeLevel(this.playingLevel);
        const upcoming = this.playingLevel + 1;
        if (LevelManager.isLevelUnlocked(upcoming)) {
            this.playingLevel = upcoming;
        }
        return this.loadLevel(this.playingLevel);
    }

    public restartLevel(): LevelConfig {
        return this.loadLevel(this.playingLevel, this.playingLevel >= 11);
    }

    /** Level 11+. New seed on a new level. Restart keeps the seed and still shows no suspect. */
    private loadOpenUniqueLevel(reuseSeed: boolean): LevelConfig {
        const size = LevelManager.getBoardSize(this.playingLevel);
        const seed = this.seedForOpenLevel(reuseSeed);
        const generated = PuzzleGenerator.generateOpenUniqueLevel(size, seed, this.playingLevel);
        if (generated?.nextUniqueMove && generated.solution) {
            const board = createBoardData(generated);
            logOpenPuzzle(
                this.playingLevel,
                generated.solution,
                generated.initialSuspects ?? [],
                generated.nextUniqueMove,
                countSuspects(board),
                findUniqueNextMoves(board).length,
            );
            return generated;
        }
        logInvalidLevel('empty');
        console.warn(
            '[UniqueReasoning] generation exceeded 1000 attempts. Adjusting generation parameters and retrying.',
        );
        throw new Error('[UniqueReasoning] INVALID LEVEL');
    }

    private seedForOpenLevel(reuseSeed: boolean): number {
        if (reuseSeed && this.openSeed != null && this.openSeedLevel === this.playingLevel) {
            return this.openSeed;
        }
        this.openSeed = (Math.floor(Math.random() * 0x7ffffffe) + 1) >>> 0;
        this.openSeedLevel = this.playingLevel;
        return this.openSeed;
    }

    public completeLevel(level: number): void {
        LevelManager.completeLevel(level);
    }

    private static takeTargetLevel(): number | null {
        const level = LevelManager.targetLevel;
        LevelManager.targetLevel = null;
        return level;
    }
}
