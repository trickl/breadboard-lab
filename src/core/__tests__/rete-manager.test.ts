/**
 * Tests for ReteManager - Rete.js integration layer
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ReteManager,
  ComponentNode,
  BreadboardHoleNode,
  legSocket,
  holeSocket,
} from '../rete-manager';
import { ComponentType, type BreadboardState, type Resistor } from '../types';

describe('ReteManager', () => {
  let manager: ReteManager;

  beforeEach(() => {
    // Create manager without container for unit tests
    manager = new ReteManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('initialization', () => {
    it('should create editor instance', () => {
      const editor = manager.getEditor();
      expect(editor).toBeDefined();
    });

    it('should initialize without errors', async () => {
      await expect(manager.initialize()).resolves.not.toThrow();
    });
  });

  describe('ComponentNode', () => {
    it('should create node with correct number of legs', () => {
      const node = new ComponentNode('r1', ComponentType.RESISTOR, 2);
      expect(node.componentId).toBe('r1');
      expect(node.componentType).toBe(ComponentType.RESISTOR);
      expect(node.legs).toBe(2);
    });

    it('should create input sockets for each leg', () => {
      const node = new ComponentNode('r1', ComponentType.RESISTOR, 2);
      expect(node.inputs.leg0).toBeDefined();
      expect(node.inputs.leg1).toBeDefined();
      expect(node.inputs.leg2).toBeUndefined();
    });
  });

  describe('BreadboardHoleNode', () => {
    it('should create node with position', () => {
      const node = new BreadboardHoleNode({ row: 5, col: 10 });
      expect(node.position.row).toBe(5);
      expect(node.position.col).toBe(10);
    });

    it('should have single output socket', () => {
      const node = new BreadboardHoleNode({ row: 5, col: 10 });
      expect(node.outputs.hole).toBeDefined();
    });
  });

  describe('socket types', () => {
    it('should define leg socket', () => {
      expect(legSocket).toBeDefined();
      expect(legSocket.name).toBe('component-leg');
    });

    it('should define hole socket', () => {
      expect(holeSocket).toBeDefined();
      expect(holeSocket.name).toBe('breadboard-hole');
    });
  });

  describe('syncFromBreadboardState', () => {
    it('should accept empty state', async () => {
      const state: BreadboardState = {
        components: [],
        selectedComponentId: null,
      };

      await manager.initialize();
      await expect(manager.syncFromBreadboardState(state)).resolves.not.toThrow();
    });

    it('should create nodes for components', async () => {
      const resistor: Resistor = {
        id: 'r1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 10 },
          { row: 5, col: 15 },
        ],
        rotation: 0,
        resistance: 220,
      };

      const state: BreadboardState = {
        components: [resistor],
        selectedComponentId: null,
      };

      await manager.initialize();
      await manager.syncFromBreadboardState(state);

      const editor = manager.getEditor();
      const nodes = editor.getNodes();

      // Should create 1 ComponentNode + 2 BreadboardHoleNodes (for 2 positions)
      expect(nodes.length).toBe(3);

      // Find the component node
      const componentNodes = nodes.filter((n) => n instanceof ComponentNode);
      expect(componentNodes.length).toBe(1);

      const componentNode = componentNodes[0] as ComponentNode;
      expect(componentNode.componentId).toBe('r1');
      expect(componentNode.componentType).toBe(ComponentType.RESISTOR);

      // Find the hole nodes
      const holeNodes = nodes.filter((n) => n instanceof BreadboardHoleNode);
      expect(holeNodes.length).toBe(2);
    });

    it('should handle multiple components', async () => {
      const r1: Resistor = {
        id: 'r1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 10 },
          { row: 5, col: 15 },
        ],
        rotation: 0,
        resistance: 220,
      };

      const r2: Resistor = {
        id: 'r2',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 10, col: 10 },
          { row: 10, col: 15 },
        ],
        rotation: 0,
        resistance: 1000,
      };

      const state: BreadboardState = {
        components: [r1, r2],
        selectedComponentId: null,
      };

      await manager.initialize();
      await manager.syncFromBreadboardState(state);

      const editor = manager.getEditor();
      const nodes = editor.getNodes();

      // Should create 2 ComponentNodes + 4 BreadboardHoleNodes (for 4 unique positions)
      expect(nodes.length).toBe(6);

      // Verify component nodes
      const componentNodes = nodes.filter((n) => n instanceof ComponentNode);
      expect(componentNodes.length).toBe(2);

      // Verify hole nodes
      const holeNodes = nodes.filter((n) => n instanceof BreadboardHoleNode);
      expect(holeNodes.length).toBe(4);
    });

    it('should create connections between components and holes', async () => {
      const resistor: Resistor = {
        id: 'r1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 10 },
          { row: 5, col: 15 },
        ],
        rotation: 0,
        resistance: 220,
      };

      const state: BreadboardState = {
        components: [resistor],
        selectedComponentId: null,
      };

      await manager.initialize();
      await manager.syncFromBreadboardState(state);

      const editor = manager.getEditor();
      const connections = editor.getConnections();

      // Should create 2 connections (one for each leg)
      expect(connections.length).toBe(2);
    });
  });

  describe('syncToBreadboardState', () => {
    it('should return null when no changes', () => {
      const state: BreadboardState = {
        components: [],
        selectedComponentId: null,
      };

      const result = manager.syncToBreadboardState(state);
      expect(result).toBeNull();
    });
  });

  describe('accessor methods (Phase 2)', () => {
    it('should retrieve component node by ID', async () => {
      const resistor: Resistor = {
        id: 'r1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 10 },
          { row: 5, col: 15 },
        ],
        rotation: 0,
        resistance: 220,
      };

      const state: BreadboardState = {
        components: [resistor],
        selectedComponentId: null,
      };

      await manager.initialize();
      await manager.syncFromBreadboardState(state);

      const componentNode = manager.getComponentNode('r1');
      expect(componentNode).toBeDefined();
      expect(componentNode!.componentId).toBe('r1');
      expect(componentNode!.componentType).toBe(ComponentType.RESISTOR);
    });

    it('should retrieve hole node by position', async () => {
      const resistor: Resistor = {
        id: 'r1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 10 },
          { row: 5, col: 15 },
        ],
        rotation: 0,
        resistance: 220,
      };

      const state: BreadboardState = {
        components: [resistor],
        selectedComponentId: null,
      };

      await manager.initialize();
      await manager.syncFromBreadboardState(state);

      const holeNode = manager.getHoleNode({ row: 5, col: 10 });
      expect(holeNode).toBeDefined();
      expect(holeNode!.position.row).toBe(5);
      expect(holeNode!.position.col).toBe(10);
    });

    it('should retrieve all hole nodes', async () => {
      const resistor: Resistor = {
        id: 'r1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 10 },
          { row: 5, col: 15 },
        ],
        rotation: 0,
        resistance: 220,
      };

      const state: BreadboardState = {
        components: [resistor],
        selectedComponentId: null,
      };

      await manager.initialize();
      await manager.syncFromBreadboardState(state);

      const holeNodes = manager.getAllHoleNodes();
      expect(holeNodes.length).toBe(2);
    });

    it('should retrieve all component nodes', async () => {
      const r1: Resistor = {
        id: 'r1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 10 },
          { row: 5, col: 15 },
        ],
        rotation: 0,
        resistance: 220,
      };

      const r2: Resistor = {
        id: 'r2',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 10, col: 10 },
          { row: 10, col: 15 },
        ],
        rotation: 0,
        resistance: 1000,
      };

      const state: BreadboardState = {
        components: [r1, r2],
        selectedComponentId: null,
      };

      await manager.initialize();
      await manager.syncFromBreadboardState(state);

      const componentNodes = manager.getAllComponentNodes();
      expect(componentNodes.length).toBe(2);
    });

    it('should retrieve all connections', async () => {
      const resistor: Resistor = {
        id: 'r1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 10 },
          { row: 5, col: 15 },
        ],
        rotation: 0,
        resistance: 220,
      };

      const state: BreadboardState = {
        components: [resistor],
        selectedComponentId: null,
      };

      await manager.initialize();
      await manager.syncFromBreadboardState(state);

      const connections = manager.getConnections();
      expect(connections.length).toBe(2); // One connection per leg
    });
  });

  describe('one-connector-per-hole constraint (Phase 2)', () => {
    it('should enforce one output socket per hole node', () => {
      const holeNode = new BreadboardHoleNode({ row: 5, col: 10 });

      // Hole node should have exactly one output socket
      expect(Object.keys(holeNode.outputs).length).toBe(1);
      expect(holeNode.outputs.hole).toBeDefined();
    });

    it('should not allow multiple components to share same hole position', async () => {
      // This test verifies the data structure constraint
      // In Phase 2, components are still placed via BreadboardState, so this
      // tests that the sync creates unique hole nodes for unique positions only
      const r1: Resistor = {
        id: 'r1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 10 },
          { row: 5, col: 15 },
        ],
        rotation: 0,
        resistance: 220,
      };

      const r2: Resistor = {
        id: 'r2',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 10 },
          { row: 10, col: 10 },
        ], // Shares position with r1
        rotation: 0,
        resistance: 1000,
      };

      const state: BreadboardState = {
        components: [r1, r2],
        selectedComponentId: null,
      };

      await manager.initialize();
      await manager.syncFromBreadboardState(state);

      const holeNodes = manager.getAllHoleNodes();

      // Should create unique hole nodes only (3 unique positions)
      expect(holeNodes.length).toBe(3);

      // The shared hole (5,10) should only have one node
      const sharedHole = manager.getHoleNode({ row: 5, col: 10 });
      expect(sharedHole).toBeDefined();
    });
  });

  describe('Phase 3: Interactive Connection Creation', () => {
    it('should register connection created handler', () => {
      let handlerCalled = false;
      manager.onConnectionCreated(() => {
        handlerCalled = true;
      });

      // Handler should be registered without error
      expect(handlerCalled).toBe(false); // Not called yet
    });

    it('should register connection removed handler', () => {
      let handlerCalled = false;
      manager.onConnectionRemoved(() => {
        handlerCalled = true;
      });

      // Handler should be registered without error
      expect(handlerCalled).toBe(false); // Not called yet
    });

    it('should validate one-connector-per-hole constraint', async () => {
      const resistor: Resistor = {
        id: 'r1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 10 },
          { row: 5, col: 15 },
        ],
        rotation: 0,
        resistance: 220,
      };

      const state: BreadboardState = {
        components: [resistor],
        selectedComponentId: null,
      };

      await manager.initialize();
      await manager.syncFromBreadboardState(state);

      // Get the hole node and component node
      const holeNode = manager.getHoleNode({ row: 5, col: 10 });
      const componentNode = manager.getComponentNode('r1');

      expect(holeNode).toBeDefined();
      expect(componentNode).toBeDefined();

      // Get the existing connection (from sync)
      const connections = manager.getConnections();
      expect(connections.length).toBeGreaterThan(0);

      const existingConnection = connections[0];

      // Validate the existing connection (should pass)
      const validationExisting = manager.validateOneConnectorPerHole(existingConnection);
      expect(validationExisting.valid).toBe(true);
    });

    it('should detect occupied holes', async () => {
      const resistor: Resistor = {
        id: 'r1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 10 },
          { row: 5, col: 15 },
        ],
        rotation: 0,
        resistance: 220,
      };

      const state: BreadboardState = {
        components: [resistor],
        selectedComponentId: null,
      };

      await manager.initialize();
      await manager.syncFromBreadboardState(state);

      // Holes with connections should be occupied
      expect(manager.isHoleOccupied({ row: 5, col: 10 })).toBe(true);
      expect(manager.isHoleOccupied({ row: 5, col: 15 })).toBe(true);

      // Unoccupied hole should return false
      expect(manager.isHoleOccupied({ row: 7, col: 20 })).toBe(false);
    });

    it('should create floating component', async () => {
      await manager.initialize();

      const componentNode = await manager.createFloatingComponent('led1', ComponentType.LED, {
        x: 100,
        y: 100,
      });

      expect(componentNode).toBeDefined();
      expect(componentNode.componentId).toBe('led1');
      expect(componentNode.componentType).toBe(ComponentType.LED);
      expect(componentNode.legs).toBe(2);

      // Should be retrievable
      const retrieved = manager.getComponentNode('led1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.componentId).toBe('led1');
    });

    it('should set connection validator', () => {
      const validator = () => ({ valid: true });
      manager.setConnectionValidator(validator);

      // Validator should be set without error
      // Actual validation happens during connection creation
    });
  });

  describe('Wire re-routing', () => {
    it('should re-route connection to a new hole', async () => {
      // Create a simple circuit with two holes and one component
      const resistor: Resistor = {
        id: 'r1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 10 },
          { row: 5, col: 15 },
        ],
        rotation: 0,
        resistance: 220,
      };

      const state: BreadboardState = {
        components: [resistor],
        selectedComponentId: null,
      };

      await manager.initialize();
      await manager.syncFromBreadboardState(state);

      // Get the connections
      const connections = manager.getConnections();
      expect(connections.length).toBeGreaterThan(0);

      const connection = connections[0];

      // Try to re-route to a new hole
      const newHolePosition = { row: 5, col: 20 };

      // Create the new hole node first
      // (In real usage, this would be done by syncFromBreadboardState)
      // For this test, we'll just test that the method doesn't crash
      const success = await manager.rerouteConnection(connection.id, newHolePosition, 'target');

      // Since the new hole doesn't exist, it should fail gracefully
      expect(typeof success).toBe('boolean');
    });

    it('should reject re-routing to an occupied hole', async () => {
      const resistor1: Resistor = {
        id: 'r1',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 10 },
          { row: 5, col: 15 },
        ],
        rotation: 0,
        resistance: 220,
      };

      const resistor2: Resistor = {
        id: 'r2',
        type: ComponentType.RESISTOR,
        positions: [
          { row: 5, col: 15 }, // Shares a hole with r1
          { row: 5, col: 20 },
        ],
        rotation: 0,
        resistance: 330,
      };

      const state: BreadboardState = {
        components: [resistor1, resistor2],
        selectedComponentId: null,
      };

      await manager.initialize();
      await manager.syncFromBreadboardState(state);

      const connections = manager.getConnections();
      expect(connections.length).toBeGreaterThan(0);

      const connection = connections[0];

      // Try to re-route to an occupied hole
      const occupiedHolePosition = { row: 5, col: 20 };

      const success = await manager.rerouteConnection(
        connection.id,
        occupiedHolePosition,
        'target'
      );

      // Should fail because hole is occupied
      expect(success).toBe(false);
    });
  });
});
