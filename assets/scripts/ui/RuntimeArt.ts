/**
 * Keeps runtime-loaded art in the Android build.
 * The resources prefab serializes every sprite frame and prefab that scripts
 * load by uuid string. Those strings are not build dependencies on their own.
 */

import { _decorator, Component, Prefab, SpriteFrame } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('RuntimeArt')
export class RuntimeArt extends Component {
    @property([SpriteFrame])
    public frames: SpriteFrame[] = [];

    @property([Prefab])
    public prefabs: Prefab[] = [];
}
