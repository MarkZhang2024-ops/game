/**
 * Cluedoku! - HUD bound to scene nodes (TopUI / PlayerInfo / BottomUI).
 * Art comes from the scene sprites. This script only binds labels and buttons.
 */

import {
    _decorator, Color, Component, Label, Node, RichText, Sprite,
} from 'cc';
import { findDeep, paintHintCount, paintLevelTitle, paintProgressCounter } from './GamePageLayout';

const { ccclass } = _decorator;

export interface HudCallbacks {
    onHintPressed(): void;
    onToolPressed(): void;
    onBackPressed(): void;
    onSettingsPressed(): void;
}

@ccclass('HUD')
export class HUD extends Component {
    private cb: HudCallbacks | null = null;
    private levelLabel: Label | RichText | null = null;
    private progressLabel: Label | null = null;
    private heartsLabel: Label | null = null;
    private heartGroup: Node | null = null;
    private hintLabel: Label | null = null;
    private hintsLeft = 3;
    private hintBusy = false;
    private toolBusy = false;
    private bound = false;

    protected onLoad(): void {
        this.bindScene();
    }

    public relayout(): void {
        this.bindScene();
        this.refreshHintBadge();
    }

    public setCallbacks(cb: HudCallbacks): void { this.cb = cb; }

    public setLevel(level: number): void {
        paintLevelTitle(findDeep(this.findCanvas(), 'LevelBanner'), level);
    }

    public setProgress(placed: number, required: number): void {
        paintProgressCounter(findDeep(this.findCanvas(), 'ProgressPlate'), placed, required);
    }

    public setHearts(lives: number, max: number): void {
        const hearts = this.heartGroup?.children ?? [];
        if (hearts.length > 0) {
            for (let i = 0; i < hearts.length; i++) {
                hearts[i].active = i < max;
                const sprite = hearts[i].getComponent(Sprite);
                if (sprite) {
                    sprite.color = i < lives ? Color.WHITE : new Color(255, 255, 255, 80);
                }
            }
            return;
        }
        if (this.heartsLabel) {
            this.heartsLabel.string = `${Math.max(0, lives)}/${Math.max(0, max)}`;
        }
    }

    public setHintsLeft(hints: number): void {
        this.hintsLeft = Math.max(0, hints);
        this.refreshHintBadge();
    }

    /** Ignores extra taps and dims the hint button while an ad request is open. */
    public setHintBusy(busy: boolean): void {
        this.hintBusy = busy;
        const button = findDeep(this.findCanvas(), 'HintButton');
        const sprite = button?.getComponent(Sprite);
        if (sprite) sprite.color = busy ? new Color(255, 255, 255, 150) : Color.WHITE;
    }

    /** Ignores extra taps and dims the tool button while an ad request is open. */
    public setToolBusy(busy: boolean): void {
        this.toolBusy = busy;
        const button = findDeep(this.findCanvas(), 'ToolButton');
        const sprite = button?.getComponent(Sprite);
        if (sprite) sprite.color = busy ? new Color(255, 255, 255, 150) : Color.WHITE;
    }

    /** A remaining count covers the play icon. Zero reveals the video triangle. */
    private refreshHintBadge(): void {
        paintHintCount(findDeep(this.findCanvas(), 'HintButton'), this.hintsLeft);
    }

    private bindScene(): void {
        const canvas = this.findCanvas();
        if (!canvas) return;

        const top = findDeep(canvas, 'TopUI');
        const player = findDeep(canvas, 'PlayerInfo');
        const bottom = findDeep(canvas, 'BottomUI');

        this.levelLabel = this.levelTextOn(findDeep(top, 'LevelLabel'));
        this.progressLabel = this.labelOn(findDeep(player, 'ProgressLabel'));
        this.heartGroup = findDeep(player, 'HeartGroup');
        this.heartsLabel = this.labelOn(this.heartGroup);

        const hintBtn = findDeep(bottom, 'HintButton');
        this.hintLabel = this.labelOn(hintBtn);

        if (this.bound) return;
        this.bound = true;

        const settingButton = findDeep(top, 'SettingButton');
        if (settingButton) settingButton.active = true;
        settingButton?.on(Node.EventType.TOUCH_END, () => this.cb?.onSettingsPressed());
        findDeep(top, 'BackButton')?.on(Node.EventType.TOUCH_END, () => this.cb?.onBackPressed());
        findDeep(bottom, 'HintButton')?.on(Node.EventType.TOUCH_END, () => {
            if (this.hintBusy) return;
            this.cb?.onHintPressed();
        });
        findDeep(bottom, 'ToolButton')?.on(Node.EventType.TOUCH_END, () => {
            if (this.toolBusy) return;
            this.cb?.onToolPressed();
        });
    }

    private findCanvas(): Node | null {
        let n: Node | null = this.node;
        while (n) {
            if (n.name === 'Canvas') return n;
            n = n.parent;
        }
        return this.node.parent;
    }

    private labelOn(node: Node | null): Label | null {
        if (!node) return null;
        return node.getComponent(Label) || node.getComponentInChildren(Label);
    }

    private levelTextOn(node: Node | null): Label | RichText | null {
        if (!node) return null;
        return node.getComponent(Label)
            || node.getComponentInChildren(Label)
            || node.getComponent(RichText)
            || node.getComponentInChildren(RichText);
    }
}
