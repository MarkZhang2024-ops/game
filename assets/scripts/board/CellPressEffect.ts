/**
 * Press and release motion for a board cell.
 * Visual only. Placement rules stay in GameManager.
 */

import { _decorator, Component, Node, Tween, Vec3, tween } from 'cc';
import { DEBUG_PRESS } from '../utils/Constants';

const { ccclass, property } = _decorator;

@ccclass('CellPressEffect')
export class CellPressEffect extends Component {
    @property
    public pressScale = 0.92;

    @property
    public pressTime = 0.08;

    @property
    public releaseTime = 0.18;

    @property
    public pressOffsetY = 5;

    private holding = false;
    private releasing = false;
    private poseReady = false;
    private readonly restPos = new Vec3();
    private readonly restScale = new Vec3(1, 1, 1);
    private readonly pressedPos = new Vec3();
    private readonly pressedScale = new Vec3(0.92, 0.92, 1);
    private readonly overScale = new Vec3(1.05, 1.05, 1);
    private downTween: Tween<Node> | null = null;
    private releaseTween: Tween<Node> | null = null;
    private readonly afterReleaseQueue: Array<() => void> = [];

    protected onEnable(): void {
        this.captureRest();
    }

    protected onDisable(): void {
        this.stopMotion();
        this.holding = false;
        this.releasing = false;
        if (this.poseReady) this.applyRest();
        this.flushAfterRelease();
    }

    public pressDown(row = -1, col = -1): void {
        if (DEBUG_PRESS) {
            console.log(`Cell Press Down:\nrow=${row}\ncol=${col}`);
        }
        if (!this.holding && !this.releasing) this.captureRest();
        this.holding = true;
        this.releasing = false;
        this.pressedScale.set(this.pressScale, this.pressScale, this.restScale.z || 1);
        this.pressedPos.set(this.restPos.x, this.restPos.y - this.pressOffsetY, this.restPos.z);
        this.overScale.set(this.restScale.x * 1.05, this.restScale.y * 1.05, this.restScale.z || 1);
        this.ensureTweens();
        this.stopMotion();
        this.downTween?.start();
    }

    public pressUp(row = -1, col = -1): void {
        if (!this.holding && !this.releasing) return;
        if (DEBUG_PRESS) {
            console.log(`Cell Press Up:\nrow=${row}\ncol=${col}`);
        }
        this.holding = false;
        this.releasing = true;
        this.ensureTweens();
        this.stopMotion();
        this.releaseTween?.start();
    }

    /** Finger slid off the cell. Always returns to the rest pose. */
    public cancelPress(row = -1, col = -1): void {
        if (DEBUG_PRESS && (this.holding || this.releasing)) {
            console.log(`Cell Press Up:\nrow=${row}\ncol=${col}`);
        }
        this.holding = false;
        this.releasing = false;
        this.stopMotion();
        if (this.poseReady) this.applyRest();
        this.flushAfterRelease();
    }

    public isBusy(): boolean {
        return this.holding || this.releasing;
    }

    /** Runs immediately when the cell is idle, otherwise after the release pose is restored. */
    public afterRelease(task: () => void): void {
        if (!this.isBusy()) {
            task();
            return;
        }
        this.afterReleaseQueue.push(task);
    }

    private captureRest(): void {
        this.restPos.set(this.node.position);
        this.restScale.set(this.node.scale);
        if (this.restScale.x === 0) this.restScale.set(1, 1, 1);
        this.poseReady = true;
    }

    private applyRest(): void {
        this.node.setPosition(this.restPos);
        this.node.setScale(this.restScale);
    }

    private ensureTweens(): void {
        if (this.downTween && this.releaseTween) return;
        const rise = Math.max(0.05, this.releaseTime * 0.62);
        const settle = Math.max(0.04, this.releaseTime - rise);
        this.downTween = tween(this.node).to(
            this.pressTime,
            { scale: this.pressedScale, position: this.pressedPos },
            { easing: 'quadIn' },
        );
        this.releaseTween = tween(this.node)
            .to(rise, { scale: this.overScale, position: this.restPos }, { easing: 'backOut' })
            .to(settle, { scale: this.restScale, position: this.restPos }, { easing: 'quadOut' })
            .call(() => this.onReleaseFinished());
    }

    private stopMotion(): void {
        this.downTween?.stop();
        this.releaseTween?.stop();
    }

    private onReleaseFinished(): void {
        this.releasing = false;
        this.holding = false;
        if (this.poseReady) this.applyRest();
        this.flushAfterRelease();
    }

    private flushAfterRelease(): void {
        if (this.afterReleaseQueue.length === 0) return;
        const pending = this.afterReleaseQueue.splice(0);
        for (const task of pending) task();
    }
}
