/**
 * Cluedoku! - HUD bound to scene nodes (TopUI / PlayerInfo / BottomUI).
 * Art comes from the scene sprites. This script only binds labels and buttons.
 */

import {
    _decorator, Color, Component, Label, Node, RichText, Sprite, UITransform,
} from 'cc';
import { findDeep } from './GamePageLayout';

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
        if (this.levelLabel) this.levelLabel.string = `Level ${level}`;
    }

    public setProgress(placed: number, required: number): void {
        if (this.progressLabel) this.progressLabel.string = `${placed}/${required}`;
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

    /** Count sits on its own child so it cannot hide the button sprite, and it stays up. */
    private refreshHintBadge(): void {
        const canvas = this.findCanvas();
        const button = findDeep(canvas, 'HintButton');
        if (!button) return;
        let badge = button.getChildByName('HintCount');
        if (!badge) {
            badge = new Node('HintCount');
            badge.layer = button.layer;
            const created = badge.addComponent(UITransform);
            created.setAnchorPoint(0.5, 0.5);
            const createdLabel = badge.addComponent(Label);
            createdLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
            createdLabel.verticalAlign = Label.VerticalAlign.CENTER;
            createdLabel.overflow = Label.Overflow.SHRINK;
            createdLabel.isBold = true;
            createdLabel.useSystemFont = true;
            createdLabel.fontFamily = 'Arial';
            createdLabel.enableOutline = true;
            createdLabel.outlineColor = new Color(70, 30, 12, 255);
            button.addChild(badge);
        }
        badge.layer = button.layer;
        badge.active = true;
        const buttonUt = button.getComponent(UITransform);
        const width = buttonUt?.width ?? 232;
        const height = buttonUt?.height ?? 253;
        const badgeUt = badge.getComponent(UITransform)!;
        badgeUt.setContentSize(width * 0.42, height * 0.28);
        badge.setPosition(0, -height * 0.3, 0);
        const label = badge.getComponent(Label)!;
        const font = Math.max(22, Math.round(height * 0.2));
        label.fontSize = font;
        label.lineHeight = font + 4;
        label.outlineWidth = Math.max(2, Math.round(font * 0.12));
        label.color = Color.WHITE;
        label.string = `${this.hintsLeft}`;
        this.hintLabel = label;
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

        findDeep(top, 'SettingButton')?.on(Node.EventType.TOUCH_END, () => this.cb?.onSettingsPressed());
        findDeep(top, 'BackButton')?.on(Node.EventType.TOUCH_END, () => this.cb?.onBackPressed());
        findDeep(bottom, 'HintButton')?.on(Node.EventType.TOUCH_END, () => this.cb?.onHintPressed());
        findDeep(bottom, 'ToolButton')?.on(Node.EventType.TOUCH_END, () => this.cb?.onToolPressed());
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
