import type { AppState } from './types';

function parseBooleanEnv(value: unknown): boolean | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  return null;
}

function getDefaultDebugOverlaysEnabled(): boolean {
  // Vite env vars are always strings.
  const raw = parseBooleanEnv(import.meta.env.VITE_DEBUG_OVERLAYS);
  if (raw !== null) return raw;

  // Sensible default: on in dev, off in production.
  return Boolean(import.meta.env.DEV);
}

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
      appearanceById: {},
      reteCommand: null,
      reteCommandNonce: 0,
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
      showDebugOverlays: getDefaultDebugOverlaysEnabled(),
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
