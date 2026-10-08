/**
 * Pop animation for a suspect that was just placed.
 * Started only after the cell press has released.
 */

import { _decorator, Component, Node, Tween, Vec3, tween } from 'cc';

const { ccclass } = _decorator;

@ccclass('JellySuspect')
export class JellySuspect extends Component {
    private motion: Tween<Node> | null = null;
    private motionNode: Node | null = null;
    private readonly popped = new Vec3(1.12, 1.12, 1);
    private readonly settled = new Vec3(1, 1, 1);

    public showEffect(target?: Node | null): void {
        const node = target && target.isValid ? target : this.node;
        if (!node.isValid) return;
        if (this.motionNode !== node) {
            this.motion?.stop();
            this.motionNode = node;
            this.motion = tween(node)
                .to(0.14, { scale: this.popped }, { easing: 'quadOut' })
                .to(0.08, { scale: this.settled }, { easing: 'quadIn' });
        }
        this.motion?.stop();
        node.setScale(0, 0, 1);
        this.motion?.start();
    }

    protected onDisable(): void {
        this.motion?.stop();
    }
}
