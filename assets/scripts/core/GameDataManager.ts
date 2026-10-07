/**
 * Lobby profile shared by Achievement / Level / Leaderboard.
 * currentLevel is stored by LevelManager. This profile only mirrors it.
 */

import { LevelManager } from './LevelManager';
import { SaveManager } from './SaveManager';

export interface GameProfile {
    currentLevel: number;
    currentScene: string;
    playerName: string;
    avatarId: string;
    bestScore: number;
    featuredScene: string;
    achievementProgress: number;
}

const DEFAULT_PROFILE: GameProfile = {
    currentLevel: 1,
    currentScene: 'Candy Fountain',
    playerName: 'LadadLac',
    avatarId: 'bear',
    bestScore: 0,
    featuredScene: 'Candy City Streets',
    achievementProgress: 0.62,
};

export class GameDataManager {
    private static profile: GameProfile = { ...DEFAULT_PROFILE };

    public static getProfile(): GameProfile {
        const save = SaveManager.load();
        if (save.playerName) this.profile.playerName = save.playerName;
        if (save.avatarId) this.profile.avatarId = save.avatarId;
        this.profile.currentLevel = LevelManager.getCurrentLevel();
        return this.profile;
    }

    public static getCurrentLevel(): number {
        return LevelManager.getCurrentLevel();
    }

    public static setCurrentLevel(level: number): void {
        LevelManager.setCurrentLevel(level);
        this.profile.currentLevel = LevelManager.getCurrentLevel();
    }

    public static setCurrentScene(scene: string): void {
        this.profile.currentScene = scene;
    }

    public static setPlayerName(name: string): void {
        const next = name.trim();
        if (!next) return;
        this.profile.playerName = next;
        SaveManager.update({ playerName: next });
    }

    public static setAvatarId(avatarId: string): void {
        if (!avatarId) return;
        this.profile.avatarId = avatarId;
        SaveManager.update({ avatarId });
    }

    public static setBestScore(score: number): void {
        this.profile.bestScore = Math.max(0, Math.floor(score) || 0);
    }

    public static setFeaturedScene(scene: string): void {
        this.profile.featuredScene = scene;
    }

    public static setAchievementProgress(progress: number): void {
        this.profile.achievementProgress = Math.max(0, Math.min(1, progress));
    }
}
