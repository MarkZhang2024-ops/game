/**
 * Shows one lobby page at a time.
 * Switching tabs slides the current page off and the next page in from that side.
 * Pages do not enable or disable each other.
 */

import { _decorator, BlockInputEvents, Component, instantiate, Node, Prefab, tween, Tween, UITransform, Vec3, Widget } from 'cc';
import { AchievementPage } from './AchievementPage';
import { BottomNavigation, NavTab } from './BottomNavigation';
import { LeaderboardPage } from './LeaderboardPage';
import { LevelPage } from './LevelPage';
import { SettingsPanel } from './SettingsPanel';
import { setLayerTree, stretch, uiNode } from './UiKit';

const { ccclass, property } = _decorator;

const SLIDE_SECONDS = 0.3;
const NAV_H = 211;
const NAV_BAR = 'cab2fd53-8d8d-41d0-b006-e33c5ad2b132@f9941';
const NAV_CROWN = 'ae18f3b1-65cb-4c4d-aa71-7ae2fcf1f938@f9941';
const NAV_HOME = '417c9a44-a35c-43de-844b-4686c56e5747@f9941';
const NAV_CALENDAR = 'e8b5d506-858f-4e60-a873-f1a1dfc945c1@f9941';

@ccclass('UIManager')
export class UIManager extends Component {
    @property(Node)
    achievementPage: Node | null = null;

    @property(Node)
    levelPage: Node | null = null;

    @property(Node)
    leaderboardPage: Node | null = null;

    @property(Node)
    settingsPage: Node | null = null;

    @property(Prefab)
    bottomNavPrefab: Prefab | null = null;

    @property(Prefab)
    leaderboardItemPrefab: Prefab | null = null;

    private achievement: AchievementPage | null = null;
    private level: LevelPage | null = null;
    private leaderboard: LeaderboardPage | null = null;
    private settingsPanel: SettingsPanel | null = null;
    private navigation: BottomNavigation | null = null;
    private navDock: Node | null = null;
    private shown: Node | null = null;
    private slideToken = 0;

    protected onLoad(): void {
        this.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        stretch(this.node);
        this.ensurePages();
        this.mountNavigation();
        this.node.on(Node.EventType.SIZE_CHANGED, this.layoutNavigation, this);
        this.showLevelPage();
    }

    protected onDestroy(): void {
        this.node.off(Node.EventType.SIZE_CHANGED, this.layoutNavigation, this);
    }

    protected start(): void {
        this.relayout();
    }

    public showAchievementPage(): void {
        this.showOnly(this.achievementPage);
    }

    public showLevelPage(): void {
        this.showOnly(this.levelPage);
    }

    public showLeaderboardPage(): void {
        this.showOnly(this.leaderboardPage);
    }

    public showSettingsPopup(): void {
        const panel = this.ensureSettingsPopup();
        panel.node.setSiblingIndex(panel.node.parent ? panel.node.parent.children.length - 1 : 0);
        panel.show();
    }

    private ensurePages(): void {
        if (!this.achievementPage) {
            this.achievementPage = this.createPage('AchievementPage');
            this.achievement = this.achievementPage.addComponent(AchievementPage);
        } else {
            this.achievement = this.achievementPage.getComponent(AchievementPage);
        }
        this.fitPage(this.achievementPage);
        this.achievement?.ensureView();

        if (!this.levelPage) {
            this.levelPage = this.createPage('LevelPage');
            this.level = this.levelPage.addComponent(LevelPage);
        } else {
            this.level = this.levelPage.getComponent(LevelPage);
        }
        this.fitPage(this.levelPage);
        this.level?.ensureView();
        this.level?.setSettingsHandler(() => this.showSettingsPopup());

        if (!this.leaderboardPage) {
            this.leaderboardPage = this.createPage('LeaderboardPage');
            this.leaderboard = this.leaderboardPage.addComponent(LeaderboardPage);
        } else {
            this.leaderboard = this.leaderboardPage.getComponent(LeaderboardPage);
        }
        this.fitPage(this.leaderboardPage);
        this.leaderboard?.ensureView();
        this.leaderboard?.setItemPrefab(this.leaderboardItemPrefab);
    }

    private ensureSettingsPopup(): SettingsPanel {
        if (this.settingsPanel?.isValid) return this.settingsPanel;
        const node = new Node('SettingsPanel');
        node.layer = this.node.layer;
        node.active = false;
        node.setParent(this.node);
        node.addComponent(UITransform);
        const panel = node.addComponent(SettingsPanel);
        panel.setCallbacks({
            onClose: () => panel.hide(),
            onResetProgress: () => panel.hide(),
        });
        this.settingsPanel = panel;
        return panel;
    }

    private createPage(name: string): Node {
        const node = uiNode(name, 1080, 2400);
        node.active = false;
        node.setParent(this.node);
        this.fitPage(node);
        return node;
    }

    /** Pages fill GameUI so the bottom bar sits on the screen edge. */
    private fitPage(page: Node | null): void {
        if (!page) return;
        stretch(page);
    }

    /** One bar for the lobby, parented here so page slides leave it in place. */
    private mountNavigation(): void {
        const dock = uiNode('BottomNavigationDock', 1080, NAV_H);
        dock.setParent(this.node);
        dock.addComponent(BlockInputEvents);
        this.navDock = dock;

        const node = this.bottomNavPrefab ? instantiate(this.bottomNavPrefab) : uiNode('BottomNavigation', 1080, NAV_H);
        setLayerTree(node);
        const nav = node.getComponent(BottomNavigation) ?? node.addComponent(BottomNavigation);
        nav.setHandler((next) => this.onNav(next));
        nav.mount(dock);
        nav.useLevelArt({
            bar: NAV_BAR,
            crown: NAV_CROWN,
            home: NAV_HOME,
            calendar: NAV_CALENDAR,
        });
        nav.setSelected('home');
        this.navigation = nav;
        this.layoutNavigation();
    }

    private layoutNavigation = (): void => {
        const dock = this.navDock;
        if (!dock) return;
        const size = this.node.getComponent(UITransform);
        const pageW = size?.width || 1080;
        const pageH = size?.height || 2400;
        if (pageW < 10 || pageH < 10) return;
        const barHeight = NAV_H * (pageW / 1080);
        dock.getComponent(UITransform)?.setContentSize(pageW, barHeight);
        dock.setPosition(0, -pageH / 2 + barHeight / 2, 0);
        this.navigation?.node.getComponent(Widget)?.updateAlignment();
        this.raiseNavigation();
    };

    private raiseNavigation(): void {
        const dock = this.navDock;
        const parent = dock?.parent;
        if (!dock || !parent) return;
        dock.setSiblingIndex(parent.children.length - 1);
        const settings = this.settingsPanel?.node;
        if (settings?.active && settings.parent === parent) {
            settings.setSiblingIndex(parent.children.length - 1);
        }
    }

    private tabOf(page: Node): NavTab {
        if (page === this.leaderboardPage) return 'leaderboard';
        if (page === this.achievementPage) return 'achievement';
        return 'home';
    }

    private onNav(tab: NavTab): void {
        if (tab === 'achievement') this.showAchievementPage();
        else if (tab === 'home') this.showLevelPage();
        else this.showLeaderboardPage();
    }

    private showOnly(page: Node | null): void {
        this.settingsPanel?.hide();
        if (!page || page === this.shown) return;
        const outgoing = this.shown;
        this.shown = page;
        this.navigation?.setSelected(this.tabOf(page));
        if (!outgoing) {
            this.rest(page, true);
            this.raiseNavigation();
            return;
        }
        this.slide(outgoing, page);
    }

    /**
     * Bottom bar, left to right: leaderboard, home, achievement.
     * A higher index enters from the right.
     */
    private pageIndex(page: Node): number {
        if (page === this.leaderboardPage) return 0;
        if (page === this.achievementPage) return 2;
        return 1;
    }

    private lobbyPages(): Node[] {
        return [this.leaderboardPage, this.levelPage, this.achievementPage].filter((page): page is Node => !!page);
    }

    /** Drop the page back on the screen and let its stretch widget own the rect again. */
    private rest(page: Node, active: boolean): void {
        Tween.stopAllByTarget(page);
        page.active = active;
        page.setPosition(0, 0, 0);
        const widget = page.getComponent(Widget);
        if (!widget) return;
        widget.enabled = true;
        if (active) widget.updateAlignment();
    }

    /** Freeze stretch so the slide can own position for a moment. */
    private park(page: Node): void {
        const widget = page.getComponent(Widget);
        if (widget) widget.enabled = false;
        const parent = this.node.getComponent(UITransform);
        const self = page.getComponent(UITransform);
        if (parent && self) self.setContentSize(parent.contentSize);
    }

    private slide(outgoing: Node, incoming: Node): void {
        const token = ++this.slideToken;
        const width = this.node.getComponent(UITransform)?.width || 1080;
        const dir = this.pageIndex(incoming) > this.pageIndex(outgoing) ? 1 : -1;
        this.lobbyPages().forEach((candidate) => {
            if (candidate !== outgoing && candidate !== incoming) this.rest(candidate, false);
        });
        Tween.stopAllByTarget(outgoing);
        Tween.stopAllByTarget(incoming);
        this.park(outgoing);
        this.park(incoming);

        const incomingX = incoming.active ? incoming.position.x : outgoing.position.x + dir * width;
        incoming.active = true;
        incoming.setPosition(incomingX, 0, 0);
        incoming.setSiblingIndex(this.node.children.length - 1);
        this.raiseNavigation();

        const delta = -incomingX;
        const seconds = Math.max(0.12, SLIDE_SECONDS * Math.min(1, Math.abs(incomingX) / Math.max(1, width)));
        const ease = { easing: 'cubicOut' as const };
        tween(outgoing)
            .to(seconds, { position: new Vec3(outgoing.position.x + delta, 0, 0) }, ease)
            .call(() => {
                if (token !== this.slideToken) return;
                this.rest(outgoing, false);
            })
            .start();
        tween(incoming)
            .to(seconds, { position: new Vec3(0, 0, 0) }, ease)
            .call(() => {
                if (token !== this.slideToken) return;
                this.rest(incoming, true);
            })
            .start();
    }

    private relayout(): void {
        this.getComponentsInChildren(Widget).forEach((widget) => widget.updateAlignment());
        this.achievement?.relayout();
        this.level?.relayout();
        this.leaderboard?.relayout();
        if (this.settingsPanel?.node.active) this.settingsPanel.relayout();
        this.layoutNavigation();
    }
}
