/**
 * Cluedoku! - Rule strip.
 * The three rules are baked into 说明.png, so this no longer paints cards.
 */

import { _decorator, Component, Graphics } from 'cc';

const { ccclass } = _decorator;

@ccclass('RuleBar')
export class RuleBar extends Component {
    protected onLoad(): void {
        this.relayout();
    }

    public relayout(): void {
        const panel = this.node.name === 'RulePanel' ? this.node : this.node;
        const graphics = panel.getComponents(Graphics);
        for (const g of graphics) {
            g.clear();
            g.enabled = false;
        }
        for (let i = 1; i <= 3; i++) {
            const card = panel.getChildByName(`RuleItem${i}`);
            if (card) card.active = false;
        }
    }
}
