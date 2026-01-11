import type { LayoutConfig } from '../schematic-types';
import type { LayoutNode } from './layout-types';

/**
 * Apply force-directed layout algorithm.
 *
 * Extracted from `SchematicLayoutGenerator`.
 */
export function applyForceDirectedLayout(
  nodes: Map<string, LayoutNode>,
  config: LayoutConfig
): void {
  const nodeArray = Array.from(nodes.values());

  const netToNodes = buildNetToNodes(nodeArray);
  for (let iteration = 0; iteration < config.iterations; iteration++) {
    resetForces(nodeArray);
    applyRepulsionForces(nodeArray, config);
    applyAttractionForces(netToNodes, config);
    integratePositions(nodeArray);
    coolDown(nodeArray, iteration, config);
  }
}

function buildNetToNodes(nodes: LayoutNode[]): Map<string, LayoutNode[]> {
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

function resetForces(nodes: LayoutNode[]): void {
  for (const node of nodes) {
    node.force.x = 0;
    node.force.y = 0;
  }
}

function applyRepulsionForces(nodes: LayoutNode[], config: LayoutConfig): void {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      applyRepulsionForce(nodes[i], nodes[j], config);
    }
  }
}

function applyAttractionForces(netToNodes: Map<string, LayoutNode[]>, config: LayoutConfig): void {
  for (const netNodes of netToNodes.values()) {
    applyAttractionForNet(netNodes, config);
  }
}

function applyAttractionForNet(netNodes: LayoutNode[], config: LayoutConfig): void {
  if (netNodes.length <= 1) {
    return;
  }

  for (let i = 0; i < netNodes.length; i++) {
    for (let j = i + 1; j < netNodes.length; j++) {
      applyAttractionForce(netNodes[i], netNodes[j], config);
    }
  }
}

function integratePositions(nodes: LayoutNode[]): void {
  const damping = 0.8;
  for (const node of nodes) {
    node.velocity.x = (node.velocity.x + node.force.x) * damping;
    node.velocity.y = (node.velocity.y + node.force.y) * damping;
    node.position.x += node.velocity.x;
    node.position.y += node.velocity.y;
  }
}

function coolDown(nodes: LayoutNode[], iteration: number, config: LayoutConfig): void {
  const temperature = 1 - iteration / config.iterations;
  for (const node of nodes) {
    node.velocity.x *= temperature;
    node.velocity.y *= temperature;
  }
}

/**
 * Apply repulsion force between two nodes.
 */
function applyRepulsionForce(node1: LayoutNode, node2: LayoutNode, config: LayoutConfig): void {
  const dx = node2.position.x - node1.position.x;
  const dy = node2.position.y - node1.position.y;
  const distSq = dx * dx + dy * dy;
  const minDist = config.symbolSpacing;
  const minDistSq = minDist * minDist;

  if (distSq < minDistSq && distSq > 0) {
    const dist = Math.sqrt(distSq);
    const force = config.repulsionStrength / distSq;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    node1.force.x -= fx;
    node1.force.y -= fy;
    node2.force.x += fx;
    node2.force.y += fy;
  }
}

/**
 * Apply attraction force between two nodes.
 */
function applyAttractionForce(node1: LayoutNode, node2: LayoutNode, config: LayoutConfig): void {
  const dx = node2.position.x - node1.position.x;
  const dy = node2.position.y - node1.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 0) {
    const force = config.attractionStrength * dist;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    node1.force.x += fx;
    node1.force.y += fy;
    node2.force.x -= fx;
    node2.force.y -= fy;
  }
}
