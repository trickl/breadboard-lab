/**
 * Core types for the breadboard simulator.
 * These types represent the domain model independent of UI or simulation implementation.
 */

/**
 * Position on the breadboard grid
 */
export interface Position {
  row: number;
  col: number;
}

/**
 * Terminal strip in the breadboard
 */
export interface Strip {
  id: string;
  holes: Position[];
}

/**
 * Power rail in the breadboard
 */
export interface Rail {
  id: string;
  type: 'positive' | 'negative';
  side: 'left' | 'right';
  holes: Position[];
}

/**
 * Complete breadboard topology
 * Note: This interface is defined to match the target architecture specified in
 * planning/vision/goal.md. Currently, the BreadboardLayout class provides this
 * functionality through static methods. Future refactoring may create an instance
 * of this interface for more flexible breadboard configurations.
 */
export interface BreadboardTopology {
  rows: number;
  columns: number;
  strips: Strip[];
  rails: Rail[];
}

/**
 * Component types supported by the simulator
 */
export enum ComponentType {
  RESISTOR = 'RESISTOR',
  LED = 'LED',
  WIRE = 'WIRE',
  POWER_SUPPLY = 'POWER_SUPPLY',
  GROUND = 'GROUND',
  MICROPROCESSOR = 'MICROPROCESSOR',
  SWITCH = 'SWITCH',
}

/**
 * Base interface for all components
 */
export interface Component {
  id: string;
  type: ComponentType;
  positions: Position[]; // Positions this component occupies
  rotation: 0 | 90 | 180 | 270; // Component rotation in degrees
  libraryId?: string; // Optional reference to ComponentLibraryEntry (for real-world parts)
  switchState?: 'open' | 'closed'; // For switch components
}

/**
 * Resistor component
 */
export interface Resistor extends Component {
  type: ComponentType.RESISTOR;
  resistance: number; // in Ohms
}

/**
 * LED component
 */
export interface LED extends Component {
  type: ComponentType.LED;
  forwardVoltage: number; // in Volts
  maxCurrent: number; // in Amperes
}

/**
 * Wire component
 */
export interface Wire extends Component {
  type: ComponentType.WIRE;
  resistance: number; // Usually very small, in Ohms
}

/**
 * Power supply component
 */
export interface PowerSupply extends Component {
  type: ComponentType.POWER_SUPPLY;
  voltage: number; // in Volts
}

/**
 * Ground component
 */
export interface Ground extends Component {
  type: ComponentType.GROUND;
}

/**
 * Switch component (SPST)
 */
export interface Switch extends Component {
  type: ComponentType.SWITCH;
  switchState?: 'open' | 'closed'; // Optional, defaults to 'open'
}

/**
 * EDU-8 Microprocessor State
 */
export interface EDU8State {
  accumulator: number; // 8-bit register (0-255)
  programCounter: number; // 4-bit (0-15)
  zeroFlag: boolean; // Zero flag
  halted: boolean; // Halted state
  rom: Uint8Array; // 16 bytes program memory
  inputs: number; // 4-bit input snapshot (0-15)
  outputs: number; // 4-bit output register (0-15)
  clockState: boolean; // Previous clock state (for edge detection)
}

/**
 * Microprocessor component (EDU-8)
 */
export interface Microprocessor extends Component {
  type: ComponentType.MICROPROCESSOR;
  state: EDU8State;
}

/**
 * Union type for all component types
 */
export type AnyComponent = Resistor | LED | Wire | PowerSupply | Ground | Microprocessor | Switch;

/**
 * Breadboard state containing all placed components
 */
export interface BreadboardState {
  components: AnyComponent[];
  selectedComponentId: string | null;
}

/**
 * Floating component (not yet placed on breadboard)
 * Used for Phase 3c: Interactive component placement workflow
 */
export interface FloatingComponent {
  id: string;
  type: ComponentType;
  libraryId?: string;
  position: { x: number; y: number }; // Canvas coordinates (pixels), not grid positions
  rotation: number; // Continuous rotation in degrees (0-360)
  properties: {
    resistance?: number; // For resistors (Ohms)
    forwardVoltage?: number; // For LEDs (Volts)
    maxCurrent?: number; // For LEDs (Amperes)
    voltage?: number; // For power supplies (Volts)
  };
  connectedLegs?: Map<number, Position>; // Phase 3d.4: Track which legs are connected to which holes
}

/**
 * A node in the electrical circuit
 */
export interface CircuitNode {
  id: string;
  positions: Position[]; // All breadboard positions connected to this node
  voltage?: number; // Calculated voltage at this node (in Volts)
}

/**
 * An edge in the electrical circuit (component between two nodes)
 */
export interface CircuitEdge {
  id: string;
  component: AnyComponent;
  nodeA: string; // ID of first node
  nodeB: string; // ID of second node
  current?: number; // Calculated current through this edge (in Amperes)
}

/**
 * Extracted circuit graph
 */
export interface Circuit {
  nodes: Map<string, CircuitNode>;
  edges: CircuitEdge[];
}

/**
 * Error types that can occur in a circuit
 */
export enum ErrorType {
  SHORT_CIRCUIT = 'SHORT_CIRCUIT',
  FLOATING_NODE = 'FLOATING_NODE',
  REVERSED_LED = 'REVERSED_LED',
  OPEN_CIRCUIT = 'OPEN_CIRCUIT',
  OVERCURRENT = 'OVERCURRENT',
}

/**
 * Circuit error with location and description
 */
export interface CircuitError {
  type: ErrorType;
  severity: 'error' | 'warning';
  nodeId?: string; // Node where error occurred
  componentId?: string; // Component involved in error
  positions: Position[]; // Breadboard positions to highlight
  message: string; // Short error message
  explanation: string; // Educational explanation of the problem
  suggestions: string[]; // Actionable fix suggestions
}

/**
 * Simulation result
 */
export interface SimulationResult {
  success: boolean;
  error?: string;
  nodeVoltages: Map<string, number>; // Node ID -> Voltage
  edgeCurrents: Map<string, number>; // Edge ID -> Current
  errors: CircuitError[]; // Detected circuit errors
}

/**
 * Component library category types
 */
export type ComponentCategory =
  | 'passive'
  | 'diode'
  | 'transistor'
  | 'ic'
  | 'power'
  | 'interconnect'
  | 'electro-acoustic'
  | 'virtual-educational';

/**
 * Package types for components
 */
export type PackageKind = 'axial' | 't1' | 't1-3-4' | 'dip' | 'sip' | 'header' | 'module';

/**
 * Component flexibility type for pin repositioning
 */
export type ComponentFlexibility = 'flexible' | 'rigid' | 'semi-rigid';

/**
 * Component library entry representing a real-world part
 * Based on specification in planning/vision/goal.md Section 4
 */
export interface ComponentLibraryEntry {
  id: string;
  name: string;
  category: ComponentCategory;
  manufacturer?: string;
  partFamily?: string;
  manufacturerPartNumber?: string;
  package: {
    kind: PackageKind;
    pinCount: number;
    leadSpacingMm?: number;
    body: {
      lengthMm?: number;
      widthMm?: number;
      heightMm?: number;
      diameterMm?: number;
    };
  };
  footprint: {
    pins: Array<{ pinId: string; role?: string }>;
  };
  electrical: Record<string, number | string>;
  visuals: {
    renderer: 'procedural' | 'svg';
  };
  flexibility?: ComponentFlexibility;
  maxPinSpan?: number;
  minPinSpan?: number;
  description?: string;
  typicalUses?: string[];
}

/**
 * Quick Select component entry
 * Represents a component in the Quick Select bar for fast access
 */
export interface QuickSelectComponent {
  libraryId: string;         // References ComponentLibraryEntry.id
  isDefault: boolean;         // True for default 5, false for user favorites
  order: number;              // Display order (defaults 0-4, favorites 5+)
}

/**
 * Quick Select state persisted to localStorage
 */
export interface QuickSelectState {
  components: QuickSelectComponent[];  // Max 8 entries
}
