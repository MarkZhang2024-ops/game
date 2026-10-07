/**
 * Cluedoku! - Global constants (Candyland theme).
 */

export enum CellState {
    EMPTY = 0,
    MARK = 1,
    SUSPECT = 2,
}

/** Player auxiliary mark on a cell. Independent of puzzle solution data. */
export enum CellMarkState {
    NONE = 0,
    X = 1,
    SUSPECT = 2,
}

/** Who placed the suspect. Display uses markState only; this controls click behavior. */
export enum SuspectType {
    NONE = 0,
    SYSTEM = 1,
    PLAYER = 2,
}

/** Finger-drag paint mode. Chosen from the cell under TOUCH_START. */
export enum DragMode {
    NONE = 0,
    MARK_X = 1,
    UNMARK_X = 2,
}

export enum ValidationErrorType {
    ROW_ERROR = 'ROW_ERROR',
    COLUMN_ERROR = 'COLUMN_ERROR',
    REGION_ERROR = 'REGION_ERROR',
    ADJACENT_ERROR = 'ADJACENT_ERROR',
}

/** Soft, low-saturation region colors — each clearly distinguishable. */
export const REGION_PALETTE: string[] = [
    '#A8D8EA', // 0: soft blue
    '#D5AAFF', // 1: soft lavender (purple)
    '#FFDAC1', // 2: soft peach (was muted purple — too similar to lavender)
    '#FCBAD3', // 3: soft pink
    '#D4A574', // 4: soft brown (was soft yellow)
    '#B5EAD7', // 5: soft mint (green)
    '#FFB7B2', // 6: soft coral
    '#C7CEEA', // 7: soft periwinkle
    '#E2F0CB', // 8: soft lime
    '#B5D8EB', // 9: soft sky
    '#F8B195', // 10: soft salmon
    '#C06C84', // 11: dusty rose
    '#F67280', // 12: soft red
    '#355C7D', // 13: muted navy
    '#6C5B7B', // 14: muted plum
    '#A8E6CF', // 15: soft jade
];

export const COLORS = {
    // Header
    header: '#3B4BA0',       // deep blue-purple
    headerLight: '#5A6BC4',  // lighter blue
    headerText: '#FFFFFF',
    // Backgrounds
    bg: '#E8E8EC',           // light gray
    bgLight: '#F0F0F4',      // lighter gray
    boardBg: '#FFFFFF',      // white
    // Accents
    accent: '#FFD700',       // gold
    accentDark: '#DAA520',   // goldenrod
    btnBlue: '#4A90D9',      // soft blue
    btnBlueLight: '#87CEFA', // light sky blue
    btnOrange: '#E8943A',    // warm orange
    danger: '#E74C3C',       // red heart
    success: '#2ECC71',      // green
    warning: '#F1C40F',      // yellow
    // Text
    text: '#2C3E50',         // dark blue-gray
    textLight: '#FFFFFF',
    textSecondary: '#7F8C8D',
    // Borders
    border: '#BDC3C7',       // light gray
    borderDark: '#3B4BA0',   // header blue for region borders
    gridLine: '#ECF0F1',
    // Bear detective
    bearFur: '#C68642',      // warm brown
    bearMuzzle: '#E8C39E',   // light tan
    bearHat: '#5D3A1A',      // dark brown
    maskColor: '#2C3E50',    // dark blue-gray
};

export const LAYOUT = {
    headerHeight: 110,
    ruleBarHeight: 150,
    statusBarHeight: 110,
    bottomBarHeight: 180,
    cellGap: 8,
    cellRadiusRatio: 0.22,
    boardPadding: 24,
    boardRadius: 36,
    regionBorderWidthRatio: 0.04,
    buttonRadius: 52,
};

export const GAME = {
    maxLives: 3,
    hintsPerLevel: 3,
    minSize: 4,
    maxSize: 16,
    scorePerSuspect: 100,
    scorePerSecondBonus: 10,
};

/** Set false after click-mapping is verified. */
export const DEBUG_CLICK = true;

export const EMOJI = {
    suspect: '\u{1F575}',
    mark: '\u2716',
    heart: '\u{2764}',
    heartEmpty: '\u{1F5A4}',
    hint: '\u{1F50D}',
    settings: '\u2699',
    star: '\u2B50',
    restart: '\u{1F504}',
    check: '\u2705',
    cross: '\u274C',
};
