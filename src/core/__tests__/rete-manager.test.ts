/**
 * Tests for ReteManager - Rete.js integration layer
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReteManager, ComponentNode, BreadboardHoleNode, legSocket, holeSocket } from '../rete-manager';
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
        positions: [{ row: 5, col: 10 }, { row: 5, col: 15 }],
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
      expect(nodes.length).toBe(1);
      expect(nodes[0]).toBeInstanceOf(ComponentNode);
      
      const componentNode = nodes[0] as ComponentNode;
      expect(componentNode.componentId).toBe('r1');
      expect(componentNode.componentType).toBe(ComponentType.RESISTOR);
    });

    it('should handle multiple components', async () => {
      const r1: Resistor = {
        id: 'r1',
        type: ComponentType.RESISTOR,
        positions: [{ row: 5, col: 10 }, { row: 5, col: 15 }],
        rotation: 0,
        resistance: 220,
      };

      const r2: Resistor = {
        id: 'r2',
        type: ComponentType.RESISTOR,
        positions: [{ row: 10, col: 10 }, { row: 10, col: 15 }],
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
      expect(nodes.length).toBe(2);
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
});
