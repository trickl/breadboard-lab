import type { AppState, Action } from './types';

function getDefaultConnectionAppearance() {
  return {
    style: 'curved' as const,
    color: '#3b82f6',
    curved: {
      startOrientation: 'auto' as const,
      endOrientation: 'auto' as const,
    },
  };
}

export class BreadboardController {
  private state: AppState;
  private listeners: Set<(state: AppState) => void>;

  constructor(initialState: AppState) {
    this.state = initialState;
    this.listeners = new Set();
  }

  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): Readonly<AppState> {
    return this.state;
  }

  dispatch(action: Action): void {
    const nextState = this.reduce(this.state, action);
    if (nextState !== this.state) {
      this.state = nextState;
      this.notifyListeners();
    }
  }

  private reduce(state: AppState, action: Action): AppState {
    switch (action.type) {
      case 'COMPONENT_ADDED':
        return {
          ...state,
          breadboard: {
            ...state.breadboard,
            components: [...state.breadboard.components, action.component],
          },
          circuit: {
            ...state.circuit,
            hasUnsavedChanges: true,
          },
        };

      case 'COMPONENT_MOVED':
        return {
          ...state,
          breadboard: {
            ...state.breadboard,
            components: state.breadboard.components.map((c) =>
              c.id === action.componentId ? { ...c, positions: action.positions } : c
            ),
          },
          circuit: {
            ...state.circuit,
            hasUnsavedChanges: true,
          },
        };

      case 'COMPONENT_ROTATED':
        return {
          ...state,
          breadboard: {
            ...state.breadboard,
            components: state.breadboard.components.map((c) =>
              c.id === action.componentId
                ? { ...c, rotation: action.rotation, positions: action.positions }
                : c
            ),
          },
          circuit: {
            ...state.circuit,
            hasUnsavedChanges: true,
          },
        };

      case 'COMPONENT_DELETED': {
        const componentExists = state.breadboard.components.some(
          (c) => c.id === action.componentId
        );
        if (!componentExists) return state;

        return {
          ...state,
          breadboard: {
            ...state.breadboard,
            components: state.breadboard.components.filter((c) => c.id !== action.componentId),
            selectedComponentId:
              state.breadboard.selectedComponentId === action.componentId
                ? null
                : state.breadboard.selectedComponentId,
          },
          circuit: {
            ...state.circuit,
            hasUnsavedChanges: true,
          },
        };
      }

      case 'COMPONENT_SELECTED':
        return {
          ...state,
          breadboard: {
            ...state.breadboard,
            selectedComponentId: action.componentId,
          },
          connections: {
            ...state.connections,
            selectedConnectionId: null,
          },
        };

      case 'COMPONENT_PROPERTY_CHANGED': {
        return {
          ...state,
          breadboard: {
            ...state.breadboard,
            components: state.breadboard.components.map((c) =>
              c.id === action.componentId ? { ...c, [action.property]: action.value } : c
            ),
          },
          circuit: {
            ...state.circuit,
            hasUnsavedChanges: true,
          },
        };
      }

      case 'PIN_SELECTED':
        return {
          ...state,
          breadboard: {
            ...state.breadboard,
            selectedComponentId: action.componentId,
            selectedPinIndex: action.pinIndex,
          },
        };

      case 'CONNECTION_SELECTED':
        return {
          ...state,
          connections: {
            ...state.connections,
            selectedConnectionId: action.connectionId,
            appearanceById:
              action.connectionId && !state.connections.appearanceById[action.connectionId]
                ? {
                    ...state.connections.appearanceById,
                    [action.connectionId]: getDefaultConnectionAppearance(),
                  }
                : state.connections.appearanceById,
          },
          breadboard: {
            ...state.breadboard,
            selectedComponentId: null,
          },
        };

      case 'CONNECTION_APPEARANCE_UPDATED': {
        const existing = state.connections.appearanceById[action.connectionId] ??
          getDefaultConnectionAppearance();

        return {
          ...state,
          connections: {
            ...state.connections,
            appearanceById: {
              ...state.connections.appearanceById,
              [action.connectionId]: {
                ...existing,
                ...action.appearance,
                curved: {
                  ...existing.curved,
                  ...(action.appearance.curved ?? {}),
                },
              },
            },
          },
          circuit: {
            ...state.circuit,
            hasUnsavedChanges: true,
          },
        };
      }

      case 'CONNECTION_REROUTE_STARTED':
        return {
          ...state,
          connections: {
            ...state.connections,
            selectedConnectionId: action.connectionId,
            appearanceById:
              !state.connections.appearanceById[action.connectionId]
                ? {
                    ...state.connections.appearanceById,
                    [action.connectionId]: getDefaultConnectionAppearance(),
                  }
                : state.connections.appearanceById,
            rerouteDragState: {
              type: 'connection-reroute',
              connectionId: action.connectionId,
              endpointType: action.endpointType,
              originalHolePosition: action.position,
              currentMousePosition: action.mousePos,
            },
          },
        };

      case 'CONNECTION_REROUTE_MOVED':
        if (!state.connections.rerouteDragState) return state;
        return {
          ...state,
          connections: {
            ...state.connections,
            rerouteDragState: {
              ...state.connections.rerouteDragState,
              currentMousePosition: action.mousePos,
              targetHole: action.targetHole,
            },
          },
        };

      case 'CONNECTION_REROUTE_COMPLETED':
      case 'CONNECTION_REROUTE_CANCELLED':
        return {
          ...state,
          connections: {
            ...state.connections,
            rerouteDragState: null,
          },
        };

      case 'CONNECTION_DRAG_STARTED':
        return {
          ...state,
          connectionDrag: {
            dragState: {
              sourceComponentId: action.componentId,
              sourceLegIndex: action.legIndex,
              sourcePosition: action.position,
              currentPointerPosition: { x: 0, y: 0 },
              hoveredHolePosition: null,
              isValidTarget: false,
            },
          },
        };

      case 'CONNECTION_DRAG_MOVED':
        if (!state.connectionDrag.dragState) return state;
        return {
          ...state,
          connectionDrag: {
            dragState: {
              ...state.connectionDrag.dragState,
              currentPointerPosition: action.pointerPosition,
              hoveredHolePosition: action.hoveredHole,
              isValidTarget: action.isValid,
            },
          },
        };

      case 'CONNECTION_DRAG_COMPLETED': {
        if (!state.connectionDrag.dragState) return state;
        
        // Create new connection
        const connectionId = `conn-${Date.now()}`;
        const dragState = state.connectionDrag.dragState;
        const holeKey = `${action.targetPosition.row},${action.targetPosition.col}`;
        
        const newConnection = {
          id: connectionId,
          sourceComponentId: dragState.sourceComponentId,
          sourceLegIndex: dragState.sourceLegIndex,
          sourcePosition: dragState.sourcePosition,
          targetPosition: action.targetPosition,
        };
        
        const newOccupiedHoles = new Map(state.connections.occupiedHoles);
        newOccupiedHoles.set(holeKey, connectionId);
        
        return {
          ...state,
          connections: {
            ...state.connections,
            list: [...state.connections.list, newConnection],
            occupiedHoles: newOccupiedHoles,
          },
          connectionDrag: {
            dragState: null,
          },
          circuit: {
            ...state.circuit,
            hasUnsavedChanges: true,
          },
        };
      }

      case 'CONNECTION_DRAG_CANCELLED':
        return {
          ...state,
          connectionDrag: {
            dragState: null,
          },
        };

      case 'CONNECTION_DELETED': {
        const connection = state.connections.list.find((c) => c.id === action.connectionId) ?? null;

        const nextNonce = state.connections.reteCommandNonce + 1;

        // Legacy occupied-holes bookkeeping (only if this connection exists in the legacy list)
        const newOccupiedHoles = new Map(state.connections.occupiedHoles);
        if (connection) {
          const holeKey = `${connection.targetPosition.row},${connection.targetPosition.col}`;
          newOccupiedHoles.delete(holeKey);
        }

        return {
          ...state,
          connections: {
            ...state.connections,
            list: connection
              ? state.connections.list.filter((c) => c.id !== action.connectionId)
              : state.connections.list,
            occupiedHoles: newOccupiedHoles,
            appearanceById: Object.fromEntries(
              Object.entries(state.connections.appearanceById).filter(([id]) => id !== action.connectionId)
            ),
            selectedConnectionId:
              state.connections.selectedConnectionId === action.connectionId
                ? null
                : state.connections.selectedConnectionId,
            reteCommand: {
              type: 'delete-connection',
              connectionId: action.connectionId,
              nonce: nextNonce,
            },
            reteCommandNonce: nextNonce,
          },
          circuit: {
            ...state.circuit,
            hasUnsavedChanges: true,
          },
        };
      }

      case 'DRAG_STARTED':
        return {
          ...state,
          componentDrag: {
            ...state.componentDrag,
            dragState: {
              componentId: action.componentId,
              startMousePos: action.mousePos,
              currentMousePos: action.mousePos,
              originalPositions: action.originalPositions,
              previewPositions: null,
              offsetFromFirstPin: action.offsetFromFirstPin,
            },
          },
        };

      case 'DRAG_MOVED':
        if (!state.componentDrag.dragState) return state;
        return {
          ...state,
          componentDrag: {
            ...state.componentDrag,
            dragState: {
              ...state.componentDrag.dragState,
              currentMousePos: action.mousePos,
              previewPositions: action.previewPositions,
            },
          },
        };

      case 'DRAG_COMPLETED':
      case 'DRAG_CANCELLED':
        return {
          ...state,
          componentDrag: {
            ...state.componentDrag,
            dragState: null,
          },
        };

      case 'PIN_DRAG_STARTED':
        return {
          ...state,
          componentDrag: {
            ...state.componentDrag,
            pinDragState: {
              componentId: action.componentId,
              pinIndex: action.pinIndex,
              startMousePos: action.mousePos,
              currentMousePos: action.mousePos,
              originalPosition: action.originalPosition,
              previewPosition: null,
              offsetFromPin: action.offsetFromPin,
            },
          },
        };

      case 'PIN_DRAG_MOVED':
        if (!state.componentDrag.pinDragState) return state;
        return {
          ...state,
          componentDrag: {
            ...state.componentDrag,
            pinDragState: {
              ...state.componentDrag.pinDragState,
              currentMousePos: action.mousePos,
              previewPosition: action.previewPosition,
            },
          },
        };

      case 'PIN_DRAG_COMPLETED':
      case 'PIN_DRAG_CANCELLED':
        return {
          ...state,
          componentDrag: {
            ...state.componentDrag,
            pinDragState: null,
          },
        };

      case 'FLOATING_COMPONENT_CREATED':
        return {
          ...state,
          floatingComponent: {
            ...state.floatingComponent,
            component: action.component,
          },
          placement: {
            selectedComponentType: null,
            selectedLibraryId: null,
            placementStart: null,
          },
        };

      case 'FLOATING_COMPONENT_MOVED':
        if (!state.floatingComponent.component) return state;
        return {
          ...state,
          floatingComponent: {
            ...state.floatingComponent,
            component: {
              ...state.floatingComponent.component,
              position: action.position,
            },
          },
        };

      case 'FLOATING_COMPONENT_ROTATED':
        if (!state.floatingComponent.component) return state;
        return {
          ...state,
          floatingComponent: {
            ...state.floatingComponent,
            component: {
              ...state.floatingComponent.component,
              rotation: action.rotation,
            },
          },
        };

      case 'FLOATING_COMPONENT_LEG_CONNECTED':
        {
          if (!state.floatingComponent.component) return state;
          const updatedConnectedLegs = new Map(state.floatingComponent.component.connectedLegs);
          updatedConnectedLegs.set(action.legIndex, action.holePosition);
          return {
            ...state,
            floatingComponent: {
              ...state.floatingComponent,
              component: {
                ...state.floatingComponent.component,
                connectedLegs: updatedConnectedLegs,
              },
            },
          };
        }

      case 'FLOATING_COMPONENT_PLACED':
      case 'FLOATING_COMPONENT_CANCELLED':
        return {
          ...state,
          floatingComponent: {
            component: null,
            dragState: null,
          },
        };

      case 'FLOATING_DRAG_STARTED':
        return {
          ...state,
          floatingComponent: {
            ...state.floatingComponent,
            dragState: {
              floatingComponentId: action.floatingComponentId,
              startMousePos: action.mousePos,
              offsetFromComponentCenter: action.offsetFromCenter,
              isDraggingConnection: action.isDraggingConnection,
              connectionSourceLegIndex: action.connectionSourceLegIndex,
            },
          },
        };

      case 'FLOATING_DRAG_MOVED':
        if (!state.floatingComponent.dragState) return state;
        return {
          ...state,
          floatingComponent: {
            ...state.floatingComponent,
            dragState: {
              ...state.floatingComponent.dragState,
              connectionTargetHole: action.targetHole,
            },
          },
        };

      case 'FLOATING_DRAG_COMPLETED':
        return {
          ...state,
          floatingComponent: {
            ...state.floatingComponent,
            dragState: null,
          },
        };

      case 'PLACEMENT_TYPE_SELECTED':
        return {
          ...state,
          placement: {
            ...state.placement,
            selectedComponentType: action.componentType,
            selectedLibraryId: action.libraryId,
            placementStart: null,
          },
        };

      case 'PLACEMENT_STARTED':
        return {
          ...state,
          placement: {
            ...state.placement,
            placementStart: action.position,
          },
        };

      case 'PLACEMENT_COMPLETED':
        return {
          ...state,
          placement: {
            selectedComponentType: null,
            selectedLibraryId: null,
            placementStart: null,
          },
        };

      case 'PLACEMENT_CANCELLED':
        return {
          ...state,
          placement: {
            ...state.placement,
            placementStart: null,
          },
        };

      case 'SIMULATION_COMPLETED':
        return {
          ...state,
          simulation: {
            cachedCircuit: action.circuit,
            cachedSimulation: action.result,
          },
        };

      case 'SIMULATION_CLEARED':
        return {
          ...state,
          simulation: {
            cachedCircuit: null,
            cachedSimulation: null,
          },
        };

      case 'XRAY_MODE_TOGGLED':
        return {
          ...state,
          ui: {
            ...state.ui,
            xrayModeEnabled: !state.ui.xrayModeEnabled,
          },
        };

      case 'VOLTAGE_OVERLAY_TOGGLED':
        return {
          ...state,
          ui: {
            ...state.ui,
            showVoltageOverlay: !state.ui.showVoltageOverlay,
          },
        };

      case 'CURRENT_ANIMATION_TOGGLED':
        return {
          ...state,
          ui: {
            ...state.ui,
            showCurrentAnimation: !state.ui.showCurrentAnimation,
          },
        };

      case 'BREADBOARD_ROTATED':
        {
          const nextRotation = ((state.ui.breadboardOrientation + 90) % 360) as 0 | 90 | 180 | 270;
          return {
            ...state,
            ui: {
              ...state.ui,
              breadboardOrientation: nextRotation,
            },
          };
        }

      case 'THEME_TOGGLED':
        return {
          ...state,
          ui: {
            ...state.ui,
            currentTheme: state.ui.currentTheme === 'dark' ? 'light' : 'dark',
          },
        };

      case 'VIEW_SWITCHED':
        return {
          ...state,
          ui: {
            ...state.ui,
            currentView: action.view,
          },
        };

      case 'CIRCUIT_LOADED':
        return {
          ...state,
          breadboard: {
            components: action.components,
            selectedComponentId: null,
            selectedPinIndex: null,
          },
          circuit: {
            metadata: action.metadata,
            hasUnsavedChanges: false,
          },
          placement: {
            selectedComponentType: null,
            selectedLibraryId: null,
            placementStart: null,
          },
        };

      case 'CIRCUIT_CLEARED':
        return {
          ...state,
          breadboard: {
            components: [],
            selectedComponentId: null,
            selectedPinIndex: null,
          },
          circuit: {
            metadata: null,
            hasUnsavedChanges: false,
          },
          placement: {
            selectedComponentType: null,
            selectedLibraryId: null,
            placementStart: null,
          },
        };

      case 'CIRCUIT_SAVED':
        return {
          ...state,
          circuit: {
            metadata: action.metadata,
            hasUnsavedChanges: false,
          },
        };

      case 'CIRCUIT_MODIFIED':
        return {
          ...state,
          circuit: {
            ...state.circuit,
            hasUnsavedChanges: true,
          },
        };

      case 'COMPONENT_ID_COUNTER_SET':
        return {
          ...state,
          counters: {
            ...state.counters,
            componentIdCounter: action.counter,
          },
        };

      case 'STATE_REPLACED':
        return action.state;

      default:
        return state;
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }
}
