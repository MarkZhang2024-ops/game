/**
 * BoardController - reads level data and instantiates Cell prefabs into BoardContainer.
 */

import { _decorator, Component, Prefab, UITransform } from 'cc';
import { Board } from './Board';
import { BoardData } from '../puzzle/PuzzleTypes';
import { CellClickHandler } from './Cell';

const { ccclass, property } = _decorator;

@ccclass('BoardController')
export class BoardController extends Component {
    @property(Prefab)
    public cellPrefab: Prefab | null = null;

    private board: Board | null = null;
    private pendingData: BoardData | null = null;

    protected onLoad(): void {
        this.board = this.getComponent(Board) || this.addComponent(Board);
        if (this.cellPrefab) {
            this.board.cellPrefab = this.cellPrefab;
        }
        const ut = this.getComponent(UITransform) || this.addComponent(UITransform);
        ut.setAnchorPoint(0.5, 0.5);
    }

    public getBoard(): Board | null {
        return this.board;
    }

    public setClickHandler(handler: CellClickHandler): void {
        this.board?.setClickHandler(handler);
    }

    /**
     * Create a size×size board. Cell count is size*size (6→36, 8→64, 10→100).
     * Pass BoardData from the current level so colors / locked suspects stay correct.
     */
    public createBoard(size: number, data?: BoardData): void {
        if (!this.board) {
            this.board = this.getComponent(Board) || this.addComponent(Board);
        }
        if (this.cellPrefab) {
            this.board.cellPrefab = this.cellPrefab;
        }
        const boardData = data ?? this.pendingData;
        if (!boardData) {
            console.error('[BoardController] missing level BoardData');
            return;
        }
        if (boardData.rows !== size || boardData.cols !== size) {
            console.warn(`[BoardController] size ${size} does not match data ${boardData.rows}×${boardData.cols}`);
        }
        this.pendingData = boardData;
        this.board.createBoard(boardData);
    }

    public setLevelData(data: BoardData): void {
        this.pendingData = data;
    }
}
