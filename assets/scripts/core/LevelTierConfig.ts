/**
 * The only level-tier table. Board size and leaderboard tiers both read this.
 * Puzzle generation stays in PuzzleGenerator; it only receives boardSize.
 */

export interface LevelTierConfig {
    tierId: number;
    minLevel: number;
    maxLevel: number;
    boardSize: number;
}

export const LEVEL_TIERS: LevelTierConfig[] = [
    { tierId: 1, minLevel: 1, maxLevel: 10, boardSize: 5 },
    { tierId: 2, minLevel: 11, maxLevel: 35, boardSize: 6 },
    { tierId: 3, minLevel: 36, maxLevel: 56, boardSize: 7 },
    { tierId: 4, minLevel: 57, maxLevel: 80, boardSize: 8 },
    { tierId: 5, minLevel: 81, maxLevel: 110, boardSize: 9 },
];

export interface LeaderboardTierDisplay {
    tierId: number;
    minLevel: number;
    maxLevel: number;
    boardSize: number;
    /** 0..1. Local currentLevel against this tier. Not a server value. */
    progress: number;
}

export function tierById(tierId: number): LevelTierConfig | null {
    return LEVEL_TIERS.find((tier) => tier.tierId === tierId) ?? null;
}

/** Levels above the last tier stay on that tier. No extra board size is invented. */
export function tierByLevel(level: number): LevelTierConfig {
    const value = Math.max(1, Math.floor(level) || 1);
    const match = LEVEL_TIERS.find((tier) => value >= tier.minLevel && value <= tier.maxLevel);
    if (match) return match;
    if (value < LEVEL_TIERS[0].minLevel) return LEVEL_TIERS[0];
    return LEVEL_TIERS[LEVEL_TIERS.length - 1];
}

/** Counts currentLevel itself. Reaching the level fills progress before it is cleared. */
export function tierCompletedCount(level: number, tier: LevelTierConfig): number {
    const reached = Math.max(0, Math.floor(level));
    return Math.max(0, Math.min(reached, tier.maxLevel) - tier.minLevel + 1);
}

export function tierTotalCount(tier: LevelTierConfig): number {
    const total = tier.maxLevel - tier.minLevel + 1;
    return total > 0 ? total : 0;
}

/** reachedInTier / totalInTier. The current level counts before it is cleared. */
export function tierProgress(level: number, tier: LevelTierConfig): number {
    const total = tierTotalCount(tier);
    if (total <= 0) return 0;
    return tierCompletedCount(level, tier) / total;
}
