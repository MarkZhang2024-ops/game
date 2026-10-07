/**
 * Shared candy-lobby drawing helpers.
 * Missing sliced art is drawn with Graphics so labels and buttons stay real nodes.
 */

import {
    Button,
    Color,
    Graphics,
    ImageAsset,
    Label,
    Layers,
    Node,
    Sprite,
    SpriteFrame,
    Texture2D,
    UITransform,
    Widget,
} from 'cc';
import { loadSpriteFrame } from './GameArt';

export const CANDY_LAND_FRAME = '555bead7-9d0e-4790-bd61-081557ecbe7b@f9941';
export const CANDY_CASTLE_FRAME = '5dba9671-2bde-466e-9214-b6786573a6d0@f9941';

export const Palette = {
    pinkBg: hex('#FF9CC8'),
    pinkDeep: hex('#FF4F93'),
    pinkLine: hex('#F062A8'),
    candyPink: hex('#FF78B0'),
    framePink: hex('#FFD0E4'),
    white: hex('#FFFFFF'),
    ink: hex('#6A3A22'),
    red: hex('#E53935'),
    green: hex('#3DDC4A'),
    greenDark: hex('#1FA83A'),
    greenTrack: hex('#C8F5C0'),
    cream: hex('#FFF6E4'),
    namePlate: hex('#F6E2C0'),
    brown: hex('#6B3E1E'),
    brownDark: hex('#4E2A12'),
    gold: hex('#FFC107'),
    bronze: hex('#D08A3A'),
    purple: hex('#7E57C2'),
    sky: hex('#7ECFFF'),
    sand: hex('#F6D7A8'),
    choco: hex('#6A3B22'),
    rowPink: hex('#F7B7C9'),
    rowMint: hex('#B6F3C9'),
    rowPeach: hex('#F8D3A8'),
    orange: hex('#F4A03A'),
    blue: hex('#42A5F5'),
};

export function hex(value: string, alpha = 255): Color {
    const n = parseInt(value.replace('#', ''), 16);
    return new Color((n >> 16) & 255, (n >> 8) & 255, n & 255, alpha);
}

export function uiNode(name: string, width = 100, height = 100): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    const transform = node.addComponent(UITransform);
    transform.setContentSize(width, height);
    transform.setAnchorPoint(0.5, 0.5);
    return node;
}

export interface PinOptions {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    horizontalCenter?: number;
    verticalCenter?: number;
}

export function pin(node: Node, options: PinOptions): Widget {
    const widget = node.getComponent(Widget) ?? node.addComponent(Widget);
    widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
    if (options.left !== undefined) {
        widget.isAlignLeft = true;
        widget.left = options.left;
    }
    if (options.right !== undefined) {
        widget.isAlignRight = true;
        widget.right = options.right;
    }
    if (options.top !== undefined) {
        widget.isAlignTop = true;
        widget.top = options.top;
    }
    if (options.bottom !== undefined) {
        widget.isAlignBottom = true;
        widget.bottom = options.bottom;
    }
    if (options.horizontalCenter !== undefined) {
        widget.isAlignHorizontalCenter = true;
        widget.horizontalCenter = options.horizontalCenter;
    }
    if (options.verticalCenter !== undefined) {
        widget.isAlignVerticalCenter = true;
        widget.verticalCenter = options.verticalCenter;
    }
    widget.updateAlignment();
    return widget;
}

export function stretch(node: Node): Widget {
    return pin(node, { left: 0, right: 0, top: 0, bottom: 0 });
}

export function gfx(node: Node): Graphics {
    return node.getComponent(Graphics) ?? node.addComponent(Graphics);
}

export function addLabel(
    parent: Node,
    name: string,
    text: string,
    fontSize: number,
    color: Color,
    width: number,
    height: number,
): Label {
    const node = uiNode(name, width, height);
    node.setParent(parent);
    const label = node.addComponent(Label);
    label.useSystemFont = true;
    label.fontFamily = 'Arial';
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = Math.round(fontSize * 1.15);
    label.color = color;
    label.isBold = true;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.cacheMode = Label.CacheMode.NONE;
    return label;
}

export function outline(label: Label, color: Color, width: number): void {
    label.enableOutline = true;
    label.outlineColor = color;
    label.outlineWidth = width;
}

export function addButton(node: Node, zoom = 0.94): Button {
    const button = node.getComponent(Button) ?? node.addComponent(Button);
    button.transition = Button.Transition.SCALE;
    button.zoomScale = zoom;
    button.target = node;
    return button;
}

export function paintRound(g: Graphics, width: number, height: number, fill: Color, radius: number): void {
    g.fillColor = fill;
    g.roundRect(-width / 2, -height / 2, width, height, radius);
    g.fill();
}

export function paintCandyFrame(g: Graphics, width: number, height: number): void {
    g.clear();
    const x = -width / 2;
    const y = -height / 2;
    g.fillColor = Palette.candyPink;
    g.roundRect(x, y, width, height, 40);
    g.fill();
    g.fillColor = Palette.white;
    g.roundRect(x + 14, y + 14, width - 28, height - 28, 32);
    g.fill();
    g.fillColor = Palette.framePink;
    g.roundRect(x + 24, y + 24, width - 48, height - 48, 26);
    g.fill();
}

export function paintPill(g: Graphics, width: number, height: number, fill: Color, shadow: Color): void {
    g.clear();
    g.fillColor = shadow;
    g.roundRect(-width / 2, -height / 2 - 8, width, height, height / 2);
    g.fill();
    g.fillColor = fill;
    g.roundRect(-width / 2, -height / 2, width, height, height / 2);
    g.fill();
    g.fillColor = new Color(255, 255, 255, 90);
    g.roundRect(-width / 2 + 22, height * 0.05, width - 44, height * 0.28, height / 2);
    g.fill();
}

export function paintStar(g: Graphics, radius: number, fill: Color): void {
    const inner = radius * 0.46;
    g.fillColor = fill;
    for (let i = 0; i < 10; i++) {
        const rad = -Math.PI / 2 + i * Math.PI / 5;
        const dist = i % 2 === 0 ? radius : inner;
        const x = Math.cos(rad) * dist;
        const y = Math.sin(rad) * dist;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
    }
    g.close();
    g.fill();
}

export function paintBear(g: Graphics, radius: number, fur: Color): void {
    g.clear();
    g.fillColor = new Color(255, 255, 255, 255);
    g.circle(0, 0, radius);
    g.fill();
    g.fillColor = fur;
    g.circle(-radius * 0.62, radius * 0.62, radius * 0.38);
    g.fill();
    g.circle(radius * 0.62, radius * 0.62, radius * 0.38);
    g.fill();
    g.circle(0, -radius * 0.05, radius * 0.78);
    g.fill();
    g.fillColor = Palette.cream;
    g.circle(0, -radius * 0.22, radius * 0.38);
    g.fill();
    g.fillColor = Palette.ink;
    g.circle(-radius * 0.18, radius * 0.05, radius * 0.08);
    g.fill();
    g.circle(radius * 0.18, radius * 0.05, radius * 0.08);
    g.fill();
    g.fillColor = hex('#E57373');
    g.circle(0, -radius * 0.16, radius * 0.1);
    g.fill();
}

export function paintLock(g: Graphics, size: number): void {
    g.clear();
    const bodyW = size * 0.72;
    const bodyH = size * 0.52;
    g.strokeColor = Palette.gold;
    g.lineWidth = size * 0.1;
    g.arc(0, size * 0.12, size * 0.26, Math.PI, 0, true);
    g.stroke();
    g.fillColor = Palette.gold;
    g.roundRect(-bodyW / 2, -size * 0.48, bodyW, bodyH, 16);
    g.fill();
    g.fillColor = Palette.brownDark;
    g.circle(0, -size * 0.22, size * 0.08);
    g.fill();
    g.roundRect(-size * 0.045, -size * 0.42, size * 0.09, size * 0.18, 4);
    g.fill();
}

export function paintGear(g: Graphics, radius: number): void {
    g.clear();
    g.fillColor = hex('#5AC8FA');
    g.circle(0, 0, radius);
    g.fill();
    g.fillColor = Palette.white;
    for (let i = 0; i < 8; i++) {
        const rad = i * Math.PI / 4;
        g.circle(Math.cos(rad) * radius * 0.78, Math.sin(rad) * radius * 0.78, radius * 0.22);
        g.fill();
    }
    g.fillColor = hex('#5AC8FA');
    g.circle(0, 0, radius * 0.46);
    g.fill();
    g.fillColor = Palette.white;
    g.circle(0, 0, radius * 0.2);
    g.fill();
}

export function paintCrown(g: Graphics, size: number): void {
    g.clear();
    g.fillColor = Palette.gold;
    g.moveTo(-size * 0.46, -size * 0.2);
    g.lineTo(-size * 0.46, size * 0.05);
    g.lineTo(-size * 0.22, -size * 0.08);
    g.lineTo(0, size * 0.42);
    g.lineTo(size * 0.22, -size * 0.08);
    g.lineTo(size * 0.46, size * 0.05);
    g.lineTo(size * 0.46, -size * 0.2);
    g.close();
    g.fill();
    g.fillColor = hex('#FF5252');
    g.circle(0, size * 0.02, size * 0.08);
    g.fill();
}

export function paintHouse(g: Graphics, size: number): void {
    g.clear();
    g.fillColor = hex('#F48FB1');
    g.roundRect(-size * 0.36, -size * 0.42, size * 0.72, size * 0.5, 8);
    g.fill();
    g.fillColor = Palette.white;
    g.moveTo(0, size * 0.48);
    g.lineTo(-size * 0.5, size * 0.02);
    g.lineTo(size * 0.5, size * 0.02);
    g.close();
    g.fill();
    g.fillColor = Palette.candyPink;
    g.roundRect(-size * 0.12, -size * 0.42, size * 0.24, size * 0.28, 6);
    g.fill();
    g.fillColor = Palette.gold;
    g.circle(0, size * 0.16, size * 0.08);
    g.fill();
}

export function paintClipboard(g: Graphics, size: number): void {
    g.clear();
    g.fillColor = hex('#F48FB1');
    g.roundRect(-size * 0.34, -size * 0.42, size * 0.68, size * 0.84, 12);
    g.fill();
    g.fillColor = Palette.white;
    g.roundRect(-size * 0.24, -size * 0.3, size * 0.48, size * 0.58, 8);
    g.fill();
    g.fillColor = Palette.gold;
    g.roundRect(-size * 0.16, size * 0.28, size * 0.32, size * 0.16, 6);
    g.fill();
    g.fillColor = Palette.framePink;
    g.roundRect(-size * 0.16, -size * 0.08, size * 0.32, size * 0.06, 3);
    g.fill();
    g.roundRect(-size * 0.16, -size * 0.2, size * 0.24, size * 0.06, 3);
    g.fill();
}

export function rowFill(rank: number): Color {
    if (rank === 1) return Palette.rowPink;
    if (rank === 2) return Palette.rowMint;
    if (rank === 3) return Palette.rowPeach;
    const cycle = [Palette.rowMint, Palette.rowPink, Palette.rowMint, Palette.rowPeach];
    return cycle[(Math.max(4, rank) - 4) % cycle.length];
}

export function furForRank(rank: number): Color {
    const colors = [Palette.orange, hex('#F48FB1'), hex('#81C784'), hex('#64B5F6'), hex('#FFD54F')];
    return colors[(Math.max(1, rank) - 1) % colors.length];
}

let whiteSprite: SpriteFrame | null = null;

export function whiteFrame(): SpriteFrame {
    if (whiteSprite && whiteSprite.isValid) return whiteSprite;
    const image = new ImageAsset();
    image.reset({
        _data: new Uint8Array([255, 255, 255, 255]),
        width: 1,
        height: 1,
        format: Texture2D.PixelFormat.RGBA8888,
        _compressed: false,
    });
    const texture = new Texture2D();
    texture.image = image;
    const frame = new SpriteFrame();
    frame.texture = texture;
    frame.packable = false;
    whiteSprite = frame;
    return frame;
}

export function applySprite(sprite: Sprite, uuid: string): void {
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.type = Sprite.Type.SIMPLE;
    loadSpriteFrame(uuid, (asset) => {
        if (!sprite.isValid || !asset) return;
        sprite.spriteFrame = asset;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    });
}

export function setLayerTree(node: Node): void {
    node.layer = Layers.Enum.UI_2D;
    node.children.forEach(setLayerTree);
}
