/**
 * Circuit serialization and deserialization
 * Converts BreadboardState to/from JSON format for saving and loading
 */

import type { BreadboardState, AnyComponent, Position } from './types';
import { ComponentType } from './types';
import { createInitialEDU8State } from './edu8-simulator';

/**
 * Default component values
 */
const DEFAULT_RESISTANCE = 1000; // 1kΩ
const DEFAULT_LED_FORWARD_VOLTAGE = 2.0; // 2V
const DEFAULT_LED_MAX_CURRENT = 0.02; // 20mA
const DEFAULT_WIRE_RESISTANCE = 0.01; // Very low
const DEFAULT_POWER_SUPPLY_VOLTAGE = 5.0; // 5V

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
  metadata?: Record<string, number | number[] | string>;
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
      name: metadata.name ?? 'Untitled Circuit',
      description: metadata.description,
      author: metadata.author,
      created: metadata.created ?? new Date().toISOString(),
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
        color: component.color ?? 'red',
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
    case ComponentType.MICROPROCESSOR:
      serialized.metadata = {
        rom: Array.from(component.state.rom),
      };
      break;
    case ComponentType.SWITCH:
      serialized.metadata = {
        switchState: component.switchState ?? 'open',
      };
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

  const readNumber = (key: keyof typeof metadata, defaultValue: number): number => {
    const value = metadata[key];
    return typeof value === 'number' ? value : defaultValue;
  };

  const readString = (key: keyof typeof metadata, defaultValue: string): string => {
    const value = metadata[key];
    return typeof value === 'string' ? value : defaultValue;
  };

  const deserializeResistor = (): AnyComponent => ({
    id,
    type: ComponentType.RESISTOR,
    positions,
    rotation,
    resistance: readNumber('resistance', DEFAULT_RESISTANCE),
  });

  const deserializeLed = (): AnyComponent => ({
    id,
    type: ComponentType.LED,
    positions,
    rotation,
    color: readString('color', 'red'),
    forwardVoltage: readNumber('forwardVoltage', DEFAULT_LED_FORWARD_VOLTAGE),
    maxCurrent: readNumber('maxCurrent', DEFAULT_LED_MAX_CURRENT),
  });

  const deserializeWire = (): AnyComponent => ({
    id,
    type: ComponentType.WIRE,
    positions,
    rotation,
    resistance: readNumber('resistance', DEFAULT_WIRE_RESISTANCE),
  });

  const deserializePowerSupply = (): AnyComponent => ({
    id,
    type: ComponentType.POWER_SUPPLY,
    positions,
    rotation,
    voltage: readNumber('voltage', DEFAULT_POWER_SUPPLY_VOLTAGE),
  });

  const deserializeGround = (): AnyComponent => ({
    id,
    type: ComponentType.GROUND,
    positions,
    rotation,
  });

  const deserializeMicroprocessor = (): AnyComponent => {
    const state = createInitialEDU8State();
    // Load ROM if provided
    if (metadata.rom && Array.isArray(metadata.rom)) {
      state.rom = new Uint8Array(metadata.rom.slice(0, 16));
    }
    return {
      id,
      type: ComponentType.MICROPROCESSOR,
      positions,
      rotation,
      state,
    };
  };

  const deserializeSwitch = (): AnyComponent => {
    const switchState =
      metadata.switchState === 'open' || metadata.switchState === 'closed'
        ? metadata.switchState
        : 'open';

    return {
      id,
      type: ComponentType.SWITCH,
      positions,
      rotation,
      switchState,
    };
  };

  // Deserialize based on type
  switch (type) {
    case ComponentType.RESISTOR:
      return deserializeResistor();

    case ComponentType.LED:
      return deserializeLed();

    case ComponentType.WIRE:
      return deserializeWire();

    case ComponentType.POWER_SUPPLY:
      return deserializePowerSupply();

    case ComponentType.GROUND:
      return deserializeGround();

    case ComponentType.MICROPROCESSOR:
      return deserializeMicroprocessor();

    case ComponentType.SWITCH:
      return deserializeSwitch();

    default:
      throw new Error(`Unknown component type: ${type}`);
  }
}

/**
 * Validate circuit data structure
 */
function validateCircuitData(data: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  const addError = (field: string, message: string) => {
    errors.push({ field, message });
  };

  const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
  };

  const validateMetadata = (value: unknown) => {
    if (!isRecord(value)) {
      addError('metadata', 'Metadata must be an object');
      return;
    }

    if (typeof value.name !== 'string') {
      addError('metadata.name', 'Name must be a string');
    }
    if (typeof value.created !== 'string') {
      addError('metadata.created', 'Created timestamp must be a string');
    }
  };

  const validateComponent = (value: unknown, index: number) => {
    if (!isRecord(value)) {
      addError(`components[${index}]`, 'Component must be an object');
      return;
    }

    if (typeof value.id !== 'string') {
      addError(`components[${index}].id`, 'Component ID must be a string');
    }
    if (typeof value.type !== 'string') {
      addError(`components[${index}].type`, 'Component type must be a string');
    }
    if (!Array.isArray(value.positions)) {
      addError(`components[${index}].positions`, 'Positions must be an array');
    }
    if (typeof value.rotation !== 'number') {
      addError(`components[${index}].rotation`, 'Rotation must be a number');
    }
  };

  if (!isRecord(data)) {
    addError('root', 'Circuit data must be an object');
    return errors;
  }

  const circuitData = data;

  // Validate version
  if (typeof circuitData.version !== 'string') {
    addError('version', 'Version must be a string');
  }

  // Validate metadata
  validateMetadata(circuitData.metadata);

  // Validate components array
  if (!Array.isArray(circuitData.components)) {
    addError('components', 'Components must be an array');
  } else {
    circuitData.components.forEach((component, index) => validateComponent(component, index));
  }

  return errors;
}
