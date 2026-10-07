/**
 * Leaderboard records. The page only renders what LeaderboardService returns.
 */

export interface LeaderboardEntry {
    rank: number;
    playerId: string;
    playerName: string;
    avatarId: string;
    level: number;
    /** Set by the server when present. Otherwise the page uses list order. */
    tierId?: number;
}

export interface LeaderboardResult {
    entries: LeaderboardEntry[];
    currentUser: LeaderboardEntry | null;
}
