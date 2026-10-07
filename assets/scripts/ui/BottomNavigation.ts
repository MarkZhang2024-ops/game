/**
 * Bottom navigation shared by the three lobby pages.
 * Clicks are reported upward; this component does not open pages itself.
 */

import { _decorator, Button, Component, Graphics, Node, Sprite, UITransform } from 'cc';
import {
    addButton,
    applySprite,
    gfx,
    paintClipboard,
    paintCrown,
    paintHouse,
    paintRound,
    Palette,
    pin,
    uiNode,
} from './UiKit';

export interface LevelNavArt {
    bar: string;
    crown: string;
    home: string;
    calendar: string;
}

const { ccclass, property } = _decorator;

export type NavTab = 'achievement' | 'home' | 'leaderboard';

@ccclass('BottomNavigation')
export class BottomNavigation extends Component {
    @property(Button)
    achievementButton: Button | null = null;

    @property(Button)
    homeButton: Button | null = null;

    @property(Button)
    leaderboardButton: Button | null = null;

    @property(Node)
    achievementIcon: Node | null = null;

    @property(Node)
    homeIcon: Node | null = null;

    @property(Node)
    leaderboardIcon: Node | null = null;

    @property(Node)
    barNode: Node | null = null;

    private handler: ((tab: NavTab) => void) | null = null;
    private selected: NavTab = 'achievement';
    private listening = false;
    private artMode = false;
    private artReady = false;
    private art: LevelNavArt | null = null;

    protected onLoad(): void {
        this.ensureButtons();
        this.node.on(Node.EventType.SIZE_CHANGED, this.relayout, this);
    }

    protected onEnable(): void {
        this.bind();
        this.relayout();
    }

    protected onDisable(): void {
        this.unbind();
    }

    protected onDestroy(): void {
        this.node.off(Node.EventType.SIZE_CHANGED, this.relayout, this);
        this.unbind();
    }

    public setHandler(handler: (tab: NavTab) => void): void {
        this.handler = handler;
    }

    public setSelected(tab: NavTab): void {
        this.selected = tab;
        this.paint();
    }

    /**
     * Level page only. Other lobby pages keep the Graphics bar.
     * Icons stay on the same buttons, so the existing click handler is unchanged.
     */
    public useLevelArt(art: LevelNavArt): void {
        this.artMode = true;
        this.art = art;
        this.ensureButtons();
        this.ensureArt();
        this.layoutArt();
    }

    private ensureButtons(): void {
        if (this.achievementButton && this.homeButton && this.leaderboardButton) {
            return;
        }
        this.barNode = uiNode('Bar', 1000, 168);
        this.barNode.setParent(this.node);

        const achievement = this.makeButton('AchievementButton', 150);
        const home = this.makeButton('HomeButton', 168);
        const leaderboard = this.makeButton('LeaderboardButton', 150);
        this.achievementButton = achievement.button;
        this.homeButton = home.button;
        this.leaderboardButton = leaderboard.button;
        this.achievementIcon = achievement.icon;
        this.homeIcon = home.icon;
        this.leaderboardIcon = leaderboard.icon;
    }

    private makeButton(name: string, size: number): { button: Button; icon: Node } {
        const node = uiNode(name, size, size);
        node.setParent(this.node);
        const button = addButton(node, 0.94);
        const icon = uiNode('Icon', size * 0.62, size * 0.62);
        icon.setParent(node);
        return { button, icon };
    }

    private relayout = (): void => {
        if (this.artMode) {
            this.layoutArt();
            return;
        }
        const transform = this.node.getComponent(UITransform);
        const width = transform?.width ?? 1080;
        const height = transform?.height ?? 210;
        if (this.barNode) {
            const barTransform = this.barNode.getComponent(UITransform)!;
            barTransform.setContentSize(Math.max(280, width - 36), Math.min(176, height - 28));
            this.barNode.setPosition(0, -10, 0);
        }
        const columns = [-width / 3, 0, width / 3];
        const buttons = [this.achievementButton, this.homeButton, this.leaderboardButton];
        buttons.forEach((button, index) => {
            if (!button) return;
            button.node.setPosition(columns[index], index === 1 ? 16 : 8, 0);
        });
        this.paint();
    };

    private paint(): void {
        if (this.artMode) {
            this.layoutArt();
            return;
        }
        if (this.barNode) {
            const barTransform = this.barNode.getComponent(UITransform)!;
            const g = gfx(this.barNode);
            g.clear();
            paintRound(g, barTransform.width, barTransform.height, Palette.brown, 28);
            g.fillColor = Palette.cream;
            g.roundRect(-barTransform.width / 2, barTransform.height / 2 - 28, barTransform.width, 36, 18);
            g.fill();
        }
        this.paintTab(this.achievementButton, this.achievementIcon, 'leaderboard', paintCrown);
        this.paintTab(this.homeButton, this.homeIcon, 'home', paintHouse);
        this.paintTab(this.leaderboardButton, this.leaderboardIcon, 'achievement', paintClipboard);
    }

    private paintTab(
        button: Button | null,
        icon: Node | null,
        tab: NavTab,
        draw: (g: Graphics, size: number) => void,
    ): void {
        if (!button || !icon) return;
        const selected = this.selected === tab;
        const transform = button.node.getComponent(UITransform)!;
        const g = gfx(button.node);
        g.clear();
        if (selected) {
            g.fillColor = Palette.candyPink;
            g.circle(0, 0, transform.width * 0.46);
            g.fill();
            g.fillColor = Palette.white;
            g.circle(0, 0, transform.width * 0.38);
            g.fill();
        }
        button.node.setScale(selected ? 1.12 : 1, selected ? 1.12 : 1, 1);
        const iconTransform = icon.getComponent(UITransform)!;
        draw(gfx(icon), iconTransform.width);
    }

    private bind(): void {
        if (this.listening) return;
        this.listening = true;
        this.achievementButton?.node.on(Button.EventType.CLICK, this.onLeaderboard, this);
        this.homeButton?.node.on(Button.EventType.CLICK, this.onHome, this);
        this.leaderboardButton?.node.on(Button.EventType.CLICK, this.onAchievement, this);
    }

    private unbind(): void {
        if (!this.listening) return;
        this.listening = false;
        this.achievementButton?.node.off(Button.EventType.CLICK, this.onLeaderboard, this);
        this.homeButton?.node.off(Button.EventType.CLICK, this.onHome, this);
        this.leaderboardButton?.node.off(Button.EventType.CLICK, this.onAchievement, this);
    }

    private ensureArt(): void {
        if (this.artReady || !this.art || !this.barNode) return;
        this.artReady = true;
        this.paintArt(this.barNode, this.art.bar, 1080, 211);
        this.paintArt(this.achievementIcon, this.art.crown, 105, 103);
        this.paintArt(this.homeIcon, this.art.home, 100, 104);
        this.paintArt(this.leaderboardIcon, this.art.calendar, 96, 102);
        // Crown (排行榜) stays on the left and opens the leaderboard.
        // Clipboard (成就) stays on the right and opens achievements.
    }

    private paintArt(host: Node | null, uuid: string, width: number, height: number): void {
        if (!host) return;
        const graphics = host.getComponent(Graphics);
        if (graphics) {
            graphics.clear();
            graphics.enabled = false;
        }
        let art = host.getChildByName('Art');
        if (!art) {
            art = new Node('Art');
            art.layer = host.layer;
            art.setParent(host);
            const transform = art.addComponent(UITransform);
            transform.setAnchorPoint(0.5, 0.5);
        }
        const transform = art.getComponent(UITransform)!;
        transform.setContentSize(width, height);
        const sprite = art.getComponent(Sprite) ?? art.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.type = Sprite.Type.SIMPLE;
        applySprite(sprite, uuid);
    }

    /** Centers measured on the 1080×211 bar in design/level.png. */
    private layoutArt(): void {
        if (!this.art) return;
        this.ensureArt();
        const transform = this.node.getComponent(UITransform);
        const width = transform?.width ?? 1080;
        const height = transform?.height ?? 211;
        const sx = width / 1080;
        const sy = height / 211;
        if (this.barNode) {
            const barTransform = this.barNode.getComponent(UITransform)!;
            barTransform.setContentSize(width, height);
            this.barNode.setPosition(0, 0, 0);
            const art = this.barNode.getChildByName('Art');
            art?.getComponent(UITransform)?.setContentSize(width, height);
            const graphics = this.barNode.getComponent(Graphics);
            if (graphics) {
                graphics.clear();
                graphics.enabled = false;
            }
        }
        this.placeArtButton(this.achievementButton, this.achievementIcon, 105, 103, -369.5, -18, sx, sy);
        this.placeArtButton(this.homeButton, this.homeIcon, 100, 104, 3, -17.5, sx, sy);
        this.placeArtButton(this.leaderboardButton, this.leaderboardIcon, 96, 102, 360, -17.5, sx, sy);
    }

    private placeArtButton(
        button: Button | null,
        icon: Node | null,
        width: number,
        height: number,
        x: number,
        y: number,
        sx: number,
        sy: number,
    ): void {
        if (!button || !icon) return;
        const graphics = button.node.getComponent(Graphics);
        if (graphics) {
            graphics.clear();
            graphics.enabled = false;
        }
        const iconGraphics = icon.getComponent(Graphics);
        if (iconGraphics) {
            iconGraphics.clear();
            iconGraphics.enabled = false;
        }
        button.node.setScale(1, 1, 1);
        button.node.setPosition(x * sx, y * sy, 0);
        button.node.getComponent(UITransform)?.setContentSize(220 * sx, 180 * sy);
        icon.setPosition(0, 0, 0);
        icon.getComponent(UITransform)?.setContentSize(width * sx, height * sy);
        icon.getChildByName('Art')?.getComponent(UITransform)?.setContentSize(width * sx, height * sy);
    }

    private onAchievement(): void { this.handler?.('achievement'); }
    private onHome(): void { this.handler?.('home'); }
    private onLeaderboard(): void { this.handler?.('leaderboard'); }

    public mount(parent: Node): void {
        this.node.setParent(parent);
        pin(this.node, { left: 0, right: 0, top: 0, bottom: 0 });
    }
}
