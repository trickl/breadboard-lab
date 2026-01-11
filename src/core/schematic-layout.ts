/**
 * Schematic layout generator
 * Converts electrical circuit into positioned schematic diagram using force-directed layout
 */

import type { Circuit } from './types';
import type {
  SchematicDiagram,
  SchematicSymbol,
  SchematicConnection,
  SchematicPosition,
  LayoutConfig,
} from './schematic-types';
import { DEFAULT_LAYOUT_CONFIG } from './schematic-types';
import { ComponentType } from './types';

type SymbolTerminal = SchematicSymbol['terminals'][number];

/**
 * Internal node for layout algorithm
 */
interface LayoutNode {
  id: string;
  componentId: string;
  componentType: ComponentType;
  position: SchematicPosition;
  velocity: SchematicPosition;
  force: SchematicPosition;
  properties: Record<string, number | string>;
  terminals: Array<{ id: string; offset: SchematicPosition; netId: string }>;
}

/**
 * Generates schematic diagrams from electrical circuits
 */
export class SchematicLayoutGenerator {
  private readonly config: LayoutConfig;

  constructor(config: Partial<LayoutConfig> = {}) {
    this.config = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  }

  /**
   * Generate schematic diagram from circuit
   */
  generate(circuit: Circuit): SchematicDiagram {
    // Convert circuit edges to layout nodes
    const nodes = this.createLayoutNodes(circuit);

    // Apply force-directed layout algorithm
    this.applyForceDirectedLayout(nodes, circuit);

    // Convert layout nodes to schematic symbols
    const symbols = this.createSchematicSymbols(nodes);

    // Generate connections between symbols
    const connections = this.createConnections(circuit, symbols);

    // Calculate bounds
    const bounds = this.calculateBounds(symbols);

    return {
      symbols,
      connections,
      bounds,
    };
  }

  /**
   * Create layout nodes from circuit edges
   */
  private createLayoutNodes(circuit: Circuit): Map<string, LayoutNode> {
    const nodes = new Map<string, LayoutNode>();

    for (const edge of circuit.edges) {
      const component = edge.component;

      // Get terminal configuration for this component type
      const terminals = this.getTerminalConfiguration(component.type);

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
        properties: this.extractProperties(component),
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
   * Get terminal configuration for a component type
   */
  private getTerminalConfiguration(type: ComponentType): Array<{ offset: SchematicPosition }> {
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
   * Extract relevant properties from component
   */
  private extractProperties(component: unknown): Record<string, number | string> {
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

  /**
   * Apply force-directed layout algorithm
   */
  private applyForceDirectedLayout(nodes: Map<string, LayoutNode>, _circuit: Circuit): void {
    const nodeArray = Array.from(nodes.values());

    const netToNodes = this.buildNetToNodes(nodeArray);
    for (let iteration = 0; iteration < this.config.iterations; iteration++) {
      this.resetForces(nodeArray);
      this.applyRepulsionForces(nodeArray);
      this.applyAttractionForces(netToNodes);
      this.integratePositions(nodeArray);
      this.coolDown(nodeArray, iteration);
    }
  }

  private buildNetToNodes(nodes: LayoutNode[]): Map<string, LayoutNode[]> {
    const netToNodes = new Map<string, LayoutNode[]>();
    for (const node of nodes) {
      for (const terminal of node.terminals) {
        if (!netToNodes.has(terminal.netId)) {
          netToNodes.set(terminal.netId, []);
        }
        netToNodes.get(terminal.netId)!.push(node);
      }
    }
    return netToNodes;
  }

  private resetForces(nodes: LayoutNode[]): void {
    for (const node of nodes) {
      node.force.x = 0;
      node.force.y = 0;
    }
  }

  private applyRepulsionForces(nodes: LayoutNode[]): void {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        this.applyRepulsionForce(nodes[i], nodes[j]);
      }
    }
  }

  private applyAttractionForces(netToNodes: Map<string, LayoutNode[]>): void {
    for (const netNodes of netToNodes.values()) {
      this.applyAttractionForNet(netNodes);
    }
  }

  private applyAttractionForNet(netNodes: LayoutNode[]): void {
    if (netNodes.length <= 1) {
      return;
    }

    for (let i = 0; i < netNodes.length; i++) {
      for (let j = i + 1; j < netNodes.length; j++) {
        this.applyAttractionForce(netNodes[i], netNodes[j]);
      }
    }
  }

  private integratePositions(nodes: LayoutNode[]): void {
    const damping = 0.8;
    for (const node of nodes) {
      node.velocity.x = (node.velocity.x + node.force.x) * damping;
      node.velocity.y = (node.velocity.y + node.force.y) * damping;
      node.position.x += node.velocity.x;
      node.position.y += node.velocity.y;
    }
  }

  private coolDown(nodes: LayoutNode[], iteration: number): void {
    const temperature = 1 - iteration / this.config.iterations;
    for (const node of nodes) {
      node.velocity.x *= temperature;
      node.velocity.y *= temperature;
    }
  }

  /**
   * Apply repulsion force between two nodes
   */
  private applyRepulsionForce(node1: LayoutNode, node2: LayoutNode): void {
    const dx = node2.position.x - node1.position.x;
    const dy = node2.position.y - node1.position.y;
    const distSq = dx * dx + dy * dy;
    const minDist = this.config.symbolSpacing;
    const minDistSq = minDist * minDist;

    if (distSq < minDistSq && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const force = this.config.repulsionStrength / distSq;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      node1.force.x -= fx;
      node1.force.y -= fy;
      node2.force.x += fx;
      node2.force.y += fy;
    }
  }

  /**
   * Apply attraction force between two nodes
   */
  private applyAttractionForce(node1: LayoutNode, node2: LayoutNode): void {
    const dx = node2.position.x - node1.position.x;
    const dy = node2.position.y - node1.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const force = this.config.attractionStrength * dist;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      node1.force.x += fx;
      node1.force.y += fy;
      node2.force.x -= fx;
      node2.force.y -= fy;
    }
  }

  /**
   * Convert layout nodes to schematic symbols
   */
  private createSchematicSymbols(nodes: Map<string, LayoutNode>): SchematicSymbol[] {
    const symbols: SchematicSymbol[] = [];

    for (const node of nodes.values()) {
      symbols.push({
        id: node.id,
        componentId: node.componentId,
        componentType: node.componentType,
        position: node.position,
        terminals: node.terminals.map((term) => ({
          id: term.id,
          position: term.offset,
          netId: term.netId,
        })),
        properties: node.properties,
      });
    }

    return symbols;
  }

  /**
   * Create connections between symbols based on nets
   */
  private createConnections(_circuit: Circuit, symbols: SchematicSymbol[]): SchematicConnection[] {
    const connections: SchematicConnection[] = [];
    const netToTerminals = new Map<
      string,
      Array<{ symbol: SchematicSymbol; terminal: SymbolTerminal }>
    >();

    // Group terminals by net
    for (const symbol of symbols) {
      for (const terminal of symbol.terminals) {
        if (!netToTerminals.has(terminal.netId)) {
          netToTerminals.set(terminal.netId, []);
        }
        netToTerminals.get(terminal.netId)!.push({ symbol, terminal });
      }
    }

    // Create connections for each net
    let connectionId = 0;
    for (const terminals of netToTerminals.values()) {
      if (terminals.length > 1) {
        // Calculate center point of all terminals for this net
        const centerX =
          terminals.reduce((sum, t) => sum + t.symbol.position.x + t.terminal.position.x, 0) /
          terminals.length;
        const centerY =
          terminals.reduce((sum, t) => sum + t.symbol.position.y + t.terminal.position.y, 0) /
          terminals.length;

        // Create star topology: each terminal connects to center
        for (const { symbol, terminal } of terminals) {
          const terminalPos = {
            x: symbol.position.x + terminal.position.x,
            y: symbol.position.y + terminal.position.y,
          };

          connections.push({
            id: `conn-${connectionId++}`,
            netId: terminal.netId,
            path: [terminalPos, { x: centerX, y: centerY }],
          });
        }
      }
    }

    return connections;
  }

  /**
   * Calculate bounding box of all symbols
   */
  private calculateBounds(symbols: SchematicSymbol[]): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    if (symbols.length === 0) {
      return { minX: 0, maxX: 400, minY: 0, maxY: 400 };
    }

    const padding = 50;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const symbol of symbols) {
      minX = Math.min(minX, symbol.position.x - 50);
      maxX = Math.max(maxX, symbol.position.x + 50);
      minY = Math.min(minY, symbol.position.y - 50);
      maxY = Math.max(maxY, symbol.position.y + 50);
    }

    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
    };
  }
}
