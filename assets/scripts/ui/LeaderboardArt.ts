/**
 * Leaderboard SpriteFrame ids, digit strips, the "Level" word, and sprite-letter names.
 */

import { Node, Sprite, UITransform } from 'cc';
import { loadSpriteFrame } from './GameArt';
import { uiNode } from './UiKit';

export const LB_BACKGROUND = 'd34ac233-ef00-4449-a106-4c4592ce4acf@f9941';
export const LB_TITLE = '99cdd50f-5610-4456-9ee7-f9ee6f875d60@f9941';
export const LB_DECORATION = '11209de9-8389-4811-8b1d-c25528e3b8ba@f9941';
export const LB_YOUR_RANK_CARD = '98c4bd7a-c7d5-4b04-ab83-662df40ddee4@f9941';
export const LB_YOUR_RANK_RIBBON = '6abe5018-ccb5-408f-b25c-acd177241d91@f9941';

const ROW_PINK = '0caf0d03-585e-448f-8118-8e0809907da0@f9941';
const ROW_MINT = 'fdaac7d6-fb66-4bbb-9737-92cf28e3d6ef@f9941';
const ROW_PEACH = 'ad083992-a3d6-4bfb-869e-a2f8f325240f@f9941';
const ROW_GREEN = '1d8b8656-5dab-4ded-9a65-25aa638cc7c9@f9941';
const ROW_FRAMES = [ROW_PINK, ROW_MINT, ROW_PEACH, ROW_GREEN];

const STAR_GOLD = 'bb12f2f9-dc1c-4558-989c-c84baff63421@f9941';
const STAR_PURPLE = '2baa681d-f283-4ff1-bb27-3f31d121838d@f9941';
const STAR_BRONZE = '6de293b8-4e4a-41a0-bafc-852319142910@f9941';

export interface GlyphSet {
    frames: string[];
    sizes: number[][];
}

export interface WordArt {
    frame: string;
    width: number;
    height: number;
}

/** 排名和关数数字: rank digits and the row level. */
export const RANK_DIGITS: GlyphSet = {
    frames: [
        '0ab9f5c3-64dd-45dd-8165-c9f551633349@f9941',
        '05749dc3-0f13-4a05-98e5-b0aebbf149f6@f9941',
        '5b152617-6b9b-449e-bffb-c22c58a0666d@f9941',
        '3e8989d2-2af9-43ae-a3b0-f97f351431e7@f9941',
        '9a41e132-4c0c-42c0-b5ea-fa5d5fb8e608@f9941',
        'f3b7f896-212a-4cbd-bbb1-1a40a830a6c8@f9941',
        'aa9446b6-1cb6-4f04-8ef3-6861b785326b@f9941',
        'f645c544-a5e6-4ea4-90da-80298a31441e@f9941',
        '5d693d3d-bb24-4d99-87d6-4aee1435cc18@f9941',
        '13d010bb-b1b4-4331-a31e-281a2ba25617@f9941',
    ],
    sizes: [
        [33, 38], [23, 37], [33, 37], [33, 38], [33, 37],
        [33, 38], [33, 38], [32, 37], [33, 38], [33, 38],
    ],
};

/** 关卡得分数大号: level on the bottom card. */
export const BIG_DIGITS: GlyphSet = {
    frames: [
        'e85530db-81b3-540c-aae0-87c73359e89d@f9941',
        '531747c2-aa7b-5087-a105-3b8b630841dd@f9941',
        '9598ee0d-fc06-5d4c-9d4b-582256182e1d@f9941',
        '3227679c-3a93-5b80-827d-a0eb0955b5f8@f9941',
        '9f12bf3b-5fb8-5c1f-8ace-df113d7428b4@f9941',
        'e642b889-ad3a-5908-be26-9e499a7ebeee@f9941',
        '6793f658-8250-5b30-91d2-4b12d3a189b5@f9941',
        '7f1b059f-a4a8-5a60-b4bf-b67542949078@f9941',
        'b4681022-1b49-553b-8943-57368929680c@f9941',
        'f20226f3-b702-5ad8-b4d9-c5c2ccde41ce@f9941',
    ],
    sizes: Array.from({ length: 10 }, () => [40, 48]),
};

export const LEVEL_SMALL: WordArt = { frame: 'a0e0bb2d-d747-5836-bbfe-e4ad090cbc71@f9941', width: 136, height: 45 };
export const LEVEL_BIG: WordArt = { frame: 'eb068a81-f629-5425-aa8e-b6eb441fce8d@f9941', width: 159, height: 51 };

/** 名字小字母 plus matching 0–9. Sizes are the trimmed PNGs; descent is how far the glyph drops below the baseline. */
const LETTERS: Record<string, { frame: string; w: number; h: number; descent: number }> = {
    a: { frame: 'bfd3da66-8b87-5371-ab0f-de01312f1d43@f9941', w: 27, h: 32, descent: 0 },
    b: { frame: 'cc8af52c-21ea-5818-8780-fb9c7d3927f9@f9941', w: 29, h: 45, descent: 0 },
    c: { frame: '07e2639e-4952-594b-b53b-dce2944ad894@f9941', w: 25, h: 32, descent: 0 },
    d: { frame: 'd504b6e4-29a5-54ca-a4ae-fab2e526d9a3@f9941', w: 29, h: 45, descent: 0 },
    e: { frame: 'c55713aa-4997-5db4-b19e-a8271456bab6@f9941', w: 28, h: 32, descent: 0 },
    f: { frame: '032131d3-eee5-5628-bff5-7f85948f4d4e@f9941', w: 21, h: 44, descent: 0 },
    g: { frame: '2b02dd43-4df2-511e-b7f5-808e7ccd34fc@f9941', w: 30, h: 45, descent: 13 },
    h: { frame: '5c71f727-4b9d-583a-ac27-786ec4b1f030@f9941', w: 27, h: 44, descent: 0 },
    i: { frame: '6661db93-63cd-5d89-86c8-f85db71f366c@f9941', w: 10, h: 44, descent: 0 },
    j: { frame: '370e9504-fdc2-51fc-bc22-1da91ba27613@f9941', w: 16, h: 57, descent: 13 },
    k: { frame: 'ffa5b721-8df5-5ae7-9bc7-9266ab28e920@f9941', w: 26, h: 45, descent: 0 },
    l: { frame: 'faa28283-53ce-5aa0-b5d7-728232c4feb9@f9941', w: 12, h: 45, descent: 0 },
    m: { frame: 'ebe80172-831c-5947-b2c9-63b0da4f3a40@f9941', w: 45, h: 31, descent: 0 },
    n: { frame: '66370a60-4c39-5800-97f7-acf0204c8d69@f9941', w: 27, h: 31, descent: 0 },
    o: { frame: '82adca07-04ab-5007-afa3-205926bb346a@f9941', w: 30, h: 32, descent: 0 },
    p: { frame: '5484d549-b37b-54ea-8141-cf1a1cfe1258@f9941', w: 29, h: 43, descent: 11 },
    q: { frame: '9be919b4-5954-530e-9763-07f038a6221a@f9941', w: 29, h: 43, descent: 11 },
    r: { frame: 'd01b36be-6b71-53c4-8104-57676a19325d@f9941', w: 20, h: 31, descent: 0 },
    s: { frame: '57db77e1-0b39-5a05-a6a1-62dba7d01b6d@f9941', w: 23, h: 32, descent: 0 },
    t: { frame: '6d4cbf66-de78-5e9d-bd1c-ec9532555a9a@f9941', w: 21, h: 40, descent: 0 },
    u: { frame: 'd44b8f2d-79e5-5c47-95b1-afedef09a8f6@f9941', w: 27, h: 32, descent: 0 },
    v: { frame: '47251f64-876c-5eca-bffc-cb5795cfa4fb@f9941', w: 27, h: 31, descent: 0 },
    w: { frame: '2ac19ce5-4841-59e4-8c34-d59587a507e2@f9941', w: 43, h: 31, descent: 0 },
    x: { frame: '0034af02-435f-57e8-8c53-f66b65e8c4ba@f9941', w: 24, h: 32, descent: 0 },
    y: { frame: '2ce8c526-7978-53da-993e-dbfab93a798a@f9941', w: 27, h: 44, descent: 12 },
    z: { frame: 'a7127186-2d52-53ce-9eae-26fef0a51b44@f9941', w: 24, h: 31, descent: 0 },
    '0': { frame: 'dedd1161-70c5-52c5-bcfd-525c54ab7e65@f9941', w: 27, h: 42, descent: 0 },
    '1': { frame: 'ecbe8772-9572-5c65-a16c-d32f5eca046e@f9941', w: 24, h: 40, descent: 0 },
    '2': { frame: '3728e93d-4c12-5a4a-8c86-8391840d99c3@f9941', w: 26, h: 41, descent: 0 },
    '3': { frame: '358d8773-9ece-5a81-9113-8e252a7b5dd8@f9941', w: 27, h: 42, descent: 0 },
    '4': { frame: '74ca5341-ca27-576b-9b2f-239a60b3cd84@f9941', w: 29, h: 40, descent: 0 },
    '5': { frame: '88eb0485-b4ec-5fce-853d-b8c5cf9545de@f9941', w: 27, h: 41, descent: 0 },
    '6': { frame: '11015dd5-bdc3-58ac-9cf7-b03aed169084@f9941', w: 26, h: 42, descent: 0 },
    '7': { frame: '903c3a9f-352f-5d85-9c59-c9849e7cd2cb@f9941', w: 26, h: 40, descent: 0 },
    '8': { frame: '8901737d-53a2-5b06-b76b-bddf9e7cd71a@f9941', w: 26, h: 42, descent: 0 },
    '9': { frame: '08fe08eb-1dc5-5317-a795-b569fc877c8b@f9941', w: 26, h: 42, descent: 0 },
};
const LETTER_X_HEIGHT = 32;

export function rowFrame(rank: number): string {
    const index = (Math.max(1, Math.floor(rank)) - 1) % ROW_FRAMES.length;
    return ROW_FRAMES[index];
}

/** Rank 1 gold, 2 purple, 3 bronze. Later ranks have no star art. */
export function starFrame(rank: number): string | null {
    if (rank === 1) return STAR_GOLD;
    if (rank === 2) return STAR_PURPLE;
    if (rank === 3) return STAR_BRONZE;
    return null;
}

/** The bottom card always keeps a star under the rank. After 3rd place it stays gold. */
export function currentStarFrame(rank: number): string {
    return starFrame(rank) ?? STAR_GOLD;
}

export function showFrame(sprite: Sprite, uuid: string | null): void {
    if (!uuid) {
        sprite.spriteFrame = null;
        return;
    }
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.type = Sprite.Type.SIMPLE;
    loadSpriteFrame(uuid, (frame) => {
        if (!sprite.isValid || !frame) return;
        sprite.spriteFrame = frame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.type = Sprite.Type.SIMPLE;
    });
}

/** Right-hand column: the "Level" word sprite above, digits below, both centered on columnX. */
export function layoutLevelColumn(
    word: Sprite,
    digits: Node,
    columnX: number,
    level: number,
    art: WordArt,
    wordHeight: number,
    digitHeight: number,
    digitSet: GlyphSet,
    gap: number,
): void {
    const wordWidth = wordHeight * (art.width / art.height);
    const total = wordHeight + gap + digitHeight;
    word.node.getComponent(UITransform)?.setContentSize(wordWidth, wordHeight);
    word.node.setPosition(columnX, total / 2 - wordHeight / 2, 0);
    showFrame(word, art.frame);
    digits.setPosition(columnX, -total / 2 + digitHeight / 2, 0);
    fillDigits(digits, level, digitHeight, digitSet);
}

/** Centers digit sprites in host. Returns the strip width. */
export function fillDigits(host: Node, value: number, digitHeight: number, set: GlyphSet = RANK_DIGITS): number {
    host.removeAllChildren();
    const text = `${Math.max(0, Math.floor(value))}`;
    const gap = Math.max(1, Math.round(digitHeight * 0.06));
    const pieces: { node: Node; width: number }[] = [];
    let total = 0;
    for (const ch of text) {
        const index = ch.charCodeAt(0) - 48;
        if (index < 0 || index > 9) continue;
        const [sourceW, sourceH] = set.sizes[index];
        const width = digitHeight * (sourceW / sourceH);
        const node = uiNode(`Digit${ch}`, width, digitHeight);
        node.setParent(host);
        const sprite = node.addComponent(Sprite);
        showFrame(sprite, set.frames[index]);
        pieces.push({ node, width });
        total += width;
    }
    if (pieces.length > 1) total += gap * (pieces.length - 1);
    const transform = host.getComponent(UITransform) ?? host.addComponent(UITransform);
    transform.setContentSize(Math.max(digitHeight * 0.4, total), digitHeight);
    transform.setAnchorPoint(0.5, 0.5);
    let cursor = -total / 2;
    pieces.forEach((piece) => {
        piece.node.setPosition(cursor + piece.width / 2, 0, 0);
        cursor += piece.width + gap;
    });
    return total;
}

/**
 * Left-aligned sprite-letter name with its x-height centered on host.
 * a–z, 0–9, and spaces share one face. Returns false for any other character so the caller can show a Label instead.
 */
export function fillName(host: Node, name: string, xHeight: number, maxWidth: number, gapRatio = 0.06): boolean {
    host.removeAllChildren();
    const text = name.trim().toLowerCase();
    if (!text || !/^[a-z0-9 ]+$/.test(text)) return false;
    let scale = xHeight / LETTER_X_HEIGHT;
    const spacing = () => Math.max(1, xHeight * gapRatio);
    const space = () => xHeight * 0.45;
    const measure = () => {
        let width = 0;
        for (let i = 0; i < text.length; i++) {
            const glyph = LETTERS[text[i]];
            width += glyph ? glyph.w * scale : space();
            if (i < text.length - 1) width += spacing();
        }
        return width;
    };
    let total = measure();
    if (total > maxWidth && total > 0) {
        const shrink = maxWidth / total;
        scale *= shrink;
        xHeight *= shrink;
        total = measure();
    }
    const transform = host.getComponent(UITransform) ?? host.addComponent(UITransform);
    transform.setAnchorPoint(0, 0.5);
    transform.setContentSize(Math.max(1, total), xHeight * 1.8);
    const baseline = -xHeight / 2;
    let cursor = 0;
    for (let i = 0; i < text.length; i++) {
        const glyph = LETTERS[text[i]];
        if (!glyph) {
            cursor += space() + spacing();
            continue;
        }
        const width = glyph.w * scale;
        const height = glyph.h * scale;
        const node = uiNode(`Letter_${text[i]}`, width, height);
        node.setParent(host);
        showFrame(node.addComponent(Sprite), glyph.frame);
        node.setPosition(cursor + width / 2, baseline - glyph.descent * scale + height / 2, 0);
        cursor += width + spacing();
    }
    return true;
}
