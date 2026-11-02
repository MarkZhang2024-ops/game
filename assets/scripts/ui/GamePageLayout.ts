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
 * The level title and the placed counter are sprite digits from 关卡数字 and 生命值.
 */

import { Color, Graphics, Label, Node, Sprite, sys, UITransform, view } from 'cc';
import { applySpriteFrame, GAME_FRAMES } from './GameArt';
import { fillDigits, GlyphSet, showFrame } from './LeaderboardArt';
import { whiteFrame } from './UiKit';

const LEVEL_WORD = { frame: 'd2cb0e9e-b7b5-50bf-91b2-a09b9df746f2@f9941', width: 171, height: 53 };
const LEVEL_DIGITS: GlyphSet = {
    frames: [
        '95123b7e-e1f8-5613-8907-851aa5690af9@f9941',
        '076b62b7-3f1c-5733-8666-eba69f89c5cb@f9941',
        '173b306a-1c2e-5358-a0bf-1a642d148b5e@f9941',
        '3ae48758-f8e8-5a27-9a5c-46f987433562@f9941',
        '18a41c48-5177-59ac-98d0-c289df99702e@f9941',
        'f68c219f-70b1-5cde-8629-9a5740402e16@f9941',
        'd00508eb-867c-5f05-a394-b6afd61dbac9@f9941',
        'aea4fdb4-a063-502e-93aa-2de707459ddc@f9941',
        '9c4796cd-27e4-56ed-ba55-578373be7c9d@f9941',
        'ba3a350b-f3c0-5e2f-a5b3-b66541ff983c@f9941',
    ],
    sizes: Array.from({ length: 10 }, () => [36, 50]),
};
const COUNTER_DIGITS: GlyphSet = {
    frames: [
        'b16e8783-d2ee-509b-ac09-70cf7e31fd46@f9941',
        '51094391-55b2-5cb9-88b1-548d45edeafe@f9941',
        'aff9585f-cbbd-5155-8b4b-d33933a6ade5@f9941',
        'b4c2aa22-7ad0-53ea-a964-4bfc5a2fff4d@f9941',
        'ee2d30a6-f57c-5e04-953c-9289d6ecf6c7@f9941',
        'fdf94322-4e99-5a4f-a049-73c322672969@f9941',
        '45d36793-f523-5b14-be99-d930cea9c660@f9941',
        '9b4ba47d-da25-5f2f-a9f3-58976eddbfb7@f9941',
        '905fcfb0-4bcf-538e-bee5-de128829a0f1@f9941',
        'd85897a3-7276-59f2-8ab3-963e6499e884@f9941',
    ],
    sizes: Array.from({ length: 10 }, () => [45, 65]),
};
const COUNTER_SLASH = { frame: '0ab247c7-0418-538e-b008-b1f62f90cec0@f9941', width: 29, height: 92 };

export const GAME_UI = {
    designWidth: 1080,
    designHeight: 2400,
    topRowFromTop: 188,
    topButton: 198,
    backCenterX: 150,
    settingCenterX: 934,
    bannerWidth: 458,
    bannerHeight: 172,
    ruleFromTop: 417,
    ruleWidth: 1020,
    ruleHeight: 191,
    playerFromTop: 639,
    progressCenterX: 318,
    progressWidth: 416,
    progressHeight: 144,
    heartCenterX: 762,
    heartWidth: 416,
    heartHeight: 144,
    bearWidth: 132,
    bearHeight: 172,
    heartIconW: 109,
    heartIconH: 98,
    heartGap: -2,
    frameWidth: 1020,
    frameHeight: 1033,
    /** Inner cream hole of 框.png, 1020×1033. */
    frameInsetLeft: 62 / 1020,
    frameInsetRight: 52 / 1020,
    frameInsetTop: 68 / 1033,
    frameInsetBottom: 47 / 1033,
    bottomFromBottom: 235,
    bottomButtonWidth: 232,
    bottomButtonHeight: 253,
    bottomButtonSpacing: 305,
    bandGap: 12,
    /** Top of 框.png. The candy grid starts just inside this, under the waterfall. */
    frameTopFromTop: 850,
};

let fittedFrameW = 0;
let fittedFrameH = 0;
let shownLevel = 1;
let shownPlaced = 0;
let shownRequired = 1;

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

function artHost(parent: Node, name: string): Node {
    let node = parent.getChildByName(name);
    if (!node) {
        node = new Node(name);
        node.layer = parent.layer;
        const transform = node.addComponent(UITransform);
        transform.setAnchorPoint(0.5, 0.5);
        node.setParent(parent);
    }
    return node;
}

function fresh(parent: Node, name: string): Node {
    const node = new Node(name);
    node.layer = parent.layer;
    const transform = node.addComponent(UITransform);
    transform.setAnchorPoint(0.5, 0.5);
    node.setParent(parent);
    return node;
}

/** "Level" plus the level number, centered on the banner. */
export function paintLevelTitle(banner: Node | null, level?: number): void {
    if (level != null) shownLevel = Math.max(0, Math.floor(level));
    if (!banner?.isValid) return;
    const old = findDeep(banner, 'LevelLabel');
    if (old) old.active = false;
    const height = banner.getComponent(UITransform)?.height ?? 0;
    if (height < 2) return;
    const art = artHost(banner, 'LevelArt');
    art.removeAllChildren();
    // Sprites were cut for the 172px banner: digits 50px, word 53px, with a full space before the number.
    const digitH = height * (50 / 172);
    const wordH = height * (LEVEL_WORD.height / 172);
    const wordW = height * (LEVEL_WORD.width / 172);
    const gap = digitH * 0.62;
    const digits = fresh(art, 'Digits');
    const digitsW = fillDigits(digits, shownLevel, digitH, LEVEL_DIGITS);
    const total = wordW + gap + digitsW;
    const word = fresh(art, 'Word');
    word.getComponent(UITransform)?.setContentSize(wordW, wordH);
    showFrame(word.getComponent(Sprite) ?? word.addComponent(Sprite), LEVEL_WORD.frame);
    word.setPosition(-total / 2 + wordW / 2, 0, 0);
    const digitDrop = (wordH - digitH) / 2;
    digits.setPosition(-total / 2 + wordW + gap + digitsW / 2, -digitDrop, 0);
    art.getComponent(UITransform)?.setContentSize(total, Math.max(wordH, digitH));
    art.setPosition(0, height * 0.02, 0);
}

/**
 * Remaining free hints sit on the magnifier badge.
 * At zero the badge is hidden so 图案1.png's video triangle shows.
 */
export function paintHintCount(button: Node | null, count: number): void {
    if (!button?.isValid) return;
    let badge = button.getChildByName('HintCount');
    if (count <= 0) {
        if (badge) badge.active = false;
        return;
    }
    if (!badge) {
        badge = new Node('HintCount');
        badge.layer = button.layer;
        const root = badge.addComponent(UITransform);
        root.setAnchorPoint(0.5, 0.5);
        button.addChild(badge);
        const cover = new Node('Cover');
        cover.layer = button.layer;
        const coverUt = cover.addComponent(UITransform);
        coverUt.setAnchorPoint(0.5, 0.5);
        cover.addComponent(Graphics);
        cover.setParent(badge);
        const digits = new Node('Digits');
        digits.layer = button.layer;
        const digitsUt = digits.addComponent(UITransform);
        digitsUt.setAnchorPoint(0.5, 0.5);
        digits.setParent(badge);
    }
    badge.active = true;
    badge.layer = button.layer;
    badge.setSiblingIndex(button.children.length - 1);
    const width = button.getComponent(UITransform)?.width ?? 232;
    const height = button.getComponent(UITransform)?.height ?? 253;
    badge.setPosition(0, -height * 0.326, 0);
    const coverW = width * (78 / 232);
    const coverH = height * (54 / 253);
    const cover = badge.getChildByName('Cover');
    cover?.getComponent(UITransform)?.setContentSize(coverW, coverH);
    const graphics = cover?.getComponent(Graphics);
    if (graphics) {
        graphics.clear();
        graphics.fillColor = new Color(1, 186, 244, 255);
        const radius = coverH * 0.42;
        graphics.roundRect(-coverW / 2, -coverH / 2, coverW, coverH, radius);
        graphics.fill();
    }
    const digits = badge.getChildByName('Digits');
    if (digits) fillDigits(digits, count, height * (38 / 253), LEVEL_DIGITS);
}

/** Brown "placed/required" sprites on the progress plate, to the right of the bear. */
export function paintProgressCounter(plate: Node | null, placed?: number, required?: number): void {
    if (placed != null) shownPlaced = Math.max(0, Math.floor(placed));
    if (required != null) shownRequired = Math.max(0, Math.floor(required));
    if (!plate?.isValid) return;
    const old = findDeep(plate, 'ProgressLabel');
    if (old) old.active = false;
    const plateW = plate.getComponent(UITransform)?.width ?? 0;
    const plateH = plate.getComponent(UITransform)?.height ?? 0;
    if (plateH < 2) return;
    const art = artHost(plate, 'ProgressArt');
    art.removeAllChildren();
    const digitH = plateH * 0.48;
    const gap = Math.max(1, digitH * 0.06);
    const slashH = digitH;
    const slashW = slashH * (COUNTER_SLASH.width / COUNTER_SLASH.height);
    const left = fresh(art, 'Placed');
    const slash = fresh(art, 'Slash');
    const right = fresh(art, 'Required');
    const leftW = fillDigits(left, shownPlaced, digitH, COUNTER_DIGITS);
    const rightW = fillDigits(right, shownRequired, digitH, COUNTER_DIGITS);
    slash.getComponent(UITransform)?.setContentSize(slashW, slashH);
    showFrame(slash.getComponent(Sprite) ?? slash.addComponent(Sprite), COUNTER_SLASH.frame);
    const total = leftW + gap + slashW + gap + rightW;
    let cursor = -total / 2;
    left.setPosition(cursor + leftW / 2, 0, 0);
    cursor += leftW + gap;
    slash.setPosition(cursor + slashW / 2, 0, 0);
    cursor += slashW + gap;
    right.setPosition(cursor + rightW / 2, 0, 0);
    art.getComponent(UITransform)?.setContentSize(total, digitH);
    art.setPosition(plateW * 0.171, plateH * 0.035, 0);
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
    levelLabel.active = false;
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

function layoutLevelLabel(banner: Node | null): void {
    paintLevelTitle(banner);
}

function layoutProgressContents(plate: Node | null, unit: number): void {
    if (!plate) return;
    const plateW = GAME_UI.progressWidth * unit;
    const plateH = GAME_UI.progressHeight * unit;
    const bearW = GAME_UI.bearWidth * unit;
    const bearH = GAME_UI.bearHeight * unit;
    const bear = findDeep(plate, 'Character');
    setSize(bear, bearW, bearH);
    at(bear, -plateW * 0.5 + 117 * unit, 18 * unit);
    paintProgressCounter(plate);
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

    const topBtn = m.topButton * unit;
    const topY = sh / 2 - m.topRowFromTop * unit;
    const top = findDeep(canvas, 'TopUI');
    setSize(top, sw, topBtn + 16 * unit);
    place(top, 0, topY, safeX, safeY);
    const backX = -sw / 2 + m.backCenterX * unit;
    const settingX = sw / 2 - (m.designWidth - m.settingCenterX) * unit;
    setSize(findDeep(top, 'BackButton'), topBtn, topBtn);
    at(findDeep(top, 'BackButton'), backX, 0);
    const settingButton = findDeep(top, 'SettingButton');
    setSize(settingButton, topBtn, topBtn);
    at(settingButton, settingX, 0);
    if (settingButton) settingButton.active = true;
    const bannerW = m.bannerWidth * unit;
    const bannerH = m.bannerHeight * unit;
    const banner = findDeep(top, 'LevelBanner');
    setSize(banner, bannerW, bannerH);
    at(banner, 0, 0);
    layoutLevelLabel(banner);

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
    // Pin to the screen bottom, not the safe rect, so the pair sits on the pink ground.
    const worldY = -height / 2 + m.bottomFromBottom * unit;
    const bottomLocalY = worldY - safeY;
    const bottom = findDeep(canvas, 'BottomUI');
    setSize(bottom, sw, bottomH + 20 * unit);
    if (bottom?.parent?.name === 'SafeArea') {
        bottom.setPosition(-safeX, bottomLocalY, 0);
    } else {
        bottom.setPosition(0, worldY, 0);
    }
    const btnW = m.bottomButtonWidth * unit;
    const btnH = m.bottomButtonHeight * unit;
    const halfSpan = m.bottomButtonSpacing * unit * 0.5;
    setSize(findDeep(bottom, 'HintButton'), btnW, btnH);
    setSize(findDeep(bottom, 'ToolButton'), btnW, btnH);
    at(findDeep(bottom, 'HintButton'), -halfSpan, 0);
    at(findDeep(bottom, 'ToolButton'), halfSpan, 0);
    if (bottom?.parent) bottom.setSiblingIndex(bottom.parent.children.length - 1);

    const frameTop = sh / 2 - m.frameTopFromTop * unit;
    const buttonTop = bottomLocalY + bottomH / 2 + m.bandGap * unit;
    const available = Math.max(200 * unit, frameTop - buttonTop);
    const maxFrameW = Math.max(200 * unit, sw - 30 * unit);
    const nativeW = m.frameWidth * unit;
    const nativeH = m.frameHeight * unit;
    const frameScale = Math.min(1, maxFrameW / nativeW, available / nativeH);
    const frameW = nativeW * frameScale;
    const frameH = nativeH * frameScale;
    const frameY = frameTop - frameH / 2;

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
