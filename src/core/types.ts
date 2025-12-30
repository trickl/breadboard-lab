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
 * Simulation result
 */
export interface SimulationResult {
  success: boolean;
  error?: string;
  nodeVoltages: Map<string, number>; // Node ID -> Voltage
  edgeCurrents: Map<string, number>; // Edge ID -> Current
}
