/**
 * Leaderboard. Fixed art stays put. Rows come from LeaderboardService and scroll.
 */

import {
    _decorator,
    BlockInputEvents,
    Color,
    Component,
    instantiate,
    Label,
    Mask,
    Node,
    Prefab,
    ScrollView,
    Sprite,
    UITransform,
    Widget,
} from 'cc';
import { GameDataManager } from '../core/GameDataManager';
import { LevelManager } from '../core/LevelManager';
import { LeaderboardEntry, LeaderboardResult } from '../data/LeaderboardData';
import { LeaderboardService } from '../data/LeaderboardService';
import { avatarFrame } from './AvatarConfig';
import { profileAvatar } from './ProfileAvatars';
import { BottomNavigation } from './BottomNavigation';
import { LeaderboardItem } from './LeaderboardItem';
import {
    fillDigits,
    LB_BACKGROUND,
    LB_DECORATION,
    LB_TITLE,
    LB_YOUR_RANK_CARD,
    LB_YOUR_RANK_RIBBON,
    showFrame,
    starFrame,
} from './LeaderboardArt';
import { addLabel, applySprite, setLayerTree, stretch, uiNode } from './UiKit';

const { ccclass, property } = _decorator;

const DESIGN_W = 1080;
const DESIGN_H = 2400;
const TITLE_W = 857;
const TITLE_H = 401;
const DECOR_W = 937;
const DECOR_H = 337;
const DECOR_TOP = 292;
const NAV_H = 210;
const ITEM_W = 1045;
const ITEM_H = 154;
const ITEM_GAP = 12;
const PAD_TOP = 8;
const PAD_BOTTOM = 20;
const RANK_CARD_W = 1040;
const RANK_CARD_H = 268;

const NAV_BAR = 'cab2fd53-8d8d-41d0-b006-e33c5ad2b132@f9941';
const NAV_CROWN = 'ae18f3b1-65cb-4c4d-aa71-7ae2fcf1f938@f9941';
const NAV_HOME = '417c9a44-a35c-43de-844b-4686c56e5747@f9941';
const NAV_CALENDAR = 'e8b5d506-858f-4e60-a873-f1a1dfc945c1@f9941';

const NAME_COLOR = new Color(112, 54, 28, 255);

@ccclass('LeaderboardPage')
export class LeaderboardPage extends Component {
    @property(Prefab)
    itemPrefab: Prefab | null = null;

    @property(ScrollView)
    scrollView: ScrollView | null = null;

    @property(Node)
    content: Node | null = null;

    @property(Node)
    navSlot: Node | null = null;

    private navigation: BottomNavigation | null = null;
    private built = false;
    private layingOut = false;
    private loadToken = 0;
    private result: LeaderboardResult | null = null;
    private background: Node | null = null;
    private titleNode: Node | null = null;
    private decoration: Node | null = null;
    private viewNode: Node | null = null;
    private statusLabel: Label | null = null;
    private currentCard: Node | null = null;
    private currentStar: Sprite | null = null;
    private currentRankDigits: Node | null = null;
    private currentAvatar: Sprite | null = null;
    private currentName: Label | null = null;
    private currentLevelCaption: Label | null = null;
    private currentLevelDigits: Node | null = null;
    private itemWidth = ITEM_W;
    private itemHeight = ITEM_H;
    private itemGap = ITEM_GAP;
    private padTop = PAD_TOP;
    private padBottom = PAD_BOTTOM;

    protected onLoad(): void {
        this.ensureView();
        this.node.on(Node.EventType.SIZE_CHANGED, this.relayout, this);
    }

    protected onEnable(): void {
        this.navigation?.setSelected('leaderboard');
        this.scheduleOnce(this.relayout, 0);
        this.reload();
    }

    protected onDisable(): void {
        this.loadToken++;
    }

    protected onDestroy(): void {
        this.loadToken++;
        this.node.off(Node.EventType.SIZE_CHANGED, this.relayout, this);
    }

    public setNavigation(navigation: BottomNavigation): void {
        this.navigation = navigation;
        navigation.useLevelArt({
            bar: NAV_BAR,
            crown: NAV_CROWN,
            home: NAV_HOME,
            calendar: NAV_CALENDAR,
        });
        this.mountNavigation();
        if (this.node.activeInHierarchy) navigation.setSelected('leaderboard');
    }

    public setItemPrefab(prefab: Prefab | null): void {
        this.itemPrefab = prefab;
        if (this.result && this.node.activeInHierarchy) this.renderEntries(this.result.entries, false);
    }

    public ensureView(): void {
        if (this.built) return;
        this.built = true;
        this.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        this.getComponent(BlockInputEvents) ?? this.node.addComponent(BlockInputEvents);
        stretch(this.node);

        this.background = uiNode('Background', DESIGN_W, DESIGN_H);
        this.background.setParent(this.node);
        const backgroundSprite = this.background.addComponent(Sprite);
        backgroundSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        backgroundSprite.type = Sprite.Type.SIMPLE;
        applySprite(backgroundSprite, LB_BACKGROUND);

        this.titleNode = uiNode('LeaderboardTitle', TITLE_W, TITLE_H);
        this.titleNode.setParent(this.node);
        const titleSprite = this.titleNode.addComponent(Sprite);
        titleSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        titleSprite.type = Sprite.Type.SIMPLE;
        applySprite(titleSprite, LB_TITLE);

        this.decoration = uiNode('HeaderDecoration', DECOR_W, DECOR_H);
        this.decoration.setParent(this.node);
        const decorSprite = this.decoration.addComponent(Sprite);
        decorSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        decorSprite.type = Sprite.Type.SIMPLE;
        applySprite(decorSprite, LB_DECORATION);

        this.buildScroll();
        this.buildCurrentRank();

        this.navSlot = uiNode('BottomNavigation', DESIGN_W, NAV_H);
        this.navSlot.setParent(this.node);
        this.mountNavigation();
        this.relayout();
    }

    public reload(): void {
        if (!this.content) return;
        const token = ++this.loadToken;
        this.result = null;
        this.content.removeAllChildren();
        this.setStatus('Loading...');
        this.paintCurrent(null);
        this.layoutContent(true);
        LeaderboardService.getLeaderboard().then(
            (result) => {
                if (!this.isValid || token !== this.loadToken) return;
                this.result = result;
                this.renderEntries(result.entries, true);
                this.paintCurrent(result.currentUser);
            },
            () => {
                if (!this.isValid || token !== this.loadToken) return;
                this.content?.removeAllChildren();
                this.setStatus("Couldn't load the leaderboard");
                this.paintCurrent(null);
            },
        );
    }

    public relayout = (): void => {
        if (this.layingOut) return;
        this.layingOut = true;
        this.layoutChrome();
        if (this.result) this.renderEntries(this.result.entries, false);
        else this.layoutContent(false);
        this.layingOut = false;
    };

    private buildScroll(): void {
        const scrollNode = uiNode('LeaderboardScrollView', DESIGN_W, 800);
        scrollNode.setParent(this.node);
        const scroll = scrollNode.addComponent(ScrollView);
        scroll.horizontal = false;
        scroll.vertical = true;
        scroll.inertia = true;
        scroll.elastic = true;
        scroll.cancelInnerEvents = true;

        this.viewNode = uiNode('View', DESIGN_W, 800);
        this.viewNode.setParent(scrollNode);
        const mask = this.viewNode.addComponent(Mask);
        mask.type = Mask.Type.GRAPHICS_RECT;

        this.content = uiNode('Content', DESIGN_W, 800);
        this.content.setParent(this.viewNode);
        this.content.getComponent(UITransform)?.setAnchorPoint(0.5, 1);

        const status = uiNode('Status', 720, 80);
        status.setParent(scrollNode);
        this.statusLabel = addLabel(status, 'StatusLabel', '', 32, NAME_COLOR, 720, 80);

        scroll.content = this.content;
        this.scrollView = scroll;
    }

    private buildCurrentRank(): void {
        this.currentCard = uiNode('CurrentUserRank', RANK_CARD_W, RANK_CARD_H);
        this.currentCard.setParent(this.node);
        const cardSprite = this.currentCard.addComponent(Sprite);
        cardSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        cardSprite.type = Sprite.Type.SIMPLE;
        applySprite(cardSprite, LB_YOUR_RANK_CARD);

        const star = uiNode('Rank', 120, 120);
        star.setParent(this.currentCard);
        this.currentStar = star.addComponent(Sprite);
        this.currentRankDigits = uiNode('RankDigits', 48, 48);
        this.currentRankDigits.setParent(star);

        const avatar = uiNode('Avatar', 120, 120);
        avatar.setParent(this.currentCard);
        this.currentAvatar = avatar.addComponent(Sprite);

        const ribbon = uiNode('YourRank', 168, 56);
        ribbon.setParent(this.currentCard);
        const ribbonSprite = ribbon.addComponent(Sprite);
        ribbonSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        ribbonSprite.type = Sprite.Type.SIMPLE;
        applySprite(ribbonSprite, LB_YOUR_RANK_RIBBON);

        this.currentName = addLabel(this.currentCard, 'PlayerName', '', 36, NAME_COLOR, 360, 64);
        this.currentName.horizontalAlign = Label.HorizontalAlign.LEFT;
        this.currentName.node.getComponent(UITransform)?.setAnchorPoint(0, 0.5);

        this.currentLevelCaption = addLabel(this.currentCard, 'LevelCaption', 'Level', 22, NAME_COLOR, 160, 36);
        this.currentLevelCaption.horizontalAlign = Label.HorizontalAlign.RIGHT;
        this.currentLevelCaption.node.getComponent(UITransform)?.setAnchorPoint(1, 0.5);

        this.currentLevelDigits = uiNode('LevelDigits', 120, 48);
        this.currentLevelDigits.setParent(this.currentCard);
    }

    private renderEntries(entries: LeaderboardEntry[], resetScroll: boolean): void {
        if (!this.content) return;
        this.content.removeAllChildren();
        if (entries.length === 0) {
            this.setStatus('No rankings yet');
        } else {
            this.setStatus('');
            entries.forEach((entry, index) => {
                const node = this.createItem(this.withTier(entry, index));
                node.setParent(this.content!);
            });
        }
        this.layoutContent(resetScroll);
    }

    /** Server tierId wins. Otherwise row order is Tier 1..5. Ranges stay in LEVEL_TIERS. */
    private withTier(entry: LeaderboardEntry, index: number): LeaderboardEntry {
        const requested = entry.tierId && entry.tierId > 0 ? Math.floor(entry.tierId) : index + 1;
        const tier = LevelManager.getTierById(requested);
        return { ...entry, tierId: tier?.tierId ?? requested };
    }

    private createItem(entry: LeaderboardEntry): Node {
        const node = this.itemPrefab ? instantiate(this.itemPrefab) : uiNode('LeaderboardItem', this.itemWidth, this.itemHeight);
        setLayerTree(node);
        const item = node.getComponent(LeaderboardItem) ?? node.addComponent(LeaderboardItem);
        item.setItemSize(this.itemWidth, this.itemHeight);
        item.setData(entry);
        return node;
    }

    private paintCurrent(entry: LeaderboardEntry | null): void {
        if (!this.currentCard || !this.currentStar || !this.currentAvatar || !this.currentRankDigits || !this.currentLevelDigits) return;
        this.applyLocalPlayer();
        const ranked = !!entry;
        this.currentStar.node.active = ranked;
        this.currentRankDigits.active = ranked;
        if (!entry) return;
        const star = starFrame(entry.rank);
        this.currentStar.enabled = !!star;
        showFrame(this.currentStar, star);
        const height = this.currentCard.getComponent(UITransform)?.height ?? RANK_CARD_H;
        fillDigits(this.currentRankDigits, entry.rank, height * 0.16);
        this.layoutCurrent();
    }

    /** Name, portrait, and level follow the saved profile and the current frontier. */
    private applyLocalPlayer(): void {
        if (!this.currentCard || !this.currentAvatar || !this.currentLevelDigits) return;
        const profile = GameDataManager.getProfile();
        if (this.currentName) this.currentName.string = profile.playerName;
        this.currentAvatar.node.active = true;
        showFrame(this.currentAvatar, avatarFrame(profile.avatarId) ?? profileAvatar(profile.avatarId).portrait);
        if (this.currentLevelCaption) this.currentLevelCaption.node.active = true;
        this.currentLevelDigits.active = true;
        const height = this.currentCard.getComponent(UITransform)?.height ?? RANK_CARD_H;
        fillDigits(this.currentLevelDigits, LevelManager.getCurrentLevel(), height * 0.16);
        this.layoutCurrent();
    }

    private setStatus(text: string): void {
        if (!this.statusLabel) return;
        this.statusLabel.string = text;
        this.statusLabel.node.active = text.length > 0;
    }

    private mountNavigation(): void {
        if (!this.navigation || !this.navSlot) return;
        if (this.navigation.node.parent !== this.navSlot) this.navigation.mount(this.navSlot);
        this.navigation.node.getComponent(Widget)?.updateAlignment();
    }

    private layoutChrome(): void {
        const size = this.getComponent(UITransform);
        const pageW = size?.width || DESIGN_W;
        const pageH = size?.height || DESIGN_H;
        if (pageW < 10 || pageH < 10) return;
        const scale = pageW / DESIGN_W;
        const bottom = 0;
        const navH = NAV_H * scale;
        const rankW = RANK_CARD_W * scale;
        const rankH = RANK_CARD_H * scale;
        const headerBottom = (DECOR_TOP + DECOR_H) * scale;
        const scrollTop = headerBottom + 12 * scale;
        const scrollBottom = bottom + navH + rankH + 16 * scale;
        const scrollH = Math.max(80, pageH - scrollTop - scrollBottom);

        this.itemWidth = ITEM_W * scale;
        this.itemHeight = ITEM_H * scale;
        this.itemGap = ITEM_GAP * scale;
        this.padTop = PAD_TOP * scale;
        this.padBottom = PAD_BOTTOM * scale;

        this.layoutBackground(pageW, pageH);
        this.placeTop(this.titleNode, (DESIGN_W - TITLE_W) / 2, 8, TITLE_W, TITLE_H, pageW, pageH, scale);
        this.placeTop(this.decoration, (DESIGN_W - DECOR_W) / 2, DECOR_TOP, DECOR_W, DECOR_H, pageW, pageH, scale);

        const scrollY = pageH / 2 - scrollTop - scrollH / 2;
        this.place(this.scrollView?.node ?? null, 0, scrollY, pageW, scrollH);
        this.place(this.viewNode, 0, 0, pageW, scrollH);
        this.statusLabel?.node.setPosition(0, 0, 0);
        this.statusLabel?.node.getComponent(UITransform)?.setContentSize(pageW * 0.8, 80 * scale);

        const rankY = -pageH / 2 + bottom + navH + 12 * scale + rankH / 2;
        this.place(this.currentCard, 0, rankY, rankW, rankH);
        this.layoutCurrent();

        this.place(this.navSlot, 0, -pageH / 2 + bottom + navH / 2, pageW, navH);
        this.mountNavigation();
        this.navSlot?.setSiblingIndex(this.node.children.length - 1);
    }

    private layoutCurrent(): void {
        if (!this.currentCard) return;
        const size = this.currentCard.getComponent(UITransform);
        const width = size?.width ?? RANK_CARD_W;
        const height = size?.height ?? RANK_CARD_H;
        const left = -width / 2;
        const star = height * 0.46;
        this.currentStar?.node.getComponent(UITransform)?.setContentSize(star, star);
        this.currentStar?.node.setPosition(left + height * 0.48, height * 0.06, 0);
        const avatar = height * 0.46;
        this.currentAvatar?.node.getComponent(UITransform)?.setContentSize(avatar, avatar);
        this.currentAvatar?.node.setPosition(left + height * 1.12, height * 0.08, 0);
        const ribbon = this.currentCard.getChildByName('YourRank');
        ribbon?.getComponent(UITransform)?.setContentSize(height * 0.7, height * 0.22);
        ribbon?.setPosition(left + height * 1.12, -height * 0.22, 0);
        this.currentName?.node.getComponent(UITransform)?.setContentSize(width * 0.36, height * 0.28);
        this.currentName?.node.setPosition(left + height * 1.55, height * 0.1, 0);
        if (this.currentName) this.currentName.fontSize = Math.max(18, Math.round(height * 0.13));
        this.currentLevelCaption?.node.getComponent(UITransform)?.setContentSize(height * 0.7, height * 0.16);
        this.currentLevelCaption?.node.setPosition(width / 2 - height * 0.22, height * 0.12, 0);
        if (this.currentLevelCaption) this.currentLevelCaption.fontSize = Math.max(14, Math.round(height * 0.09));
        this.currentLevelDigits?.setPosition(width / 2 - height * 0.55, -height * 0.08, 0);
    }

    private layoutBackground(pageW: number, pageH: number): void {
        if (!this.background) return;
        const scale = Math.max(pageW / DESIGN_W, pageH / DESIGN_H);
        const width = DESIGN_W * scale;
        const height = DESIGN_H * scale;
        this.background.getComponent(UITransform)?.setContentSize(width, height);
        this.background.setPosition(0, pageH / 2 - height / 2, 0);
    }

    private layoutContent(resetScroll: boolean): void {
        if (!this.content || !this.viewNode) return;
        const viewTransform = this.viewNode.getComponent(UITransform);
        const contentTransform = this.content.getComponent(UITransform);
        if (!viewTransform || !contentTransform || viewTransform.height <= 0) return;
        const offset = resetScroll ? null : this.scrollView?.getScrollOffset().clone();
        const count = this.content.children.length;
        const contentHeight = count * this.itemHeight
            + Math.max(0, count - 1) * this.itemGap
            + this.padTop
            + this.padBottom;
        contentTransform.setAnchorPoint(0.5, 1);
        contentTransform.setContentSize(viewTransform.width, Math.max(1, contentHeight));
        this.content.children.forEach((child, index) => {
            child.getComponent(LeaderboardItem)?.setItemSize(this.itemWidth, this.itemHeight);
            const y = -this.padTop - this.itemHeight / 2 - index * (this.itemHeight + this.itemGap);
            child.setPosition(0, y, 0);
        });
        this.content.setPosition(0, viewTransform.height / 2, 0);
        if (resetScroll) this.scrollView?.scrollToTop(0);
        else if (offset) this.scrollView?.scrollToOffset(offset, 0);
    }

    private placeTop(
        node: Node | null,
        designX: number,
        designY: number,
        designW: number,
        designH: number,
        pageW: number,
        pageH: number,
        scale: number,
    ): void {
        if (!node) return;
        const width = designW * scale;
        const height = designH * scale;
        const x = (designX + designW / 2) * scale - pageW / 2;
        const y = pageH / 2 - (designY + designH / 2) * scale;
        this.place(node, x, y, width, height);
    }

    private place(node: Node | null, x: number, y: number, width: number, height: number): void {
        if (!node) return;
        node.getComponent(UITransform)?.setContentSize(width, height);
        node.setPosition(x, y, 0);
        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.type = Sprite.Type.SIMPLE;
        }
    }
}
