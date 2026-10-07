/**
 * Achievement page. Fixed chrome is SpriteFrame art. Cards are created from AchievementData
 * and scroll vertically. Header and bottom navigation stay put.
 */

import {
    _decorator,
    BlockInputEvents,
    Component,
    instantiate,
    Mask,
    Node,
    Prefab,
    ScrollView,
    Sprite,
    sys,
    UITransform,
    Vec2,
    view,
    Widget,
} from 'cc';
import { LevelManager } from '../core/LevelManager';
import { AchievementData, AchievementDataSource } from '../data/AchievementData';
import { AchievementCard } from './AchievementCard';
import { BottomNavigation } from './BottomNavigation';
import { loadByUuid } from './GameArt';
import { applySprite, setLayerTree, stretch, uiNode } from './UiKit';

const { ccclass, property } = _decorator;

const DESIGN_W = 1080;
const DESIGN_H = 2400;
const HEADER_H = 262;
const NAV_H = 210;
const TITLE_W = 593;
const TITLE_H = 89;
const CARD_W = 884;
const CARD_H = 839;
const CARD_SPACING = 100;
const PAD_TOP = 36;
const PAD_BOTTOM = 48;

const BACKGROUND = '471162c3-cb94-44f7-9550-f32800756f5f@f9941';
const HEADER_BAR = '935ed879-7ca9-47cf-bfb5-b059d4bc7915@f9941';
const TITLE = '5060190e-9453-4f46-8f88-5fe6b8813f7e@f9941';
const CARD_PREFAB = 'c0c05909-0009-4009-8009-000000000009';

const NAV_BAR = 'cab2fd53-8d8d-41d0-b006-e33c5ad2b132@f9941';
const NAV_CROWN = 'ae18f3b1-65cb-4c4d-aa71-7ae2fcf1f938@f9941';
const NAV_HOME = '417c9a44-a35c-43de-844b-4686c56e5747@f9941';
const NAV_CALENDAR = 'e8b5d506-858f-4e60-a873-f1a1dfc945c1@f9941';

function safeBottom(pageH: number): number {
    const safe = sys.getSafeAreaRect();
    const visible = view.getVisibleSize();
    if (safe.width <= 0 || safe.height <= 0 || visible.width <= 0 || visible.height <= 0) return 0;
    if (safe.width > visible.width + 2 || safe.height > visible.height + 2) return 0;
    return Math.max(0, safe.y) * (pageH / visible.height);
}

@ccclass('AchievementPage')
export class AchievementPage extends Component {
    @property(Prefab)
    cardPrefab: Prefab | null = null;

    @property(ScrollView)
    scrollView: ScrollView | null = null;

    @property(Node)
    content: Node | null = null;

    @property(Node)
    navSlot: Node | null = null;

    private navigation: BottomNavigation | null = null;
    private built = false;
    private layingOut = false;
    private prefabRequested = false;
    private background: Node | null = null;
    private header: Node | null = null;
    private titleNode: Node | null = null;
    private viewNode: Node | null = null;
    private cardWidth = CARD_W;
    private cardHeight = CARD_H;
    private cardSpacing = CARD_SPACING;
    private padTop = PAD_TOP;
    private padBottom = PAD_BOTTOM;
    private focusIndex = 0;

    protected onLoad(): void {
        this.ensureView();
        this.node.on(Node.EventType.SIZE_CHANGED, this.relayout, this);
    }

    protected onEnable(): void {
        this.refresh();
        this.navigation?.setSelected('achievement');
        this.scheduleOnce(this.relayout, 0);
    }

    protected onDestroy(): void {
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
        if (this.node.activeInHierarchy) navigation.setSelected('achievement');
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
        applySprite(backgroundSprite, BACKGROUND);

        this.header = uiNode('Header', DESIGN_W, HEADER_H);
        this.header.setParent(this.node);
        const headerSprite = this.header.addComponent(Sprite);
        headerSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        headerSprite.type = Sprite.Type.SIMPLE;
        applySprite(headerSprite, HEADER_BAR);

        this.titleNode = uiNode('AchievementTitle', TITLE_W, TITLE_H);
        this.titleNode.setParent(this.header);
        const titleSprite = this.titleNode.addComponent(Sprite);
        titleSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        titleSprite.type = Sprite.Type.SIMPLE;
        applySprite(titleSprite, TITLE);

        this.buildScroll();

        this.navSlot = uiNode('BottomNavigation', DESIGN_W, NAV_H);
        this.navSlot.setParent(this.node);
        this.mountNavigation();

        const popup = uiNode('PopupLayer', 0, 0);
        popup.setParent(this.node);
        this.loadCardPrefab();
        this.relayout();
    }

    public refresh(): void {
        if (!this.content) return;
        const entries = this.entries();
        this.content.removeAllChildren();
        entries.forEach((entry) => {
            const node = this.createAchievementCard(entry);
            node.setParent(this.content!);
        });
        this.layoutContent(true);
    }

    public relayout = (): void => {
        if (this.layingOut) return;
        this.layingOut = true;
        this.layoutChrome();
        this.layoutContent(false);
        this.layingOut = false;
    };

    private entries(): AchievementData[] {
        this.focusIndex = Math.max(0, LevelManager.getCurrentTier().tierId - 1);
        return AchievementDataSource.getAchievements();
    }

    private buildScroll(): void {
        const scrollNode = uiNode('AchievementScrollView', DESIGN_W, 1600);
        scrollNode.setParent(this.node);
        const scroll = scrollNode.addComponent(ScrollView);
        scroll.horizontal = false;
        scroll.vertical = true;
        scroll.inertia = true;
        scroll.elastic = true;
        scroll.cancelInnerEvents = true;

        this.viewNode = uiNode('View', DESIGN_W, 1600);
        this.viewNode.setParent(scrollNode);
        const mask = this.viewNode.addComponent(Mask);
        mask.type = Mask.Type.GRAPHICS_RECT;

        this.content = uiNode('Content', DESIGN_W, 1600);
        this.content.setParent(this.viewNode);
        const contentTransform = this.content.getComponent(UITransform)!;
        contentTransform.setAnchorPoint(0.5, 1);

        scroll.content = this.content;
        this.scrollView = scroll;
    }

    private loadCardPrefab(): void {
        if (this.cardPrefab || this.prefabRequested) return;
        this.prefabRequested = true;
        loadByUuid<Prefab>(CARD_PREFAB, (asset) => {
            if (!asset) return;
            if (!this.isValid) return;
            this.cardPrefab = asset;
            if (this.node.activeInHierarchy) this.refresh();
        });
    }

    private createAchievementCard(data: AchievementData): Node {
        const node = this.cardPrefab ? instantiate(this.cardPrefab) : uiNode('AchievementCard', this.cardWidth, this.cardHeight);
        setLayerTree(node);
        const card = node.getComponent(AchievementCard) ?? node.addComponent(AchievementCard);
        card.setCardSize(this.cardWidth, this.cardHeight);
        card.setData(data);
        card.setTierProgress(data.progress, `${data.completed} / ${data.total}`);
        return node;
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
        const headerH = HEADER_H * scale;
        const navH = NAV_H * scale;
        const bottom = safeBottom(pageH);
        this.cardWidth = CARD_W * scale;
        this.cardHeight = CARD_H * scale;
        this.cardSpacing = CARD_SPACING * scale;
        this.padTop = PAD_TOP * scale;
        this.padBottom = PAD_BOTTOM * scale;

        this.layoutBackground(pageW, pageH);
        this.place(this.header, 0, pageH / 2 - headerH / 2, pageW, headerH);
        this.titleNode?.getComponent(UITransform)?.setContentSize(TITLE_W * scale, TITLE_H * scale);
        this.titleNode?.setPosition(0, 0, 0);

        const scrollH = Math.max(120, pageH - headerH - navH - bottom);
        const scrollY = pageH / 2 - headerH - scrollH / 2;
        const scrollNode = this.scrollView?.node ?? null;
        this.place(scrollNode, 0, scrollY, pageW, scrollH);
        this.place(this.viewNode, 0, 0, pageW, scrollH);

        this.place(this.navSlot, 0, -pageH / 2 + bottom + navH / 2, pageW, navH);
        this.mountNavigation();
        this.node.getChildByName('PopupLayer')?.setSiblingIndex(this.node.children.length - 1);
    }

    private layoutBackground(pageW: number, pageH: number): void {
        if (!this.background) return;
        const scale = Math.max(pageW / DESIGN_W, pageH / DESIGN_H);
        const width = DESIGN_W * scale;
        const height = DESIGN_H * scale;
        this.background.getComponent(UITransform)?.setContentSize(width, height);
        this.background.setPosition(0, pageH / 2 - height / 2, 0);
        const sprite = this.background.getComponent(Sprite);
        if (sprite) {
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.type = Sprite.Type.SIMPLE;
        }
    }

    private layoutContent(resetScroll: boolean): void {
        if (!this.content || !this.viewNode) return;
        const viewTransform = this.viewNode.getComponent(UITransform);
        const contentTransform = this.content.getComponent(UITransform);
        if (!viewTransform || !contentTransform || viewTransform.height <= 0) return;
        const offset = resetScroll ? null : this.scrollView?.getScrollOffset().clone();
        const count = this.content.children.length;
        const width = this.cardWidth;
        const height = this.cardHeight;
        const spacing = this.cardSpacing;
        const contentHeight = count * height + Math.max(0, count - 1) * spacing + this.padTop + this.padBottom;
        contentTransform.setAnchorPoint(0.5, 1);
        contentTransform.setContentSize(viewTransform.width, Math.max(1, contentHeight));
        const bottom = -contentHeight + this.padBottom + height / 2;
        this.content.children.forEach((child, index) => {
            child.getComponent(AchievementCard)?.setCardSize(width, height);
            child.setPosition(0, bottom + index * (height + spacing), 0);
        });
        this.content.setPosition(0, viewTransform.height / 2, 0);
        if (resetScroll) {
            const maxY = Math.max(0, contentHeight - viewTransform.height);
            const cardBottom = contentHeight - this.padBottom - this.focusIndex * (height + spacing);
            const y = Math.max(0, Math.min(maxY, cardBottom - viewTransform.height));
            this.scrollView?.scrollToOffset(new Vec2(0, y), 0);
        } else if (offset) {
            this.scrollView?.scrollToOffset(offset, 0);
        }
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
