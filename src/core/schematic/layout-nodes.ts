import type { Circuit } from '../types';
import { ComponentType } from '../types';
import type { SchematicPosition } from '../schematic-types';
import type { LayoutNode } from './layout-types';

/**
 * Create layout nodes from circuit edges.
 *
 * Extracted from `SchematicLayoutGenerator`.
 */
export function createLayoutNodes(circuit: Circuit): Map<string, LayoutNode> {
  const nodes = new Map<string, LayoutNode>();

  for (const edge of circuit.edges) {
    const component = edge.component;

    // Get terminal configuration for this component type
    const terminals = getTerminalConfiguration(component.type);

    // Create layout node with initial random position
    const node: LayoutNode = {
      id: edge.id,
      componentId: component.id,
      componentType: component.type,
      position: {
        x: Math.random() * 400,
        y: Math.random() * 400,
      },
      velocity: { x: 0, y: 0 },
      force: { x: 0, y: 0 },
      properties: extractProperties(component),
      terminals: terminals.map((term, idx) => ({
        id: `${edge.id}-term-${idx}`,
        offset: term.offset,
        netId: idx === 0 ? edge.nodeA : edge.nodeB,
      })),
    };

    nodes.set(edge.id, node);
  }

  return nodes;
}

/**
 * Get terminal configuration for a component type.
 */
function getTerminalConfiguration(type: ComponentType): Array<{ offset: SchematicPosition }> {
  switch (type) {
    case ComponentType.RESISTOR:
    case ComponentType.LED:
    case ComponentType.WIRE:
      return [{ offset: { x: -30, y: 0 } }, { offset: { x: 30, y: 0 } }];
    case ComponentType.POWER_SUPPLY:
      return [{ offset: { x: 0, y: -20 } }, { offset: { x: 0, y: 20 } }];
    case ComponentType.GROUND:
      return [{ offset: { x: 0, y: -20 } }];
    default:
      return [{ offset: { x: -20, y: 0 } }, { offset: { x: 20, y: 0 } }];
  }
}

/**
 * Extract relevant properties from component.
 */
function extractProperties(component: unknown): Record<string, number | string> {
  const props: Record<string, number | string> = {};

  if (!component || typeof component !== 'object') {
    return props;
  }

  const c = component as Record<string, unknown>;

  if ('resistance' in c && typeof c.resistance === 'number') {
    props.resistance = c.resistance;
  }
  if ('voltage' in c && typeof c.voltage === 'number') {
    props.voltage = c.voltage;
  }
  if ('forwardVoltage' in c && typeof c.forwardVoltage === 'number') {
    props.forwardVoltage = c.forwardVoltage;
  }
  if ('maxCurrent' in c && typeof c.maxCurrent === 'number') {
    props.maxCurrent = c.maxCurrent;
  }

  return props;
}
