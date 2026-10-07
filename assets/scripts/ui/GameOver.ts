/**
 * Cluedoku! - Game over overlay.
 *
 * The scene still owns GameOver / TitleLabel / RetryButton.
 * This script dresses them with the fail cut-art and builds the sad bear,
 * "Remaining" line, and the same tier progress bar as the win sheet.
 * RetryButton keeps the onRetry click (restart the level).
 *
 * TODO: the Remaining line uses the system bold face. This project has no font file.
 */

import {
    _decorator, BlockInputEvents, Color, Component, Label, Node, Sprite,
    tween, Tween, UITransform, Vec3,
} from 'cc';
import { LevelManager } from '../core/LevelManager';
import { SaveManager } from '../core/SaveManager';
import { applySpriteFrame } from './GameArt';
import { findDeep, GAME_UI } from './GamePageLayout';
import { whiteFrame } from './UiKit';

const { ccclass } = _decorator;

const FAIL_TITLE = '0f5451a6-4edf-43b5-8bc8-d696c186f78b@f9941';
const FAIL_BEAR = 'c0f13efe-9634-471b-a487-1693cf15bd86@f9941';
const FAIL_ICON = 'f6d1136f-0be2-4f20-a609-bb2cc3f21d74@f9941';
const FAIL_PLAY = '75d7de35-0afe-44dc-af56-d5392cb08950@f9941';
const BAR_FILL = 'e3957e89-59f0-4d6c-b373-4a906db7d52d@f9941';
const BAR_TRACK = 'e30d8c50-a3a0-4605-8816-58bb75e34dba@f9941';
const BAR_LENS = 'eeecbbb8-fd23-40df-913c-e428e60c7f72@f9941';

/** One free continue. Play on restarts the level and restores lives. */
const FREE_PLAY_ON = 1;

const INK = new Color(255, 255, 255, 255);
const OUTLINE = new Color(72, 28, 42, 255);

export interface GameOverCallbacks {
    onRetry(): void;
}

@ccclass('GameOver')
export class GameOver extends Component {
    private callbacks: GameOverCallbacks | null = null;
    private remainLabel: Label | null = null;
    private countLabel: Label | null = null;
    private fillSprite: Sprite | null = null;
    private fillRange = 0;
    private step = 1;
    private total = 1;
    private bound = false;
    private dressed = false;
    private artMounted = false;

    protected onLoad(): void {
        this.bind();
        this.dress();
        this.place();
        this.scheduleOnce(() => this.mountArt(), 0);
    }

    public setCallbacks(cb: GameOverCallbacks): void {
        this.callbacks = cb;
        this.bind();
    }

    public show(level?: number): void {
        this.bind();
        this.dress();
        const played = Math.max(1, Math.floor(level ?? SaveManager.load().currentLevel) || 1);
        const slot = LevelManager.getTierSlot(played);
        this.step = slot.step;
        this.total = slot.total;
        this.fillRange = slot.progress;
        this.applyTexts();
        this.place();
        this.node.active = true;
        this.node.setScale(1, 1, 1);
        this.scheduleOnce(() => this.mountArt(), 0);
        this.popBear();
    }

    public hide(): void {
        this.node.active = false;
    }

    /** Keeps the overlay on the safe rect after a canvas resize. */
    public relayout(): void {
        if (!this.dressed) this.dress();
        this.place();
    }

    private bind(): void {
        if (this.bound) return;
        this.bound = true;
        this.node.getChildByName('RetryButton')?.on(Node.EventType.TOUCH_END, () => {
            this.callbacks?.onRetry();
        });
    }

    private dress(): void {
        if (this.dressed) return;
        this.dressed = true;

        const dim = this.ensureChild(this.node, 'Dim');
        const dimSprite = dim.getComponent(Sprite) || dim.addComponent(Sprite);
        dimSprite.spriteFrame = whiteFrame();
        dimSprite.type = Sprite.Type.SIMPLE;
        dimSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        dimSprite.color = new Color(36, 12, 28, 176);
        if (!dim.getComponent(BlockInputEvents)) dim.addComponent(BlockInputEvents);

        this.releaseLabel(this.ensureChild(this.node, 'TitleLabel'));
        this.ensureChild(this.node, 'Bear');

        const progress = this.ensureChild(this.node, 'Progress');
        this.ensureChild(progress, 'Track');
        this.ensureChild(progress, 'Fill');
        this.ensureChild(progress, 'Lens');
        this.countLabel = this.ensureText(this.ensureChild(progress, 'Count'));

        const row = this.ensureChild(this.node, 'RemainRow');
        this.remainLabel = this.ensureText(this.ensureChild(row, 'RemainLabel'));
        this.ensureChild(row, 'RemainIcon');

        this.releaseLabel(this.ensureChild(this.node, 'RetryButton'));
        this.applyTexts();
    }

    /** Adds cut-art after any old Label on that node has actually been removed. */
    private mountArt(): void {
        if (this.artMounted || !this.node.activeInHierarchy) return;
        const title = this.node.getChildByName('TitleLabel');
        const retry = this.node.getChildByName('RetryButton');
        if (title?.getComponent(Label) || retry?.getComponent(Label)) {
            this.scheduleOnce(() => this.mountArt(), 0);
            return;
        }
        this.artMounted = true;
        if (title) this.paint(title, FAIL_TITLE);
        const bear = this.node.getChildByName('Bear');
        if (bear) this.paint(bear, FAIL_BEAR);
        const progress = this.node.getChildByName('Progress');
        const track = progress?.getChildByName('Track');
        const fill = progress?.getChildByName('Fill');
        const lens = progress?.getChildByName('Lens');
        if (track) this.paint(track, BAR_TRACK);
        if (fill) {
            this.paint(fill, BAR_FILL, (sprite) => {
                this.fillSprite = sprite;
                sprite.type = Sprite.Type.FILLED;
                sprite.fillType = Sprite.FillType.HORIZONTAL;
                sprite.fillStart = 0;
                sprite.fillRange = this.fillRange;
            });
        }
        if (lens) this.paint(lens, BAR_LENS);
        const icon = this.node.getChildByName('RemainRow')?.getChildByName('RemainIcon');
        if (icon) this.paint(icon, FAIL_ICON);
        if (retry) this.paint(retry, FAIL_PLAY);
    }

    private releaseLabel(node: Node): void {
        const label = node.getComponent(Label);
        if (!label) return;
        label.enabled = false;
        label.destroy();
    }

    private applyTexts(): void {
        if (this.remainLabel) this.remainLabel.string = `Remaining: ${FREE_PLAY_ON}`;
        if (this.countLabel) this.countLabel.string = `${this.step}/${this.total}`;
        if (this.fillSprite && this.fillSprite.isValid) this.fillSprite.fillRange = this.fillRange;
    }

    private place(): void {
        const canvas = this.canvasNode();
        const canvasUt = canvas?.getComponent(UITransform);
        const width = canvasUt?.width ?? GAME_UI.designWidth;
        const height = canvasUt?.height ?? GAME_UI.designHeight;
        const unit = width / GAME_UI.designWidth;
        const safeNode = canvas ? findDeep(canvas, 'SafeArea') : null;
        const safeUt = safeNode?.getComponent(UITransform);
        const sw = safeUt?.width ?? width;
        const sh = safeUt?.height ?? height;
        const ox = safeNode?.position.x ?? 0;
        const oy = safeNode?.position.y ?? 0;

        const rootUt = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        rootUt.setContentSize(width, height);

        const dim = this.node.getChildByName('Dim');
        this.setSize(dim, width + 8, height + 8);
        dim?.setPosition(0, 0, 0);
        const dimSprite = dim?.getComponent(Sprite);
        if (dimSprite) dimSprite.color = new Color(36, 12, 28, 176);

        const titleY = sh * (0.5 - 0.219);
        const remainY = sh * (0.5 - 0.295);
        const bearY = sh * (0.5 - 0.492);
        const barY = sh * (0.5 - 0.705);
        const playY = sh * (0.5 - 0.825);

        const titleW = Math.min(950 * unit, sw - 24 * unit);
        const titleH = titleW * (170 / 950);
        const bearW = Math.min(860 * unit, sw * 0.86);
        const bearH = bearW * (756 / 898);
        const trackW = Math.min(660 * unit, sw - 180 * unit);
        const trackH = trackW * (126 / 648);
        const playW = Math.min(598 * unit, sw - 80 * unit);
        const playH = playW * (175 / 598);

        this.placeArt(this.node.getChildByName('TitleLabel'), ox, oy + titleY, titleW, titleH);
        this.placeArt(this.node.getChildByName('Bear'), ox, oy + bearY, bearW, bearH);
        this.placeArt(this.node.getChildByName('RetryButton'), ox, oy + playY, playW, playH);

        const progress = this.node.getChildByName('Progress');
        if (progress) progress.setPosition(ox, oy + barY, 0);
        const track = progress?.getChildByName('Track') || null;
        this.placeArt(track, 0, 0, trackW, trackH);

        const inset = trackW * 0.055;
        const fillW = trackW - inset * 2;
        const fillH = trackH * 0.62;
        const fill = progress?.getChildByName('Fill') || null;
        const fillUt = fill?.getComponent(UITransform) || fill?.addComponent(UITransform);
        if (fillUt) {
            fillUt.setAnchorPoint(0, 0.5);
            fillUt.setContentSize(fillW, fillH);
        }
        fill?.setPosition(-trackW / 2 + inset, 0, 0);

        const lensH = trackH * 0.92;
        const lensW = lensH * (86 / 103);
        const lens = progress?.getChildByName('Lens') || null;
        this.placeArt(lens, trackW / 2 - lensW * 0.28, trackH * 0.02, lensW, lensH);

        const count = progress?.getChildByName('Count') || null;
        this.setSize(count, trackW, trackH);
        count?.setPosition(0, 0, 0);
        const barFont = Math.max(22, Math.round(34 * unit));
        this.styleText(this.countLabel, barFont);

        this.placeRemain(ox, oy + remainY, unit);
        this.styleText(this.remainLabel, Math.max(22, Math.round(40 * unit)));

        const order = ['Dim', 'Bear', 'TitleLabel', 'Progress', 'RemainRow', 'RetryButton'];
        order.forEach((name, index) => {
            this.node.getChildByName(name)?.setSiblingIndex(index);
        });
        const inner = ['Track', 'Fill', 'Count', 'Lens'];
        inner.forEach((name, index) => {
            progress?.getChildByName(name)?.setSiblingIndex(index);
        });
    }

    private placeRemain(x: number, y: number, unit: number): void {
        const row = this.node.getChildByName('RemainRow');
        if (!row) return;
        row.setPosition(x, y, 0);
        const font = Math.max(22, Math.round(40 * unit));
        const text = this.remainLabel?.string || `Remaining: ${FREE_PLAY_ON}`;
        const textW = font * 0.56 * text.length;
        const iconH = font * 1.2;
        const iconW = iconH * (65 / 61);
        const gap = 10 * unit;
        const total = textW + gap + iconW;

        const labelNode = row.getChildByName('RemainLabel');
        const labelUt = labelNode?.getComponent(UITransform) || labelNode?.addComponent(UITransform);
        if (labelUt) {
            labelUt.setAnchorPoint(0, 0.5);
            labelUt.setContentSize(textW, font * 1.4);
        }
        labelNode?.setPosition(-total / 2, 0, 0);
        if (this.remainLabel) this.remainLabel.horizontalAlign = Label.HorizontalAlign.LEFT;

        const icon = row.getChildByName('RemainIcon');
        const iconUt = icon?.getComponent(UITransform) || icon?.addComponent(UITransform);
        if (iconUt) {
            iconUt.setAnchorPoint(0, 0.5);
            iconUt.setContentSize(iconW, iconH);
        }
        icon?.setPosition(-total / 2 + textW + gap, font * 0.02, 0);
    }

    private popBear(): void {
        const bear = this.node.getChildByName('Bear');
        if (!bear) return;
        Tween.stopAllByTarget(bear);
        bear.setScale(0.86, 0.86, 1);
        tween(bear)
            .to(0.22, { scale: new Vec3(1.05, 1.05, 1) })
            .to(0.12, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private canvasNode(): Node | null {
        let n: Node | null = this.node;
        while (n) {
            if (n.name === 'Canvas') return n;
            n = n.parent;
        }
        return this.node.parent;
    }

    private ensureChild(parent: Node, name: string): Node {
        let node = parent.getChildByName(name);
        if (!node) {
            node = new Node(name);
            node.layer = this.node.layer;
            node.setParent(parent);
        }
        node.layer = this.node.layer;
        node.active = true;
        return node;
    }

    private ensureText(node: Node): Label {
        const label = node.getComponent(Label) || node.addComponent(Label);
        label.enabled = true;
        label.useSystemFont = true;
        label.fontFamily = 'Arial';
        label.isBold = true;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        label.cacheMode = Label.CacheMode.NONE;
        return label;
    }

    private styleText(label: Label | null, fontSize: number): void {
        if (!label) return;
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.15);
        label.color = INK;
        label.enableOutline = true;
        label.outlineWidth = Math.max(2, Math.round(fontSize * 0.08));
        label.outlineColor = OUTLINE;
    }

    private paint(node: Node, frame: string, onReady?: (sprite: Sprite) => void): void {
        const sprite = node.getComponent(Sprite) || node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.color = Color.WHITE;
        applySpriteFrame(sprite, frame, () => {
            if (!sprite.isValid) return;
            sprite.enabled = false;
            sprite.enabled = true;
            onReady?.(sprite);
        });
    }

    private placeArt(node: Node | null, x: number, y: number, width: number, height: number): void {
        if (!node) return;
        this.setSize(node, width, height);
        node.setPosition(x, y, 0);
    }

    private setSize(node: Node | null, width: number, height: number): void {
        if (!node) return;
        const ut = node.getComponent(UITransform) || node.addComponent(UITransform);
        ut.setContentSize(width, height);
    }
}
