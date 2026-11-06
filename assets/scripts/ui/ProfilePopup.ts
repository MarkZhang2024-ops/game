/**
 * Profile dialog on the level page. Save writes the nickname and avatar.
 */

import {
    _decorator,
    BlockInputEvents,
    Button,
    Color,
    Component,
    EditBox,
    Font,
    Label,
    Node,
    Sprite,
    SpriteFrame,
    UITransform,
    Widget,
} from 'cc';
import { GameDataManager } from '../core/GameDataManager';
import { UserService } from '../data/UserService';
import { loadByUuid, loadSpriteFrame } from './GameArt';
import { fillName } from './LeaderboardArt';
import { PROFILE_AVATARS, profileAvatar } from './ProfileAvatars';
import { addButton, addLabel, applySprite, stretch, uiNode, whiteFrame } from './UiKit';

const { ccclass } = _decorator;

const FRAME = '074d9746-bcf6-48f5-9d2c-cef9cd0b7f47@f9941';
const NAME_BAR = 'c69bc959-7959-4a08-b552-0aafa3903345@f9941';
const NAME_PLATE = '9f1d2d2e-087d-4ed1-a1a2-aac09e2e7741@f9941';
const EDIT = '2adcebce-8d1b-44ab-a501-90341d27fc81@f9941';
const SAVE = 'b17377ce-3dc8-4e8a-8a6a-90a0b0515dc6@f9941';
const CHECK = '7349f859-b195-4adb-81ca-ca691e959824@f9941';
const ROUNDED_FONT = '8ced58e9-6351-4596-8f44-8fd0d123b0b7';

const PANEL_W = 977;
const PANEL_H = 1637;
const PLATE_W = 484;
const PLATE_H = 138;
const NAME_X_HEIGHT = 29;
/** Gap between glyphs on the 1080 comp is 5px at a 32px x-height. */
const NAME_GAP = 5 / 32;
const AVATAR_W = 249;
const AVATAR_H = 243;
/**
 * Cream between the outer rings on the profile comp.
 * Horizontal pairs measure 22px, the two rows measure 26px.
 */
const AVATAR_GAP_X = 22;
const AVATAR_GAP_Y = 26;
const AVATAR_ORIGIN_X = -268.5;
const AVATAR_ORIGIN_Y = 94;
const NAME_COLOR = new Color(92, 42, 24, 255);
const NAME_LIMIT = 12;

interface AvatarOption {
    id: string;
    check: Node;
}

@ccclass('ProfilePopup')
export class ProfilePopup extends Component {
    private built = false;
    private listening = false;
    private panel: Node | null = null;
    private nameAvatar: Sprite | null = null;
    private nameArt: Node | null = null;
    private nameEdit: EditBox | null = null;
    private nameEditing = false;
    private editButton: Button | null = null;
    private saveButton: Button | null = null;
    private options: AvatarOption[] = [];
    private draftAvatar = 'bear';
    private savedHandler: (() => void) | null = null;
    private frameToken = new Map<Sprite, number>();

    public setSavedHandler(handler: () => void): void {
        this.savedHandler = handler;
    }

    public open(): void {
        this.ensureView();
        const profile = GameDataManager.getProfile();
        this.draftAvatar = profileAvatar(profile.avatarId).id;
        this.showName(profile.playerName);
        this.paintDraft();
        this.node.active = true;
        this.node.setSiblingIndex(this.node.parent ? this.node.parent.children.length - 1 : 0);
        this.layout();
        this.scheduleOnce(() => {
            this.showName(profile.playerName);
            this.layout();
        }, 0);
    }

    public close(): void {
        this.nameEdit?.blur();
        this.node.active = false;
    }

    public layout(): void {
        if (!this.built) return;
        this.node.getComponent(Widget)?.updateAlignment();
        const size = this.getComponent(UITransform);
        const pageW = size?.width || 1080;
        const pageH = size?.height || 2400;
        const fit = Math.min((pageW - 24) / PANEL_W, (pageH - 48) / PANEL_H, 1);
        this.panel?.setScale(fit, fit, 1);
        this.panel?.setPosition(0, 0, 0);
        this.placeNameLabel(this.nameEdit?.textLabel ?? null);
        this.placeNameLabel(this.nameEdit?.placeholderLabel ?? null);
    }

    protected onEnable(): void {
        this.bind();
    }

    protected onDisable(): void {
        this.unbind();
    }

    private ensureView(): void {
        if (this.built) return;
        this.built = true;
        this.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        stretch(this.node);

        const dim = uiNode('Dim', 1080, 2400);
        dim.setParent(this.node);
        stretch(dim);
        const dimSprite = dim.addComponent(Sprite);
        dimSprite.spriteFrame = whiteFrame();
        dimSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        dimSprite.type = Sprite.Type.SIMPLE;
        dimSprite.color = new Color(0, 0, 0, 1);
        dim.addComponent(BlockInputEvents);
        dim.on(Node.EventType.TOUCH_END, this.close, this);

        this.panel = uiNode('Panel', PANEL_W, PANEL_H);
        this.panel.setParent(this.node);
        const frame = this.panel.addComponent(Sprite);
        frame.sizeMode = Sprite.SizeMode.CUSTOM;
        frame.type = Sprite.Type.SIMPLE;
        applySprite(frame, FRAME);

        const bar = uiNode('NameBar', 808, 191);
        bar.setParent(this.panel);
        bar.setPosition(0, 348, 0);
        const barSprite = bar.addComponent(Sprite);
        barSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        barSprite.type = Sprite.Type.SIMPLE;
        applySprite(barSprite, NAME_BAR);

        const nameAvatar = uiNode('NameAvatar', 164, 160);
        nameAvatar.setParent(this.panel);
        nameAvatar.setPosition(-306, 344, 0);
        this.nameAvatar = nameAvatar.addComponent(Sprite);
        this.nameAvatar.sizeMode = Sprite.SizeMode.CUSTOM;
        this.nameAvatar.type = Sprite.Type.SIMPLE;

        const plate = uiNode('NamePlate', PLATE_W, PLATE_H);
        plate.setParent(this.panel);
        plate.setPosition(14, 348, 0);
        const plateSprite = plate.addComponent(Sprite);
        plateSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        plateSprite.type = Sprite.Type.SIMPLE;
        applySprite(plateSprite, NAME_PLATE);
        const field = uiNode('NameField', PLATE_W, PLATE_H);
        field.setParent(plate);
        this.nameArt = uiNode('NameArt', PLATE_W, PLATE_H);
        this.nameArt.setParent(plate);
        const text = addLabel(field, 'Text', '', 40, NAME_COLOR, PLATE_W, PLATE_H);
        text.horizontalAlign = Label.HorizontalAlign.CENTER;
        text.verticalAlign = Label.VerticalAlign.CENTER;
        const placeholder = addLabel(field, 'Placeholder', 'Name', 40, new Color(160, 112, 80, 180), PLATE_W, PLATE_H);
        placeholder.horizontalAlign = Label.HorizontalAlign.CENTER;
        placeholder.verticalAlign = Label.VerticalAlign.CENTER;
        this.applyNameFont(text);
        this.applyNameFont(placeholder);
        this.placeNameLabel(text);
        this.placeNameLabel(placeholder);
        this.nameEdit = field.addComponent(EditBox);
        this.nameEdit.textLabel = text;
        this.nameEdit.placeholderLabel = placeholder;
        this.nameEdit.inputMode = EditBox.InputMode.SINGLE_LINE;
        this.nameEdit.maxLength = NAME_LIMIT;
        this.showName(GameDataManager.getProfile().playerName);

        const edit = uiNode('EditButton', 119, 120);
        edit.setParent(this.panel);
        edit.setPosition(325, 348, 0);
        this.editButton = addButton(edit, 0.94);
        const editSprite = edit.addComponent(Sprite);
        editSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        editSprite.type = Sprite.Type.SIMPLE;
        applySprite(editSprite, EDIT);

        const pitchX = AVATAR_W + AVATAR_GAP_X;
        const pitchY = AVATAR_H + AVATAR_GAP_Y;
        const spots = [0, 1, 2, 3, 4, 5].map((index) => ({
            x: AVATAR_ORIGIN_X + (index % 3) * pitchX,
            y: AVATAR_ORIGIN_Y - Math.floor(index / 3) * pitchY,
        }));
        PROFILE_AVATARS.forEach((avatar, index) => {
            const spot = spots[index];
            const option = uiNode(`Avatar_${avatar.id}`, AVATAR_W, AVATAR_H);
            option.setParent(this.panel);
            option.setPosition(spot.x, spot.y, 0);
            const button = addButton(option, 0.96);
            const sprite = option.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.type = Sprite.Type.SIMPLE;
            applySprite(sprite, avatar.portrait);
            const check = uiNode('Check', 98, 98);
            check.setParent(option);
            check.setPosition(77, -66, 0);
            const checkSprite = check.addComponent(Sprite);
            checkSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            checkSprite.type = Sprite.Type.SIMPLE;
            applySprite(checkSprite, CHECK);
            check.active = false;
            button.node.on(Button.EventType.CLICK, () => this.selectAvatar(avatar.id), this);
            this.options.push({ id: avatar.id, check });
        });

        const save = uiNode('SaveButton', 526, 220);
        save.setParent(this.panel);
        save.setPosition(14, -618, 0);
        this.saveButton = addButton(save, 0.96);
        const saveSprite = save.addComponent(Sprite);
        saveSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        saveSprite.type = Sprite.Type.SIMPLE;
        applySprite(saveSprite, SAVE);
    }

    private bind(): void {
        if (this.listening) return;
        this.listening = true;
        this.editButton?.node.on(Button.EventType.CLICK, this.onEdit, this);
        this.saveButton?.node.on(Button.EventType.CLICK, this.onSave, this);
        this.nameEdit?.node.on(EditBox.EventType.EDITING_DID_BEGAN, this.onNameBegan, this);
        this.nameEdit?.node.on(EditBox.EventType.EDITING_DID_ENDED, this.onNameEnded, this);
    }

    private unbind(): void {
        if (!this.listening) return;
        this.listening = false;
        this.editButton?.node.off(Button.EventType.CLICK, this.onEdit, this);
        this.saveButton?.node.off(Button.EventType.CLICK, this.onSave, this);
        this.nameEdit?.node.off(EditBox.EventType.EDITING_DID_BEGAN, this.onNameBegan, this);
        this.nameEdit?.node.off(EditBox.EventType.EDITING_DID_ENDED, this.onNameEnded, this);
    }

    private showName(name: string): void {
        const edit = this.nameEdit;
        if (!edit) return;
        edit.string = name;
        const text = edit.textLabel;
        const placeholder = edit.placeholderLabel;
        if (text) {
            text.string = name;
            this.placeNameLabel(text);
        }
        if (placeholder) this.placeNameLabel(placeholder);
        this.syncNameVisual();
    }

    /** Sprite letters while idle. The EditBox label shows only while typing, or when the name has no letter art. */
    private syncNameVisual(): void {
        const edit = this.nameEdit;
        const name = edit?.string ?? '';
        const art = !this.nameEditing
            && !!this.nameArt
            && fillName(this.nameArt, name, NAME_X_HEIGHT, PLATE_W - 48, NAME_GAP);
        if (this.nameArt) {
            this.nameArt.active = art;
            const width = this.nameArt.getComponent(UITransform)?.width ?? 0;
            this.nameArt.setPosition(-width / 2, 5, 0);
        }
        const text = edit?.textLabel;
        const placeholder = edit?.placeholderLabel;
        if (text) text.node.active = !art && name.length > 0;
        if (placeholder) placeholder.node.active = !art && name.length === 0;
    }

    private applyNameFont(label: Label): void {
        label.isBold = false;
        label.fontSize = 40;
        label.lineHeight = 40;
        loadByUuid<Font>(ROUNDED_FONT, (font) => {
            if (!font || !label.isValid) return;
            label.useSystemFont = false;
            label.font = font;
            label.isBold = false;
        });
    }

    private onNameBegan(): void {
        this.nameEditing = true;
        this.syncNameVisual();
    }

    private onNameEnded(): void {
        this.nameEditing = false;
        this.syncNameVisual();
    }

    /** EditBox pins the label to the field's top-left. The text itself stays centered in the plate. */
    private placeNameLabel(label: Label | null): void {
        if (!label) return;
        const node = label.node;
        const parent = node.parent?.getComponent(UITransform);
        const width = parent?.width || PLATE_W;
        const height = parent?.height || PLATE_H;
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.setAnchorPoint(0, 1);
        transform.setContentSize(width, height);
        node.setPosition(-width / 2, height / 2, 0);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
    }

    private onEdit(): void {
        this.nameEditing = true;
        this.syncNameVisual();
        this.nameEdit?.focus();
    }

    private selectAvatar(id: string): void {
        this.draftAvatar = profileAvatar(id).id;
        this.paintDraft();
    }

    private paintDraft(): void {
        if (this.nameAvatar) this.showFrame(this.nameAvatar, profileAvatar(this.draftAvatar).header);
        this.options.forEach((option) => {
            option.check.active = option.id === this.draftAvatar;
        });
    }

    private onSave(): void {
        const typed = this.nameEdit?.string.trim() ?? '';
        const profile = GameDataManager.getProfile();
        const current = profile.playerName;
        const previousAvatar = profileAvatar(profile.avatarId).id;
        const name = (typed || current).slice(0, NAME_LIMIT);
        const nextAvatar = profileAvatar(this.draftAvatar).id;
        GameDataManager.setPlayerName(name);
        GameDataManager.setAvatarId(nextAvatar);
        const change: { username?: string; avatarId?: string } = {};
        if (name !== current) change.username = name;
        if (nextAvatar !== previousAvatar) change.avatarId = nextAvatar;
        if (change.username || change.avatarId) {
            UserService.updateProfile(change).catch(() => undefined);
        }
        this.close();
        this.savedHandler?.();
    }

    private showFrame(sprite: Sprite, uuid: string): void {
        const token = (this.frameToken.get(sprite) ?? 0) + 1;
        this.frameToken.set(sprite, token);
        loadSpriteFrame(uuid, (frame: SpriteFrame | null) => {
            if (this.frameToken.get(sprite) !== token || !sprite.isValid || !frame) return;
            sprite.spriteFrame = frame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.type = Sprite.Type.SIMPLE;
        });
    }
}
