import type { Position, Rail } from './types';

/**
 * Breadboard layout configuration.
 * Models a breadboard with power rails and terminal strips.
 * - Power rails: 4 columns (2 per side), all holes in a rail vertically connected
 * - Terminal strips: each row of 5 holes is internally connected
 */
export class BreadboardLayout {
  // Standard breadboard dimensions
  static readonly ROWS = 30; // Number of rows in terminal strips
  static readonly COLS_PER_SIDE = 5; // 5 columns per side (a-e, f-j)
  static readonly TOTAL_COLS = 14; // 4 rail columns + 10 terminal strip columns

  // Rail column indices
  static readonly RAIL_LEFT_NEGATIVE = 0;
  static readonly RAIL_LEFT_POSITIVE = 1;
  // NOTE: On the right rail block, the + rail is on the outer column.
  static readonly RAIL_RIGHT_NEGATIVE = 12;
  static readonly RAIL_RIGHT_POSITIVE = 13;

  // Terminal strip column ranges (adjusted for rails)
  static readonly STRIP_LEFT_START = 2;
  static readonly STRIP_LEFT_END = 6; // inclusive
  static readonly STRIP_RIGHT_START = 7;
  static readonly STRIP_RIGHT_END = 11; // inclusive

  /**
   * Check if a position is in a rail column
   */
  static isPositionInRail(pos: Position): boolean {
    return (
      pos.col === this.RAIL_LEFT_NEGATIVE ||
      pos.col === this.RAIL_LEFT_POSITIVE ||
      pos.col === this.RAIL_RIGHT_POSITIVE ||
      pos.col === this.RAIL_RIGHT_NEGATIVE
    );
  }

  /**
   * Get the rail information for a position (if it's in a rail)
   */
  static getRailForPosition(pos: Position): Rail | null {
    if (!this.isValidPosition(pos)) {
      return null;
    }

    // Build rail holes for the specified column
    const buildRailHoles = (col: number): Position[] => {
      const holes: Position[] = [];
      for (let row = 0; row < this.ROWS; row++) {
        holes.push({ row, col });
      }
      return holes;
    };

    if (pos.col === this.RAIL_LEFT_NEGATIVE) {
      return {
        id: 'rail-left-negative',
        type: 'negative',
        side: 'left',
        holes: buildRailHoles(this.RAIL_LEFT_NEGATIVE),
      };
    }

    if (pos.col === this.RAIL_LEFT_POSITIVE) {
      return {
        id: 'rail-left-positive',
        type: 'positive',
        side: 'left',
        holes: buildRailHoles(this.RAIL_LEFT_POSITIVE),
      };
    }

    if (pos.col === this.RAIL_RIGHT_POSITIVE) {
      return {
        id: 'rail-right-positive',
        type: 'positive',
        side: 'right',
        holes: buildRailHoles(this.RAIL_RIGHT_POSITIVE),
      };
    }

    if (pos.col === this.RAIL_RIGHT_NEGATIVE) {
      return {
        id: 'rail-right-negative',
        type: 'negative',
        side: 'right',
        holes: buildRailHoles(this.RAIL_RIGHT_NEGATIVE),
      };
    }

    return null;
  }

  /**
   * Check if two positions are electrically connected by the breadboard's internal structure
   */
  static areInternallyConnected(pos1: Position, pos2: Position): boolean {
    // Same position is always connected
    if (pos1.row === pos2.row && pos1.col === pos2.col) {
      return true;
    }

    // Check if both positions are in the same rail (same column, rail columns)
    if (this.isPositionInRail(pos1) && pos1.col === pos2.col) {
      return true;
    }

    // Terminal strips: within a row, all holes on the same side are connected
    if (pos1.row !== pos2.row) {
      return false;
    }

    if (this.areInSameTerminalStripRange(pos1, pos2, this.STRIP_LEFT_START, this.STRIP_LEFT_END)) {
      return true;
    }

    return this.areInSameTerminalStripRange(
      pos1,
      pos2,
      this.STRIP_RIGHT_START,
      this.STRIP_RIGHT_END
    );
  }

  private static isColInRange(pos: Position, startCol: number, endCol: number): boolean {
    return pos.col >= startCol && pos.col <= endCol;
  }

  private static areInSameTerminalStripRange(
    pos1: Position,
    pos2: Position,
    startCol: number,
    endCol: number
  ): boolean {
    return this.isColInRange(pos1, startCol, endCol) && this.isColInRange(pos2, startCol, endCol);
  }

  /**
   * Check if a position is in a terminal strip
   */
  static isInTerminalStrip(pos: Position): boolean {
    if (pos.row < 0 || pos.row >= this.ROWS) {
      return false;
    }
    return (
      (pos.col >= this.STRIP_LEFT_START && pos.col <= this.STRIP_LEFT_END) ||
      (pos.col >= this.STRIP_RIGHT_START && pos.col <= this.STRIP_RIGHT_END)
    );
  }

  /**
   * Check if a position is valid on the breadboard
   */
  static isValidPosition(pos: Position): boolean {
    return pos.row >= 0 && pos.row < this.ROWS && pos.col >= 0 && pos.col < this.TOTAL_COLS;
  }

  /**
   * Get all positions internally connected to the given position
   */
  static getConnectedPositions(pos: Position): Position[] {
    if (!this.isValidPosition(pos)) {
      return [];
    }

    if (this.isPositionInRail(pos)) {
      return this.buildRailConnectedPositions(pos.col);
    }

    if (this.isInTerminalStrip(pos)) {
      return this.buildTerminalStripConnectedPositions(pos);
    }

    return [];
  }

  private static buildRailConnectedPositions(col: number): Position[] {
    const connected: Position[] = [];
    for (let row = 0; row < this.ROWS; row++) {
      connected.push({ row, col });
    }
    return connected;
  }

  private static buildTerminalStripConnectedPositions(pos: Position): Position[] {
    const range = this.getTerminalStripRangeForColumn(pos.col);
    if (!range) {
      return [];
    }

    const connected: Position[] = [];
    for (let col = range.startCol; col <= range.endCol; col++) {
      connected.push({ row: pos.row, col });
    }

    return connected;
  }

  private static getTerminalStripRangeForColumn(
    col: number
  ): { startCol: number; endCol: number } | null {
    if (col >= this.STRIP_LEFT_START && col <= this.STRIP_LEFT_END) {
      return { startCol: this.STRIP_LEFT_START, endCol: this.STRIP_LEFT_END };
    }
    if (col >= this.STRIP_RIGHT_START && col <= this.STRIP_RIGHT_END) {
      return { startCol: this.STRIP_RIGHT_START, endCol: this.STRIP_RIGHT_END };
    }
    return null;
  }
}
