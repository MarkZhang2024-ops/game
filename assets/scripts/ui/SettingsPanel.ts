/**
 * Cluedoku! - Settings popup on the game screen.
 *
 * Scene still owns SettingsPanel / CloseButton / ResetButton.
 * CloseButton is the Leave candy and only hides this popup. ResetButton stays in the scene but is hidden.
 * Sound, music, vibration, and the bell persist. A red slash shows when one is off.
 */

import {
    _decorator, BlockInputEvents, Color, Component, EventTouch, Label, Node, Sprite,
    tween, Tween, UITransform, Vec3,
} from 'cc';
import { SaveData } from '../core/GameState';
import { SaveManager } from '../core/SaveManager';
import { applySpriteFrame } from './GameArt';
import { findDeep, GAME_UI } from './GamePageLayout';
import { whiteFrame } from './UiKit';

const { ccclass } = _decorator;

const FRAME = 'c3a90ccc-7800-4526-9a96-a2514cb04deb@f9941';
const LEAVE = 'cd50aeff-8ed7-4fcb-95ed-af408ba00079@f9941';
const OFF = '4172163c-3fcd-4f1b-8b64-6894c4defaf5@f9941';
const ICON_SOUND = 'c57c1009-55f4-40f4-b430-3bc6a495b73f@f9941';
const ICON_MUSIC = '5fc8d0ec-767b-4d17-9198-ebd3a623b1e4@f9941';
const ICON_VIBE = '2d9eb0db-2d67-40bf-969c-f4e4949d688f@f9941';
const ICON_BELL = 'd9f1676d-3d11-4358-a01e-05ce81a22bf1@f9941';
const ICON_HELP = 'f59a0d2a-4e97-456c-aaf4-234ee846f022@f9941';
const ICON_INFO = 'c7a9820b-bef3-4929-b4b0-b84cbddb53e6@f9941';

type ToggleKey = 'soundOn' | 'musicOn' | 'vibrationOn' | 'bellOn';

const TOGGLES: { name: string; frame: string; key: ToggleKey }[] = [
    { name: 'SoundButton', frame: ICON_SOUND, key: 'soundOn' },
    { name: 'MusicButton', frame: ICON_MUSIC, key: 'musicOn' },
    { name: 'VibeButton', frame: ICON_VIBE, key: 'vibrationOn' },
    { name: 'BellButton', frame: ICON_BELL, key: 'bellOn' },
];

export interface SettingsCallbacks {
    onClose(): void;
    onResetProgress(): void;
}

@ccclass('SettingsPanel')
export class SettingsPanel extends Component {
    private callbacks: SettingsCallbacks | null = null;
    private bound = false;
    private dressed = false;
    private artMounted = false;
    private offMarks = new Map<ToggleKey, Node>();

    protected onLoad(): void {
        this.dress();
        this.bind();
        this.place();
        this.scheduleOnce(() => this.mountArt(), 0);
    }

    public setCallbacks(cb: SettingsCallbacks): void {
        this.callbacks = cb;
        this.bind();
    }

    public show(): void {
        this.dress();
        this.bind();
        this.refreshToggles();
        this.place();
        this.node.active = true;
        this.node.setScale(1, 1, 1);
        this.scheduleOnce(() => this.mountArt(), 0);
        this.popSheet();
    }

    public hide(): void {
        this.node.active = false;
    }

    public relayout(): void {
        if (!this.dressed) this.dress();
        this.place();
    }

    private bind(): void {
        if (this.bound) return;
        const leave = this.node.getChildByName('CloseButton')
            || this.node.getChildByName('Sheet')?.getChildByName('CloseButton');
        if (!leave) return;
        this.bound = true;
        leave?.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            this.callbacks?.onClose();
        });
        this.node.getChildByName('ResetButton')?.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            SaveManager.resetProgress();
            this.callbacks?.onResetProgress();
        });
    }

    private dress(): void {
        if (this.dressed) return;
        this.dressed = true;

        const dim = this.ensureChild(this.node, 'Dim');
        const dimSprite = dim.getComponent(Sprite) || dim.addComponent(Sprite);
        dimSprite.spriteFrame = whiteFrame();
        dimSprite.type = Sprite.Type.SIMPLE;
        dimSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        dimSprite.color = new Color(36, 12, 28, 176);
        if (!dim.getComponent(BlockInputEvents)) dim.addComponent(BlockInputEvents);
        dim.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            this.callbacks?.onClose();
        });

        const sheet = this.ensureChild(this.node, 'Sheet');
        if (!sheet.getComponent(BlockInputEvents)) sheet.addComponent(BlockInputEvents);
        this.ensureChild(sheet, 'Frame');

        for (const item of TOGGLES) {
            const button = this.ensureChild(sheet, item.name);
            const off = this.ensureChild(button, 'Off');
            this.offMarks.set(item.key, off);
            const onToggle = (event: EventTouch) => {
                event.propagationStopped = true;
                this.toggle(item.key);
            };
            button.on(Node.EventType.TOUCH_END, onToggle);
            off.on(Node.EventType.TOUCH_END, onToggle);
        }
        this.ensureChild(sheet, 'HelpButton');
        this.ensureChild(sheet, 'InfoButton');

        let leave = this.node.getChildByName('CloseButton') || sheet.getChildByName('CloseButton');
        if (!leave) {
            leave = this.ensureChild(sheet, 'CloseButton');
        } else if (leave.parent !== sheet) {
            leave.setParent(sheet);
        }
        this.releaseLabel(leave);

        const reset = this.node.getChildByName('ResetButton');
        if (reset) reset.active = false;

        this.refreshToggles();
    }

    private mountArt(): void {
        if (this.artMounted || !this.node.activeInHierarchy) return;
        const leave = this.sheet()?.getChildByName('CloseButton');
        if (leave?.getComponent(Label)) {
            this.scheduleOnce(() => this.mountArt(), 0);
            return;
        }
        this.artMounted = true;
        const sheet = this.sheet();
        const frame = sheet?.getChildByName('Frame');
        if (frame) this.paint(frame, FRAME);
        for (const item of TOGGLES) {
            const button = sheet?.getChildByName(item.name);
            if (button) this.paint(button, item.frame);
            const off = button?.getChildByName('Off');
            if (off) this.paint(off, OFF);
        }
        const help = sheet?.getChildByName('HelpButton');
        const info = sheet?.getChildByName('InfoButton');
        if (help) this.paint(help, ICON_HELP);
        if (info) this.paint(info, ICON_INFO);
        if (leave) this.paint(leave, LEAVE);
        this.refreshToggles();
    }

    private toggle(key: ToggleKey): void {
        const save = SaveManager.load();
        const next = !save[key];
        const patch: Partial<SaveData> = {};
        patch[key] = next;
        SaveManager.update(patch);
        this.refreshToggles();
    }

    private refreshToggles(): void {
        const save = SaveManager.load();
        for (const item of TOGGLES) {
            const off = this.offMarks.get(item.key);
            if (off) off.active = !save[item.key];
        }
    }

    private place(): void {
        const canvas = this.canvasNode();
        const canvasUt = canvas?.getComponent(UITransform);
        const width = canvasUt?.width ?? GAME_UI.designWidth;
        const height = canvasUt?.height ?? GAME_UI.designHeight;
        const unit = width / GAME_UI.designWidth;
        const safeNode = canvas ? findDeep(canvas, 'SafeArea') : null;
        const safeUt = safeNode?.getComponent(UITransform);
        const sw = safeUt?.width ?? width;
        const sh = safeUt?.height ?? height;
        const ox = safeNode?.position.x ?? 0;
        const oy = safeNode?.position.y ?? 0;

        const rootUt = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
        rootUt.setContentSize(width, height);

        const dim = this.node.getChildByName('Dim');
        this.setSize(dim, width + 8, height + 8);
        dim?.setPosition(0, 0, 0);

        let frameW = Math.min(938 * unit, sw - 36 * unit);
        let frameH = frameW * (1207 / 938);
        const maxH = sh * 0.86;
        if (frameH > maxH) {
            frameH = maxH;
            frameW = frameH * (938 / 1207);
        }
        const s = frameW / 938;

        const sheet = this.sheet();
        if (sheet) sheet.setPosition(ox, oy, 0);
        this.placeArt(sheet?.getChildByName('Frame') || null, 0, 0, frameW, frameH);

        const icon = 168 * s;
        const col = 210 * s;
        const rowUp = 110 * s;
        const rowDown = -120 * s;
        const slots = [
            [-col, rowUp], [0, rowUp], [col, rowUp],
            [-col, rowDown], [0, rowDown], [col, rowDown],
        ];
        const names = ['SoundButton', 'MusicButton', 'VibeButton', 'BellButton', 'HelpButton', 'InfoButton'];
        names.forEach((name, index) => {
            const button = sheet?.getChildByName(name) || null;
            const [x, y] = slots[index];
            this.placeArt(button, x, y, icon, icon * (197 / 193));
            const off = button?.getChildByName('Off') || null;
            this.placeArt(off, 0, 0, icon * 0.82, icon * 0.82 * (175 / 163));
            off?.setSiblingIndex(button ? button.children.length - 1 : 0);
        });

        const leaveW = Math.min(610 * s, frameW * 0.72);
        const leaveH = leaveW * (179 / 610);
        this.placeArt(sheet?.getChildByName('CloseButton') || null, 0, -388 * s, leaveW, leaveH);

        const order = ['Frame', 'SoundButton', 'MusicButton', 'VibeButton', 'BellButton', 'HelpButton', 'InfoButton', 'CloseButton'];
        order.forEach((name, index) => sheet?.getChildByName(name)?.setSiblingIndex(index));
        dim?.setSiblingIndex(0);
        sheet?.setSiblingIndex(this.node.children.length - 1);
    }

    private popSheet(): void {
        const sheet = this.sheet();
        if (!sheet) return;
        Tween.stopAllByTarget(sheet);
        sheet.setScale(0.86, 0.86, 1);
        tween(sheet)
            .to(0.22, { scale: new Vec3(1.04, 1.04, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private sheet(): Node | null {
        return this.node.getChildByName('Sheet');
    }

    private canvasNode(): Node | null {
        let n: Node | null = this.node;
        while (n) {
            if (n.name === 'Canvas') return n;
            n = n.parent;
        }
        return this.node.parent;
    }

    private ensureChild(parent: Node, name: string): Node {
        let node = parent.getChildByName(name);
        if (!node) {
            node = new Node(name);
            node.layer = this.node.layer;
            node.setParent(parent);
        }
        node.layer = this.node.layer;
        node.active = true;
        // Touch and BlockInputEvents register this node immediately. The event
        // sorter reads UITransform.cameraPriority, so the transform must exist first.
        if (!node.getComponent(UITransform)) node.addComponent(UITransform);
        return node;
    }

    private releaseLabel(node: Node | null): void {
        const label = node?.getComponent(Label);
        if (!label) return;
        label.enabled = false;
        label.destroy();
    }

    private paint(node: Node, frame: string): void {
        const sprite = node.getComponent(Sprite) || node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.color = Color.WHITE;
        applySpriteFrame(sprite, frame, () => {
            if (!sprite.isValid) return;
            sprite.enabled = false;
            sprite.enabled = true;
        });
    }

    private placeArt(node: Node | null, x: number, y: number, width: number, height: number): void {
        if (!node) return;
        this.setSize(node, width, height);
        node.setPosition(x, y, 0);
    }

    private setSize(node: Node | null, width: number, height: number): void {
        if (!node) return;
        const ut = node.getComponent(UITransform) || node.addComponent(UITransform);
        ut.setContentSize(width, height);
    }
}
