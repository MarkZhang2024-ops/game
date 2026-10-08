/**
 * Shows one lobby page at a time.
 * Pages do not enable or disable each other.
 */

import { _decorator, Component, instantiate, Node, Prefab, UITransform, Widget } from 'cc';
import { AchievementPage } from './AchievementPage';
import { BottomNavigation, NavTab } from './BottomNavigation';
import { LeaderboardPage } from './LeaderboardPage';
import { LevelPage } from './LevelPage';
import { SettingsPanel } from './SettingsPanel';
import { setLayerTree, stretch, uiNode } from './UiKit';

const { ccclass, property } = _decorator;

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

    protected onLoad(): void {
        this.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        stretch(this.node);
        this.ensurePages();
        this.mountNavigation();
        this.showLevelPage();
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

    private mountNavigation(): void {
        this.attachNav(this.achievement, 'achievement');
        this.attachNav(this.level, 'home');
        this.attachNav(this.leaderboard, 'leaderboard');
    }

    private attachNav(page: { setNavigation(nav: BottomNavigation): void } | null, tab: NavTab): void {
        if (!page) return;
        const node = this.bottomNavPrefab ? instantiate(this.bottomNavPrefab) : uiNode('BottomNavigation', 1080, 210);
        setLayerTree(node);
        const nav = node.getComponent(BottomNavigation) ?? node.addComponent(BottomNavigation);
        nav.setHandler((next) => this.onNav(next));
        nav.setSelected(tab);
        page.setNavigation(nav);
    }

    private onNav(tab: NavTab): void {
        if (tab === 'achievement') this.showAchievementPage();
        else if (tab === 'home') this.showLevelPage();
        else this.showLeaderboardPage();
    }

    private showOnly(page: Node | null): void {
        this.settingsPanel?.hide();
        if (this.achievementPage) this.achievementPage.active = page === this.achievementPage;
        if (this.levelPage) this.levelPage.active = page === this.levelPage;
        if (this.leaderboardPage) this.leaderboardPage.active = page === this.leaderboardPage;
    }

    private relayout(): void {
        this.getComponentsInChildren(Widget).forEach((widget) => widget.updateAlignment());
        this.achievement?.relayout();
        this.level?.relayout();
        this.leaderboard?.relayout();
        if (this.settingsPanel?.node.active) this.settingsPanel.relayout();
    }
}
