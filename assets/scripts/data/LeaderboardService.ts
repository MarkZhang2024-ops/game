/**
 * Leaderboard HTTP API.
 * GET {USER_API_BASE_URL}{GET_TOP_USERS_API}?game_package=
 * Without a package name the page keeps the local sample rows.
 */

import { GET_TOP_USERS_API, USER_API_BASE_URL } from '../api/ApiConfig';
import { AndroidDeviceManager } from '../core/AndroidDeviceManager';
import { GameDataManager } from '../core/GameDataManager';
import { LevelManager } from '../core/LevelManager';
import { LeaderboardEntry, LeaderboardResult } from './LeaderboardData';
import { avatarIdFromServer } from '../ui/ProfileAvatars';

const LOCAL_PLAYER_ID = 'local_player';

const MOCK_ENTRIES: LeaderboardEntry[] = [
    { rank: 1, playerId: 'player_001', playerName: 'LadadLdac', avatarId: '1', level: 136 },
    { rank: 2, playerId: 'player_002', playerName: 'CandyCat', avatarId: '2', level: 128 },
    { rank: 3, playerId: 'player_003', playerName: 'Dragon', avatarId: '3', level: 119 },
    { rank: 4, playerId: 'player_004', playerName: 'Penguin', avatarId: '5', level: 108 },
    { rank: 5, playerId: 'player_005', playerName: 'Candy', avatarId: '6', level: 96 },
];

interface XmlRequest {
    open(method: string, url: string, async: boolean): void;
    send(): void;
    timeout: number;
    status: number;
    readyState: number;
    responseText: string;
    onreadystatechange: (() => void) | null;
    onerror: (() => void) | null;
    ontimeout: (() => void) | null;
}

type XmlRequestCtor = new () => XmlRequest;

interface RuntimeHost {
    XMLHttpRequest?: XmlRequestCtor;
    setTimeout?: (handler: () => void, timeout: number) => number;
}

function runtimeHost(): RuntimeHost {
    return Function('return this')() as RuntimeHost;
}

export class LeaderboardService {
    public static getLeaderboard(): Promise<LeaderboardResult> {
        return AndroidDeviceManager.getPackageNameAsync().then((gamePackage) => {
            if (!gamePackage) return this.loadMock();
            const url = `${USER_API_BASE_URL}${GET_TOP_USERS_API}?game_package=${encodeURIComponent(gamePackage)}`;
            return requestJson(url).then((body) => normalize(body, AndroidDeviceManager.getAndroidId()));
        });
    }

    private static loadMock(): Promise<LeaderboardResult> {
        const profile = GameDataManager.getProfile();
        const mine: LeaderboardEntry = {
            rank: 0,
            playerId: LOCAL_PLAYER_ID,
            playerName: profile.playerName,
            avatarId: profile.avatarId,
            level: LevelManager.getCurrentLevel(),
        };
        const others = MOCK_ENTRIES.filter((entry) => entry.playerId !== LOCAL_PLAYER_ID);
        const sorted = [...others, mine].sort((a, b) => {
            if (b.level !== a.level) return b.level - a.level;
            if (a.playerId === LOCAL_PLAYER_ID) return 1;
            if (b.playerId === LOCAL_PLAYER_ID) return -1;
            return 0;
        });
        const entries = sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
        const result: LeaderboardResult = {
            entries,
            currentUser: entries.find((entry) => entry.playerId === LOCAL_PLAYER_ID) ?? null,
        };
        const wait = runtimeHost().setTimeout;
        if (!wait) return Promise.resolve(result);
        return new Promise((resolve) => {
            wait(() => resolve(result), 200);
        });
    }
}

function requestJson(url: string): Promise<unknown> {
    const ctor = runtimeHost().XMLHttpRequest;
    if (!ctor) return Promise.reject(new Error('XMLHttpRequest is not available'));
    return new Promise((resolve, reject) => {
        const xhr = new ctor();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4) return;
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(JSON.parse(xhr.responseText));
                } catch (err) {
                    reject(err);
                }
                return;
            }
            reject(new Error(`leaderboard HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('leaderboard network error'));
        xhr.send();
    });
}

function normalize(body: unknown, deviceId: string | null): LeaderboardResult {
    const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const code = Number(record.code);
    if (Number.isFinite(code) && code !== 200) {
        throw new Error(`leaderboard code ${code}`);
    }
    const rawEntries = Array.isArray(record.data) ? record.data : [];
    const entries = rawEntries
        .map(readEntry)
        .filter((entry): entry is LeaderboardEntry => !!entry)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    const currentUser = deviceId
        ? entries.find((entry) => entry.playerId === deviceId) ?? null
        : null;
    return { entries, currentUser };
}

function readEntry(raw: unknown): LeaderboardEntry | null {
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;
    const level = Number(record.level);
    const playerName = typeof record.username === 'string' ? record.username.trim() : '';
    const deviceId = typeof record.device_id === 'string' ? record.device_id.trim() : '';
    const id = record.id;
    const playerId = deviceId || (typeof id === 'number' || typeof id === 'string' ? String(id) : '');
    const avatarId = avatarIdFromServer(record.user_avatar) ?? '';
    return {
        rank: 0,
        playerId,
        playerName,
        avatarId,
        level: Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0,
    };
}
