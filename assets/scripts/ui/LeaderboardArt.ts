/**
 * Leaderboard SpriteFrame ids and the rank/level digit strip.
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

const DIGITS = [
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
];

const DIGIT_SIZE = [
    [33, 38], [23, 37], [33, 37], [33, 38], [33, 37],
    [33, 38], [33, 38], [32, 37], [33, 38], [33, 38],
];

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

/** Centers digit sprites in host. Returns the strip width. */
export function fillDigits(host: Node, value: number, digitHeight: number): number {
    host.removeAllChildren();
    const text = `${Math.max(0, Math.floor(value))}`;
    const gap = Math.max(1, Math.round(digitHeight * 0.06));
    const pieces: { node: Node; width: number }[] = [];
    let total = 0;
    for (const ch of text) {
        const index = ch.charCodeAt(0) - 48;
        if (index < 0 || index > 9) continue;
        const [sourceW, sourceH] = DIGIT_SIZE[index];
        const width = digitHeight * (sourceW / sourceH);
        const node = uiNode(`Digit${ch}`, width, digitHeight);
        node.setParent(host);
        const sprite = node.addComponent(Sprite);
        showFrame(sprite, DIGITS[index]);
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
