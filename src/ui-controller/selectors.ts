import type { AppState } from './types';
import type { AnyComponent } from '@/core/types';

export function getComponents(state: AppState): AnyComponent[] {
  return state.breadboard.components;
}

export function getSelectedComponent(state: AppState): AnyComponent | null {
  const { components, selectedComponentId } = state.breadboard;
  if (!selectedComponentId) return null;
  return components.find((c) => c.id === selectedComponentId) ?? null;
}

export function getComponentById(state: AppState, id: string): AnyComponent | undefined {
  return state.breadboard.components.find((c) => c.id === id);
}

export function hasUnsavedChanges(state: AppState): boolean {
  return state.circuit.hasUnsavedChanges;
}

export function getSimulationResult(state: AppState) {
  return state.simulation.cachedSimulation;
}

export function getCircuit(state: AppState) {
  return state.simulation.cachedCircuit;
}

export function isXrayModeEnabled(state: AppState): boolean {
  return state.ui.xrayModeEnabled;
}

export function getCurrentTheme(state: AppState): 'light' | 'dark' {
  return state.ui.currentTheme;
}

export function getBreadboardOrientation(state: AppState): 0 | 90 | 180 | 270 {
  return state.ui.breadboardOrientation;
}

export function getCurrentView(state: AppState): 'breadboard' | 'schematic' {
  return state.ui.currentView;
}

export function getFloatingComponent(state: AppState) {
  return state.floatingComponent.component;
}

export function getDragState(state: AppState) {
  return state.componentDrag.dragState;
}

export function getNodeVoltage(state: AppState, nodeId: string): number | undefined {
  return state.simulation.cachedSimulation?.nodeVoltages.get(nodeId);
}

export function getEdgeCurrent(state: AppState, edgeId: string) {
  return state.simulation.cachedSimulation?.edgeCurrents.get(edgeId);
}

export function getSimulationErrors(state: AppState) {
  return state.simulation.cachedSimulation?.errors ?? [];
}

export function isSimulationSuccessful(state: AppState): boolean {
  return state.simulation.cachedSimulation?.success ?? false;
}
