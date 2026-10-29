/**
 * GET /user/getUser?device_id=&game_package=
 * A saved user is reused and the request is skipped.
 */

import { USER_API_BASE_URL, GET_USER_API, UPDATE_USER_API } from '../api/ApiConfig';
import { AndroidDeviceManager } from '../core/AndroidDeviceManager';
import { GameDataManager } from '../core/GameDataManager';
import { avatarIdFromServer } from '../ui/ProfileAvatars';

const STORAGE_KEY = 'cluedoku_user_v1';
const FALLBACK_NAME = 'LadaLac';
const LEGACY_DEFAULT_NAME = 'LadadLac';

export interface RemoteUser {
    id: number | null;
    game_package: string | null;
    device_id: string | null;
    username: string | null;
    user_avatar: string | null;
    email: string | null;
    level: number | null;
    rank: number | null;
    register_time: string | null;
    update_time: string | null;
}

interface XmlRequest {
    open(method: string, url: string, async: boolean): void;
    setRequestHeader(name: string, value: string): void;
    send(body?: string): void;
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
}

function runtimeHost(): RuntimeHost {
    return Function('return this')() as RuntimeHost;
}

export class UserService {
    private static memory: RemoteUser | null = null;
    private static pending: Promise<RemoteUser | null> | null = null;

    /** Saved user, or null when this install has not stored one. */
    public static getUser(): RemoteUser | null {
        if (this.memory) return this.memory;
        this.memory = this.readStored();
        if (this.memory) this.applyProfile(this.memory);
        return this.memory;
    }

    /** Fetch a username after the Android ID is ready when none is stored. */
    public static ensureUser(): Promise<RemoteUser | null> {
        const saved = this.getUser();
        if (this.storedUsername(saved)) return Promise.resolve(saved);
        if (this.pending) return this.pending;
        this.pending = this.fetch()
            .finally(() => {
                this.pending = null;
            });
        return this.pending;
    }

    /** Saved user without writing it over a profile edit that has not been uploaded yet. */
    private static cachedUser(): RemoteUser | null {
        if (this.memory) return this.memory;
        this.memory = this.readStored();
        return this.memory;
    }

    /** Upload only the nickname or avatar that actually changed. */
    public static updateProfile(change: { username?: string; avatarId?: string }): Promise<RemoteUser | null> {
        const name = change.username?.trim() ?? '';
        const avatar = change.avatarId ? avatarIdFromServer(change.avatarId) : null;
        if (!name && !avatar) return Promise.resolve(null);
        return AndroidDeviceManager.getAndroidIdAsync().then((deviceId) => {
            const gamePackage = AndroidDeviceManager.getPackageName();
            if (!deviceId || !gamePackage) {
                console.warn(`[UserService] updateUser skipped, androidId=${deviceId ?? ''}, packageName=${gamePackage ?? ''}`);
                return null;
            }
            const saved = this.cachedUser();
            const payload: Record<string, string | number> = {
                game_package: gamePackage,
                device_id: deviceId,
            };
            if (name) payload.username = name;
            if (avatar) payload.user_avatar = avatar;
            return this.postUpdate(payload, saved);
        });
    }

    /** Upload the unlocked level after a new level is cleared. */
    public static updateLevel(level: number): Promise<RemoteUser | null> {
        const next = Math.max(1, Math.floor(level) || 1);
        return AndroidDeviceManager.getAndroidIdAsync().then((deviceId) => {
            const gamePackage = AndroidDeviceManager.getPackageName();
            if (!deviceId || !gamePackage) {
                console.warn(`[UserService] updateUser skipped, androidId=${deviceId ?? ''}, packageName=${gamePackage ?? ''}`);
                return null;
            }
            return this.postUpdate({
                game_package: gamePackage,
                device_id: deviceId,
                level: next,
            }, this.cachedUser());
        });
    }

    private static postUpdate(payload: Record<string, string | number>, saved: RemoteUser | null): Promise<RemoteUser | null> {
        const url = `${USER_API_BASE_URL}${UPDATE_USER_API}`;
        console.log(`[UserService] updateUser ${url} ${JSON.stringify(payload)}`);
        return requestJson('POST', url, JSON.stringify(payload), 'updateUser').then((body) => {
            const returned = readUser(body);
            const user: RemoteUser = returned ?? {
                id: saved?.id ?? null,
                game_package: typeof payload.game_package === 'string' ? payload.game_package : saved?.game_package ?? null,
                device_id: typeof payload.device_id === 'string' ? payload.device_id : saved?.device_id ?? null,
                username: typeof payload.username === 'string' ? payload.username : saved?.username ?? null,
                user_avatar: typeof payload.user_avatar === 'string' ? payload.user_avatar : saved?.user_avatar ?? null,
                email: saved?.email ?? null,
                level: typeof payload.level === 'number' ? payload.level : saved?.level ?? null,
                rank: saved?.rank ?? null,
                register_time: saved?.register_time ?? null,
                update_time: saved?.update_time ?? null,
            };
            this.memory = user;
            this.persist(user);
            console.log(`[UserService] updated username=${user.username ?? ''}, avatar=${user.user_avatar ?? ''}, level=${user.level ?? ''}`);
            return user;
        }).catch((err: unknown) => {
            const message = err instanceof Error ? err.message : 'updateUser failed';
            console.warn(`[UserService] ${message}`);
            return null;
        });
    }

    private static fetch(): Promise<RemoteUser | null> {
        return AndroidDeviceManager.getAndroidIdAsync().then((deviceId) => {
            const gamePackage = AndroidDeviceManager.getPackageName();
            if (!deviceId || !gamePackage) {
                console.warn(`[UserService] getUser skipped, androidId=${deviceId ?? ''}, packageName=${gamePackage ?? ''}`);
                return this.useFallback();
            }
            const url = `${USER_API_BASE_URL}${GET_USER_API}?device_id=${encodeURIComponent(deviceId)}&game_package=${encodeURIComponent(gamePackage)}`;
            console.log(`[UserService] getUser ${url}`);
            return requestJson('GET', url, undefined, 'getUser').then((body) => {
                const user = readUser(body);
                if (!user?.username) {
                    console.warn('[UserService] getUser response has no username');
                    return this.useFallback();
                }
                this.memory = user;
                this.persist(user);
                this.applyProfile(user);
                console.log(`[UserService] username=${user.username}`);
                return user;
            }).catch((err: unknown) => {
                const message = err instanceof Error ? err.message : 'getUser failed';
                console.warn(`[UserService] ${message}`);
                return this.useFallback();
            });
        });
    }

    /** A failed request with no saved name keeps the fallback visible. */
    private static useFallback(): null {
        if (!this.storedUsername(this.getUser())) GameDataManager.setPlayerName(FALLBACK_NAME);
        return null;
    }

    private static storedUsername(saved: RemoteUser | null): string | null {
        const remote = saved?.username?.trim() ?? '';
        if (remote) return remote;
        const local = GameDataManager.getProfile().playerName.trim();
        if (!local || local === LEGACY_DEFAULT_NAME || local === FALLBACK_NAME) return null;
        return local;
    }

    private static applyProfile(user: RemoteUser): void {
        const name = typeof user.username === 'string' ? user.username.trim() : '';
        if (name) GameDataManager.setPlayerName(name);
        const avatarId = avatarIdFromServer(user.user_avatar);
        if (avatarId) GameDataManager.setAvatarId(avatarId);
    }

    private static readStored(): RemoteUser | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return readUser(JSON.parse(raw));
        } catch {
            return null;
        }
    }

    private static persist(user: RemoteUser): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        } catch {
            // The memory copy still serves this process.
        }
    }
}

function requestJson(method: string, url: string, body: string | undefined, label: string): Promise<unknown> {
    const ctor = runtimeHost().XMLHttpRequest;
    if (!ctor) return Promise.reject(new Error('XMLHttpRequest is not available'));
    return new Promise((resolve, reject) => {
        const xhr = new ctor();
        let settled = false;
        const finish = (ok: boolean, value: unknown): void => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (ok) resolve(value);
            else reject(value instanceof Error ? value : new Error(String(value)));
        };
        const timer = setTimeout(() => {
            try {
                xhr.abort();
            } catch (err) {
                // The native request may already be gone.
            }
            finish(false, new Error(`${label} timeout`));
        }, 8000);
        xhr.open(method, url, true);
        if (body) xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4) return;
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    finish(true, JSON.parse(xhr.responseText));
                } catch (err) {
                    finish(false, err);
                }
                return;
            }
            if (xhr.status === 0) return;
            finish(false, new Error(`${label} HTTP ${xhr.status}`));
        };
        xhr.onerror = () => finish(false, new Error(`${label} network error`));
        xhr.send(body);
    });
}

function readUser(raw: unknown): RemoteUser | null {
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;
    const code = Number(record.code);
    if (Number.isFinite(code) && code !== 200) return null;
    const source = record.data && typeof record.data === 'object'
        ? record.data as Record<string, unknown>
        : record;
    const user: RemoteUser = {
        id: readInt(source.id),
        game_package: readText(source.game_package),
        device_id: readText(source.device_id),
        username: readText(source.username),
        user_avatar: avatarIdFromServer(source.user_avatar),
        email: readText(source.email),
        level: readInt(source.level),
        rank: readInt(source.rank),
        register_time: readText(source.register_time),
        update_time: readText(source.update_time),
    };
    const hasId = user.id !== null;
    const hasName = !!user.username;
    if (!hasId && !hasName) return null;
    return user;
}

function readText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const text = value.trim();
    return text ? text : null;
}

function readInt(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return Math.floor(value);
}
