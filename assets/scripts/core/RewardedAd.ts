/**
 * Asks Android to show a rewarded ad and delivers one reward per request.
 * Intermediate statuses never grant a reward. Timeout only ends the request.
 */

import { AndroidBridge } from './AndroidBridge';

const SHOW_EVENT = 'showRewardedAd';
const RESULT_EVENT = 'rewardedAdResult';
const TIMEOUT_MS = 90000;

const OPEN = new Set(['loading', 'loaded', 'showed']);
const FAIL = new Set(['closed', 'not_ready', 'load_failed', 'show_failed']);

interface PendingAd {
    rewardType: string;
    rewarded: boolean;
    onReward: (amount: number) => void;
    onFailure: (status: string) => void;
    timer: ReturnType<typeof setTimeout>;
}

interface AdResult {
    requestId: string;
    status: string;
    rewardAmount: number | null;
}

export class RewardedAd {
    private static readonly pending = new Map<string, PendingAd>();
    private static activeId = '';
    private static listening = false;
    private static sequence = 0;

    public static showRewardedAd(
        rewardType: string,
        onReward: (amount: number) => void,
        onFailure: (status: string) => void,
    ): void {
        if (this.activeId) {
            onFailure('busy');
            return;
        }
        if (!AndroidBridge.isAndroid()) {
            onFailure('unsupported');
            return;
        }
        this.ensureListener();
        const requestId = this.nextId();
        const timer = setTimeout(() => this.expire(requestId), TIMEOUT_MS);
        this.pending.set(requestId, { rewardType, rewarded: false, onReward, onFailure, timer });
        this.activeId = requestId;
        const body = JSON.stringify({ action: SHOW_EVENT, requestId });
        if (!AndroidBridge.send(SHOW_EVENT, body)) {
            this.finish(requestId, 'send_failed');
        }
    }

    public static isBusy(): boolean {
        return this.activeId.length > 0;
    }

    private static ensureListener(): void {
        if (this.listening) return;
        this.listening = true;
        AndroidBridge.on(RESULT_EVENT, (data) => this.onResult(data));
    }

    private static onResult(data: string): void {
        const parsed = this.parse(data);
        if (parsed === 'invalid') {
            if (this.activeId) this.finish(this.activeId, 'invalid_json');
            return;
        }
        if (!parsed) return;
        const request = this.pending.get(parsed.requestId);
        if (!request) return;
        if (OPEN.has(parsed.status)) {
            this.refreshTimer(parsed.requestId, request);
            return;
        }
        if (parsed.status === 'reward_earned') {
            if (request.rewarded) return;
            if (parsed.rewardAmount === null || parsed.rewardAmount < 0) {
                this.finish(parsed.requestId, 'invalid_reward');
                return;
            }
            request.rewarded = true;
            try {
                request.onReward(parsed.rewardAmount);
            } catch (err) {
                console.warn('[RewardedAd] reward handler failed');
            }
            this.clear(parsed.requestId);
            return;
        }
        if (FAIL.has(parsed.status)) {
            if (parsed.status === 'closed' && request.rewarded) {
                this.clear(parsed.requestId);
                return;
            }
            this.finish(parsed.requestId, parsed.status);
            return;
        }
        this.finish(parsed.requestId, 'unknown');
    }

    private static expire(requestId: string): void {
        const request = this.pending.get(requestId);
        if (!request || request.rewarded) return;
        this.finish(requestId, 'timeout');
    }

    private static refreshTimer(requestId: string, request: PendingAd): void {
        clearTimeout(request.timer);
        request.timer = setTimeout(() => this.expire(requestId), TIMEOUT_MS);
    }

    private static finish(requestId: string, status: string): void {
        const request = this.pending.get(requestId);
        if (!request || request.rewarded) {
            this.clear(requestId);
            return;
        }
        this.clear(requestId);
        try {
            request.onFailure(status);
        } catch (err) {
            console.warn('[RewardedAd] failure handler failed');
        }
    }

    private static clear(requestId: string): void {
        const request = this.pending.get(requestId);
        if (request) clearTimeout(request.timer);
        this.pending.delete(requestId);
        if (this.activeId === requestId) this.activeId = '';
    }

    /** 'invalid' is unreadable JSON. null is a background event with no requestId. */
    private static parse(data: string): AdResult | 'invalid' | null {
        let raw: unknown;
        try {
            raw = JSON.parse(data);
        } catch (err) {
            return 'invalid';
        }
        if (!raw || typeof raw !== 'object') return 'invalid';
        const record = raw as Record<string, unknown>;
        const requestId = typeof record.requestId === 'string' ? record.requestId : '';
        const status = typeof record.status === 'string' ? record.status : '';
        if (!requestId || !status) return null;
        const amount = typeof record.rewardAmount === 'number' && Number.isFinite(record.rewardAmount)
            ? record.rewardAmount
            : null;
        return { requestId, status, rewardAmount: amount };
    }

    private static nextId(): string {
        this.sequence += 1;
        return `reward_${Date.now()}_${this.sequence}`;
    }
}
