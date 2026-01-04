/**
 * History Manager for undo/redo functionality.
 * Maintains two stacks: one for undo, one for redo.
 * Enforces a maximum history size to prevent memory issues.
 */

import type { Command } from './command';
import type { BreadboardState } from './types';

/**
 * Manages command history for undo/redo operations
 */
export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private readonly maxHistory: number;

  /**
   * Create a new HistoryManager
   * @param maxHistory Maximum number of actions to retain (default: 50 as per goal.md)
   */
  constructor(maxHistory: number = 50) {
    this.maxHistory = maxHistory;
  }

  /**
   * Execute a command and add it to the history
   * @param command Command to execute
   * @param currentState Current breadboard state
   * @returns New state after command execution
   */
  execute(command: Command, currentState: BreadboardState): BreadboardState {
    const newState = command.execute(currentState);

    // Add to undo stack
    this.undoStack.push(command);

    // Enforce history limit (remove oldest if over capacity)
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    // Clear redo stack (standard undo/redo behavior: new actions invalidate redo)
    this.redoStack = [];

    return newState;
  }

  /**
   * Undo the last command
   * @param currentState Current breadboard state
   * @returns New state after undo, or null if nothing to undo
   */
  undo(currentState: BreadboardState): BreadboardState | null {
    const command = this.undoStack.pop();
    if (!command) {
      return null;
    }

    const newState = command.undo(currentState);
    this.redoStack.push(command);

    return newState;
  }

  /**
   * Redo the last undone command
   * @param currentState Current breadboard state
   * @returns New state after redo, or null if nothing to redo
   */
  redo(currentState: BreadboardState): BreadboardState | null {
    const command = this.redoStack.pop();
    if (!command) {
      return null;
    }

    const newState = command.execute(currentState);
    this.undoStack.push(command);

    return newState;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clear all history (used when loading a new circuit)
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get the number of actions in the undo stack
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get the number of actions in the redo stack
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }
}
