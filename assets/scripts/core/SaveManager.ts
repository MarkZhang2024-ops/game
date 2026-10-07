/**
 * Cluedoku! - Save manager.
 *
 * Persists progress (current level, high score, settings) to localStorage.
 * Falls back to an in-memory store if localStorage is unavailable.
 */

import { SaveData } from './GameState';

const STORAGE_KEY = 'cluedoku_save_v2';

const DEFAULT_SAVE: SaveData = {
    currentLevel: 1,
    highScore: 0,
    soundOn: true,
    musicOn: true,
    vibrationOn: true,
    bellOn: true,
    winStreak: 0,
    playerName: 'LadadLac',
    avatarId: 'bear',
};

export class SaveManager {
    private static memory: SaveData | null = null;

    /** Load save data (from localStorage or defaults). */
    public static load(): SaveData {
        if (this.memory) return this.memory;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                this.memory = { ...DEFAULT_SAVE, ...JSON.parse(raw) };
            } else {
                this.memory = { ...DEFAULT_SAVE };
            }
        } catch {
            this.memory = { ...DEFAULT_SAVE };
        }
        return this.memory;
    }

    /** Persist save data. */
    public static save(data: SaveData): void {
        this.memory = data;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
            // Ignore quota / privacy errors.
        }
    }

    /** Update a single field and persist. */
    public static update(partial: Partial<SaveData>): SaveData {
        const data = { ...this.load(), ...partial };
        this.save(data);
        return data;
    }

    /** Reset progress to level 1 (keeps settings). */
    public static resetProgress(): SaveData {
        const data = this.load();
        data.currentLevel = 1;
        data.highScore = 0;
        data.winStreak = 0;
        this.save(data);
        return data;
    }
}
