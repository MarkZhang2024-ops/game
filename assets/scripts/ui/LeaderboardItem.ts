/**
 * One leaderboard row. setData fills it; the row count is not stored here.
 */

import { _decorator, Color, Component, Label, Node, Sprite, UITransform } from 'cc';
import { LeaderboardEntry } from '../data/LeaderboardData';
import { avatarFrame } from './AvatarConfig';
import { fillDigits, layoutLevelColumn, rowFrame, showFrame, starFrame } from './LeaderboardArt';
import { profileAvatar } from './ProfileAvatars';
import { addLabel, uiNode } from './UiKit';

const { ccclass } = _decorator;

const NAME_COLOR = new Color(112, 54, 28, 255);

@ccclass('LeaderboardItem')
export class LeaderboardItem extends Component {
    private entry: LeaderboardEntry | null = null;
    private built = false;
    private itemWidth = 1045;
    private itemHeight = 154;
    private background: Sprite | null = null;
    private rankIcon: Sprite | null = null;
    private rankDigits: Node | null = null;
    private avatar: Sprite | null = null;
    private nameLabel: Label | null = null;
    private levelCaption: Label | null = null;
    private levelDigits: Node | null = null;

    public setItemSize(width: number, height: number): void {
        this.itemWidth = width;
        this.itemHeight = height;
        this.ensure();
        this.layout();
        this.paint();
    }

    public setData(data: LeaderboardEntry): void {
        this.entry = data;
        this.ensure();
        this.layout();
        this.paint();
    }

    /** Draw the name and level again after the row is in the scroll view. */
    public repaint(): void {
        if (!this.entry) return;
        this.layout();
        this.paint();
    }

    private ensure(): void {
        if (this.built) return;
        this.built = true;
        const root = this.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        root.setAnchorPoint(0.5, 0.5);
        root.setContentSize(this.itemWidth, this.itemHeight);

        const background = uiNode('Background', this.itemWidth, this.itemHeight);
        background.setParent(this.node);
        this.background = background.addComponent(Sprite);

        const rank = uiNode('Rank', 110, 110);
        rank.setParent(this.node);
        this.rankIcon = rank.addComponent(Sprite);
        this.rankDigits = uiNode('RankDigits', 40, 40);
        this.rankDigits.setParent(rank);

        const avatar = uiNode('Avatar', 108, 108);
        avatar.setParent(this.node);
        this.avatar = avatar.addComponent(Sprite);

        this.levelDigits = uiNode('LevelDigits', 80, 40);
        this.levelDigits.setParent(this.node);

        this.nameLabel = addLabel(this.node, 'PlayerName', '', 34, NAME_COLOR, 420, 70);
        this.nameLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        this.nameLabel.enableWrapText = false;
        this.nameLabel.cacheMode = Label.CacheMode.BITMAP;
        this.nameLabel.node.getComponent(UITransform)?.setAnchorPoint(0, 0.5);

        this.levelCaption = addLabel(this.node, 'LevelCaption', 'Level', 22, NAME_COLOR, 140, 32);
        this.levelCaption.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.levelCaption.verticalAlign = Label.VerticalAlign.CENTER;
        this.levelCaption.enableWrapText = false;
        this.levelCaption.cacheMode = Label.CacheMode.BITMAP;
        this.levelCaption.node.getComponent(UITransform)?.setAnchorPoint(0.5, 0.5);
    }

    private layout(): void {
        const width = this.itemWidth;
        const height = this.itemHeight;
        this.node.getComponent(UITransform)?.setContentSize(width, height);
        this.background?.node.getComponent(UITransform)?.setContentSize(width, height);
        this.background?.node.setPosition(0, 0, 0);

        const left = -width / 2;
        const star = height * 0.72;
        this.rankIcon?.node.getComponent(UITransform)?.setContentSize(star, star);
        this.rankIcon?.node.setPosition(left + height * 0.58, 0, 0);

        const avatar = height * 0.7;
        this.avatar?.node.getComponent(UITransform)?.setContentSize(avatar, avatar);
        this.avatar?.node.setPosition(left + height * 1.42, 0, 0);

        const nameX = left + height * 1.95;
        const nameW = Math.max(80, width * 0.4);
        this.nameLabel?.node.getComponent(UITransform)?.setContentSize(nameW, height * 0.46);
        this.nameLabel?.node.setPosition(nameX, 0, 0);
        if (this.nameLabel) this.nameLabel.fontSize = Math.max(18, Math.round(height * 0.22));
    }

    private paint(): void {
        const entry = this.entry;
        if (!entry || !this.background || !this.rankIcon || !this.avatar || !this.rankDigits || !this.levelDigits) return;
        showFrame(this.background, rowFrame(entry.rank));
        const star = starFrame(entry.rank);
        this.rankIcon.enabled = !!star;
        showFrame(this.rankIcon, star);
        fillDigits(this.rankDigits, entry.rank, this.itemHeight * 0.28);
        showFrame(this.avatar, avatarFrame(entry.avatarId) ?? profileAvatar(entry.avatarId).portrait);
        if (this.nameLabel) this.nameLabel.string = entry.playerName;
        if (this.levelCaption) layoutLevelColumn(this.levelCaption, this.levelDigits, this.itemWidth, this.itemHeight, entry.level);
    }
}
