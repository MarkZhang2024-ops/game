/**
 * Cluedoku! - Splash screen controller.
 * Scene layout is fixed. Loading node is a bottom progress bar (no spinner).
 */

import {
    _decorator,
    Component,
    Node,
    tween,
    Tween,
    director,
    Graphics,
    UITransform,
    Color,
} from 'cc';
import { COLORS } from '../utils/Constants';

const { ccclass } = _decorator;

@ccclass('SplashController')
export class SplashController extends Component {
    private delayTime = 10;
    private readonly progress = { value: 0 };

    start(): void {
        this.layoutBar();
        this.startLoading();
        this.scheduleOnce(() => {
            this.enterLobby();
        }, this.delayTime);
    }

    protected onDestroy(): void {
        Tween.stopAllByTarget(this.progress);
    }

    private layoutBar(): void {
        const loading = this.findLoading();
        if (!loading) return;

        const icon = loading.getChildByName('LoadingIcon');
        if (icon) icon.active = false;

        const canvas = this.canvasNode();
        const canvasUt = canvas?.getComponent(UITransform);
        const barW = Math.max(240, (canvasUt?.width ?? 960) * 0.78);
        const barH = 20;
        const bottomPad = 72;
        const y = -((canvasUt?.height ?? 640) * 0.5) + bottomPad;

        loading.setPosition(0, y, 0);
        const ut = loading.getComponent(UITransform) || loading.addComponent(UITransform);
        ut.setAnchorPoint(0.5, 0.5);
        ut.setContentSize(barW, barH);
        this.drawProgress(0);
    }

    private startLoading(): void {
        Tween.stopAllByTarget(this.progress);
        this.progress.value = 0;
        tween(this.progress)
            .to(this.delayTime, { value: 1 }, {
                easing: 'quadOut',
                onUpdate: () => this.drawProgress(this.progress.value),
            })
            .start();
    }

    private drawProgress(t: number): void {
        const loading = this.findLoading();
        if (!loading) return;
        const ut = loading.getComponent(UITransform);
        const w = ut?.width ?? 720;
        const h = ut?.height ?? 20;
        const g = loading.getComponent(Graphics) || loading.addComponent(Graphics);
        g.clear();

        const r = h * 0.5;
        g.fillColor = new Color(255, 255, 255, 70);
        g.roundRect(-w / 2, -h / 2, w, h, r);
        g.fill();

        const ratio = Math.max(0, Math.min(1, t));
        const fillW = Math.max(ratio > 0 ? h : 0, w * ratio);
        if (fillW <= 0) return;

        g.fillColor = new Color(COLORS.btnOrange);
        g.roundRect(-w / 2, -h / 2, fillW, h, r);
        g.fill();
        g.fillColor = new Color(255, 255, 255, 80);
        g.roundRect(-w / 2, h * 0.08, fillW, h * 0.28, r * 0.4);
        g.fill();
    }

    private enterLobby(): void {
        director.loadScene('Lobby');
    }

    private canvasNode(): Node | null {
        return this.node.name === 'Canvas' ? this.node : this.node.parent;
    }

    private findLoading(): Node | null {
        return this.canvasNode()?.getChildByName('Loading') ?? null;
    }
}
