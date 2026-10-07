/**
 * One achievement card. Built once and filled from AchievementData.
 * The cut art already includes the candy frame, photo, and banner title.
 */

import {
    _decorator,
    Color,
    Component,
    ImageAsset,
    Label,
    Node,
    ProgressBar,
    Rect,
    Size,
    Sprite,
    SpriteFrame,
    Texture2D,
    UITransform,
} from 'cc';
import { AchievementData } from '../data/AchievementData';
import { loadSpriteFrame } from './GameArt';
import { addLabel, applySprite, outline, Palette, uiNode } from './UiKit';

const { ccclass } = _decorator;

const LOCK_FRAME = 'f7d9f0c6-372c-4774-b3a9-f5e767c58464@f9941';
const FILL = new Color(82, 212, 42, 255);
const TRACK = new Color(36, 122, 18, 255);

let capsule: SpriteFrame | null = null;

function capsuleFrame(): SpriteFrame {
    if (capsule && capsule.isValid) return capsule;
    const width = 64;
    const height = 36;
    const radius = 16;
    const pixels = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dx = x < radius ? radius - x - 0.5 : x >= width - radius ? x - (width - radius) + 0.5 : 0;
            const dy = y - height / 2 + 0.5;
            const dist = Math.hypot(dx, dy);
            const edge = dx === 0 ? radius - Math.abs(dy) : radius - dist;
            const alpha = edge >= 1 ? 255 : edge <= 0 ? 0 : Math.round(edge * 255);
            const index = (y * width + x) * 4;
            pixels[index] = 255;
            pixels[index + 1] = 255;
            pixels[index + 2] = 255;
            pixels[index + 3] = alpha;
        }
    }
    const image = new ImageAsset();
    image.reset({
        _data: pixels,
        width,
        height,
        format: Texture2D.PixelFormat.RGBA8888,
        _compressed: false,
    });
    const texture = new Texture2D();
    texture.image = image;
    const frame = new SpriteFrame();
    frame.texture = texture;
    frame.packable = false;
    frame.rect = new Rect(0, 0, width, height);
    frame.originalSize = new Size(width, height);
    frame.insetLeft = radius;
    frame.insetRight = radius;
    frame.insetTop = radius;
    frame.insetBottom = radius;
    capsule = frame;
    return frame;
}

function sliced(sprite: Sprite, color: Color): void {
    sprite.spriteFrame = capsuleFrame();
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.type = Sprite.Type.SLICED;
    sprite.color = color;
}

@ccclass('AchievementCard')
export class AchievementCard extends Component {
    private data: AchievementData | null = null;
    private built = false;
    private imageToken = 0;
    private cardWidth = 884;
    private cardHeight = 839;
    private cardImage: Sprite | null = null;
    private titleLabel: Label | null = null;
    private lockOverlay: Node | null = null;
    private progressRoot: Node | null = null;
    private progressBar: ProgressBar | null = null;
    private completedText: Label | null = null;

    public setData(data: AchievementData): void {
        this.data = data;
        this.ensure();
        this.apply();
        this.setTierProgress(data.progress, `${data.completed} / ${data.total}`);
    }

    /** Fill length and the count use the same LevelManager result. */
    public setTierProgress(progress: number, completedText: string): void {
        this.ensure();
        const value = Math.max(0, Math.min(1, progress));
        const fill = this.progressBar?.barSprite?.node ?? null;
        if (fill) fill.active = value > 0;
        if (this.progressBar) {
            if (this.progressBar.progress === value) {
                this.progressBar.progress = value === 0 ? 1 : 0;
            }
            this.progressBar.progress = value;
        }
        if (this.completedText) this.completedText.string = completedText;
    }

    public setCardSize(width: number, height: number): void {
        this.cardWidth = width;
        this.cardHeight = height;
        this.ensure();
        this.layout();
        if (this.data) this.setTierProgress(this.data.progress, `${this.data.completed} / ${this.data.total}`);
    }

    private ensure(): void {
        if (this.built) return;
        this.built = true;
        const root = this.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        root.setContentSize(this.cardWidth, this.cardHeight);
        root.setAnchorPoint(0.5, 0.5);

        const background = uiNode('CardBackground', this.cardWidth, this.cardHeight);
        background.setParent(this.node);
        this.cardImage = background.addComponent(Sprite);
        this.cardImage.sizeMode = Sprite.SizeMode.CUSTOM;
        this.cardImage.type = Sprite.Type.SIMPLE;

        this.titleLabel = addLabel(this.node, 'AchievementTitle', '', 42, Palette.white, 620, 88);
        outline(this.titleLabel, new Color(90, 20, 30, 255), 4);
        this.titleLabel.node.active = false;

        this.lockOverlay = uiNode('LockOverlay', 294, 362);
        this.lockOverlay.setParent(this.node);
        const icon = uiNode('LockIcon', 294, 362);
        icon.setParent(this.lockOverlay);
        const lock = icon.addComponent(Sprite);
        lock.sizeMode = Sprite.SizeMode.CUSTOM;
        lock.type = Sprite.Type.SIMPLE;
        applySprite(lock, LOCK_FRAME);

        this.progressRoot = uiNode('ProgressBar', 372, 46);
        this.progressRoot.setParent(this.node);
        const track = uiNode('Background', 372, 46);
        track.setParent(this.progressRoot);
        sliced(track.addComponent(Sprite), TRACK);

        const fill = uiNode('Fill', 372, 36);
        fill.setParent(this.progressRoot);
        const fillTransform = fill.getComponent(UITransform)!;
        fillTransform.setAnchorPoint(0, 0.5);
        const fillSprite = fill.addComponent(Sprite);
        sliced(fillSprite, FILL);
        fillSprite.type = Sprite.Type.SIMPLE;
        this.progressBar = this.progressRoot.addComponent(ProgressBar);
        this.progressBar.mode = ProgressBar.Mode.HORIZONTAL;
        this.progressBar.barSprite = fillSprite;
        this.progressBar.progress = 0;
        fill.active = false;

        this.completedText = addLabel(this.progressRoot, 'CompletedText', '', 22, Color.WHITE, 372, 46);
        outline(this.completedText, new Color(20, 70, 16, 255), 2);
        this.layout();
    }

    private layout(): void {
        const width = this.cardWidth;
        const height = this.cardHeight;
        this.node.getComponent(UITransform)?.setContentSize(width, height);
        const background = this.node.getChildByName('CardBackground');
        background?.getComponent(UITransform)?.setContentSize(width, height);
        background?.setPosition(0, 0, 0);

        const title = this.titleLabel?.node;
        title?.getComponent(UITransform)?.setContentSize(width * 0.7, 88 * (height / 839));
        title?.setPosition(0, height / 2 - 78 * (height / 839), 0);

        const lockW = 294 * (width / 884);
        const lockH = 362 * (height / 839);
        if (this.lockOverlay) {
            this.lockOverlay.getComponent(UITransform)?.setContentSize(lockW, lockH);
            this.lockOverlay.setPosition(0, 14 * (height / 839), 0);
            const icon = this.lockOverlay.getChildByName('LockIcon');
            icon?.getComponent(UITransform)?.setContentSize(lockW, lockH);
            icon?.setPosition(0, 0, 0);
        }

        const barW = 372 * (width / 884);
        const barH = 46 * (height / 839);
        if (!this.progressRoot || !this.progressBar) return;
        this.progressRoot.getComponent(UITransform)?.setContentSize(barW, barH);
        this.progressRoot.setPosition(0, -height * 0.325, 0);
        const track = this.progressRoot.getChildByName('Background');
        track?.getComponent(UITransform)?.setContentSize(barW, barH);
        track?.setPosition(0, 0, 0);
        const fill = this.progressBar.barSprite?.node;
        const innerW = Math.max(16, barW - 8);
        const innerH = Math.max(12, barH - 10);
        if (fill) {
            const fillTransform = fill.getComponent(UITransform)!;
            fillTransform.setAnchorPoint(0, 0.5);
            fillTransform.setContentSize(innerW, innerH);
            fill.setPosition(-innerW / 2, 0, 0);
            const fillSprite = fill.getComponent(Sprite);
            if (fillSprite) fillSprite.type = Sprite.Type.SIMPLE;
        }
        this.progressBar.totalLength = innerW;
        const count = this.completedText?.node;
        count?.getComponent(UITransform)?.setContentSize(barW, barH);
        count?.setPosition(0, 0, 0);
        if (this.completedText) {
            const font = Math.max(16, Math.round(barH * 0.55));
            this.completedText.fontSize = font;
            this.completedText.lineHeight = font + 2;
        }
    }

    private apply(): void {
        if (!this.data) return;
        this.layout();
        if (this.titleLabel) this.titleLabel.string = this.data.title;
        if (this.lockOverlay) this.lockOverlay.active = !this.data.unlocked;
        if (this.progressRoot) this.progressRoot.active = this.data.unlocked;
        this.setTierProgress(this.data.progress, `${this.data.completed} / ${this.data.total}`);
        this.loadImage(this.data.image);
    }

    private loadImage(uuid: string): void {
        const token = ++this.imageToken;
        if (this.titleLabel) this.titleLabel.node.active = false;
        loadSpriteFrame(uuid, (frame) => {
            if (token !== this.imageToken || !this.cardImage?.isValid) return;
            if (!frame) {
                if (this.titleLabel) this.titleLabel.node.active = true;
                return;
            }
            this.cardImage.spriteFrame = frame;
            this.cardImage.sizeMode = Sprite.SizeMode.CUSTOM;
            this.cardImage.type = Sprite.Type.SIMPLE;
            if (this.titleLabel) this.titleLabel.node.active = false;
        });
    }
}
