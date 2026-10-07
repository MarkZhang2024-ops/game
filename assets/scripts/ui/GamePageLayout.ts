/**
 * Places the game screen on the 1080×2400 candy comp.
 *
 * Chrome lives under SafeArea, so positions below are SafeArea-local:
 * y = 0 is the safe rect center, +y is up. Top and bottom rows are pinned
 * to the safe rect, and the board frame only shrinks when the gap between
 * them is shorter than the art. Sprites stay uniform (same scale on x and y).
 *
 * Click mapping is unchanged: Board converts UI location with
 * convertToNodeSpaceAR, which includes this node's position and scale.
 *
 * TODO: the level title in the comp is a rounded display face. This project
 * has no font file, so the label uses the system bold face on 关卡框.png.
 */

import { Color, Label, Node, RichText, Sprite, sys, UITransform, view } from 'cc';
import { applySpriteFrame, GAME_FRAMES } from './GameArt';
import { whiteFrame } from './UiKit';

export const GAME_UI = {
    designWidth: 1080,
    designHeight: 2400,
    topRowFromTop: 186,
    topButton: 198,
    backCenterX: 150,
    settingCenterX: 930,
    bannerWidth: 458,
    bannerHeight: 172,
    ruleFromTop: 410,
    ruleWidth: 1020,
    ruleHeight: 191,
    playerFromTop: 632,
    progressCenterX: 248,
    progressWidth: 416,
    progressHeight: 144,
    heartCenterX: 762,
    heartWidth: 416,
    heartHeight: 144,
    bearWidth: 132,
    bearHeight: 172,
    heartIconW: 109,
    heartIconH: 98,
    heartGap: 18,
    frameWidth: 1020,
    frameHeight: 1020,
    /** Inner pink hole of 游戏主框.png, measured on the 1020×1228 source. */
    frameInsetLeft: 64 / 1020,
    frameInsetRight: 65 / 1020,
    frameInsetTop: 83 / 1228,
    frameInsetBottom: 71 / 1228,
    bottomFromBottom: 254,
    bottomButtonWidth: 232,
    bottomButtonHeight: 253,
    bottomButtonSpacing: 380,
    bandGap: 18,
};

let fittedFrameW = 0;
let fittedFrameH = 0;

export function findDeep(root: Node | null, name: string): Node | null {
    if (!root) return null;
    if (root.name === name) return root;
    for (const child of root.children) {
        const found = findDeep(child, name);
        if (found) return found;
    }
    return null;
}

interface Insets {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

function safeInsets(width: number, height: number): Insets {
    const empty = { top: 0, bottom: 0, left: 0, right: 0 };
    const safe = sys.getSafeAreaRect();
    const visible = view.getVisibleSize();
    if (safe.width <= 0 || safe.height <= 0 || visible.width <= 0 || visible.height <= 0) {
        return empty;
    }
    if (safe.width > visible.width + 2 || safe.height > visible.height + 2) {
        return empty;
    }
    const sx = width / visible.width;
    const sy = height / visible.height;
    return {
        left: Math.max(0, safe.x) * sx,
        right: Math.max(0, visible.width - (safe.x + safe.width)) * sx,
        bottom: Math.max(0, safe.y) * sy,
        top: Math.max(0, visible.height - (safe.y + safe.height)) * sy,
    };
}

function setSize(node: Node | null, width: number, height: number): void {
    if (!node) return;
    const ut = node.getComponent(UITransform) || node.addComponent(UITransform);
    ut.setAnchorPoint(0.5, 0.5);
    ut.setContentSize(width, height);
    const sprite = node.getComponent(Sprite);
    if (sprite) {
        sprite.type = Sprite.Type.SIMPLE;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    }
}

function at(node: Node | null, x: number, y: number): void {
    node?.setPosition(x, y, 0);
}

/**
 * safeLocal is the offset from the SafeArea center.
 * Nodes parented to SafeArea use that space directly.
 * Nodes still parented to Canvas get the SafeArea origin added back.
 */
function place(node: Node | null, safeLocalX: number, safeLocalY: number, safeX: number, safeY: number): void {
    if (!node) return;
    if (node.parent?.name === 'SafeArea') {
        node.setPosition(safeLocalX, safeLocalY, 0);
        return;
    }
    node.setPosition(safeLocalX + safeX, safeLocalY + safeY, 0);
}

function claim(parent: Node, name: string, searchRoot: Node): Node {
    let node = findDeep(searchRoot, name);
    if (!node) {
        node = new Node(name);
        node.layer = searchRoot.layer;
        const ut = node.addComponent(UITransform);
        ut.setAnchorPoint(0.5, 0.5);
    }
    node.layer = searchRoot.layer;
    if (node.parent !== parent) node.setParent(parent);
    return node;
}

function paint(node: Node | null, frame: string): void {
    if (!node) return;
    const sprite = node.getComponent(Sprite) || node.addComponent(Sprite);
    applySpriteFrame(sprite, frame);
}

/**
 * Bottom buttons carry both a disabled Label and a Sprite. Cocos stores one
 * UI renderer per node, and the Label keeps the slot, so 图案1/图案2 never draw.
 * Drop the Label and leave the sprite as the only renderer.
 */
function paintButton(node: Node | null, frame: string): void {
    if (!node) return;
    const label = node.getComponent(Label);
    if (label) label.destroy();
    const sprite = node.getComponent(Sprite) || node.addComponent(Sprite);
    sprite.color = Color.WHITE;
    sprite.enabled = true;
    applySpriteFrame(sprite, frame, () => {
        if (!sprite.isValid) return;
        sprite.color = Color.WHITE;
        sprite.enabled = false;
        sprite.enabled = true;
    });
}

function hideCaption(node: Node | null): void {
    const label = node?.getComponent(Label);
    if (label) label.enabled = false;
}

/** Level title sits on 关卡框.png. The scene node may still be a RichText placeholder. */
function ensureLevelText(node: Node | null): void {
    if (!node) return;
    const rich = node.getComponent(RichText);
    if (rich) rich.enabled = false;
    const sprite = node.getComponent(Sprite);
    if (sprite) sprite.enabled = false;
    let label = node.getComponent(Label);
    if (!label) {
        label = node.addComponent(Label);
        label.string = 'Level 4';
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.useSystemFont = true;
        label.fontFamily = 'Arial';
        label.cacheMode = Label.CacheMode.NONE;
    }
    label.enabled = true;
    label.isBold = true;
}

/**
 * Builds the candy chrome if the scene is still the flat label layout.
 * Idempotent: an already structured scene is only reparented when needed.
 * New nodes copy the Canvas layer so the UI camera (canvas_19) can see them.
 */
function ensureGameChrome(canvas: Node): void {
    const safe = claim(canvas, 'SafeArea', canvas);
    const popup = claim(canvas, 'PopupLayer', canvas);
    const game = claim(safe, 'GameArea', canvas);
    const top = claim(safe, 'TopUI', canvas);
    const rules = claim(safe, 'RulePanel', canvas);
    const player = claim(safe, 'PlayerInfo', canvas);
    const bottom = claim(safe, 'BottomUI', canvas);

    const banner = claim(top, 'LevelBanner', canvas);
    const levelLabel = claim(banner, 'LevelLabel', canvas);
    ensureLevelText(levelLabel);
    const progress = claim(player, 'ProgressPlate', canvas);
    claim(progress, 'Character', canvas);
    claim(progress, 'ProgressLabel', canvas);
    const heartPlate = claim(player, 'HeartPlate', canvas);
    const heartGroup = claim(heartPlate, 'HeartGroup', canvas);
    for (let i = 1; i <= 3; i++) {
        const heart = claim(heartGroup, `Heart${i}`, canvas);
        paint(heart, GAME_FRAMES.heart);
    }

    const frame = claim(game, 'BoardFrame', canvas);
    const board = findDeep(canvas, 'DynamicGameBoard') || findDeep(canvas, 'BoardContainer');
    if (board) {
        board.name = 'DynamicGameBoard';
        board.layer = canvas.layer;
        if (board.parent !== frame) board.setParent(frame);
    }

    for (const name of ['LevelComplete', 'GameOver', 'SettingsPanel', 'Toast']) {
        const popupNode = findDeep(canvas, name);
        if (popupNode && popupNode.parent !== popup) popupNode.setParent(popup);
    }

    const bg = findDeep(canvas, 'Background');
    if (bg && bg.parent === canvas) bg.setSiblingIndex(0);
    safe.setSiblingIndex(Math.max(0, canvas.children.length - 2));
    popup.setSiblingIndex(canvas.children.length - 1);

    const safeOrder = ['RulePanel', 'PlayerInfo', 'GameArea', 'TopUI', 'BottomUI'];
    safeOrder.forEach((name, index) => safe.getChildByName(name)?.setSiblingIndex(index));
    top.getChildByName('BackButton')?.setSiblingIndex(0);
    banner.setSiblingIndex(1);
    top.getChildByName('SettingButton')?.setSiblingIndex(2);
    progress.setSiblingIndex(0);
    heartPlate.setSiblingIndex(1);
    frame.setSiblingIndex(0);

    paint(bg, GAME_FRAMES.background);
    paint(findDeep(top, 'BackButton'), GAME_FRAMES.back);
    paint(findDeep(top, 'SettingButton'), GAME_FRAMES.setting);
    paint(banner, GAME_FRAMES.banner);
    paint(rules, GAME_FRAMES.rules);
    paint(progress, GAME_FRAMES.plate);
    paint(heartPlate, GAME_FRAMES.plate);
    paint(findDeep(progress, 'Character'), GAME_FRAMES.bear);
    paint(frame, GAME_FRAMES.frame);
    paintButton(findDeep(bottom, 'HintButton'), GAME_FRAMES.hint);
    paintButton(findDeep(bottom, 'ToolButton'), GAME_FRAMES.tool);

    hideCaption(findDeep(top, 'BackButton'));
    hideCaption(findDeep(top, 'SettingButton'));
    hideCaption(heartGroup);
    for (let i = 1; i <= 3; i++) {
        const item = rules.getChildByName(`RuleItem${i}`);
        if (item) item.active = false;
    }
}

function dressDimmer(popup: Node | null): void {
    const dim = popup?.getChildByName('Dim');
    if (!dim) return;
    const sprite = dim.getComponent(Sprite) || dim.addComponent(Sprite);
    sprite.spriteFrame = whiteFrame();
    sprite.type = Sprite.Type.SIMPLE;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.color = new Color(48, 16, 36, 150);
    setSize(dim, 1600, 3200);
}

function layoutLevelLabel(banner: Node | null, bannerW: number, bannerH: number): void {
    const labelNode = findDeep(banner, 'LevelLabel');
    setSize(labelNode, bannerW * 0.72, bannerH * 0.52);
    at(labelNode, 0, -bannerH * 0.02);
    const label = labelNode?.getComponent(Label);
    if (!label) return;
    label.fontSize = Math.max(20, Math.round(bannerH * 0.38));
    label.lineHeight = Math.max(24, Math.round(bannerH * 0.44));
    label.isBold = true;
    label.overflow = Label.Overflow.SHRINK;
    label.color = new Color(255, 255, 255, 255);
    label.enableOutline = true;
    label.outlineWidth = Math.max(2, Math.round(bannerH * 0.035));
    label.outlineColor = new Color(90, 42, 18, 255);
}

function layoutProgressContents(plate: Node | null, unit: number): void {
    if (!plate) return;
    const plateW = GAME_UI.progressWidth * unit;
    const plateH = GAME_UI.progressHeight * unit;
    const bearW = GAME_UI.bearWidth * unit;
    const bearH = GAME_UI.bearHeight * unit;
    const bear = findDeep(plate, 'Character');
    setSize(bear, bearW, bearH);
    at(bear, -plateW * 0.5 + bearW * 0.42, bearH * 0.06);
    const labelNode = findDeep(plate, 'ProgressLabel');
    setSize(labelNode, plateW * 0.48, plateH * 0.7);
    at(labelNode, plateW * 0.16, 0);
    const label = labelNode?.getComponent(Label);
    if (!label) return;
    label.fontSize = Math.max(18, Math.round(plateH * 0.4));
    label.lineHeight = Math.max(20, Math.round(plateH * 0.46));
    label.isBold = true;
    label.overflow = Label.Overflow.SHRINK;
    label.color = new Color(92, 52, 28, 255);
}

function layoutHearts(plate: Node | null, unit: number): void {
    const group = findDeep(plate, 'HeartGroup');
    if (!group) return;
    const icons = group.children;
    const iconW = GAME_UI.heartIconW * unit;
    const iconH = GAME_UI.heartIconH * unit;
    const step = iconW + GAME_UI.heartGap * unit;
    const start = -step * Math.max(0, icons.length - 1) / 2;
    for (let i = 0; i < icons.length; i++) {
        setSize(icons[i], iconW, iconH);
        at(icons[i], start + step * i, 0);
    }
    const span = icons.length > 0 ? step * (icons.length - 1) + iconW : iconW;
    setSize(group, span, iconH);
    at(group, 0, 0);
    const caption = group.getComponent(Label);
    if (caption) caption.enabled = false;
}

/**
 * @param resizeBoard When true, the dynamic board's content size is updated
 * so the next createBoard() call lays cells out in the fitted frame.
 * When false, an already built board is only scaled so marks stay put.
 */
export function applyGamePageLayout(canvas: Node, resizeBoard: boolean): void {
    const canvasUt = canvas.getComponent(UITransform);
    if (!canvasUt) return;
    const width = canvasUt.width;
    const height = canvasUt.height;
    if (width < 2 || height < 2) return;

    ensureGameChrome(canvas);

    const unit = width / GAME_UI.designWidth;
    const safe = safeInsets(width, height);
    const m = GAME_UI;
    const safeX = (safe.left - safe.right) / 2;
    const safeY = (safe.bottom - safe.top) / 2;
    const sw = Math.max(2, width - safe.left - safe.right);
    const sh = Math.max(2, height - safe.top - safe.bottom);

    const bg = findDeep(canvas, 'Background');
    if (bg) {
        setSize(bg, m.designWidth, m.designHeight);
        const cover = Math.max(width / m.designWidth, height / m.designHeight);
        bg.setScale(cover, cover, 1);
        at(bg, 0, 0);
    }

    const safeNode = findDeep(canvas, 'SafeArea');
    if (safeNode) {
        setSize(safeNode, sw, sh);
        at(safeNode, safeX, safeY);
    }

    const popup = findDeep(canvas, 'PopupLayer');
    if (popup) {
        setSize(popup, width, height);
        at(popup, 0, 0);
    }
    dressDimmer(findDeep(canvas, 'LevelComplete'));
    dressDimmer(findDeep(canvas, 'GameOver'));
    dressDimmer(findDeep(canvas, 'SettingsPanel'));

    const buttonScale = 2 / 3;
    const topBtn = m.topButton * unit * buttonScale;
    const topY = sh / 2 - m.topRowFromTop * unit;
    const top = findDeep(canvas, 'TopUI');
    setSize(top, sw, topBtn + 16 * unit);
    place(top, 0, topY, safeX, safeY);
    const backX = -sw / 2 + m.backCenterX * unit;
    const settingX = sw / 2 - (m.designWidth - m.settingCenterX) * unit;
    setSize(findDeep(top, 'BackButton'), topBtn, topBtn);
    at(findDeep(top, 'BackButton'), backX, 0);
    setSize(findDeep(top, 'SettingButton'), topBtn, topBtn);
    at(findDeep(top, 'SettingButton'), settingX, 0);
    const bannerW = m.bannerWidth * unit;
    const bannerH = m.bannerHeight * unit;
    const banner = findDeep(top, 'LevelBanner');
    setSize(banner, bannerW, bannerH);
    at(banner, 0, 0);
    layoutLevelLabel(banner, bannerW, bannerH);

    const ruleW = Math.min(m.ruleWidth * unit, sw - 24 * unit);
    const ruleH = ruleW * (m.ruleHeight / m.ruleWidth);
    const ruleY = sh / 2 - m.ruleFromTop * unit;
    const rules = findDeep(canvas, 'RulePanel');
    setSize(rules, ruleW, ruleH);
    place(rules, 0, ruleY, safeX, safeY);

    const playerY = sh / 2 - m.playerFromTop * unit;
    const player = findDeep(canvas, 'PlayerInfo');
    setSize(player, sw, m.progressHeight * unit + 24 * unit);
    place(player, 0, playerY, safeX, safeY);
    const progress = findDeep(player, 'ProgressPlate');
    const progressW = m.progressWidth * unit;
    const progressH = m.progressHeight * unit;
    setSize(progress, progressW, progressH);
    at(progress, -sw / 2 + m.progressCenterX * unit, 0);
    layoutProgressContents(progress, unit);
    const hearts = findDeep(player, 'HeartPlate');
    setSize(hearts, m.heartWidth * unit, m.heartHeight * unit);
    at(hearts, -sw / 2 + m.heartCenterX * unit, 0);
    layoutHearts(hearts, unit);

    const bottomH = m.bottomButtonHeight * unit;
    const bottomY = -sh / 2 + m.bottomFromBottom * unit;
    const bottom = findDeep(canvas, 'BottomUI');
    setSize(bottom, sw, bottomH + 20 * unit);
    place(bottom, 0, bottomY, safeX, safeY);
    const btnW = m.bottomButtonWidth * unit * buttonScale;
    const btnH = m.bottomButtonHeight * unit * buttonScale;
    const halfSpan = m.bottomButtonSpacing * unit * 0.5;
    setSize(findDeep(bottom, 'HintButton'), btnW, btnH);
    setSize(findDeep(bottom, 'ToolButton'), btnW, btnH);
    at(findDeep(bottom, 'HintButton'), -halfSpan, 0);
    at(findDeep(bottom, 'ToolButton'), halfSpan, 0);
    if (bottom?.parent) bottom.setSiblingIndex(bottom.parent.children.length - 1);

    const playerBottom = playerY - progressH / 2 - m.bandGap * unit;
    const buttonTop = bottomY + bottomH / 2 + m.bandGap * unit;
    const available = Math.max(200 * unit, playerBottom - buttonTop);
    const maxFrameW = Math.max(200 * unit, sw - 30 * unit);
    const nativeW = m.frameWidth * unit;
    const nativeH = m.frameHeight * unit;
    const frameScale = Math.min(1, maxFrameW / nativeW, available / nativeH);
    const frameW = nativeW * frameScale;
    const frameH = nativeH * frameScale;
    const frameY = (playerBottom + buttonTop) / 2;

    const gameArea = findDeep(canvas, 'GameArea');
    const frame = findDeep(canvas, 'BoardFrame');
    const board = findDeep(canvas, 'DynamicGameBoard') || findDeep(canvas, 'BoardContainer');
    place(gameArea, 0, frameY, safeX, safeY);

    if (resizeBoard || fittedFrameW <= 0) {
        gameArea?.setScale(1, 1, 1);
        setSize(gameArea, frameW, frameH);
        setSize(frame, frameW, frameH);
        frame?.setPosition(0, 0, 0);
        const innerW = frameW * (1 - m.frameInsetLeft - m.frameInsetRight);
        const innerH = frameH * (1 - m.frameInsetTop - m.frameInsetBottom);
        const side = Math.min(innerW, innerH);
        const offsetY = ((m.frameInsetBottom - m.frameInsetTop) * frameH) / 2;
        setSize(board, side, side);
        board?.setPosition(0, offsetY, 0);
        fittedFrameW = frameW;
        fittedFrameH = frameH;
    } else if (gameArea && fittedFrameW > 0 && fittedFrameH > 0) {
        const scale = Math.min(frameW / fittedFrameW, frameH / fittedFrameH);
        gameArea.setScale(scale, scale, 1);
    }
}
