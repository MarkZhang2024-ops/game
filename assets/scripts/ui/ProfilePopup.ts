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
    Label,
    Node,
    Sprite,
    SpriteFrame,
    UITransform,
    Widget,
} from 'cc';
import { GameDataManager } from '../core/GameDataManager';
import { loadSpriteFrame } from './GameArt';
import { PROFILE_AVATARS, profileAvatar } from './ProfileAvatars';
import { addButton, addLabel, applySprite, stretch, uiNode, whiteFrame } from './UiKit';

const { ccclass } = _decorator;

const FRAME = '074d9746-bcf6-48f5-9d2c-cef9cd0b7f47@f9941';
const NAME_PLATE = '9f1d2d2e-087d-4ed1-a1a2-aac09e2e7741@f9941';
const EDIT = '2adcebce-8d1b-44ab-a501-90341d27fc81@f9941';
const SAVE = 'b17377ce-3dc8-4e8a-8a6a-90a0b0515dc6@f9941';
const CHECK = '7349f859-b195-4adb-81ca-ca691e959824@f9941';

const PANEL_W = 977;
const PANEL_H = 1637;
const PLATE_W = 484;
const PLATE_H = 138;
const NAME_INSET = 36;
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
    private nameEdit: EditBox | null = null;
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

        const nameAvatar = uiNode('NameAvatar', 150, 147);
        nameAvatar.setParent(this.panel);
        nameAvatar.setPosition(-306, 342, 0);
        this.nameAvatar = nameAvatar.addComponent(Sprite);
        this.nameAvatar.sizeMode = Sprite.SizeMode.CUSTOM;
        this.nameAvatar.type = Sprite.Type.SIMPLE;

        const plate = uiNode('NamePlate', PLATE_W, PLATE_H);
        plate.setParent(this.panel);
        plate.setPosition(34, 342, 0);
        const plateSprite = plate.addComponent(Sprite);
        plateSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        plateSprite.type = Sprite.Type.SIMPLE;
        applySprite(plateSprite, NAME_PLATE);
        const fieldW = PLATE_W - NAME_INSET * 2;
        const field = uiNode('NameField', fieldW, PLATE_H);
        field.setParent(plate);
        const text = addLabel(field, 'Text', '', 44, NAME_COLOR, fieldW, PLATE_H);
        text.horizontalAlign = Label.HorizontalAlign.LEFT;
        text.verticalAlign = Label.VerticalAlign.CENTER;
        const placeholder = addLabel(field, 'Placeholder', 'Name', 44, new Color(160, 112, 80, 180), fieldW, PLATE_H);
        placeholder.horizontalAlign = Label.HorizontalAlign.LEFT;
        placeholder.verticalAlign = Label.VerticalAlign.CENTER;
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
        edit.setPosition(326, 342, 0);
        this.editButton = addButton(edit, 0.94);
        const editSprite = edit.addComponent(Sprite);
        editSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        editSprite.type = Sprite.Type.SIMPLE;
        applySprite(editSprite, EDIT);

        const spots = [
            { x: -252, y: 85 },
            { x: 0, y: 85 },
            { x: 252, y: 85 },
            { x: -252, y: -167 },
            { x: 0, y: -167 },
            { x: 252, y: -167 },
        ];
        PROFILE_AVATARS.forEach((avatar, index) => {
            const spot = spots[index];
            const option = uiNode(`Avatar_${avatar.id}`, 249, 243);
            option.setParent(this.panel);
            option.setPosition(spot.x, spot.y, 0);
            const button = addButton(option, 0.96);
            const sprite = option.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.type = Sprite.Type.SIMPLE;
            applySprite(sprite, avatar.portrait);
            const check = uiNode('Check', 98, 98);
            check.setParent(option);
            check.setPosition(88, -78, 0);
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
        save.setPosition(18, -612, 0);
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
    }

    private unbind(): void {
        if (!this.listening) return;
        this.listening = false;
        this.editButton?.node.off(Button.EventType.CLICK, this.onEdit, this);
        this.saveButton?.node.off(Button.EventType.CLICK, this.onSave, this);
    }

    private showName(name: string): void {
        const edit = this.nameEdit;
        if (!edit) return;
        edit.string = name;
        const text = edit.textLabel;
        const placeholder = edit.placeholderLabel;
        if (text) {
            text.string = name;
            text.node.active = name.length > 0;
            this.placeNameLabel(text);
        }
        if (placeholder) {
            placeholder.node.active = name.length === 0;
            this.placeNameLabel(placeholder);
        }
    }

    /** EditBox pins the label to the field's top-left. The field itself is already inset from the plate. */
    private placeNameLabel(label: Label | null): void {
        if (!label) return;
        const node = label.node;
        const parent = node.parent?.getComponent(UITransform);
        const width = parent?.width || PLATE_W - NAME_INSET * 2;
        const height = parent?.height || PLATE_H;
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.setAnchorPoint(0, 1);
        transform.setContentSize(width, height);
        node.setPosition(-width / 2, height / 2, 0);
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        label.verticalAlign = Label.VerticalAlign.CENTER;
    }

    private onEdit(): void {
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
        const current = GameDataManager.getProfile().playerName;
        const name = (typed || current).slice(0, NAME_LIMIT);
        GameDataManager.setPlayerName(name);
        GameDataManager.setAvatarId(this.draftAvatar);
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
