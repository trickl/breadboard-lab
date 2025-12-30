import type { Position } from './types';

/**
 * Breadboard layout configuration.
 * Models a simplified breadboard with terminal strips.
 * Terminal strips: each row of 5 holes is internally connected.
 */
export class BreadboardLayout {
  // Standard breadboard dimensions
  static readonly ROWS = 30; // Number of rows in terminal strips
  static readonly COLS_PER_SIDE = 5; // 5 columns per side (a-e, f-j)

  /**
   * Check if two positions are electrically connected by the breadboard's internal structure
   */
  static areInternallyConnected(pos1: Position, pos2: Position): boolean {
    // Same position is always connected
    if (pos1.row === pos2.row && pos1.col === pos2.col) {
      return true;
    }

    // Terminal strips: within a row, all holes on the same side are connected
    if (pos1.row === pos2.row) {
      // Left terminal strip (columns 0-4)
      if (pos1.col < this.COLS_PER_SIDE && pos2.col < this.COLS_PER_SIDE) {
        return true;
      }
      // Right terminal strip (columns 5-9)
      if (pos1.col >= this.COLS_PER_SIDE && pos2.col >= this.COLS_PER_SIDE) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a position is in a terminal strip
   */
  static isInTerminalStrip(pos: Position): boolean {
    return pos.col >= 0 && pos.col < this.COLS_PER_SIDE * 2 && pos.row >= 0 && pos.row < this.ROWS;
  }

  /**
   * Check if a position is valid on the breadboard
   */
  static isValidPosition(pos: Position): boolean {
    return (
      pos.row >= 0 &&
      pos.row < this.ROWS &&
      pos.col >= 0 &&
      pos.col < this.COLS_PER_SIDE * 2 // 5 columns per side
    );
  }

  /**
   * Get all positions internally connected to the given position
   */
  static getConnectedPositions(pos: Position): Position[] {
    if (!this.isValidPosition(pos)) {
      return [];
    }

    const connected: Position[] = [];

    // Terminal strips
    if (this.isInTerminalStrip(pos)) {
      if (pos.col < this.COLS_PER_SIDE) {
        // Left terminal strip
        for (let col = 0; col < this.COLS_PER_SIDE; col++) {
          connected.push({ row: pos.row, col });
        }
      } else {
        // Right terminal strip
        for (let col = this.COLS_PER_SIDE; col < this.COLS_PER_SIDE * 2; col++) {
          connected.push({ row: pos.row, col });
        }
      }
    }

    return connected;
  }
}
