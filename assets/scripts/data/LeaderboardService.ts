/**
 * Leaderboard HTTP API.
 * USE_MOCK_LEADERBOARD returns the sample rows plus the current player.
 * The real call is GET {API_BASE_URL}{LEADERBOARD_API}.
 */

import { API_BASE_URL, LEADERBOARD_API, USE_MOCK_LEADERBOARD } from '../api/ApiConfig';
import { GameDataManager } from '../core/GameDataManager';
import { LevelManager } from '../core/LevelManager';
import { LeaderboardEntry, LeaderboardResult } from './LeaderboardData';

const LOCAL_PLAYER_ID = 'local_player';

const MOCK_ENTRIES: LeaderboardEntry[] = [
    { rank: 1, playerId: 'player_001', playerName: 'LadadLdac', avatarId: 'bear', level: 136 },
    { rank: 2, playerId: 'player_002', playerName: 'CandyCat', avatarId: 'cat', level: 128 },
    { rank: 3, playerId: 'player_003', playerName: 'Dragon', avatarId: 'dragon', level: 119 },
    { rank: 4, playerId: 'player_004', playerName: 'Penguin', avatarId: 'penguin', level: 108 },
    { rank: 5, playerId: 'player_005', playerName: 'Candy', avatarId: 'chick', level: 96 },
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
        if (USE_MOCK_LEADERBOARD) return this.loadMock();
        return this.loadRemote();
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

    private static loadRemote(): Promise<LeaderboardResult> {
        const url = `${API_BASE_URL}${LEADERBOARD_API}`;
        return requestJson(url).then((body) => normalize(body));
    }
}

function requestJson(url: string): Promise<unknown> {
    const ctor = runtimeHost().XMLHttpRequest;
    if (!ctor) return Promise.reject(new Error('XMLHttpRequest is not available'));
    return new Promise((resolve, reject) => {
        const xhr = new ctor();
        xhr.open('GET', url, true);
        xhr.timeout = 8000;
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
        xhr.ontimeout = () => reject(new Error('leaderboard timeout'));
        xhr.send();
    });
}

function normalize(body: unknown): LeaderboardResult {
    const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
    const rawEntries = Array.isArray(record.entries) ? record.entries : Array.isArray(body) ? body : [];
    const entries = rawEntries.map(readEntry).filter((entry): entry is LeaderboardEntry => !!entry);
    const currentUser = readEntry(record.currentUser);
    return { entries, currentUser };
}

function readEntry(raw: unknown): LeaderboardEntry | null {
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;
    const rank = Number(record.rank);
    if (!Number.isFinite(rank)) return null;
    const level = Number(record.level);
    const playerName = typeof record.playerName === 'string' ? record.playerName : typeof record.name === 'string' ? record.name : '';
    const playerId = typeof record.playerId === 'string' ? record.playerId : '';
    const avatarId = typeof record.avatarId === 'string' ? record.avatarId : '';
    const tierRaw = Number(record.tierId);
    const entry: LeaderboardEntry = {
        rank: Math.floor(rank),
        playerId,
        playerName,
        avatarId,
        level: Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0,
    };
    if (Number.isFinite(tierRaw) && tierRaw > 0) entry.tierId = Math.floor(tierRaw);
    return entry;
}
