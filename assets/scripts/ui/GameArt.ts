/**
 * Sprite-frame ids for the candy game screen.
 * Static HUD art is assigned on the scene. Cells load the same frames at runtime
 * because the board is created from code.
 */

import { assetManager, Sprite, SpriteFrame } from 'cc';
import { CellColor } from '../puzzle/PuzzleTypes';

const TILE_YELLOW = '519e16e9-1087-4ecd-878f-52afba09a9df@f9941';
const TILE_RED = 'aa5deb51-7ff4-4069-8c5e-435b9147fca2@f9941';
const TILE_BLUE = '125b1ad6-9bd9-4194-8506-ac300f47c89d@f9941';
const TILE_PURPLE = '1eb6b846-2aab-4c37-bd86-ce631b934794@f9941';
const TILE_GREEN = 'fdd94f04-804b-425f-8935-5741629b0d41@f9941';
const TILE_PINK = 'a10fa827-d36c-4f85-9583-f74330a4a870@f9941';

export const MARK_X_FRAME = '96544d3f-edc0-449b-ba43-0c4fcde8c43d@f9941';
export const SUSPECT_FRAME = '01b5b235-cc6b-47e1-9051-9fe11838336f@f9941';

/** Sprite frames under assets/prefabs/cutpicture/game. */
export const GAME_FRAMES = {
    background: 'b58ba434-8e4e-4bed-b09c-54ac8e96ebdb@f9941',
    back: '0f5621f0-e922-4cba-860c-5deb28300cfa@f9941',
    setting: 'cb9b1d1d-af00-4b66-ae1f-095a5809b3d8@f9941',
    banner: 'aa95a317-4503-4fd5-ba2b-0f1fc1aef500@f9941',
    rules: '6548ec79-7268-49d8-aeaa-f4ef29e205b3@f9941',
    plate: '4417914f-2989-4d71-9ed2-4d12af0e1009@f9941',
    bear: '01b5b235-cc6b-47e1-9051-9fe11838336f@f9941',
    heart: 'dbec840c-7095-42d1-8a60-4ec04e70d6cb@f9941',
    frame: 'f9c3558a-a387-4d69-a496-61d52b5ec079@f9941',
    hint: '1da40428-dd49-40bf-bdb4-7ce9095c8765@f9941',
    tool: '02e8f773-3761-4831-82ad-99c81f8858ab@f9941',
} as const;

const TILE_BY_COLOR: Partial<Record<CellColor, string>> = {
    [CellColor.Yellow]: TILE_YELLOW,
    [CellColor.Red]: TILE_RED,
    [CellColor.Cyan]: TILE_BLUE,
    [CellColor.Purple]: TILE_PURPLE,
    [CellColor.Green]: TILE_GREEN,
    [CellColor.Pink]: TILE_PINK,
};

const TILE_CYCLE = [TILE_YELLOW, TILE_GREEN, TILE_BLUE, TILE_PURPLE, TILE_PINK, TILE_RED];

/**
 * Six candy tiles exist in cutpicture/game. Region colors without a dedicated
 * tile reuse that set. TODO: add tiles if a level needs a seventh distinct candy.
 */
export function tileFrameFor(color: CellColor): string {
    return TILE_BY_COLOR[color] ?? TILE_CYCLE[Math.abs(color) % TILE_CYCLE.length];
}

const cache = new Map<string, SpriteFrame>();
const waiters = new Map<string, Array<(frame: SpriteFrame | null) => void>>();

let resourcesReady = false;
let resourcesLoading = false;
const resourcesWaiters: Array<() => void> = [];

/**
 * String uuids are not build dependencies. RuntimeArt.prefab in assets/resources
 * lists every frame and prefab loaded this way, so the Android pack keeps them.
 * loadAny only sees that bundle after it is loaded.
 */
function ensureResources(done: () => void): void {
    if (resourcesReady || assetManager.getBundle('resources')) {
        resourcesReady = true;
        done();
        return;
    }
    resourcesWaiters.push(done);
    if (resourcesLoading) return;
    resourcesLoading = true;
    assetManager.loadBundle('resources', (err) => {
        resourcesLoading = false;
        if (!err) resourcesReady = true;
        const pending = resourcesWaiters.splice(0);
        for (const cb of pending) cb();
    });
}

export function loadByUuid<T>(uuid: string, done: (asset: T | null) => void, label = '[GameArt] load failed'): void {
    ensureResources(() => {
        assetManager.loadAny({ uuid }, (err: Error | null, asset: T) => {
            if (err || !asset) {
                if (err) console.warn(label, uuid, err);
                done(null);
                return;
            }
            done(asset);
        });
    });
}

export function loadSpriteFrame(uuid: string, done: (frame: SpriteFrame | null) => void): void {
    const cached = cache.get(uuid);
    if (cached && cached.isValid) {
        done(cached);
        return;
    }
    const pending = waiters.get(uuid);
    if (pending) {
        pending.push(done);
        return;
    }
    waiters.set(uuid, [done]);
    loadByUuid<SpriteFrame>(uuid, (frame) => {
        const list = waiters.get(uuid) ?? [];
        waiters.delete(uuid);
        if (frame) cache.set(uuid, frame);
        for (const cb of list) cb(frame);
    }, '[GameArt] sprite load failed');
}

export function applySpriteFrame(sprite: Sprite, uuid: string, onReady?: () => void): void {
    sprite.type = Sprite.Type.SIMPLE;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    loadSpriteFrame(uuid, (frame) => {
        if (!sprite.isValid || !frame) return;
        sprite.spriteFrame = frame;
        sprite.type = Sprite.Type.SIMPLE;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        onReady?.();
    });
}
