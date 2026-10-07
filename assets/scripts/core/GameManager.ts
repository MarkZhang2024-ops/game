/**
 * Cluedoku! - Main game manager (Cocos Creator 3.8.4).
 *
 * Scene chrome is fixed. Only DynamicGameBoard instantiates Cell prefabs.
 */

import {
    _decorator,
    assetManager,
    BlockInputEvents,
    Color,
    Component,
    director,
    Label,
    Layers,
    Node,
    SceneAsset,
    Sprite,
    tween,
    Tween,
    UITransform,
    view,
} from 'cc';
import { GameState } from './GameState';
import { LevelManager } from './LevelManager';
import { SaveManager } from './SaveManager';
import { HintManager } from './HintManager';
import { HintPopup } from '../ui/HintPopup';
import { Board } from '../board/Board';
import { BoardController } from '../board/BoardController';
import { HUD } from '../ui/HUD';
import { RuleBar } from '../ui/RuleBar';
import { LevelComplete } from '../ui/LevelComplete';
import { GameOver } from '../ui/GameOver';
import { SettingsPanel } from '../ui/SettingsPanel';
import { PuzzleSolver } from '../puzzle/PuzzleSolver';
import { createBoardData, cloneBoard, countSuspects } from '../puzzle/PuzzleTypes';
import { GAME, CellMarkState, SuspectType } from '../utils/Constants';
import { applyGamePageLayout, findDeep } from '../ui/GamePageLayout';
import { applySpriteFrame } from '../ui/GameArt';
import { whiteFrame } from '../ui/UiKit';

/** Candy banner baked with "Out of Lives!" (1036×257). */
const HINT_EMPTY_BANNER = '57608542-d39d-4428-a843-6b321ce03c93@f9941';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property(Board)
    public boardRef: Board | null = null;

    @property(BoardController)
    public boardController: BoardController | null = null;

    private state = new GameState();
    private levelManager = new LevelManager();
    private board: Board | null = null;
    private hud: HUD | null = null;
    private ruleBar: RuleBar | null = null;
    private levelComplete: LevelComplete | null = null;
    private gameOver: GameOver | null = null;
    private settingsPanel: SettingsPanel | null = null;
    private timerEnabled = false;
    private toastLabel: Label | null = null;
    private hintEmptyBanner: Node | null = null;
    private hintPopup: HintPopup | null = null;
    private hintOpen = false;
    private hintHighlights: { row: number; col: number }[] = [];
    private lastClickedRow = -1;
    private lastClickedCol = -1;
    private lastClickAt = 0;
    private pendingRow = -1;
    private pendingCol = -1;
    private clickTimerPending = false;
    private static readonly DOUBLE_CLICK_INTERVAL = 0.25;
    private static readonly GAME_SCENE_UUID = 'b2c3d4e5-2f3a-4c4d-9e8f-7a6b5c4d3e2f';
    private static openingGame = false;

    /** Opens the puzzle scene on targetLevel. Progress stays in LevelManager. */
    public static startLevel(level: number): void {
        if (GameManager.openingGame) return;
        const next = Math.max(1, Math.floor(Number(level)) || 1);
        if (!LevelManager.isLevelUnlocked(next)) return;
        GameManager.openingGame = true;
        LevelManager.setTargetLevel(next);

        const launched = director.loadScene('Game', (err) => {
            if (!err) {
                GameManager.openingGame = false;
                return;
            }
            console.warn('[GameManager] loadScene(Game) failed, loading by asset uuid', err);
            GameManager.openGameSceneAsset();
        });
        if (!launched) {
            GameManager.openGameSceneAsset();
        }
    }

    private static openGameSceneAsset(): void {
        assetManager.loadAny({ uuid: GameManager.GAME_SCENE_UUID }, (err: Error | null, asset: SceneAsset) => {
            if (err || !asset) {
                GameManager.openingGame = false;
                console.error('[GameManager] cannot open Game scene', err);
                return;
            }
            director.runScene(asset, undefined, () => {
                GameManager.openingGame = false;
            });
        });
    }

    protected onLoad(): void {
        this.node.layer = Layers.Enum.UI_2D;
        this.bindSceneUI();
        view.on('canvas-resize', this.onScreenResize, this);
        try {
            this.loadCurrentLevel();
            this.timerEnabled = true;
        } catch (e) {
            console.error('[GameManager] loadLevel: ' + e);
        }
    }

    protected onDestroy(): void {
        view.off('canvas-resize', this.onScreenResize, this);
        this.clearClickTimer();
    }

    private onScreenResize = (): void => {
        this.scheduleOnce(() => {
            const canvas = this.canvas();
            if (canvas) applyGamePageLayout(canvas, false);
            this.hud?.setHintsLeft(this.state.hints);
            this.levelComplete?.relayout();
            this.gameOver?.relayout();
            this.settingsPanel?.relayout();
            this.layoutHintEmptyBanner();
        }, 0);
    };

    private canvas(): Node | null {
        let n: Node | null = this.node;
        while (n) {
            if (n.name === 'Canvas') return n;
            n = n.parent;
        }
        return this.node.parent;
    }

    private bindSceneUI(): void {
        const canvas = this.canvas();
        if (!canvas) {
            console.error('[GameManager] Canvas not found');
            return;
        }

        const top = findDeep(canvas, 'TopUI');
        this.hud = top?.getComponent(HUD) || canvas.getComponentInChildren(HUD) || null;
        this.hud?.setCallbacks({
            onHintPressed: () => this.onHint(),
            onToolPressed: () => this.onTool(),
            onBackPressed: () => {
                director.loadScene('Lobby');
            },
            onSettingsPressed: () => this.settingsPanel?.show(),
        });

        const rules = findDeep(canvas, 'RulePanel');
        this.ruleBar = rules?.getComponent(RuleBar) || canvas.getComponentInChildren(RuleBar) || null;

        const container = findDeep(canvas, 'DynamicGameBoard')
            || findDeep(canvas, 'BoardContainer');
        this.boardController = this.boardController
            || container?.getComponent(BoardController)
            || canvas.getComponentInChildren(BoardController)
            || null;
        this.board = this.boardRef
            || this.boardController?.getBoard()
            || container?.getComponent(Board)
            || canvas.getComponentInChildren(Board)
            || null;
        this.board?.setClickHandler((row, col) => this.onCellClicked(row, col));

        this.levelComplete = findDeep(canvas, 'LevelComplete')?.getComponent(LevelComplete) || null;
        this.levelComplete?.setCallbacks({ onNextLevel: () => this.nextLevel() });

        this.gameOver = findDeep(canvas, 'GameOver')?.getComponent(GameOver) || null;
        this.gameOver?.setCallbacks({ onRetry: () => this.restartLevel() });

        this.settingsPanel = findDeep(canvas, 'SettingsPanel')?.getComponent(SettingsPanel) || null;
        this.settingsPanel?.setCallbacks({
            onClose: () => this.settingsPanel?.hide(),
            onResetProgress: () => {
                this.settingsPanel?.hide();
                LevelManager.setCurrentLevel(1);
                SaveManager.update({ winStreak: 0 });
                this.levelManager = new LevelManager();
                this.loadCurrentLevel();
            },
        });

        const popup = findDeep(canvas, 'PopupLayer') || canvas;
        const hintNode = new Node('HintPopup');
        hintNode.layer = popup.layer;
        hintNode.active = false;
        hintNode.setParent(popup);
        const hintTransform = hintNode.addComponent(UITransform);
        hintTransform.setContentSize(1080, 2400);
        this.hintPopup = hintNode.addComponent(HintPopup);

        const toast = findDeep(canvas, 'Toast');
        this.toastLabel = toast?.getComponent(Label) || toast?.getComponentInChildren(Label) || null;
        if (toast) toast.active = false;
    }

    protected update(dt: number): void {
        if (this.timerEnabled && !this.state.levelCompleted) {
            this.state.elapsedTime += dt;
        }
    }

    public onCellClicked(row: number, col: number): void {
        this.handleCellClick(row, col);
    }

    public clickCell(row: number, col: number): void {
        this.handleCellClick(row, col);
    }

    private handleCellClick(row: number, col: number): void {
        if (this.hintOpen || this.state.levelCompleted || this.state.lives <= 0) return;
        const board = this.state.board;
        if (!board || !this.board) return;
        if (this.board.isDragGesture()) return;
        if (!PuzzleSolver.inBounds(board, row, col)) return;

        const cellView = this.board.getCell(row, col);
        if (cellView?.getSuspectType() === SuspectType.SYSTEM) {
            this.clearClickTimer();
            return;
        }

        const now = Date.now();
        const sameCell = this.lastClickedRow === row && this.lastClickedCol === col;
        const withinWindow =
            this.clickTimerPending &&
            sameCell &&
            now - this.lastClickAt <= GameManager.DOUBLE_CLICK_INTERVAL * 1000;

        if (withinWindow) {
            this.clearClickTimer();
            this.lastClickedRow = -1;
            this.lastClickedCol = -1;
            this.handleDoubleClick(row, col);
            return;
        }

        if (this.clickTimerPending) {
            const pr = this.pendingRow;
            const pc = this.pendingCol;
            this.clearClickTimer();
            this.handleSingleClick(pr, pc);
        }

        this.lastClickedRow = row;
        this.lastClickedCol = col;
        this.lastClickAt = now;
        this.pendingRow = row;
        this.pendingCol = col;
        this.clickTimerPending = true;
        this.scheduleOnce(this.onSingleClickTimeout, GameManager.DOUBLE_CLICK_INTERVAL);
    }

    private onSingleClickTimeout = (): void => {
        const row = this.pendingRow;
        const col = this.pendingCol;
        this.clickTimerPending = false;
        this.pendingRow = -1;
        this.pendingCol = -1;
        if (row >= 0 && col >= 0) {
            this.handleSingleClick(row, col);
        }
    };

    private clearClickTimer(): void {
        this.unschedule(this.onSingleClickTimeout);
        this.clickTimerPending = false;
        this.pendingRow = -1;
        this.pendingCol = -1;
    }

    private handleSingleClick(row: number, col: number): void {
        const board = this.state.board;
        const view = this.board;
        if (!board || !view) return;
        const cell = view.getCell(row, col);
        if (!cell) return;

        switch (cell.getMarkState()) {
            case CellMarkState.NONE:
                cell.setMarkState(CellMarkState.X, SuspectType.NONE);
                break;
            case CellMarkState.X:
                cell.setMarkState(CellMarkState.NONE, SuspectType.NONE);
                break;
            case CellMarkState.SUSPECT:
                if (cell.getSuspectType() === SuspectType.SYSTEM) {
                    return;
                }
                view.removeSuspect(row, col);
                this.refreshProgress();
                break;
            default:
                break;
        }
    }

    private handleDoubleClick(row: number, col: number): void {
        const board = this.state.board;
        const view = this.board;
        if (!board || !view) return;
        const cell = view.getCell(row, col);
        if (!cell) return;
        if (cell.getSuspectType() === SuspectType.SYSTEM) return;
        if (cell.getMarkState() === CellMarkState.SUSPECT) return;

        if (!PuzzleSolver.canPlace(board, row, col)) {
            view.shakeCell(row, col);
            this.showToast('Illegal placement');
            this.loseLife();
            return;
        }

        const data = board.cells[row][col];
        data.hasSuspect = true;
        cell.setMarkState(CellMarkState.SUSPECT, SuspectType.PLAYER, true);
        this.refreshProgress();
        if (PuzzleSolver.isComplete(board)) {
            this.onLevelCompleted();
        }
    }

    private loadCurrentLevel(): void {
        this.hideHintEmptyBanner();
        this.dismissRuleHint();
        const level = this.levelManager.loadCurrentLevel();
        const board = createBoardData(level);
        this.state.resetForLevel(level, board, GAME.maxLives, GAME.hintsPerLevel);
        this.renderLevel();
    }

    private restartLevel(): void {
        this.clearClickTimer();
        this.levelComplete?.hide();
        this.gameOver?.hide();
        this.settingsPanel?.hide();
        this.hideHintEmptyBanner();
        this.dismissRuleHint();
        this.timerEnabled = true;
        const level = this.levelManager.restartLevel();
        const board = createBoardData(level);
        this.state.resetForLevel(level, board, GAME.maxLives, GAME.hintsPerLevel);
        this.renderLevel();
    }

    private nextLevel(): void {
        this.clearClickTimer();
        this.levelComplete?.hide();
        this.hideHintEmptyBanner();
        this.dismissRuleHint();
        const level = this.levelManager.nextLevel();
        const board = createBoardData(level);
        this.state.resetForLevel(level, board, GAME.maxLives, GAME.hintsPerLevel);
        this.renderLevel();
    }

    private renderLevel(): void {
        this.clearClickTimer();
        const boardData = this.state.board;
        if (!boardData) {
            console.error('[GameManager] Board data missing');
            return;
        }

        const canvas = this.canvas();
        if (canvas) applyGamePageLayout(canvas, true);
        this.hud?.relayout();
        this.ruleBar?.relayout();

        const data = cloneBoard(boardData);
        const size = data.rows;
        if (this.boardController) {
            this.boardController.createBoard(size, data);
            this.board = this.boardController.getBoard();
        } else if (this.board) {
            this.board.createBoard(data);
        } else {
            console.error('[GameManager] BoardContainer / BoardController is not assigned');
            return;
        }
        this.board?.setClickHandler((row, col) => this.onCellClicked(row, col));
        this.state.board = this.board?.getBoardData() ?? data;

        this.hud?.setLevel(this.state.currentLevel);
        this.hud?.setHearts(this.state.lives, this.state.maxLives);
        this.hud?.setHintsLeft(this.state.hints);
        this.refreshProgress();
    }

    private refreshProgress(): void {
        if (!this.state.board) return;
        this.hud?.setProgress(countSuspects(this.state.board), this.state.getRequiredSuspectCount());
    }

    private onTool(): void {
        if (this.hintOpen || this.state.levelCompleted || this.state.lives <= 0) return;
        if (!this.state.board || !this.board) return;
        const pos = HintManager.pickAvailableSuspect(this.state.board);
        if (!pos) {
            this.showToast('No suspect available');
            return;
        }
        HintManager.playHint(this.board, pos);
        this.refreshProgress();
        if (PuzzleSolver.isComplete(this.state.board)) {
            this.onLevelCompleted();
        }
    }

    private onHint(): void {
        if (this.state.levelCompleted || this.state.lives <= 0) return;
        if (this.state.hints <= 0) {
            this.showHintEmptyBanner();
            return;
        }
        if (this.hintOpen || !this.state.board || !this.board) return;
        const hint = HintManager.findHint(this.state.board, (row, col) => this.canMarkExcluded(row, col));
        if (!hint) {
            this.showToast('No hint available');
            return;
        }
        this.state.hints--;
        this.hud?.setHintsLeft(this.state.hints);
        HintManager.playHint(this.board, { row: hint.row, col: hint.column });
        for (const cell of hint.excludedCells) {
            this.board.excludeCell(cell.row, cell.column);
        }
        this.highlightHint(hint.row, hint.column);
        for (const cell of hint.excludedCells) {
            this.highlightHint(cell.row, cell.column);
        }
        this.hintOpen = true;
        this.board.setInputEnabled(false);
        this.hintPopup?.show(hint.reason, () => this.onHintContinue());
        this.refreshProgress();
    }

    private canMarkExcluded(row: number, col: number): boolean {
        const cell = this.board?.getCell(row, col);
        if (!cell || cell.getMarkState() !== CellMarkState.NONE) return false;
        if (cell.getSuspectType() === SuspectType.SYSTEM || cell.isLocked()) return false;
        return true;
    }

    private highlightHint(row: number, col: number): void {
        this.board?.getCell(row, col)?.setHintHighlight(true);
        this.hintHighlights.push({ row, col });
    }

    private clearHintHighlights(): void {
        for (const mark of this.hintHighlights) {
            this.board?.getCell(mark.row, mark.col)?.setHintHighlight(false);
        }
        this.hintHighlights = [];
    }

    private onHintContinue(): void {
        this.clearHintHighlights();
        this.hintOpen = false;
        this.board?.setInputEnabled(true);
        this.hintPopup?.hide();
        this.refreshProgress();
        if (this.state.board && PuzzleSolver.isComplete(this.state.board)) {
            this.onLevelCompleted();
        }
    }

    private dismissRuleHint(): void {
        this.clearHintHighlights();
        this.hintOpen = false;
        this.board?.setInputEnabled(true);
        this.hintPopup?.hide();
    }

    private loseLife(): void {
        if (this.state.lives <= 0) return;
        this.state.lives--;
        this.hud?.setHearts(this.state.lives, this.state.maxLives);
        if (this.state.lives <= 0) {
            this.onGameOver();
        }
    }

    private onLevelCompleted(): void {
        if (this.state.levelCompleted) return;
        this.state.levelCompleted = true;
        this.timerEnabled = false;
        this.levelManager.completeLevel(this.state.currentLevel);
        const suspectScore = this.state.getRequiredSuspectCount() * GAME.scorePerSuspect;
        const timeBonus = Math.max(0, 300 - Math.floor(this.state.elapsedTime)) * GAME.scorePerSecondBonus;
        this.state.score = suspectScore + timeBonus + this.state.lives * 50;
        const save = SaveManager.load();
        SaveManager.update({
            highScore: Math.max(save.highScore, this.state.score),
            winStreak: (save.winStreak || 0) + 1,
        });
        this.levelComplete?.show(this.state.score, this.state.elapsedTime, this.state.currentLevel);
    }

    private onGameOver(): void {
        this.timerEnabled = false;
        SaveManager.update({ winStreak: 0 });
        this.gameOver?.show(this.state.currentLevel);
    }

    private showHintEmptyBanner(): void {
        const canvas = this.canvas();
        if (!canvas) return;
        const popup = findDeep(canvas, 'PopupLayer') || canvas;
        if (!this.hintEmptyBanner || !this.hintEmptyBanner.isValid) {
            this.hintEmptyBanner = this.createHintEmptyBanner(popup);
        }
        this.hintEmptyBanner.active = true;
        this.hintEmptyBanner.setSiblingIndex(popup.children.length - 1);
        this.layoutHintEmptyBanner();
    }

    private hideHintEmptyBanner(): void {
        if (this.hintEmptyBanner?.isValid) this.hintEmptyBanner.active = false;
    }

    private createHintEmptyBanner(popup: Node): Node {
        const root = new Node('HintEmptyBanner');
        root.layer = popup.layer;
        root.setParent(popup);
        const rootUt = root.addComponent(UITransform);
        rootUt.setAnchorPoint(0.5, 0.5);

        const dim = new Node('Dim');
        dim.layer = root.layer;
        dim.setParent(root);
        dim.addComponent(UITransform).setAnchorPoint(0.5, 0.5);
        const dimSprite = dim.addComponent(Sprite);
        dimSprite.spriteFrame = whiteFrame();
        dimSprite.type = Sprite.Type.SIMPLE;
        dimSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        dimSprite.color = new Color(0, 0, 0, 140);
        dim.addComponent(BlockInputEvents);
        dim.on(Node.EventType.TOUCH_END, () => this.hideHintEmptyBanner());

        const banner = new Node('Banner');
        banner.layer = root.layer;
        banner.setParent(root);
        banner.addComponent(UITransform).setAnchorPoint(0.5, 0.5);
        const bannerSprite = banner.addComponent(Sprite);
        bannerSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        bannerSprite.type = Sprite.Type.SIMPLE;
        applySpriteFrame(bannerSprite, HINT_EMPTY_BANNER);
        banner.on(Node.EventType.TOUCH_END, () => this.hideHintEmptyBanner());
        return root;
    }

    private layoutHintEmptyBanner(): void {
        const root = this.hintEmptyBanner;
        const canvas = this.canvas();
        if (!root?.isValid || !root.active || !canvas) return;
        const popup = root.parent;
        const popupUt = popup?.getComponent(UITransform);
        const canvasUt = canvas.getComponent(UITransform);
        const width = canvasUt?.width ?? 1080;
        const height = canvasUt?.height ?? 2400;
        const unit = width / 1080;
        root.getComponent(UITransform)?.setContentSize(width, height);
        root.setPosition(0, 0, 0);

        const dim = root.getChildByName('Dim');
        const dimUt = dim?.getComponent(UITransform);
        dimUt?.setContentSize(width + 8, height + 8);
        dim?.setPosition(0, 0, 0);

        const bannerW = Math.min(1036 * unit, width - 16 * unit);
        const bannerH = bannerW * (257 / 1036);
        const banner = root.getChildByName('Banner');
        banner?.getComponent(UITransform)?.setContentSize(bannerW, bannerH);

        let y = height * 0.02;
        const game = findDeep(canvas, 'GameArea');
        if (game && popupUt) {
            const local = popupUt.convertToNodeSpaceAR(game.worldPosition);
            const gameUt = game.getComponent(UITransform);
            const gameH = (gameUt?.height ?? 1020) * Math.abs(game.scale.y);
            y = local.y + gameH * 0.16;
        }
        banner?.setPosition(0, y, 0);
    }

    private showToast(msg: string): void {
        if (!this.toastLabel) return;
        const node = this.toastLabel.node;
        node.active = true;
        this.toastLabel.string = msg;
        Tween.stopAllByTarget(node);
        node.setScale(1, 1, 1);
        tween(node)
            .delay(1.1)
            .call(() => {
                node.active = false;
            })
            .start();
    }
}
