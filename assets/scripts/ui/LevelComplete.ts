/**
 * Cluedoku! - Level complete overlay.
 *
 * The scene still owns LevelComplete / TitleLabel / ScoreLabel / TimeLabel / NextButton.
 * This script dresses those nodes with the win cut-art and builds the bear,
 * streak line, and the tier progress bar beside them. NextButton keeps the onNextLevel click.
 *
 * TODO: streak and the bar label use the system bold face. This project has no font file.
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

const WIN_WELL_DONE = 'd2cb181f-6279-449f-a17e-86d6a7e6d113@f9941';
const WIN_BEAR = '8acc1a39-7472-45e1-a148-88a68b94d49c@f9941';
const WIN_BAR_FILL = 'e3957e89-59f0-4d6c-b373-4a906db7d52d@f9941';
const WIN_BAR_TRACK = 'e30d8c50-a3a0-4605-8816-58bb75e34dba@f9941';
const WIN_BAR_LENS = 'eeecbbb8-fd23-40df-913c-e428e60c7f72@f9941';
const WIN_NEXT = '9745157f-0e4d-440e-bd14-60289ffec2de@f9941';

const INK = new Color(255, 255, 255, 255);
const OUTLINE = new Color(72, 28, 42, 255);

export interface LevelCompleteCallbacks {
    onNextLevel(): void;
}

@ccclass('LevelComplete')
export class LevelComplete extends Component {
    private callbacks: LevelCompleteCallbacks | null = null;
    private streakLabel: Label | null = null;
    private countLabel: Label | null = null;
    private fillSprite: Sprite | null = null;
    private fillRange = 0;
    private streak = 0;
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

    public setCallbacks(cb: LevelCompleteCallbacks): void {
        this.callbacks = cb;
        this.bind();
    }

    /** score and elapsed stay in the signature so GameManager's call does not change. */
    public show(score: number, elapsedSeconds: number, level?: number): void {
        void score;
        void elapsedSeconds;
        this.bind();
        this.dress();
        const save = SaveManager.load();
        this.streak = save.winStreak || 0;
        const played = Math.max(1, Math.floor(level ?? save.currentLevel) || 1);
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
        this.streakLabel = this.findLabel('ScoreLabel');
        if (this.bound) return;
        this.bound = true;
        this.node.getChildByName('NextButton')?.on(Node.EventType.TOUCH_END, () => {
            this.callbacks?.onNextLevel();
        });
    }

    private findLabel(name: string): Label | null {
        const n = this.node.getChildByName(name);
        return n?.getComponent(Label) || null;
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

        const count = this.ensureChild(progress, 'Count');
        this.countLabel = this.ensureText(count);

        const streakNode = this.ensureChild(this.node, 'ScoreLabel');
        this.streakLabel = this.ensureText(streakNode);

        const time = this.node.getChildByName('TimeLabel');
        if (time) time.active = false;

        this.releaseLabel(this.ensureChild(this.node, 'NextButton'));
        this.applyTexts();
    }

    /** Adds cut-art after any old Label on that node has actually been removed. */
    private mountArt(): void {
        if (this.artMounted || !this.node.activeInHierarchy) return;
        const title = this.node.getChildByName('TitleLabel');
        const next = this.node.getChildByName('NextButton');
        if (title?.getComponent(Label) || next?.getComponent(Label)) {
            this.scheduleOnce(() => this.mountArt(), 0);
            return;
        }
        this.artMounted = true;
        if (title) this.paint(title, WIN_WELL_DONE);
        const bear = this.node.getChildByName('Bear');
        if (bear) this.paint(bear, WIN_BEAR);
        const progress = this.node.getChildByName('Progress');
        const track = progress?.getChildByName('Track');
        const fill = progress?.getChildByName('Fill');
        const lens = progress?.getChildByName('Lens');
        if (track) this.paint(track, WIN_BAR_TRACK);
        if (fill) {
            this.paint(fill, WIN_BAR_FILL, (sprite) => {
                this.fillSprite = sprite;
                sprite.type = Sprite.Type.FILLED;
                sprite.fillType = Sprite.FillType.HORIZONTAL;
                sprite.fillStart = 0;
                sprite.fillRange = this.fillRange;
            });
        }
        if (lens) this.paint(lens, WIN_BAR_LENS);
        if (next) this.paint(next, WIN_NEXT);
    }

    private releaseLabel(node: Node): void {
        const label = node.getComponent(Label);
        if (!label) return;
        label.enabled = false;
        label.destroy();
    }

    private applyTexts(): void {
        if (this.streakLabel) this.streakLabel.string = `Current Streak: ${this.streak}`;
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

        // Vertical spots are measured on the win comp (fractions down the safe rect).
        const wellY = sh * (0.5 - 0.219);
        const streakY = sh * (0.5 - 0.295);
        const bearY = sh * (0.5 - 0.492);
        const barY = sh * (0.5 - 0.705);
        const nextY = sh * (0.5 - 0.825);

        const wellW = Math.min(848 * unit, sw - 40 * unit);
        const wellH = wellW * (164 / 848);
        const bearW = Math.min(560 * unit, sw * 0.56);
        const bearH = bearW * (761 / 582);
        const trackW = Math.min(660 * unit, sw - 180 * unit);
        const trackH = trackW * (126 / 648);
        const nextW = Math.min(598 * unit, sw - 80 * unit);
        const nextH = nextW * (175 / 598);

        this.placeArt(this.node.getChildByName('TitleLabel'), ox, oy + wellY, wellW, wellH);
        this.placeArt(this.node.getChildByName('Bear'), ox, oy + bearY, bearW, bearH);
        this.placeArt(this.node.getChildByName('NextButton'), ox, oy + nextY, nextW, nextH);

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
        this.styleText(this.countLabel, Math.max(22, Math.round(34 * unit)));

        const streakNode = this.node.getChildByName('ScoreLabel');
        this.setSize(streakNode, Math.min(720 * unit, sw - 40 * unit), 64 * unit);
        streakNode?.setPosition(ox, oy + streakY, 0);
        this.styleText(this.streakLabel, Math.max(22, Math.round(40 * unit)));

        const order = ['Dim', 'Bear', 'TitleLabel', 'Progress', 'ScoreLabel', 'NextButton'];
        order.forEach((name, index) => {
            this.node.getChildByName(name)?.setSiblingIndex(index);
        });
        const inner = ['Track', 'Fill', 'Count', 'Lens'];
        inner.forEach((name, index) => {
            progress?.getChildByName(name)?.setSiblingIndex(index);
        });
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
