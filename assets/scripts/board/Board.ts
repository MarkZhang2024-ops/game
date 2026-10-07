/**
 * Cluedoku! - Board view (Cocos Creator 3.8.4).
 *
 * Layout and hit area share the same cellSize / rows / cols.
 * Decorative Graphics nodes use a 0×0 UITransform so they cannot steal hits.
 * Clicks are handled by each Cell (TOUCH_END), not by this Board.
 */

import {
    _decorator,
    Component,
    Graphics,
    Node,
    UITransform,
    Vec3,
    Vec2,
    Color,
    Layers,
    Prefab,
    Sprite,
    instantiate,
    EventTouch,
} from 'cc';
import { Cell, CellClickHandler } from './Cell';
import { COLORS, LAYOUT, DEBUG_CLICK, CellMarkState, SuspectType, DragMode } from '../utils/Constants';
import { BoardData } from '../puzzle/PuzzleTypes';

const { ccclass, property } = _decorator;

@ccclass('Board')
export class Board extends Component {
    @property(Prefab)
    public cellPrefab: Prefab | null = null;

    @property(Prefab)
    public suspectPrefab: Prefab | null = null;

    private cells: Cell[][] = [];
    private containerG: Graphics | null = null;
    private borderG: Graphics | null = null;
    private boardData: BoardData | null = null;
    private cellSize = 0;
    private rows = 0;
    private cols = 0;
    private gridWidth = 0;
    private gridHeight = 0;
    private clickHandler: CellClickHandler | null = null;
    private cellLayer: Node | null = null;

    private isDragging = false;
    private dragMode: DragMode = DragMode.NONE;
    private dragProcessedCells: Set<number> = new Set();
    private lastDragCellIndex = -1;
    private dragDistance = 0;
    private dragStartUI = new Vec2();
    private dragStartRow = -1;
    private dragStartCol = -1;
    private inputEnabled = true;
    private static readonly DRAG_THRESHOLD = 10;

    public setInputEnabled(enabled: boolean): void {
        this.inputEnabled = enabled;
        if (!enabled) this.resetDrag();
    }

    protected onEnable(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    protected onDisable(): void {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        this.resetDrag();
    }

    public isDragGesture(): boolean {
        return this.isDragging;
    }

    public setClickHandler(handler: CellClickHandler): void {
        this.clickHandler = handler;
    }

    public getBoardData(): BoardData | null {
        return this.boardData;
    }

    public getRows(): number { return this.rows; }
    public getCols(): number { return this.cols; }
    public getCellSize(): number { return this.cellSize; }

    public build(board: BoardData, availableWidth: number, availableHeight?: number): void {
        this.boardData = board;
        this.rows = board.rows;
        this.cols = board.cols;

        const ut = this.getComponent(UITransform) || this.addComponent(UITransform);
        ut.setAnchorPoint(0.5, 0.5);
        const availH = availableHeight ?? availableWidth;
        const innerW = Math.max(1, availableWidth - 2 * LAYOUT.boardPadding);
        const innerH = Math.max(1, availH - 2 * LAYOUT.boardPadding);
        this.cellSize = Math.floor(Math.min(innerW / this.cols, innerH / this.rows));
        this.gridWidth = this.cellSize * this.cols;
        this.gridHeight = this.cellSize * this.rows;
        const totalW = this.gridWidth + 2 * LAYOUT.boardPadding;
        const totalH = this.gridHeight + 2 * LAYOUT.boardPadding;

        this.node.layer = Layers.Enum.UI_2D;
        this.node.removeAllChildren();
        this.cellLayer = this.node;
        this.resetDrag();

        if (!this.cellPrefab) {
            console.error('[Board] cellPrefab is not assigned');
            return;
        }

        this.drawFrameIfPresent(totalW, totalH);

        this.cells = [];
        for (let r = 0; r < this.rows; r++) {
            this.cells[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const node = this.createCellNode(r, c);
                if (!node) continue;
                node.layer = Layers.Enum.UI_2D;
                node.parent = this.node;
                node.name = `C_${r}_${c}`;
                node.active = true;
                const cell = node.getComponent(Cell) || node.addComponent(Cell);
                const x = (c - (this.cols - 1) * 0.5) * this.cellSize;
                const y = ((this.rows - 1) * 0.5 - r) * this.cellSize;
                node.setPosition(x, y, 0);
                const data = board.cells[r][c];
                cell.init(r, c);
                cell.setup(
                    r,
                    c,
                    this.cellSize,
                    data.color,
                    (row, col) => {
                        if (this.isDragGesture()) return;
                        this.clickHandler?.(row, col);
                    },
                    this.suspectPrefab
                );
                if (data.hasSuspect || data.locked) {
                    cell.setMarkState(CellMarkState.SUSPECT, SuspectType.SYSTEM);
                }
                this.cells[r][c] = cell;
            }
        }
    }

    public createBoard(board: BoardData): void {
        const ut = this.getComponent(UITransform) || this.addComponent(UITransform);
        const w = Math.max(64, ut.width);
        const h = Math.max(64, ut.height);
        this.build(board, w, h);
    }

    public getCell(row: number, col: number): Cell | null {
        return this.cells[row]?.[col] ?? null;
    }

    public placeSuspect(row: number, col: number, animate: boolean): void {
        if (!this.boardData) return;
        const data = this.boardData.cells[row]?.[col];
        if (!data) return;
        data.hasSuspect = true;
        this.cells[row]?.[col]?.setMarkState(CellMarkState.SUSPECT, SuspectType.PLAYER, animate);
    }

    public removeSuspect(row: number, col: number): void {
        if (!this.boardData) return;
        const data = this.boardData.cells[row]?.[col];
        const cell = this.cells[row]?.[col];
        if (!data || !cell || cell.getSuspectType() === SuspectType.SYSTEM) return;
        data.hasSuspect = false;
        cell.setMarkState(CellMarkState.NONE, SuspectType.NONE);
    }

    public shakeCell(row: number, col: number): void {
        this.cells[row]?.[col]?.playShake();
    }

    /** Writes an X into the cell. Already marked or locked cells are left alone. */
    public excludeCell(row: number, col: number): boolean {
        const cell = this.getCell(row, col);
        if (!cell || cell.getMarkState() !== CellMarkState.NONE) return false;
        if (cell.getSuspectType() === SuspectType.SYSTEM || cell.isLocked()) return false;
        cell.setMarkState(CellMarkState.X, SuspectType.NONE);
        return true;
    }

    /** Places a locked suspect. The cell ignores later clicks. No highlight ring. */
    public playHint(row: number, col: number): void {
        if (!this.boardData) return;
        const data = this.boardData.cells[row]?.[col];
        const cell = this.cells[row]?.[col];
        if (!data || !cell || data.hasSuspect) return;
        data.hasSuspect = true;
        cell.setMarkState(CellMarkState.SUSPECT, SuspectType.SYSTEM, true);
        const ring = cell.node.getChildByName('HintMark');
        if (ring) ring.active = false;
    }

    /**
     * UI camera screen point → Board local → row/col.
     * Uses the same origin as Cell placement (row 0 = top, col 0 = left).
     */
    public getCellFromTouch(event: EventTouch): { row: number; col: number } | null {
        const ut = this.getComponent(UITransform);
        if (!ut || this.cellSize <= 0 || this.rows <= 0 || this.cols <= 0) {
            console.error('[Board] UITransform missing or board not built');
            return null;
        }

        const location = event.getUILocation();
        const localPos = ut.convertToNodeSpaceAR(new Vec3(location.x, location.y, 0));

        const left = -this.gridWidth * 0.5;
        const bottom = -this.gridHeight * 0.5;
        const x = localPos.x - left;
        const y = localPos.y - bottom;

        if (x < 0 || y < 0 || x >= this.gridWidth || y >= this.gridHeight) {
            return null;
        }

        const col = Math.floor(x / this.cellSize);
        const row = this.rows - 1 - Math.floor(y / this.cellSize);

        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return null;
        }

        if (DEBUG_CLICK) {
            console.log(
                `[Board Click] screen=(${location.x.toFixed(1)},${location.y.toFixed(1)}) ` +
                `local=(${localPos.x.toFixed(1)},${localPos.y.toFixed(1)}) ` +
                `row=${row} col=${col} cellSize=${this.cellSize} rows=${this.rows} cols=${this.cols}`
            );
        }

        return { row, col };
    }

    public getCellByPosition(event: EventTouch): { row: number; col: number } | null {
        return this.getCellFromTouch(event);
    }

    private onTouchStart(event: EventTouch): void {
        if (!this.inputEnabled) return;
        this.resetDrag();
        const loc = event.getUILocation();
        this.dragStartUI.set(loc.x, loc.y);
        const hit = this.getCellByPosition(event);
        if (!hit) return;
        this.dragStartRow = hit.row;
        this.dragStartCol = hit.col;
        const cell = this.getCell(hit.row, hit.col);
        if (!cell) return;
        if (cell.getSuspectType() === SuspectType.SYSTEM || cell.isLocked()) {
            this.dragMode = DragMode.NONE;
            return;
        }
        const mark = cell.getMarkState();
        if (mark === CellMarkState.NONE) {
            this.dragMode = DragMode.MARK_X;
        } else if (mark === CellMarkState.X) {
            this.dragMode = DragMode.UNMARK_X;
        } else {
            this.dragMode = DragMode.NONE;
        }
    }

    private onTouchMove(event: EventTouch): void {
        if (this.dragMode === DragMode.NONE) return;
        const loc = event.getUILocation();
        const dx = loc.x - this.dragStartUI.x;
        const dy = loc.y - this.dragStartUI.y;
        this.dragDistance = Math.sqrt(dx * dx + dy * dy);

        if (!this.isDragging && this.dragDistance > Board.DRAG_THRESHOLD) {
            this.isDragging = true;
            const start = this.getCell(this.dragStartRow, this.dragStartCol);
            if (start) this.handleDragCell(start);
        }
        if (!this.isDragging) return;

        const hit = this.getCellByPosition(event);
        if (!hit) return;
        const cell = this.getCell(hit.row, hit.col);
        if (cell) this.handleDragCell(cell);
    }

    private onTouchEnd(): void {
        this.resetDrag();
    }

    private handleDragCell(cell: Cell): void {
        const index = cell.getCellIndex(this.cols);
        if (this.dragProcessedCells.has(index)) return;
        this.dragProcessedCells.add(index);
        this.lastDragCellIndex = index;

        if (cell.getSuspectType() === SuspectType.SYSTEM || cell.isLocked()) return;

        switch (this.dragMode) {
            case DragMode.MARK_X:
                this.handleDragMark(cell);
                break;
            case DragMode.UNMARK_X:
                this.handleDragUnmark(cell);
                break;
            default:
                break;
        }
    }

    private handleDragMark(cell: Cell): void {
        if (cell.getMarkState() !== CellMarkState.NONE) return;
        cell.setMarkState(CellMarkState.X, SuspectType.NONE);
        console.log('Drag Mark', cell.getRow(), cell.getCol());
    }

    private handleDragUnmark(cell: Cell): void {
        if (cell.getMarkState() !== CellMarkState.X) return;
        cell.setMarkState(CellMarkState.NONE, SuspectType.NONE);
        console.log('Drag Unmark', cell.getRow(), cell.getCol());
    }

    private resetDrag(): void {
        this.isDragging = false;
        this.dragMode = DragMode.NONE;
        this.dragProcessedCells.clear();
        this.lastDragCellIndex = -1;
        this.dragDistance = 0;
        this.dragStartRow = -1;
        this.dragStartCol = -1;
    }

    private drawFrameIfPresent(totalW: number, totalH: number): void {
        const frame = this.node.parent;
        if (!frame) return;
        // Candy frame art already supplies the border. Drawing Graphics here
        // would cover 游戏主框.png.
        if (frame.getComponent(Sprite) || frame.name === 'BoardFrame') {
            return;
        }
        const g = frame.getComponent(Graphics) || frame.addComponent(Graphics);
        this.containerG = g;
        this.drawContainer(totalW, totalH);
        this.borderG = g;
        this.drawBorders();
    }

    private createCellNode(row: number, col: number): Node | null {
        if (this.cellPrefab) {
            try {
                return instantiate(this.cellPrefab);
            } catch (e) {
                console.error('[Board] failed to instantiate cellPrefab', e);
            }
        }
        console.error('[Board] cellPrefab is not assigned');
        return null;
    }

    private drawContainer(totalW: number, totalH: number): void {
        const g = this.containerG!;
        g.clear();
        const hw = totalW / 2;
        const hh = totalH / 2;
        const r = LAYOUT.boardRadius;
        g.fillColor = new Color(0, 0, 0, 40);
        g.roundRect(-hw + 3, -hh - 5, totalW, totalH, r);
        g.fill();
        g.fillColor = new Color(0, 0, 0, 25);
        g.roundRect(-hw + 5, -hh - 7, totalW, totalH, r);
        g.fill();
        g.fillColor = new Color(COLORS.boardBg);
        g.roundRect(-hw, -hh, totalW, totalH, r);
        g.fill();
        g.lineWidth = 3;
        g.strokeColor = new Color(COLORS.border);
        g.roundRect(-hw, -hh, totalW, totalH, r);
        g.stroke();
    }

    private drawBorders(): void {
        const g = this.borderG;
        if (!g || !this.boardData) return;
        g.clear();
        const rows = this.rows;
        const cols = this.cols;
        const cs = this.cellSize;
        const halfW = this.gridWidth / 2;
        const halfH = this.gridHeight / 2;
        const toX = (col: number) => -halfW + col * cs;
        const toY = (row: number) => halfH - row * cs;

        g.strokeColor = new Color(COLORS.gridLine);
        g.lineWidth = 1;
        for (let i = 1; i < cols; i++) {
            const x = toX(i);
            g.moveTo(x, halfH);
            g.lineTo(x, -halfH);
        }
        for (let i = 1; i < rows; i++) {
            const y = toY(i);
            g.moveTo(-halfW, y);
            g.lineTo(halfW, y);
        }
        g.stroke();

        g.strokeColor = new Color(COLORS.borderDark);
        g.lineWidth = Math.max(2, Math.floor(cs * LAYOUT.regionBorderWidthRatio));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const color = this.boardData.cells[r][c].color;
                const leftDifferent = c === 0 || this.boardData.cells[r][c - 1].color !== color;
                const topDifferent = r === 0 || this.boardData.cells[r - 1][c].color !== color;
                const rightDifferent = c === cols - 1 || this.boardData.cells[r][c + 1].color !== color;
                const bottomDifferent = r === rows - 1 || this.boardData.cells[r + 1][c].color !== color;
                if (leftDifferent) {
                    g.moveTo(toX(c), toY(r));
                    g.lineTo(toX(c), toY(r + 1));
                }
                if (topDifferent) {
                    g.moveTo(toX(c), toY(r));
                    g.lineTo(toX(c + 1), toY(r));
                }
                if (rightDifferent) {
                    g.moveTo(toX(c + 1), toY(r));
                    g.lineTo(toX(c + 1), toY(r + 1));
                }
                if (bottomDifferent) {
                    g.moveTo(toX(c), toY(r + 1));
                    g.lineTo(toX(c + 1), toY(r + 1));
                }
            }
        }
        g.stroke();
    }
}
