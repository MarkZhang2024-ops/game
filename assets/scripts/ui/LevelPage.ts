/**
 * Level entrance. The Level button calls GameManager.startLevel and does not run puzzle rules.
 * Visuals are the 1080×2400 level comp. The middle name, level, and picture
 * follow the same tier card as Achievement.
 */

import {
    _decorator,
    BlockInputEvents,
    Button,
    Color,
    Component,
    Label,
    Node,
    Sprite,
    UITransform,
    Vec2,
    Widget,
} from 'cc';
import { GameDataManager } from '../core/GameDataManager';
import { GameManager } from '../core/GameManager';
import { LevelManager } from '../core/LevelManager';
import { AchievementDataSource } from '../data/AchievementData';
import { BottomNavigation } from './BottomNavigation';
import { loadSpriteFrame } from './GameArt';
import { profileAvatar } from './ProfileAvatars';
import { ProfilePopup } from './ProfilePopup';
import { addButton, addLabel, applySprite, stretch, uiNode } from './UiKit';

const { ccclass, property } = _decorator;

const DESIGN_W = 1080;
const DESIGN_H = 2400;

const BACKGROUND = 'fba4d57d-c412-49e8-ad23-e6c505cd4244@f9941';
const AVATAR = '99c5183a-52ef-43bb-8ad2-eb4e50a349ee@f9941';
const NAME_PLATE = 'e66524ae-b6a8-47a5-838f-5f3620135ab5@f9941';
const SETTINGS = 'fb71f1eb-494b-4ba0-b1ef-c7029436d106@f9941';
const LEVEL_BUTTON = '8aaa2b72-a04b-442a-884b-c8bf0133d28b@f9941';
const UNDERLINE_NUMBER = '51ea4e4f-721f-4ee7-96fd-ba5749d5c754@f9941';
const UNDERLINE_SCENE = '38c3d952-be75-4c45-81b6-b57fb8fedd2b@f9941';

const NAV_BAR = 'cab2fd53-8d8d-41d0-b006-e33c5ad2b132@f9941';
const NAV_CROWN = 'ae18f3b1-65cb-4c4d-aa71-7ae2fcf1f938@f9941';
const NAV_HOME = '417c9a44-a35c-43de-844b-4686c56e5747@f9941';
const NAV_CALENDAR = 'e8b5d506-858f-4e60-a873-f1a1dfc945c1@f9941';

const NAME_COLOR = new Color(72, 19, 15, 255);
const CAPTION_COLOR = new Color(103, 42, 23, 255);
const VALUE_COLOR = new Color(246, 39, 134, 255);
const BUTTON_TEXT = new Color(255, 255, 255, 255);
const BUTTON_SHADOW = new Color(18, 120, 42, 170);

interface DesignRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

const CARD_RECT: DesignRect = { x: 76, y: 489, w: 915, h: 1121 };

@ccclass('LevelPage')
export class LevelPage extends Component {
    @property(Sprite)
    avatarSprite: Sprite | null = null;

    @property(Button)
    avatarButton: Button | null = null;

    @property(Label)
    playerNameLabel: Label | null = null;

    @property(Button)
    settingsButton: Button | null = null;

    @property(Label)
    numberCaption: Label | null = null;

    @property(Label)
    numberValue: Label | null = null;

    @property(Label)
    sceneCaption: Label | null = null;

    @property(Label)
    sceneName: Label | null = null;

    @property(Sprite)
    sceneImage: Sprite | null = null;

    @property(Button)
    levelButton: Button | null = null;

    @property(Label)
    levelButtonLabel: Label | null = null;

    @property(Node)
    navSlot: Node | null = null;

    private navigation: BottomNavigation | null = null;
    private settingsHandler: (() => void) | null = null;
    private profilePopup: ProfilePopup | null = null;
    private built = false;
    private listening = false;
    private background: Node | null = null;
    private previewToken = 0;
    private shownCard = '';
    private layingOut = false;

    protected onLoad(): void {
        this.ensureView();
        this.node.on(Node.EventType.SIZE_CHANGED, this.relayout, this);
    }

    protected onEnable(): void {
        this.bind();
        this.refresh();
        this.navigation?.setSelected('home');
        this.scheduleOnce(this.relayout, 0);
    }

    protected onDisable(): void {
        this.profilePopup?.close();
        this.unbind();
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
        if (this.navSlot) {
            navigation.mount(this.navSlot);
            navigation.node.getComponent(Widget)?.updateAlignment();
        }
        if (this.node.activeInHierarchy) navigation.setSelected('home');
    }

    public setSettingsHandler(handler: () => void): void {
        this.settingsHandler = handler;
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

        const top = uiNode('TopUI', 0, 0);
        top.setParent(this.node);

        const plate = uiNode('PlayerNamePanel', 396, 137);
        plate.setParent(top);
        const plateSprite = plate.addComponent(Sprite);
        plateSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        plateSprite.type = Sprite.Type.SIMPLE;
        applySprite(plateSprite, NAME_PLATE);
        this.playerNameLabel = addLabel(plate, 'PlayerName', '', 34, NAME_COLOR, 250, 64);
        this.playerNameLabel.enableOutline = false;
        this.playerNameLabel.node.setPosition(52, 0, 0);

        const avatar = uiNode('CharacterIcon', 224, 219);
        avatar.setParent(top);
        this.avatarButton = addButton(avatar, 0.96);
        this.avatarSprite = avatar.addComponent(Sprite);
        this.avatarSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.avatarSprite.type = Sprite.Type.SIMPLE;
        applySprite(this.avatarSprite, AVATAR);

        const settings = uiNode('SettingsButton', 164, 164);
        settings.setParent(top);
        this.settingsButton = addButton(settings, 0.92);
        const settingsSprite = settings.addComponent(Sprite);
        settingsSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        settingsSprite.type = Sprite.Type.SIMPLE;
        applySprite(settingsSprite, SETTINGS);

        const card = uiNode('LevelInfoCard', CARD_RECT.w, CARD_RECT.h);
        card.setParent(this.node);

        const cardArt = uiNode('CardBackground', 915, 1121);
        cardArt.setParent(card);
        this.sceneImage = cardArt.addComponent(Sprite);
        this.sceneImage.sizeMode = Sprite.SizeMode.CUSTOM;
        this.sceneImage.type = Sprite.Type.SIMPLE;

        const numberLine = uiNode('NumberUnderline', 376, 3);
        numberLine.setParent(card);
        applySprite(numberLine.addComponent(Sprite), UNDERLINE_NUMBER);
        const sceneLine = uiNode('SceneUnderline', 415, 3);
        sceneLine.setParent(card);
        applySprite(sceneLine.addComponent(Sprite), UNDERLINE_SCENE);

        this.numberCaption = addLabel(card, 'NumberCaption', 'Number:', 32, CAPTION_COLOR, 200, 40);
        this.numberCaption.horizontalAlign = Label.HorizontalAlign.LEFT;
        this.numberValue = addLabel(card, 'NumberValue', '01', 34, VALUE_COLOR, 140, 44);
        this.numberValue.horizontalAlign = Label.HorizontalAlign.LEFT;

        this.sceneCaption = addLabel(card, 'SceneCaption', 'Scene:', 32, CAPTION_COLOR, 160, 40);
        this.sceneCaption.horizontalAlign = Label.HorizontalAlign.LEFT;
        this.sceneName = addLabel(card, 'SceneName', '', 34, VALUE_COLOR, 420, 44);
        this.sceneName.horizontalAlign = Label.HorizontalAlign.LEFT;
        this.sceneName.overflow = Label.Overflow.SHRINK;

        const button = uiNode('LevelButton', 630, 262);
        button.setParent(this.node);
        this.levelButton = addButton(button, 0.96);
        const buttonArt = uiNode('Background', 630, 262);
        buttonArt.setParent(button);
        const buttonSprite = buttonArt.addComponent(Sprite);
        buttonSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        buttonSprite.type = Sprite.Type.SIMPLE;
        applySprite(buttonSprite, LEVEL_BUTTON);
        this.levelButtonLabel = addLabel(button, 'LevelLabel', 'Level 1', 68, BUTTON_TEXT, 630, 262);
        this.levelButtonLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.levelButtonLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.levelButtonLabel.enableOutline = true;
        this.levelButtonLabel.outlineColor = new Color(255, 255, 255, 200);
        this.levelButtonLabel.outlineWidth = 1;
        this.levelButtonLabel.enableShadow = true;
        this.levelButtonLabel.shadowColor = BUTTON_SHADOW;
        this.levelButtonLabel.shadowOffset = new Vec2(0, -4);
        this.levelButtonLabel.shadowBlur = 2;
        this.levelButtonLabel.node.setPosition(0, 0, 0);

        this.navSlot = uiNode('BottomNavigation', DESIGN_W, 211);
        this.navSlot.setParent(this.node);

        const popup = uiNode('PopupLayer', 0, 0);
        popup.setParent(this.node);

        const profile = uiNode('ProfilePopup', DESIGN_W, DESIGN_H);
        profile.active = false;
        profile.setParent(this.node);
        this.profilePopup = profile.addComponent(ProfilePopup);
        this.profilePopup.setSavedHandler(() => this.refresh());

        this.refresh();
        this.relayout();
    }

    public refresh(): void {
        const profile = GameDataManager.getProfile();
        const level = LevelManager.getCurrentLevel();
        const scene = AchievementDataSource.sceneForLevel(level);
        if (this.playerNameLabel) this.playerNameLabel.string = profile.playerName;
        if (this.avatarSprite) applySprite(this.avatarSprite, profileAvatar(profile.avatarId).header);
        if (this.numberValue) this.numberValue.string = `${level}`.padStart(2, '0');
        if (this.sceneName) this.sceneName.string = scene.title;
        if (this.levelButtonLabel) this.levelButtonLabel.string = `Level ${level}`;
        this.showCard(scene.image);
    }

    public relayout = (): void => {
        if (this.layingOut) return;
        this.layingOut = true;
        const size = this.getComponent(UITransform);
        const pageW = size?.width || DESIGN_W;
        const pageH = size?.height || DESIGN_H;
        this.layoutBackground(pageW, pageH);

        const top = this.node.getChildByName('TopUI');
        this.place(top?.getChildByName('PlayerNamePanel') ?? null, { x: 114, y: 102, w: 396, h: 137 }, pageW, pageH);
        this.place(top?.getChildByName('CharacterIcon') ?? null, { x: 13, y: 66, w: 224, h: 219 }, pageW, pageH);
        this.place(top?.getChildByName('SettingsButton') ?? null, { x: 893, y: 93, w: 164, h: 164 }, pageW, pageH);

        const card = this.node.getChildByName('LevelInfoCard');
        this.place(card, CARD_RECT, pageW, pageH);
        this.placeIn(card?.getChildByName('CardBackground') ?? null, CARD_RECT, CARD_RECT);
        this.placeIn(this.numberCaption?.node ?? null, { x: 243, y: 800, w: 200, h: 40 }, CARD_RECT);
        this.placeIn(this.numberValue?.node ?? null, { x: 450, y: 798, w: 140, h: 44 }, CARD_RECT);
        this.placeIn(this.sceneCaption?.node ?? null, { x: 242, y: 852, w: 160, h: 40 }, CARD_RECT);
        this.placeIn(this.sceneName?.node ?? null, { x: 410, y: 850, w: 400, h: 44 }, CARD_RECT);
        this.placeIn(card?.getChildByName('NumberUnderline') ?? null, { x: 438, y: 836, w: 376, h: 3 }, CARD_RECT);
        this.placeIn(card?.getChildByName('SceneUnderline') ?? null, { x: 399, y: 884, w: 415, h: 3 }, CARD_RECT);

        const barHeight = 211 * (pageW / DESIGN_W);
        const barTop = pageH - barHeight;
        let buttonY = 1749;
        if (buttonY + 262 > barTop - 24) buttonY = barTop - 24 - 262;
        this.place(this.levelButton?.node ?? null, { x: 223, y: buttonY, w: 630, h: 262 }, pageW, pageH);
        this.centerLevelLabel();

        this.layoutNav(pageW, pageH, barHeight);
        this.node.getChildByName('PopupLayer')?.setSiblingIndex(this.node.children.length - 1);
        this.profilePopup?.node.setSiblingIndex(this.node.children.length - 1);
        this.profilePopup?.layout();
        this.layingOut = false;
    };

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

    private centerLevelLabel(): void {
        const button = this.levelButton?.node;
        const label = this.levelButtonLabel;
        if (!button || !label) return;
        const size = button.getComponent(UITransform);
        const width = size?.width ?? 630;
        const height = size?.height ?? 262;
        label.node.getComponent(UITransform)?.setContentSize(width, height);
        label.node.setPosition(0, 0, 0);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
    }

    private layoutNav(pageW: number, pageH: number, barHeight: number): void {
        if (!this.navSlot) return;
        const bottom = 0;
        this.navSlot.getComponent(UITransform)?.setContentSize(pageW, barHeight);
        this.navSlot.setPosition(0, -pageH / 2 + bottom + barHeight / 2, 0);
        this.navigation?.node.getComponent(Widget)?.updateAlignment();
    }

    private placeIn(node: Node | null, rect: DesignRect, parent: DesignRect): void {
        if (!node) return;
        node.getComponent(UITransform)?.setContentSize(rect.w, rect.h);
        const parentCx = parent.x + parent.w / 2;
        const parentCy = parent.y + parent.h / 2;
        node.setPosition(rect.x + rect.w / 2 - parentCx, parentCy - (rect.y + rect.h / 2), 0);
        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.type = Sprite.Type.SIMPLE;
        }
    }

    private place(node: Node | null, rect: DesignRect, pageW: number, pageH: number): void {
        if (!node) return;
        node.getComponent(UITransform)?.setContentSize(rect.w, rect.h);
        node.setPosition(rect.x + rect.w / 2 - pageW / 2, pageH / 2 - (rect.y + rect.h / 2), 0);
        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.type = Sprite.Type.SIMPLE;
        }
    }

    private showCard(uuid: string): void {
        if (!this.sceneImage || this.shownCard === uuid) return;
        this.shownCard = uuid;
        const token = ++this.previewToken;
        loadSpriteFrame(uuid, (frame) => {
            if (token !== this.previewToken || !this.sceneImage?.isValid) return;
            if (!frame) {
                if (this.shownCard === uuid) this.shownCard = '';
                return;
            }
            this.sceneImage.spriteFrame = frame;
            this.sceneImage.sizeMode = Sprite.SizeMode.CUSTOM;
            this.sceneImage.type = Sprite.Type.SIMPLE;
            this.sceneImage.getComponent(UITransform)?.setContentSize(915, 1121);
        });
    }

    private bind(): void {
        if (this.listening) return;
        this.listening = true;
        this.levelButton?.node.on(Button.EventType.CLICK, this.onLevelClick, this);
        this.levelButton?.node.on(Node.EventType.TOUCH_END, this.onLevelClick, this);
        this.settingsButton?.node.on(Button.EventType.CLICK, this.onSettingsClick, this);
        this.avatarButton?.node.on(Button.EventType.CLICK, this.onAvatarClick, this);
    }

    private unbind(): void {
        if (!this.listening) return;
        this.listening = false;
        this.levelButton?.node.off(Button.EventType.CLICK, this.onLevelClick, this);
        this.levelButton?.node.off(Node.EventType.TOUCH_END, this.onLevelClick, this);
        this.settingsButton?.node.off(Button.EventType.CLICK, this.onSettingsClick, this);
        this.avatarButton?.node.off(Button.EventType.CLICK, this.onAvatarClick, this);
    }

    private onLevelClick(): void {
        GameManager.startLevel(LevelManager.getCurrentLevel());
    }

    private onSettingsClick(): void {
        this.settingsHandler?.();
    }

    private onAvatarClick(): void {
        this.profilePopup?.open();
    }
}
