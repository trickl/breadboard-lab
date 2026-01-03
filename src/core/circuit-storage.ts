/**
 * Circuit storage layer for localStorage and file operations
 */

import type { CircuitData } from './circuit-serializer';

const STORAGE_KEY_PREFIX = 'breadboard-lab-circuit-';
const STORAGE_INDEX_KEY = 'breadboard-lab-circuit-index';

/**
 * Saved circuit metadata for listing
 */
export interface SavedCircuitInfo {
  name: string;
  description?: string;
  created: string;
  modified?: string;
}

/**
 * Save a circuit to localStorage
 */
export function saveToLocalStorage(name: string, circuitJson: string): void {
  const key = STORAGE_KEY_PREFIX + sanitizeStorageKey(name);

  try {
    localStorage.setItem(key, circuitJson);

    // Update index
    const index = getCircuitIndex();
    const circuitData = JSON.parse(circuitJson) as CircuitData;

    index[key] = {
      name: circuitData.metadata.name,
      description: circuitData.metadata.description,
      created: circuitData.metadata.created,
      modified: circuitData.metadata.modified,
    };

    saveCircuitIndex(index);
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Please delete some saved circuits.');
    }
    throw new Error('Failed to save circuit: ' + (error as Error).message);
  }
}

/**
 * Load a circuit from localStorage
 */
export function loadFromLocalStorage(name: string): string | null {
  const key = STORAGE_KEY_PREFIX + sanitizeStorageKey(name);

  try {
    return localStorage.getItem(key);
  } catch (error) {
    throw new Error('Failed to load circuit: ' + (error as Error).message);
  }
}

/**
 * List all saved circuits
 */
export function listSavedCircuits(): SavedCircuitInfo[] {
  const index = getCircuitIndex();

  return Object.values(index).sort((a, b) => {
    // Sort by modified date (most recent first), fallback to created date
    const dateA = new Date(a.modified || a.created).getTime();
    const dateB = new Date(b.modified || b.created).getTime();
    return dateB - dateA;
  });
}

/**
 * Delete a saved circuit from localStorage
 */
export function deleteSavedCircuit(name: string): void {
  const key = STORAGE_KEY_PREFIX + sanitizeStorageKey(name);

  try {
    localStorage.removeItem(key);

    // Update index
    const index = getCircuitIndex();
    delete index[key];
    saveCircuitIndex(index);
  } catch (error) {
    throw new Error('Failed to delete circuit: ' + (error as Error).message);
  }
}

/**
 * Download circuit as JSON file
 */
export function downloadCircuitFile(circuitJson: string, filename: string): void {
  // Ensure filename has .json extension
  if (!filename.endsWith('.json')) {
    filename += '.json';
  }

  // Create blob
  const blob = new Blob([circuitJson], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Create temporary download link
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up object URL
  URL.revokeObjectURL(url);
}

/**
 * Upload circuit from file
 * @returns Promise that resolves with the file contents as string
 */
export function uploadCircuitFile(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      // Read file
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result;

        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file: ' + reader.error?.message));
      };

      reader.readAsText(file);
    };

    input.oncancel = () => {
      reject(new Error('File selection cancelled'));
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  });
}

/**
 * Get the circuit index from localStorage
 */
function getCircuitIndex(): Record<string, SavedCircuitInfo> {
  try {
    const indexJson = localStorage.getItem(STORAGE_INDEX_KEY);
    if (!indexJson) {
      return {};
    }
    return JSON.parse(indexJson) as Record<string, SavedCircuitInfo>;
  } catch (error) {
    // If index is corrupted, rebuild it from scratch
    console.warn('Circuit index corrupted, rebuilding...', error);
    return rebuildCircuitIndex();
  }
}

/**
 * Save the circuit index to localStorage
 */
function saveCircuitIndex(index: Record<string, SavedCircuitInfo>): void {
  try {
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
  } catch (error) {
    throw new Error('Failed to save circuit index: ' + (error as Error).message);
  }
}

/**
 * Rebuild circuit index by scanning localStorage
 */
function rebuildCircuitIndex(): Record<string, SavedCircuitInfo> {
  const index: Record<string, SavedCircuitInfo> = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
      try {
        const json = localStorage.getItem(key);
        if (json) {
          const circuitData = JSON.parse(json) as CircuitData;
          index[key] = {
            name: circuitData.metadata.name,
            description: circuitData.metadata.description,
            created: circuitData.metadata.created,
            modified: circuitData.metadata.modified,
          };
        }
      } catch (error) {
        console.warn(`Failed to parse circuit at key ${key}:`, error);
      }
    }
  }

  // Save rebuilt index
  try {
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
  } catch (error) {
    console.warn('Failed to save rebuilt index:', error);
  }

  return index;
}

/**
 * Sanitize a name to be used as a storage key
 */
function sanitizeStorageKey(name: string): string {
  // Remove special characters and normalize whitespace
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
