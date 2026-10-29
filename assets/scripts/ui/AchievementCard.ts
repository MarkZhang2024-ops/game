/**
 * One achievement card. Scene art already has the candy frame and title.
 * Unlocked cards overlay the green progress bar and digit sprites from the UI cut.
 */

import {
    _decorator,
    Color,
    Component,
    Label,
    Node,
    Sprite,
    UITransform,
} from 'cc';
import { AchievementData } from '../data/AchievementData';
import { loadSpriteFrame } from './GameArt';
import { addLabel, applySprite, outline, Palette, uiNode } from './UiKit';

const { ccclass } = _decorator;

const BAR_TRACK = '94d26181-82c3-46a0-a6f9-0b93d084eff8@f9941';
const BAR_FILL = 'b3362787-0dd8-48d4-a59f-fbca5f45f883@f9941';
const SLASH = '8a5b4098-0ac5-45f9-8b98-dc9314ff13e7@f9941';
const DIGITS = [
    '5746ac14-0a3d-4354-a935-d01d56775fb6@f9941',
    'fdf4162f-262a-4e35-a017-580804e55a2a@f9941',
    'f223c56f-5098-4d3d-bf7e-8916b0c7cc4f@f9941',
    '4574237d-63d6-424d-9238-70ee94d76aba@f9941',
    '51be6e03-338c-47d3-b7fa-0321ecaa0b7e@f9941',
    '927e46bd-9826-44de-95bd-484fbe6f4b31@f9941',
    'f82a09e7-3316-42ab-a09b-8ae1528b278d@f9941',
    '8b22c776-8bdc-4ee4-bf89-b0310a5dd3a7@f9941',
    '787c2ec5-9163-47e5-8769-0c7da4fe14f8@f9941',
    'f854d00e-af1f-497d-a5d6-e52baa12c373@f9941',
];
const DIGIT_SIZE = [
    [28, 40], [26, 38], [28, 39], [27, 40], [30, 38],
    [27, 39], [28, 40], [28, 38], [28, 40], [29, 40],
];
const SLASH_SIZE = [15, 39];

@ccclass('AchievementCard')
export class AchievementCard extends Component {
    private data: AchievementData | null = null;
    private built = false;
    private imageToken = 0;
    private cardWidth = 884;
    private cardHeight = 839;
    private cardImage: Sprite | null = null;
    private titleLabel: Label | null = null;
    private progressRoot: Node | null = null;
    private fillSprite: Sprite | null = null;
    private countRoot: Node | null = null;

    public setData(data: AchievementData): void {
        this.data = data;
        this.ensure();
        this.apply();
    }

    /** Fill length and the count use the same LevelManager result. */
    public setTierProgress(progress: number, _completedText?: string): void {
        this.ensure();
        const value = Math.max(0, Math.min(1, progress));
        if (this.fillSprite) {
            this.fillSprite.type = Sprite.Type.FILLED;
            this.fillSprite.fillType = Sprite.FillType.HORIZONTAL;
            this.fillSprite.fillStart = 0;
            this.fillSprite.fillRange = value;
            this.fillSprite.node.active = value > 0;
        }
        if (this.data) this.paintCount(this.data.completed, this.data.total);
    }

    public setCardSize(width: number, height: number): void {
        this.cardWidth = width;
        this.cardHeight = height;
        this.ensure();
        this.layout();
        if (this.data) this.setTierProgress(this.data.progress);
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

        this.progressRoot = uiNode('ProgressBar', 372, 70);
        this.progressRoot.setParent(this.node);
        const track = uiNode('Track', 372, 70);
        track.setParent(this.progressRoot);
        const trackSprite = track.addComponent(Sprite);
        trackSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        applySprite(trackSprite, BAR_TRACK);

        const fill = uiNode('Fill', 328, 54);
        fill.setParent(this.progressRoot);
        this.fillSprite = fill.addComponent(Sprite);
        this.fillSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.fillSprite.type = Sprite.Type.FILLED;
        this.fillSprite.fillType = Sprite.FillType.HORIZONTAL;
        this.fillSprite.fillStart = 0;
        this.fillSprite.fillRange = 0;
        loadSpriteFrame(BAR_FILL, (frame) => {
            if (!this.fillSprite?.isValid || !frame) return;
            this.fillSprite.spriteFrame = frame;
            this.fillSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            this.fillSprite.type = Sprite.Type.FILLED;
            this.fillSprite.fillType = Sprite.FillType.HORIZONTAL;
            this.fillSprite.fillStart = 0;
            this.fillSprite.fillRange = this.data ? Math.max(0, Math.min(1, this.data.progress)) : 0;
        });

        this.countRoot = uiNode('Count', 200, 40);
        this.countRoot.setParent(this.progressRoot);
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

        const barW = 372 * (width / 884);
        const barH = 70 * (height / 839);
        if (!this.progressRoot) return;
        this.progressRoot.getComponent(UITransform)?.setContentSize(barW, barH);
        this.progressRoot.setPosition(0, -height * 0.325, 0);
        const track = this.progressRoot.getChildByName('Track');
        track?.getComponent(UITransform)?.setContentSize(barW, barH);
        track?.setPosition(0, 0, 0);
        const fill = this.fillSprite?.node;
        const innerW = barW * (374 / 425);
        const innerH = barH * (70 / 120);
        fill?.getComponent(UITransform)?.setContentSize(innerW, innerH);
        fill?.setPosition(0, 0, 0);
        this.countRoot?.setPosition(0, 0, 0);
        if (this.data) this.paintCount(this.data.completed, this.data.total);
    }

    private apply(): void {
        if (!this.data) return;
        this.layout();
        if (this.titleLabel) this.titleLabel.string = this.data.title;
        if (this.progressRoot) this.progressRoot.active = this.data.unlocked;
        this.setTierProgress(this.data.progress);
        this.loadImage(this.data.image);
    }

    private paintCount(completed: number, total: number): void {
        if (!this.countRoot) return;
        const host = this.countRoot;
        host.removeAllChildren();
        const digitH = Math.max(16, Math.round(this.cardHeight / 839 * 32));
        const pieces = `${Math.max(0, Math.floor(completed))}/${Math.max(0, Math.floor(total))}`;
        const gap = Math.max(1, Math.round(digitH * 0.08));
        const slashGap = Math.max(4, Math.round(digitH * 0.18));
        const nodes: { node: Node; width: number; after: number }[] = [];
        let totalW = 0;
        for (let i = 0; i < pieces.length; i++) {
            const ch = pieces[i];
            const slash = ch === '/';
            const index = ch.charCodeAt(0) - 48;
            if (!slash && (index < 0 || index > 9)) continue;
            const [sourceW, sourceH] = slash ? SLASH_SIZE : DIGIT_SIZE[index];
            const width = digitH * (sourceW / sourceH);
            const node = uiNode(slash ? 'Slash' : `Digit${ch}`, width, digitH);
            node.setParent(host);
            const sprite = node.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            applySprite(sprite, slash ? SLASH : DIGITS[index]);
            const after = slash || pieces[i + 1] === '/' ? slashGap : gap;
            nodes.push({ node, width, after });
            totalW += width;
        }
        if (nodes.length > 1) {
            for (let i = 0; i < nodes.length - 1; i++) totalW += nodes[i].after;
        }
        const transform = host.getComponent(UITransform) ?? host.addComponent(UITransform);
        transform.setContentSize(Math.max(digitH, totalW), digitH);
        transform.setAnchorPoint(0.5, 0.5);
        let cursor = -totalW / 2;
        nodes.forEach((piece) => {
            piece.node.setPosition(cursor + piece.width / 2, 0, 0);
            cursor += piece.width + piece.after;
        });
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
