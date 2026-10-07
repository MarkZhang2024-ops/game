/**
 * Lightweight settings placeholder. It does not change the three main pages.
 */

import { _decorator, BlockInputEvents, Button, Color, Component, Label, Node, UITransform } from 'cc';
import { addButton, addLabel, gfx, paintPill, paintRound, Palette, pin, stretch, uiNode } from './UiKit';

const { ccclass, property } = _decorator;

@ccclass('SettingsPage')
export class SettingsPage extends Component {
    @property(Button)
    closeButton: Button | null = null;

    @property(Label)
    titleLabel: Label | null = null;

    private closeHandler: (() => void) | null = null;
    private built = false;
    private listening = false;

    protected onLoad(): void {
        this.ensureView();
    }

    protected onEnable(): void {
        this.bind();
    }

    protected onDisable(): void {
        this.unbind();
    }

    public setCloseHandler(handler: () => void): void {
        this.closeHandler = handler;
    }

    public ensureView(): void {
        if (this.built) return;
        this.built = true;
        this.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        this.getComponent(BlockInputEvents) ?? this.node.addComponent(BlockInputEvents);
        stretch(this.node);

        const dim = uiNode('Dim', 1080, 2280);
        dim.setParent(this.node);
        stretch(dim);
        dim.on(Node.EventType.SIZE_CHANGED, () => this.paintDim(dim), this);
        this.paintDim(dim);

        const panel = uiNode('Panel', 760, 460);
        panel.setParent(this.node);
        pin(panel, { horizontalCenter: 0, verticalCenter: 40 });
        paintRound(gfx(panel), 760, 460, Palette.cream, 36);
        this.titleLabel = addLabel(panel, 'Title', 'Settings', 56, Palette.ink, 640, 90);
        pin(this.titleLabel.node, { top: 36, horizontalCenter: 0 });
        const body = addLabel(panel, 'Body', 'Settings will be added later.', 32, Palette.ink, 640, 120);
        pin(body.node, { horizontalCenter: 0, verticalCenter: 10 });

        const close = uiNode('CloseButton', 280, 96);
        close.setParent(panel);
        pin(close, { bottom: 36, horizontalCenter: 0 });
        this.closeButton = addButton(close, 0.96);
        paintPill(gfx(close), 280, 84, Palette.candyPink, Palette.pinkDeep);
        const closeLabel = addLabel(close, 'Label', 'Close', 36, Palette.white, 240, 70);
        closeLabel.enableOutline = true;
        closeLabel.outlineColor = Palette.pinkDeep;
        closeLabel.outlineWidth = 2;
    }

    private paintDim(dim: Node): void {
        const transform = dim.getComponent(UITransform);
        if (!transform) return;
        const g = gfx(dim);
        g.clear();
        g.fillColor = new Color(40, 16, 28, 140);
        g.rect(-transform.width / 2, -transform.height / 2, transform.width, transform.height);
        g.fill();
    }

    private bind(): void {
        if (this.listening) return;
        this.listening = true;
        this.closeButton?.node.on(Button.EventType.CLICK, this.onClose, this);
    }

    private unbind(): void {
        if (!this.listening) return;
        this.listening = false;
        this.closeButton?.node.off(Button.EventType.CLICK, this.onClose, this);
    }

    private onClose(): void {
        this.closeHandler?.();
    }
}
