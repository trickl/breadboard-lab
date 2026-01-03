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
}

/**
 * Base interface for all components
 */
export interface Component {
  id: string;
  type: ComponentType;
  positions: Position[]; // Positions this component occupies
  rotation: 0 | 90 | 180 | 270; // Component rotation in degrees
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
 * Union type for all component types
 */
export type AnyComponent = Resistor | LED | Wire | PowerSupply | Ground;

/**
 * Breadboard state containing all placed components
 */
export interface BreadboardState {
  components: AnyComponent[];
  selectedComponentId: string | null;
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
