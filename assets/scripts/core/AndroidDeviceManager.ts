/**
 * Reads the Android ID through AndroidBridge.
 * Web preview never calls the bridge and never invents an ID.
 */

import { sys } from 'cc';
import { NATIVE } from 'cc/env';
import { AndroidBridge } from './AndroidBridge';

const ID_KEY = 'android_id';
const PACKAGE_KEY = 'package_name';
const REQUEST_EVENT = 'getAndroidId';
const RESULT_EVENT = 'androidIdResult';
const REQUEST_TIMEOUT_MS = 4000;

interface DevicePayload {
    ok?: boolean;
    androidId?: string;
    packageName?: string;
}

export class AndroidDeviceManager {
    private static readyId: string | null = null;
    private static readyPackage: string | null = null;
    private static pending: Promise<string | null> | null = null;
    private static callbackInstalled = false;
    private static waiters: Array<(id: string | null) => void> = [];

    /** Start a fetch. Later calls share the same task until it fails. */
    public static initAndroidId(): Promise<string | null> {
        if (!this.isAndroidNative()) return Promise.resolve(null);
        this.loadStored();
        if (this.pending) return this.pending;
        if (this.readyId && this.readyPackage && this.callbackInstalled) return Promise.resolve(this.readyId);

        this.pending = this.request()
            .finally(() => {
                this.pending = null;
            })
            .then(() => this.readyId);
        return this.pending;
    }

    /** Cached ID, or null when it is not ready. */
    public static getAndroidId(): string | null {
        if (!this.isAndroidNative()) return null;
        this.loadStored();
        return this.readyId;
    }

    public static getPackageName(): string | null {
        if (!this.isAndroidNative()) return null;
        this.loadStored();
        return this.readyPackage;
    }

    public static getAndroidIdAsync(): Promise<string | null> {
        return this.initAndroidId();
    }

    public static getPackageNameAsync(): Promise<string | null> {
        return this.initAndroidId().then(() => this.readyPackage);
    }

    public static isAndroidIdReady(): boolean {
        return this.getAndroidId() !== null && this.getPackageName() !== null;
    }

    private static request(): Promise<string | null> {
        if (!this.bindBridge()) return Promise.resolve(this.readyId);
        return new Promise((resolve) => {
            let settled = false;
            const finish = (id: string | null): void => {
                if (settled) return;
                settled = true;
                this.waiters = this.waiters.filter((waiter) => waiter !== finish);
                resolve(id);
            };
            this.waiters.push(finish);
            if (!AndroidBridge.send(REQUEST_EVENT, '')) {
                console.warn('[AndroidDevice] sendToNative failed');
                finish(this.readyId);
                return;
            }
            setTimeout(() => finish(this.readyId), REQUEST_TIMEOUT_MS);
        });
    }

    /** One listener on the shared bridge. Does not replace other modules' callbacks. */
    private static bindBridge(): boolean {
        if (this.callbackInstalled) return true;
        if (!AndroidBridge.isAndroid()) return false;
        AndroidBridge.on(RESULT_EVENT, (data) => this.onNative(RESULT_EVENT, data));
        this.callbackInstalled = true;
        return true;
    }

    private static onNative = (eventName: string, data?: string | null): void => {
        if (eventName !== RESULT_EVENT) return;
        const parsed = this.parse(data);
        console.log(`[AndroidDevice] received androidId=${parsed.androidId ?? ''}, packageName=${parsed.packageName ?? ''}`);
        if (parsed.androidId) {
            this.readyId = parsed.androidId;
            this.persist(ID_KEY, parsed.androidId);
        }
        if (parsed.packageName) {
            this.readyPackage = parsed.packageName;
            this.persist(PACKAGE_KEY, parsed.packageName);
        }
        if (!parsed.androidId || !parsed.packageName) {
            console.warn('[AndroidDevice] android id or package name unavailable');
            this.flush(this.readyId);
            return;
        }
        console.log(`[AndroidDevice] ready, androidIdLength=${parsed.androidId.length}, packageName=${parsed.packageName}`);
        this.flush(parsed.androidId);
    };

    private static flush(id: string | null): void {
        const waiters = this.waiters;
        this.waiters = [];
        waiters.forEach((waiter) => waiter(id ?? this.readyId));
    }

    private static usable(value: string | null | undefined): string | null {
        if (typeof value !== 'string') return null;
        const id = value.trim();
        if (!id || id === 'null' || id === 'undefined') return null;
        return id;
    }

    private static parse(data?: string | null): { androidId: string | null; packageName: string | null } {
        const text = typeof data === 'string' ? data.trim() : '';
        if (!text || text === 'null' || text === 'undefined') {
            return { androidId: null, packageName: null };
        }
        if (text.charAt(0) !== '{') {
            return { androidId: this.usable(text), packageName: null };
        }
        try {
            const msg = JSON.parse(text) as DevicePayload;
            return {
                androidId: this.usable(msg.androidId),
                packageName: this.usable(msg.packageName),
            };
        } catch {
            return { androidId: null, packageName: null };
        }
    }

    private static loadStored(): void {
        if (!this.readyId) this.readyId = this.readStored(ID_KEY);
        if (!this.readyPackage) this.readyPackage = this.readStored(PACKAGE_KEY);
    }

    private static readStored(key: string): string | null {
        try {
            return this.usable(sys.localStorage.getItem(key));
        } catch {
            return null;
        }
    }

    private static persist(key: string, value: string): void {
        try {
            sys.localStorage.setItem(key, value);
        } catch {
            // Ignore quota / privacy errors. The memory cache still serves this process.
        }
    }

    private static isAndroidNative(): boolean {
        return NATIVE && sys.isNative && sys.os === sys.OS.ANDROID;
    }
}
