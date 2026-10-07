/**
 * Cluedoku! - Cell (Cocos Creator 3.8.4).
 * UI + input only. Rules live in PuzzleSolver.
 * X / Suspect are visual marks; row/col and hit area stay unchanged.
 */

import {
    _decorator,
    Component,
    Graphics,
    UITransform,
    Color,
    tween,
    Tween,
    Vec3,
    Node,
    Prefab,
    EventTouch,
    Sprite,
} from 'cc';
import { CellColor, CELL_COLOR_HEX } from '../puzzle/PuzzleTypes';
import { COLORS, LAYOUT, DEBUG_CLICK, CellMarkState, SuspectType } from '../utils/Constants';
import { applySpriteFrame, MARK_X_FRAME, SUSPECT_FRAME, tileFrameFor } from '../ui/GameArt';

const { ccclass } = _decorator;

export type CellClickHandler = (row: number, col: number) => void;

@ccclass('Cell')
export class Cell extends Component {
    private row = 0;
    private col = 0;
    private cellSize = 0;
    private cellColor: CellColor = CellColor.Yellow;
    private regionColor: Color = new Color('#FFFFFF');
    private hasSuspect = false;
    private locked = false;
    private markState: CellMarkState = CellMarkState.NONE;
    private suspectType: SuspectType = SuspectType.NONE;
    private graphics: Graphics | null = null;
    private colorGraphics: Graphics | null = null;
    private colorSprite: Sprite | null = null;
    private xSprite: Sprite | null = null;
    private suspectSprite: Sprite | null = null;
    private dirty = false;
    private clickHandler: CellClickHandler | null = null;
    private suspectPrefab: Prefab | null = null;
    private suspectAnchor: Node | null = null;
    private suspectNode: Node | null = null;
    private xMarkNode: Node | null = null;
    private suspectMarkNode: Node | null = null;
    private suspectMarkGraphics: Graphics | null = null;
    private restPosition = new Vec3();
    private hintMarkNode: Node | null = null;

    public init(row: number, col: number): void {
        this.row = row;
        this.col = col;
    }

    public getRow(): number { return this.row; }
    public getCol(): number { return this.col; }
    public getCellIndex(cols: number): number { return this.row * cols + this.col; }

    protected onLoad(): void {
        this.bindPrefabChildren();
        this.graphics = this.colorGraphics
            || this.getComponent(Graphics)
            || this.addComponent(Graphics);
    }

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    protected onDisable(): void {
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    public setup(
        row: number,
        col: number,
        size: number,
        color: CellColor,
        onClick: CellClickHandler,
        suspectPrefab: Prefab | null
    ): void {
        this.row = row;
        this.col = col;
        this.cellSize = size;
        this.cellColor = color;
        this.clickHandler = onClick;
        this.suspectPrefab = suspectPrefab;
        this.regionColor = new Color(CELL_COLOR_HEX[color] || '#FFFFFF');
        const t = this.getComponent(UITransform) || this.addComponent(UITransform);
        t.setAnchorPoint(0.5, 0.5);
        t.setContentSize(size, size);
        this.node.setScale(1, 1, 1);
        this.bindPrefabChildren();
        this.graphics = this.colorGraphics
            || this.getComponent(Graphics)
            || this.addComponent(Graphics);
        this.ensureMarkNodes();
        this.applyTileArt();
        this.markDirty();
        this.refreshMarkUI();
    }

    private applyTileArt(): void {
        const sprite = this.colorSprite;
        if (!sprite || this.cellSize <= 0) return;
        const inset = LAYOUT.cellGap;
        const visual = Math.max(8, this.cellSize - inset * 2);
        const ut = sprite.node.getComponent(UITransform);
        ut?.setContentSize(visual, visual);
        applySpriteFrame(sprite, tileFrameFor(this.cellColor), () => {
            if (this.graphics) {
                this.graphics.clear();
                this.graphics.enabled = false;
            }
            if (this.colorGraphics) {
                this.colorGraphics.clear();
                this.colorGraphics.enabled = false;
            }
        });
    }

    private bindPrefabChildren(): void {
        const bg = this.node.getChildByName('Background');
        const colorNode = this.node.getChildByName('ColorSprite');
        this.xMarkNode = this.node.getChildByName('XMark');
        this.suspectMarkNode = this.node.getChildByName('SuspectMark');
        this.suspectAnchor = this.node.getChildByName('Character') || this.node.getChildByName('SuspectAnchor');
        if (colorNode) {
            const ut = colorNode.getComponent(UITransform) || colorNode.addComponent(UITransform);
            ut.setAnchorPoint(0.5, 0.5);
            this.colorGraphics = colorNode.getComponent(Graphics);
            this.colorSprite = colorNode.getComponent(Sprite) || colorNode.addComponent(Sprite);
            this.colorSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            this.colorSprite.type = Sprite.Type.SIMPLE;
        }
        if (bg) {
            const ut = bg.getComponent(UITransform) || bg.addComponent(UITransform);
            ut.setAnchorPoint(0.5, 0.5);
            ut.setContentSize(this.cellSize, this.cellSize);
        }
        if (colorNode) {
            colorNode.getComponent(UITransform)!.setContentSize(Math.max(8, this.cellSize - LAYOUT.cellGap * 2), Math.max(8, this.cellSize - LAYOUT.cellGap * 2));
        }
    }

    public getCellColor(): CellColor { return this.cellColor; }

    public setLocked(locked: boolean): void {
        this.locked = locked;
    }

    public isLocked(): boolean {
        return this.locked;
    }

    public getMarkState(): CellMarkState {
        return this.markState;
    }

    public getSuspectType(): SuspectType {
        return this.suspectType;
    }

    public setMarkState(
        state: CellMarkState,
        suspectType: SuspectType = SuspectType.NONE,
        animate = false
    ): void {
        if (this.suspectType === SuspectType.SYSTEM && state !== CellMarkState.SUSPECT) {
            return;
        }
        this.markState = state;
        if (state === CellMarkState.SUSPECT) {
            this.suspectType = suspectType === SuspectType.NONE ? SuspectType.PLAYER : suspectType;
            this.hasSuspect = true;
            this.locked = this.suspectType === SuspectType.SYSTEM;
        } else {
            this.suspectType = SuspectType.NONE;
            this.hasSuspect = false;
            this.locked = false;
        }
        this.refreshMarkUI();
        if (animate && state === CellMarkState.SUSPECT) {
            this.playPlaceAnim();
        }
    }

    public showSuspect(animate: boolean): void {
        this.setMarkState(CellMarkState.SUSPECT, SuspectType.PLAYER, animate);
    }

    public hideSuspect(): void {
        this.setMarkState(CellMarkState.NONE, SuspectType.NONE);
    }

    public playShake(): void {
        const p = this.node.position.clone();
        this.restPosition.set(p);
        Tween.stopAllByTarget(this.node);
        tween(this.node)
            .to(0.04, { position: new Vec3(p.x - 5, p.y, p.z) })
            .to(0.04, { position: new Vec3(p.x + 5, p.y, p.z) })
            .to(0.04, { position: new Vec3(p.x - 3, p.y, p.z) })
            .to(0.04, { position: new Vec3(p.x + 3, p.y, p.z) })
            .to(0.04, { position: p })
            .start();
    }

    public isHintShown(): boolean {
        return this.hintMarkNode?.active === true;
    }

    /** Ring used only while the rule popup is open. Hiding it leaves the X or suspect. */
    public setHintHighlight(on: boolean): void {
        if (!on) {
            if (this.hintMarkNode) this.hintMarkNode.active = false;
            return;
        }
        this.playHint();
    }

    /** Leaves a ring on this cell until setHintHighlight(false) or the board is rebuilt. */
    public playHint(): void {
        let mark = this.node.getChildByName('HintMark');
        if (!mark) {
            mark = new Node('HintMark');
            mark.layer = this.node.layer;
            const created = mark.addComponent(UITransform);
            created.setAnchorPoint(0.5, 0.5);
            mark.addComponent(Graphics);
            this.node.addChild(mark);
        }
        mark.layer = this.node.layer;
        mark.active = true;
        this.hintMarkNode = mark;

        const ut = mark.getComponent(UITransform)!;
        const size = Math.max(8, this.cellSize);
        ut.setContentSize(size, size);
        const g = mark.getComponent(Graphics)!;
        g.clear();
        g.enabled = true;
        const outer = Math.max(6, size * 0.09);
        g.lineWidth = outer;
        g.strokeColor = new Color(255, 255, 255, 255);
        const pad = size * 0.06;
        const radius = size * 0.2;
        g.roundRect(-size / 2 + pad, -size / 2 + pad, size - pad * 2, size - pad * 2, radius);
        g.stroke();
        g.lineWidth = Math.max(3, size * 0.045);
        g.strokeColor = new Color(255, 196, 32, 255);
        const pad2 = size * 0.14;
        g.roundRect(-size / 2 + pad2, -size / 2 + pad2, size - pad2 * 2, size - pad2 * 2, radius * 0.75);
        g.stroke();
        this.raiseHintMark();
    }

    private raiseHintMark(): void {
        if (!this.hintMarkNode?.active) return;
        this.hintMarkNode.setSiblingIndex(this.node.children.length - 1);
    }

    private onTouchEnd(event: EventTouch): void {
        if (DEBUG_CLICK) {
            const loc = event.getUILocation();
            let localX = 0;
            let localY = 0;
            const boardNode = this.node.parent;
            const boardUT = boardNode?.getComponent(UITransform);
            if (boardUT) {
                const local = boardUT.convertToNodeSpaceAR(new Vec3(loc.x, loc.y, 0));
                localX = local.x;
                localY = local.y;
            }
            console.log(
                `[Board Click] screen=(${loc.x.toFixed(1)},${loc.y.toFixed(1)}) ` +
                `local=(${localX.toFixed(1)},${localY.toFixed(1)}) ` +
                `row=${this.row} col=${this.col} cellSize=${this.cellSize}`
            );
        }
        this.clickHandler?.(this.row, this.col);
    }

    private ensureAnchor(): void {
        if (this.suspectAnchor && this.suspectAnchor.isValid) return;
        this.suspectAnchor = this.node.getChildByName('Character')
            || this.node.getChildByName('SuspectAnchor');
    }

    private ensureMarkNodes(): void {
        this.xMarkNode = this.node.getChildByName('XMark');
        if (!this.xMarkNode) {
            this.xMarkNode = new Node('XMark');
            this.xMarkNode.layer = this.node.layer;
            const created = this.xMarkNode.addComponent(UITransform);
            created.setAnchorPoint(0.5, 0.5);
            this.node.addChild(this.xMarkNode);
        }
        this.xMarkNode.layer = this.node.layer;
        this.suspectMarkNode = this.node.getChildByName('SuspectMark');
        if (this.suspectMarkNode) {
            this.suspectMarkGraphics = this.suspectMarkNode.getComponent(Graphics);
        }
        this.drawXMark();
        this.drawSuspectMark();
    }

    private refreshMarkUI(): void {
        this.ensureMarkNodes();
        if (this.xMarkNode) {
            this.xMarkNode.active = this.markState === CellMarkState.X;
        }
        const showSuspect = this.markState === CellMarkState.SUSPECT;
        if (this.suspectMarkNode) {
            this.suspectMarkNode.active = showSuspect;
        }
        if (this.suspectAnchor) {
            this.suspectAnchor.active = showSuspect;
        }
        if (this.suspectNode && this.suspectNode.isValid) {
            this.suspectNode.active = showSuspect;
        }
        if (showSuspect) {
            this.spawnSuspectVisual();
            this.drawSuspectMark();
        }
        if (this.markState === CellMarkState.X) {
            this.drawXMark();
        }
        this.markDirty();
    }

    private spawnSuspectVisual(): void {
        this.ensureAnchor();
        if (!this.suspectAnchor) return;
        this.suspectAnchor.active = this.markState === CellMarkState.SUSPECT;
        this.suspectNode = this.suspectAnchor;
        const ut = this.suspectAnchor.getComponent(UITransform) || this.suspectAnchor.addComponent(UITransform);
        const visual = Math.max(8, Math.round(this.cellSize * 0.82));
        ut.setContentSize(visual, visual);
        const sprite = this.suspectAnchor.getComponent(Sprite) || this.suspectAnchor.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        applySpriteFrame(sprite, SUSPECT_FRAME);
        const g = this.suspectAnchor.getComponent(Graphics);
        if (g) {
            g.clear();
            g.enabled = false;
        }
    }

    private playPlaceAnim(): void {
        const target = this.suspectNode ?? this.suspectAnchor ?? this.suspectMarkNode;
        if (!target) return;
        target.setScale(new Vec3(0, 0, 1));
        tween(target)
            .to(0.14, { scale: new Vec3(1.12, 1.12, 1) })
            .to(0.08, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private markDirty(): void {
        if (this.dirty) return;
        this.dirty = true;
        this.scheduleOnce(() => {
            this.dirty = false;
            this.redraw();
        }, 0);
    }

    private redraw(): void {
        const g = this.graphics;
        if (!g || this.cellSize <= 0) return;
        if (this.colorSprite?.spriteFrame) {
            g.clear();
            g.enabled = false;
            return;
        }
        g.clear();
        const cs = this.cellSize;
        const half = cs / 2;
        const gap = LAYOUT.cellGap;
        const radius = Math.max(3, Math.floor(cs * LAYOUT.cellRadiusRatio));
        const drawW = cs - 2 * gap;
        const drawH = cs - 2 * gap;
        const drawX = -half + gap;
        const drawY = -half + gap;
        const bg = this.regionColor.clone();

        const dark = bg.clone();
        this.darken(dark, 40);
        g.fillColor = dark;
        g.roundRect(drawX, drawY - 2, drawW, drawH, radius);
        g.fill();

        g.fillColor = bg;
        g.roundRect(drawX, drawY, drawW, drawH, radius);
        g.fill();

        const light = bg.clone();
        this.lighten(light, 60);
        g.fillColor = new Color(light.r, light.g, light.b, 120);
        g.roundRect(drawX, drawY + drawH * 0.45, drawW, drawH * 0.55, radius);
        g.fill();

        g.fillColor = new Color(255, 255, 255, 80);
        g.arc(drawX + drawW * 0.3, drawY + drawH * 0.7, drawW * 0.25, Math.PI, Math.PI * 2);
        g.close();
        g.fill();

        if (this.locked && this.markState === CellMarkState.SUSPECT) {
            g.lineWidth = 2;
            g.strokeColor = new Color(255, 255, 255, 180);
            g.roundRect(drawX + 2, drawY + 2, drawW - 4, drawH - 4, radius);
            g.stroke();
        }
    }

    private drawXMark(): void {
        const mark = this.xMarkNode;
        if (!mark || this.cellSize <= 0) return;
        mark.layer = this.node.layer;

        // Sprite and Graphics are both UI renderers. Cocos keeps one uiComp
        // per node, so a Graphics on XMark hides x.png after it is disabled.
        const graphics = mark.getComponent(Graphics);
        if (graphics) {
            graphics.clear();
            graphics.enabled = false;
            graphics.destroy();
        }
        const ut = mark.getComponent(UITransform) || mark.addComponent(UITransform);
        ut.setAnchorPoint(0.5, 0.5);
        const visual = Math.max(8, Math.round(this.cellSize * 0.78));
        ut.setContentSize(visual, visual);

        this.xSprite = mark.getComponent(Sprite) || mark.addComponent(Sprite);
        this.xSprite.color = Color.WHITE;
        this.xSprite.type = Sprite.Type.SIMPLE;
        this.xSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        applySpriteFrame(this.xSprite, MARK_X_FRAME, () => {
            if (!this.xSprite?.isValid) return;
            this.xSprite.color = Color.WHITE;
            this.xSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            ut.setContentSize(visual, visual);
            // Re-bind the renderer in case a previous Graphics clear dropped it.
            this.xSprite.enabled = false;
            this.xSprite.enabled = true;
        });
        mark.setSiblingIndex(Math.max(0, this.node.children.length - 1));
        this.raiseHintMark();
    }

    private drawSuspectMark(): void {
        const g = this.suspectMarkGraphics;
        if (!g) return;
        g.clear();
        g.enabled = false;
        if (this.suspectMarkNode) this.suspectMarkNode.active = false;
    }

    private drawBear(g: Graphics, cs: number): void {
        const s = cs * 0.72;
        const cx = 0;
        const cy = -s * 0.02;
        const faceR = s * 0.34;

        g.fillColor = new Color(COLORS.bearFur);
        g.circle(cx - faceR * 0.75, cy + faceR * 0.65, faceR * 0.38);
        g.fill();
        g.circle(cx + faceR * 0.75, cy + faceR * 0.65, faceR * 0.38);
        g.fill();
        g.fillColor = new Color(COLORS.bearMuzzle);
        g.circle(cx - faceR * 0.75, cy + faceR * 0.65, faceR * 0.18);
        g.fill();
        g.circle(cx + faceR * 0.75, cy + faceR * 0.65, faceR * 0.18);
        g.fill();

        g.fillColor = new Color(COLORS.bearFur);
        g.circle(cx, cy, faceR);
        g.fill();
        g.fillColor = new Color(COLORS.bearMuzzle);
        g.circle(cx, cy - faceR * 0.25, faceR * 0.55);
        g.fill();
        g.fillColor = new Color('#1A1A1A');
        g.circle(cx, cy - faceR * 0.05, faceR * 0.13);
        g.fill();

        g.lineWidth = Math.max(1.5, s * 0.025);
        g.strokeColor = new Color('#1A1A1A');
        g.arc(cx, cy - faceR * 0.15, faceR * 0.18, Math.PI, Math.PI * 2);
        g.stroke();

        const maskY = cy + faceR * 0.18;
        g.fillColor = new Color(COLORS.maskColor);
        g.roundRect(cx - faceR * 0.85, maskY - faceR * 0.18, faceR * 1.7, faceR * 0.36, faceR * 0.15);
        g.fill();
        g.fillColor = new Color('#FFFFFF');
        g.circle(cx - faceR * 0.35, maskY, faceR * 0.09);
        g.fill();
        g.circle(cx + faceR * 0.35, maskY, faceR * 0.09);
        g.fill();

        g.fillColor = new Color(COLORS.bearHat);
        g.roundRect(cx - faceR * 0.6, cy + faceR * 0.55, faceR * 1.2, faceR * 0.5, faceR * 0.15);
        g.fill();
        g.roundRect(cx - faceR * 0.85, cy + faceR * 0.5, faceR * 1.7, faceR * 0.18, faceR * 0.08);
        g.fill();
    }

    private darken(c: Color, amount: number): void {
        c.r = Math.max(0, c.r - amount);
        c.g = Math.max(0, c.g - amount);
        c.b = Math.max(0, c.b - amount);
    }

    private lighten(c: Color, amount: number): void {
        c.r = Math.min(255, c.r + amount);
        c.g = Math.min(255, c.g + amount);
        c.b = Math.min(255, c.b + amount);
    }
}
