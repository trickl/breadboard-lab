/**
 * Quick Select Manager
 * Manages the Quick Select component bar for fast access to commonly-used components
 * Implements goal.md Section 12 requirements
 */

import { componentLibrary } from './component-library';
import type { QuickSelectComponent, QuickSelectState } from './types';

/**
 * Default components that appear in Quick Select bar on first load
 * These cannot be removed by the user
 */
const DEFAULT_COMPONENTS: QuickSelectComponent[] = [
  { libraryId: 'led-3mm-yellow', isDefault: true, order: 0 },
  { libraryId: 'wire-22awg-red', isDefault: true, order: 1 },
  { libraryId: 'resistor-220-5pct', isDefault: true, order: 2 },
  { libraryId: 'switch-spst', isDefault: true, order: 3 },
  { libraryId: 'power-5v', isDefault: true, order: 4 },
];

const STORAGE_KEY = 'quickSelectComponents';
const MAX_COMPONENTS = 8;

/**
 * QuickSelectManager class
 * Handles loading, saving, adding, and removing components from Quick Select bar
 */
export class QuickSelectManager {
  private components: QuickSelectComponent[] = [];

  constructor() {
    this.load();
  }

  /**
   * Load Quick Select state from localStorage or use defaults
   */
  load(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const state: QuickSelectState = JSON.parse(stored);
        this.components = state.components;
        this.validateAndRepair();
      } catch {
        // If JSON parse fails, use defaults
        this.components = [...DEFAULT_COMPONENTS];
      }
    } else {
      this.components = [...DEFAULT_COMPONENTS];
    }
  }

  /**
   * Save Quick Select state to localStorage
   */
  save(): void {
    const state: QuickSelectState = { components: this.components };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /**
   * Get all Quick Select components
   */
  getComponents(): QuickSelectComponent[] {
    return [...this.components];
  }

  /**
   * Add component to Quick Select (if not at capacity)
   */
  addComponent(libraryId: string): boolean {
    if (this.components.length >= MAX_COMPONENTS) {
      return false; // At capacity
    }
    if (this.components.some((c) => c.libraryId === libraryId)) {
      return false; // Already exists
    }
    const entry = componentLibrary.get(libraryId);
    if (!entry) {
      return false; // Invalid library ID
    }

    const newComponent: QuickSelectComponent = {
      libraryId,
      isDefault: false,
      order: this.components.length,
    };
    this.components.push(newComponent);
    this.save();
    return true;
  }

  /**
   * Remove component from Quick Select (if not default)
   */
  removeComponent(libraryId: string): boolean {
    const component = this.components.find((c) => c.libraryId === libraryId);
    if (!component || component.isDefault) {
      return false; // Cannot remove defaults
    }

    this.components = this.components.filter((c) => c.libraryId !== libraryId);
    this.reorder();
    this.save();
    return true;
  }

  /**
   * Check if component is in Quick Select
   */
  hasComponent(libraryId: string): boolean {
    return this.components.some((c) => c.libraryId === libraryId);
  }

  /**
   * Check if at capacity
   */
  isAtCapacity(): boolean {
    return this.components.length >= MAX_COMPONENTS;
  }

  /**
   * Reorder components after removal
   */
  private reorder(): void {
    this.components.forEach((c, index) => {
      c.order = index;
    });
  }

  /**
   * Validate and repair corrupted state
   * Ensures defaults exist and library IDs are valid
   */
  private validateAndRepair(): void {
    // Ensure all default components exist
    const defaults = DEFAULT_COMPONENTS.filter(
      (d) => !this.components.some((c) => c.libraryId === d.libraryId)
    );
    this.components = [...defaults, ...this.components];

    // Validate library IDs
    this.components = this.components.filter(
      (c) => componentLibrary.get(c.libraryId) !== undefined
    );

    // Enforce max capacity
    if (this.components.length > MAX_COMPONENTS) {
      this.components = this.components.slice(0, MAX_COMPONENTS);
    }

    this.reorder();
  }
}

/**
 * Global QuickSelectManager instance
 */
export const quickSelectManager = new QuickSelectManager();
