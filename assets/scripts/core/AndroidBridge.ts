/**
 * Single Cocos 3.8 entry to the Android JsbBridge.
 * native.jsbBridgeWrapper owns native.bridge.onNative and fans events out by name.
 * This class adds listeners there so AndroidDeviceManager and ads do not replace each other.
 * On a build without the wrapper, one chained native.bridge.onNative is installed.
 */

import { native, sys } from 'cc';
import { NATIVE } from 'cc/env';

type NativeCallback = (eventName: string, data?: string | null) => void;

interface DirectBridge {
    sendToNative(eventName: string, data?: string): void;
    onNative?: NativeCallback;
}

interface WrapperBridge {
    addNativeEventListener(eventName: string, listener: (data: string) => void): void;
    dispatchEventToNative(eventName: string, data?: string): void;
}

type Listener = (data: string) => void;

export class AndroidBridge {
    private static readonly listeners = new Map<string, Set<Listener>>();
    private static readonly nativeEvents = new Set<string>();
    private static directInstalled = false;

    public static isAndroid(): boolean {
        return NATIVE && sys.isNative && sys.os === sys.OS.ANDROID;
    }

    /** event is arg0, data is arg1 of native.bridge.sendToNative. */
    public static send(event: string, data = ''): boolean {
        if (!this.isAndroid()) return false;
        try {
            const wrapper = this.wrapper();
            if (wrapper) {
                wrapper.dispatchEventToNative(event, data);
                return true;
            }
            const bridge = this.direct();
            if (!bridge) return false;
            bridge.sendToNative(event, data);
            return true;
        } catch (err) {
            console.warn('[AndroidBridge] send failed', event);
            return false;
        }
    }

    /** One listener per function. The native hook for that event is registered once. */
    public static on(event: string, listener: Listener): void {
        let bucket = this.listeners.get(event);
        if (!bucket) {
            bucket = new Set();
            this.listeners.set(event, bucket);
        }
        if (bucket.has(listener)) return;
        bucket.add(listener);
        this.ensureNative(event);
    }

    private static ensureNative(event: string): void {
        if (!this.isAndroid() || this.nativeEvents.has(event)) return;
        const wrapper = this.wrapper();
        if (wrapper) {
            this.nativeEvents.add(event);
            wrapper.addNativeEventListener(event, (data) => this.dispatch(event, data ?? ''));
            return;
        }
        this.installDirect();
        this.nativeEvents.add(event);
    }

    /** Fallback when jsbBridgeWrapper is absent. Chains any callback already on the bridge. */
    private static installDirect(): void {
        if (this.directInstalled) return;
        const bridge = this.direct();
        if (!bridge) return;
        this.directInstalled = true;
        const previous = bridge.onNative;
        bridge.onNative = (eventName, data) => {
            this.dispatch(eventName, data ?? '');
            if (typeof previous === 'function') previous(eventName, data);
        };
    }

    private static dispatch(event: string, data: string): void {
        const bucket = this.listeners.get(event);
        if (!bucket) return;
        bucket.forEach((listener) => {
            try {
                listener(data);
            } catch (err) {
                console.warn('[AndroidBridge] listener failed', event);
            }
        });
    }

    private static wrapper(): WrapperBridge | null {
        const host = native as { jsbBridgeWrapper?: WrapperBridge };
        const wrapper = host.jsbBridgeWrapper;
        if (!wrapper || typeof wrapper.addNativeEventListener !== 'function') return null;
        if (typeof wrapper.dispatchEventToNative !== 'function') return null;
        return wrapper;
    }

    private static direct(): DirectBridge | null {
        const bridge = native.bridge as DirectBridge | null;
        if (!bridge || typeof bridge.sendToNative !== 'function') return null;
        return bridge;
    }
}
