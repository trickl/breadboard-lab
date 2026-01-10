import type {
  AnyComponent,
  Position,
  ComponentType,
  FloatingComponent,
  Circuit,
  SimulationResult,
} from '@/core/types';
import type { CircuitMetadata } from '@/core/circuit-serializer';

export interface AppState {
  breadboard: {
    components: AnyComponent[];
    selectedComponentId: string | null;
    selectedPinIndex: number | null;
  };

  placement: {
    selectedComponentType: ComponentType | null;
    selectedLibraryId: string | null;
    placementStart: Position | null;
  };

  floatingComponent: {
    component: FloatingComponent | null;
    dragState: FloatingDragState | null;
  };

  connections: {
    list: Connection[];
    occupiedHoles: Map<string, string>;
    selectedConnectionId: string | null;
    rerouteDragState: ConnectionRerouteDragState | null;
    appearanceById: Record<string, ConnectionAppearance>;
    reteCommand: ConnectionCommand | null;
    reteCommandNonce: number;
  };

  connectionDrag: {
    dragState: ConnectionDragState | null;
  };

  componentDrag: {
    dragState: DragState | null;
    pinDragState: PinDragState | null;
  };

  simulation: {
    cachedCircuit: Circuit | null;
    cachedSimulation: SimulationResult | null;
  };

  ui: {
    xrayModeEnabled: boolean;
    breadboardOrientation: 0 | 90 | 180 | 270;
    currentTheme: 'light' | 'dark';
    currentView: 'breadboard' | 'schematic';
    showVoltageOverlay: boolean;
    showCurrentAnimation: boolean;
  };

  circuit: {
    metadata: CircuitMetadata | null;
    hasUnsavedChanges: boolean;
  };

  counters: {
    componentIdCounter: number;
  };
}

export type ConnectionStyle = 'curved' | 'straight';

/**
 * Curved wire endpoint orientation hint.
 *
 * - auto: choose based on endpoint delta (mostly-horizontal vs mostly-vertical)
 * - horizontal: curve leaves/arrives horizontally
 * - vertical: curve leaves/arrives vertically
 */
export type ConnectionEndpointOrientation = 'auto' | 'horizontal' | 'vertical';

export interface ConnectionAppearance {
  style: ConnectionStyle;
  color: string;
  curved: {
    startOrientation: ConnectionEndpointOrientation;
    endOrientation: ConnectionEndpointOrientation;
  };
}

export type ConnectionCommand =
  | { type: 'delete-connection'; connectionId: string; nonce: number };

export interface DragState {
  componentId: string;
  startMousePos: { x: number; y: number };
  currentMousePos: { x: number; y: number };
  originalPositions: Position[];
  previewPositions: Position[] | null;
  offsetFromFirstPin: { x: number; y: number };
}

export interface FloatingDragState {
  floatingComponentId: string;
  startMousePos: { x: number; y: number };
  offsetFromComponentCenter: { x: number; y: number };
  isDraggingConnection: boolean;
  connectionSourceLegIndex?: number;
  connectionTargetHole?: Position;
}

export interface ConnectionRerouteDragState {
  type: 'connection-reroute';
  connectionId: string;
  endpointType: 'source' | 'target';
  originalHolePosition: Position;
  currentMousePosition: { x: number; y: number };
  targetHole?: Position;
}

export interface PinDragState {
  componentId: string;
  pinIndex: number;
  startMousePos: { x: number; y: number };
  currentMousePos: { x: number; y: number };
  originalPosition: Position;
  previewPosition: Position | null;
  offsetFromPin: { x: number; y: number };
}

export interface Connection {
  id: string;
  sourceComponentId: string;
  sourceLegIndex: number;
  sourcePosition: Position;
  targetPosition: Position;
}

export interface ConnectionDragState {
  sourceComponentId: string;
  sourceLegIndex: number;
  sourcePosition: Position;
  currentPointerPosition: { x: number; y: number };
  hoveredHolePosition: Position | null;
  isValidTarget: boolean;
}

export type Action =
  | { type: 'COMPONENT_ADDED'; component: AnyComponent }
  | { type: 'COMPONENT_MOVED'; componentId: string; positions: Position[] }
  | { type: 'COMPONENT_ROTATED'; componentId: string; rotation: 0 | 90 | 180 | 270; positions: Position[] }
  | { type: 'COMPONENT_DELETED'; componentId: string }
  | { type: 'COMPONENT_SELECTED'; componentId: string | null }
  | { type: 'COMPONENT_PROPERTY_CHANGED'; componentId: string; property: string; value: unknown }
  | { type: 'PIN_SELECTED'; componentId: string; pinIndex: number | null }
  | { type: 'CONNECTION_DELETED'; connectionId: string }
  | { type: 'CONNECTION_SELECTED'; connectionId: string | null }
  | {
      type: 'CONNECTION_APPEARANCE_UPDATED';
      connectionId: string;
      appearance: Partial<Omit<ConnectionAppearance, 'curved'>> & {
        curved?: Partial<ConnectionAppearance['curved']>;
      };
    }
  | { type: 'CONNECTION_DRAG_STARTED'; componentId: string; legIndex: number; position: Position }
  | { type: 'CONNECTION_DRAG_MOVED'; pointerPosition: { x: number; y: number }; hoveredHole: Position | null; isValid: boolean }
  | { type: 'CONNECTION_DRAG_COMPLETED'; targetPosition: Position }
  | { type: 'CONNECTION_DRAG_CANCELLED' }
  | { type: 'CONNECTION_REROUTE_STARTED'; connectionId: string; endpointType: 'source' | 'target'; position: Position; mousePos: { x: number; y: number } }
  | { type: 'CONNECTION_REROUTE_MOVED'; mousePos: { x: number; y: number }; targetHole?: Position }
  | { type: 'CONNECTION_REROUTE_COMPLETED' }
  | { type: 'CONNECTION_REROUTE_CANCELLED' }
  | { type: 'DRAG_STARTED'; componentId: string; mousePos: { x: number; y: number }; originalPositions: Position[]; offsetFromFirstPin: { x: number; y: number } }
  | { type: 'DRAG_MOVED'; mousePos: { x: number; y: number }; previewPositions: Position[] | null }
  | { type: 'DRAG_COMPLETED' }
  | { type: 'DRAG_CANCELLED' }
  | { type: 'PIN_DRAG_STARTED'; componentId: string; pinIndex: number; mousePos: { x: number; y: number }; originalPosition: Position; offsetFromPin: { x: number; y: number } }
  | { type: 'PIN_DRAG_MOVED'; mousePos: { x: number; y: number }; previewPosition: Position | null }
  | { type: 'PIN_DRAG_COMPLETED' }
  | { type: 'PIN_DRAG_CANCELLED' }
  | { type: 'FLOATING_COMPONENT_CREATED'; component: FloatingComponent }
  | { type: 'FLOATING_COMPONENT_MOVED'; position: { x: number; y: number } }
  | { type: 'FLOATING_COMPONENT_ROTATED'; rotation: number }
  | { type: 'FLOATING_COMPONENT_LEG_CONNECTED'; legIndex: number; holePosition: Position }
  | { type: 'FLOATING_COMPONENT_PLACED' }
  | { type: 'FLOATING_COMPONENT_CANCELLED' }
  | { type: 'FLOATING_DRAG_STARTED'; floatingComponentId: string; mousePos: { x: number; y: number }; offsetFromCenter: { x: number; y: number }; isDraggingConnection: boolean; connectionSourceLegIndex?: number }
  | { type: 'FLOATING_DRAG_MOVED'; targetHole?: Position }
  | { type: 'FLOATING_DRAG_COMPLETED' }
  | { type: 'PLACEMENT_TYPE_SELECTED'; componentType: ComponentType | null; libraryId: string | null }
  | { type: 'PLACEMENT_STARTED'; position: Position }
  | { type: 'PLACEMENT_COMPLETED' }
  | { type: 'PLACEMENT_CANCELLED' }
  | { type: 'SIMULATION_COMPLETED'; circuit: Circuit; result: SimulationResult }
  | { type: 'SIMULATION_CLEARED' }
  | { type: 'XRAY_MODE_TOGGLED' }
  | { type: 'BREADBOARD_ROTATED' }
  | { type: 'THEME_TOGGLED' }
  | { type: 'VIEW_SWITCHED'; view: 'breadboard' | 'schematic' }
  | { type: 'VOLTAGE_OVERLAY_TOGGLED' }
  | { type: 'CURRENT_ANIMATION_TOGGLED' }
  | { type: 'CIRCUIT_LOADED'; components: AnyComponent[]; metadata: CircuitMetadata | null }
  | { type: 'CIRCUIT_CLEARED' }
  | { type: 'CIRCUIT_SAVED'; metadata: CircuitMetadata }
  | { type: 'CIRCUIT_MODIFIED' }
  | { type: 'COMPONENT_ID_COUNTER_SET'; counter: number }
  | { type: 'STATE_REPLACED'; state: AppState };
