/**
 * Rule hint sheet. Continue only closes the sheet.
 * Suspects and X marks stay on the board.
 */

import {
    _decorator,
    BlockInputEvents,
    Color,
    Component,
    Graphics,
    Label,
    Node,
    Sprite,
    UITransform,
    Widget,
} from 'cc';
import { applySpriteFrame } from './GameArt';
import { addButton, addLabel, stretch, uiNode, whiteFrame } from './UiKit';

const { ccclass } = _decorator;

const CONTINUE = '50b25afa-5aa7-46db-bfb2-0b5d7524e984@f9941';
const PANEL_W = 920;
const PANEL_H = 210;
const BUTTON_W = 520;
const BUTTON_H = 226;

@ccclass('HintPopup')
export class HintPopup extends Component {
    private built = false;
    private panel: Node | null = null;
    private message: Label | null = null;
    private continueButton: Node | null = null;
    private onContinue: (() => void) | null = null;

    public show(message: string, onContinue: () => void): void {
        this.ensure();
        this.onContinue = onContinue;
        if (this.message) this.message.string = message;
        this.node.active = true;
        this.node.setSiblingIndex(this.node.parent ? this.node.parent.children.length - 1 : 0);
        this.node.getComponent(Widget)?.updateAlignment();
        this.layout();
        this.scheduleOnce(() => this.layout(), 0);
    }

    public hide(): void {
        this.onContinue = null;
        this.node.active = false;
    }

    public layout(): void {
        if (!this.built) return;
        const size = this.getComponent(UITransform);
        const width = size?.width || 1080;
        const height = size?.height || 2400;
        const unit = width / 1080;
        const panelW = Math.min(PANEL_W * unit, width - 48 * unit);
        const panelH = panelW * (PANEL_H / PANEL_W);
        this.drawPanel(panelW, panelH);
        this.panel?.setPosition(0, height * 0.16, 0);
        const text = this.message?.node;
        text?.getComponent(UITransform)?.setContentSize(panelW * 0.88, panelH * 0.72);
        text?.setPosition(0, 0, 0);
        if (this.message) {
            const font = Math.max(22, Math.round(32 * unit));
            this.message.fontSize = font;
            this.message.lineHeight = Math.round(font * 1.25);
        }
        const buttonW = Math.min(BUTTON_W * unit, width - 80 * unit);
        const buttonH = buttonW * (BUTTON_H / BUTTON_W);
        this.continueButton?.getComponent(UITransform)?.setContentSize(buttonW, buttonH);
        this.continueButton?.setPosition(0, -height * 0.34, 0);
    }

    private ensure(): void {
        if (this.built) return;
        this.built = true;
        const root = this.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        root.setContentSize(1080, 2400);
        stretch(this.node);

        const dim = uiNode('Mask', 1080, 2400);
        dim.setParent(this.node);
        stretch(dim);
        const dimSprite = dim.addComponent(Sprite);
        dimSprite.spriteFrame = whiteFrame();
        dimSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        dimSprite.type = Sprite.Type.SIMPLE;
        dimSprite.color = new Color(40, 16, 32, 120);
        dim.addComponent(BlockInputEvents);

        this.panel = uiNode('Panel', PANEL_W, PANEL_H);
        this.panel.setParent(this.node);
        this.panel.addComponent(Graphics);
        this.message = addLabel(this.panel, 'Message', '', 32, new Color(122, 48, 72, 255), PANEL_W * 0.88, PANEL_H * 0.72);
        this.message.overflow = Label.Overflow.SHRINK;
        this.message.enableWrapText = true;

        this.continueButton = uiNode('ContinueButton', BUTTON_W, BUTTON_H);
        this.continueButton.setParent(this.node);
        const button = addButton(this.continueButton, 0.96);
        const sprite = this.continueButton.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.type = Sprite.Type.SIMPLE;
        applySpriteFrame(sprite, CONTINUE);
        button.node.on(Node.EventType.TOUCH_END, () => this.onContinue?.(), this);
    }

    private drawPanel(width: number, height: number): void {
        const graphics = this.panel?.getComponent(Graphics);
        if (!graphics) return;
        this.panel?.getComponent(UITransform)?.setContentSize(width, height);
        graphics.clear();
        const radius = Math.min(36, height * 0.28);
        graphics.fillColor = new Color(255, 244, 248, 255);
        graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        graphics.fill();
        graphics.lineWidth = Math.max(4, height * 0.045);
        graphics.strokeColor = new Color(244, 150, 184, 255);
        const inset = graphics.lineWidth;
        graphics.roundRect(-width / 2 + inset, -height / 2 + inset, width - inset * 2, height - inset * 2, radius * 0.85);
        graphics.stroke();
    }
}
