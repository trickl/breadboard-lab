import type { NodeEditor } from 'rete';
import type { ClassicScheme } from 'rete-react-plugin';

type Schemes = ClassicScheme;

export type RailNodePayload = {
  railId: string;
  holePositions: unknown[];
};

export type BreadboardNodePayload = {
  id?: unknown;
  labelText?: unknown;
};

export type ComponentNodePayload = {
  componentId: unknown;
  componentType: unknown;
};

export function isRailNodePayload(payload: unknown): payload is RailNodePayload {
  // Note: Avoid relying on `instanceof`.
  // In dev, React Fast Refresh / HMR can replace the class identity while keeping
  // existing node instances alive, making `instanceof` fail and breaking rail logic.
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return typeof p.railId === 'string' && Array.isArray(p.holePositions);
}

export function isBreadboardNodePayload(payload: unknown): payload is BreadboardNodePayload {
  // Similar rationale: avoid `instanceof` across HMR.
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return p.id === 'breadboard' || p.labelText === 'Breadboard';
}

export function isComponentNodePayload(payload: unknown): payload is ComponentNodePayload {
  // Avoid relying on `instanceof` across Fast Refresh.
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;
  return typeof p.componentId === 'string' && typeof p.componentType === 'string';
}

export function isRailNode(editor: NodeEditor<Schemes>, nodeId: string): boolean {
  const node = editor.getNode(nodeId);
  return Boolean(node && isRailNodePayload(node));
}
