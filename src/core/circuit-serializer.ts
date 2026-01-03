/**
 * Circuit serialization and deserialization
 * Converts BreadboardState to/from JSON format for saving and loading
 */

import type { BreadboardState, AnyComponent, Position } from './types';
import { ComponentType } from './types';

/**
 * Circuit metadata for saved circuits
 */
export interface CircuitMetadata {
  name: string;
  description?: string;
  author?: string;
  created: string; // ISO 8601 timestamp
  modified?: string; // ISO 8601 timestamp
}

/**
 * Serialized component data
 */
export interface SerializedComponent {
  id: string;
  type: string;
  positions: Position[];
  rotation: 0 | 90 | 180 | 270;
  // Component-specific properties stored in metadata
  metadata?: Record<string, number>;
}

/**
 * Complete circuit data for JSON export/import
 */
export interface CircuitData {
  version: string;
  metadata: CircuitMetadata;
  components: SerializedComponent[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Serialize a BreadboardState to JSON string
 */
export function serializeCircuit(
  state: BreadboardState,
  metadata: Partial<CircuitMetadata> = {}
): string {
  const circuitData: CircuitData = {
    version: '1.0',
    metadata: {
      name: metadata.name || 'Untitled Circuit',
      description: metadata.description,
      author: metadata.author,
      created: metadata.created || new Date().toISOString(),
      modified: new Date().toISOString(),
    },
    components: state.components.map(serializeComponent),
  };

  return JSON.stringify(circuitData, null, 2);
}

/**
 * Deserialize JSON string to BreadboardState
 * @throws Error if JSON is invalid or circuit data is malformed
 */
export function deserializeCircuit(json: string): {
  state: BreadboardState;
  metadata: CircuitMetadata;
} {
  let circuitData: CircuitData;

  // Parse JSON
  try {
    circuitData = JSON.parse(json);
  } catch (error) {
    throw new Error('Invalid JSON format: ' + (error as Error).message);
  }

  // Validate circuit data
  const errors = validateCircuitData(circuitData);
  if (errors.length > 0) {
    throw new Error(
      'Invalid circuit data: ' + errors.map((e) => `${e.field}: ${e.message}`).join(', ')
    );
  }

  // Deserialize components
  const components: AnyComponent[] = [];
  for (const serialized of circuitData.components) {
    try {
      const component = deserializeComponent(serialized);
      components.push(component);
    } catch (error) {
      throw new Error(
        `Failed to deserialize component ${serialized.id}: ${(error as Error).message}`
      );
    }
  }

  return {
    state: {
      components,
      selectedComponentId: null,
    },
    metadata: circuitData.metadata,
  };
}

/**
 * Serialize a single component
 */
function serializeComponent(component: AnyComponent): SerializedComponent {
  const serialized: SerializedComponent = {
    id: component.id,
    type: component.type,
    positions: component.positions,
    rotation: component.rotation,
  };

  // Add component-specific properties to metadata
  switch (component.type) {
    case ComponentType.RESISTOR:
      serialized.metadata = { resistance: component.resistance };
      break;
    case ComponentType.LED:
      serialized.metadata = {
        forwardVoltage: component.forwardVoltage,
        maxCurrent: component.maxCurrent,
      };
      break;
    case ComponentType.WIRE:
      serialized.metadata = { resistance: component.resistance };
      break;
    case ComponentType.POWER_SUPPLY:
      serialized.metadata = { voltage: component.voltage };
      break;
    case ComponentType.GROUND:
      // No additional metadata
      break;
  }

  return serialized;
}

/**
 * Deserialize a single component
 * @throws Error if component data is invalid
 */
function deserializeComponent(serialized: SerializedComponent): AnyComponent {
  const { id, type, positions, rotation, metadata = {} } = serialized;

  // Validate positions
  if (!positions || positions.length === 0) {
    throw new Error('Component must have at least one position');
  }

  for (const pos of positions) {
    if (typeof pos.row !== 'number' || typeof pos.col !== 'number') {
      throw new Error('Invalid position format');
    }
  }

  // Validate rotation
  if (![0, 90, 180, 270].includes(rotation)) {
    throw new Error('Invalid rotation value');
  }

  // Deserialize based on type
  switch (type) {
    case ComponentType.RESISTOR:
      return {
        id,
        type: ComponentType.RESISTOR,
        positions,
        rotation,
        resistance: metadata.resistance || 1000,
      };

    case ComponentType.LED:
      return {
        id,
        type: ComponentType.LED,
        positions,
        rotation,
        forwardVoltage: metadata.forwardVoltage || 2.0,
        maxCurrent: metadata.maxCurrent || 0.02,
      };

    case ComponentType.WIRE:
      return {
        id,
        type: ComponentType.WIRE,
        positions,
        rotation,
        resistance: metadata.resistance || 0.01,
      };

    case ComponentType.POWER_SUPPLY:
      return {
        id,
        type: ComponentType.POWER_SUPPLY,
        positions,
        rotation,
        voltage: metadata.voltage || 5.0,
      };

    case ComponentType.GROUND:
      return {
        id,
        type: ComponentType.GROUND,
        positions,
        rotation,
      };

    default:
      throw new Error(`Unknown component type: ${type}`);
  }
}

/**
 * Validate circuit data structure
 */
function validateCircuitData(data: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof data !== 'object' || data === null) {
    errors.push({ field: 'root', message: 'Circuit data must be an object' });
    return errors;
  }

  const circuitData = data as Record<string, unknown>;

  // Validate version
  if (typeof circuitData.version !== 'string') {
    errors.push({ field: 'version', message: 'Version must be a string' });
  }

  // Validate metadata
  if (typeof circuitData.metadata !== 'object' || circuitData.metadata === null) {
    errors.push({ field: 'metadata', message: 'Metadata must be an object' });
  } else {
    const metadata = circuitData.metadata as Record<string, unknown>;
    if (typeof metadata.name !== 'string') {
      errors.push({ field: 'metadata.name', message: 'Name must be a string' });
    }
    if (typeof metadata.created !== 'string') {
      errors.push({ field: 'metadata.created', message: 'Created timestamp must be a string' });
    }
  }

  // Validate components array
  if (!Array.isArray(circuitData.components)) {
    errors.push({ field: 'components', message: 'Components must be an array' });
  } else {
    const components = circuitData.components;
    components.forEach((comp, index) => {
      if (typeof comp !== 'object' || comp === null) {
        errors.push({ field: `components[${index}]`, message: 'Component must be an object' });
        return;
      }

      const component = comp as Record<string, unknown>;
      if (typeof component.id !== 'string') {
        errors.push({ field: `components[${index}].id`, message: 'Component ID must be a string' });
      }
      if (typeof component.type !== 'string') {
        errors.push({
          field: `components[${index}].type`,
          message: 'Component type must be a string',
        });
      }
      if (!Array.isArray(component.positions)) {
        errors.push({
          field: `components[${index}].positions`,
          message: 'Positions must be an array',
        });
      }
      if (typeof component.rotation !== 'number') {
        errors.push({
          field: `components[${index}].rotation`,
          message: 'Rotation must be a number',
        });
      }
    });
  }

  return errors;
}
