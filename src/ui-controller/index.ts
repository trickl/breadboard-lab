import type { AppState } from './types';

export function createInitialState(): AppState {
  return {
    breadboard: {
      components: [],
      selectedComponentId: null,
      selectedPinIndex: null,
    },
    placement: {
      selectedComponentType: null,
      selectedLibraryId: null,
      placementStart: null,
    },
    floatingComponent: {
      component: null,
      dragState: null,
    },
    connections: {
      list: [],
      occupiedHoles: new Map(),
      selectedConnectionId: null,
      rerouteDragState: null,
    },
    connectionDrag: {
      dragState: null,
    },
    componentDrag: {
      dragState: null,
      pinDragState: null,
    },
    simulation: {
      cachedCircuit: null,
      cachedSimulation: null,
    },
    ui: {
      xrayModeEnabled: false,
      // Default to a horizontal (landscape) board.
      // The renderer also applies an intrinsic 90° rotation to the substrate,
      // so userRotation=0 corresponds to the expected initial orientation.
      breadboardOrientation: 0,
      currentTheme: 'dark',
      currentView: 'breadboard',
      showVoltageOverlay: false,
      showCurrentAnimation: false,
    },
    circuit: {
      metadata: null,
      hasUnsavedChanges: false,
    },
    counters: {
      componentIdCounter: 0,
    },
  };
}

export * from './types';
export * from './breadboard-controller';
export * from './simulation-runner';
export * from './selectors';
