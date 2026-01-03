/**
 * Component library registry and lookup functions
 * Manages the catalog of real-world electronic components
 */

import type { ComponentLibraryEntry, ComponentCategory } from './types';

/**
 * Component library registry
 */
class ComponentLibrary {
  private entries: Map<string, ComponentLibraryEntry> = new Map();

  /**
   * Register a component in the library
   */
  register(entry: ComponentLibraryEntry): void {
    if (this.entries.has(entry.id)) {
      throw new Error(`Component with ID "${entry.id}" already registered`);
    }
    this.entries.set(entry.id, entry);
  }

  /**
   * Get a component by ID
   */
  get(id: string): ComponentLibraryEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Get all components
   */
  getAll(): ComponentLibraryEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Get components by category
   */
  getByCategory(category: ComponentCategory): ComponentLibraryEntry[] {
    return this.getAll().filter((entry) => entry.category === category);
  }

  /**
   * Search components by name or description
   */
  search(query: string): ComponentLibraryEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(
      (entry) =>
        entry.name.toLowerCase().includes(lowerQuery) ||
        entry.description?.toLowerCase().includes(lowerQuery) ||
        entry.manufacturerPartNumber?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.entries.clear();
  }
}

/**
 * Global component library instance
 */
export const componentLibrary = new ComponentLibrary();

/**
 * Initialize the component library with default components
 */
export function initializeComponentLibrary(): void {
  // Dynamically import library entries to avoid circular dependencies
  import('../library').then(({ ALL_LIBRARY_ENTRIES }) => {
    ALL_LIBRARY_ENTRIES.forEach((entry) => {
      componentLibrary.register(entry);
    });
  });
}
