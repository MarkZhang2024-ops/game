/**
 * Cluedoku! - Math / random helpers.
 */
import { Node, UITransform, view } from 'cc';

export class MathUtils {

    /**
     * Get the UI viewport size from the Canvas UITransform.
     * Falls back to view.getVisibleSize() if Canvas is not found.
     * Use this instead of view.getVisibleSize() to avoid coordinate
     * misalignment when the fit mode scales the visible area.
     */
    public static getViewportSize(startNode: Node): { width: number; height: number } {
        let p: Node | null = startNode;
        while (p) {
            const ut = p.getComponent(UITransform);
            if (ut && ut.width > 0 && ut.height > 0 && p.name === 'Canvas') {
                return { width: ut.width, height: ut.height };
            }
            p = p.parent;
        }
        const vs = view.getVisibleSize();
        return { width: vs.width, height: vs.height };
    }

    /**
     * Fisher-Yates shuffle. Returns a NEW array, does not mutate input.
     */
    public static shuffle<T>(arr: readonly T[]): T[] {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
        return a;
    }

    /** Random integer in [min, max] inclusive. */
    public static randInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /** Pick a random element from a non-empty array. */
    public static pick<T>(arr: readonly T[]): T {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /** Clamp a number into [min, max]. */
    public static clamp(v: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, v));
    }

    /** Format seconds as mm:ss. */
    public static formatTime(totalSeconds: number): string {
        const s = Math.max(0, Math.floor(totalSeconds));
        const mm = Math.floor(s / 60).toString().padStart(2, '0');
        const ss = (s % 60).toString().padStart(2, '0');
        return `${mm}:${ss}`;
    }
}
