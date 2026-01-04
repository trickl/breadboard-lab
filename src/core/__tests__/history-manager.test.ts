/**
 * Tests for command pattern and history manager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AddComponentCommand,
  DeleteComponentCommand,
  MoveComponentCommand,
  RotateComponentCommand,
  EditPropertyCommand,
} from '../command';
import { HistoryManager } from '../history-manager';
import type { BreadboardState, Resistor, LED } from '../types';
import { ComponentType } from '../types';

describe('Command Pattern', () => {
  let initialState: BreadboardState;
  let resistor: Resistor;
  let led: LED;

  beforeEach(() => {
    initialState = {
      components: [],
      selectedComponentId: null,
    };

    resistor = {
      id: 'r1',
      type: ComponentType.RESISTOR,
      positions: [
        { row: 10, col: 20 },
        { row: 10, col: 21 },
      ],
      rotation: 0,
      resistance: 1000,
    };

    led = {
      id: 'led1',
      type: ComponentType.LED,
      positions: [
        { row: 15, col: 25 },
        { row: 15, col: 26 },
      ],
      rotation: 0,
      forwardVoltage: 2.0,
      maxCurrent: 0.02,
    };
  });

  describe('AddComponentCommand', () => {
    it('should add component on execute', () => {
      const cmd = new AddComponentCommand(resistor);
      const newState = cmd.execute(initialState);

      expect(newState.components).toHaveLength(1);
      expect(newState.components[0]).toEqual(resistor);
    });

    it('should remove component on undo', () => {
      const cmd = new AddComponentCommand(resistor);
      const afterAdd = cmd.execute(initialState);
      const afterUndo = cmd.undo(afterAdd);

      expect(afterUndo.components).toHaveLength(0);
    });

    it('should not mutate original state', () => {
      const cmd = new AddComponentCommand(resistor);
      cmd.execute(initialState);

      expect(initialState.components).toHaveLength(0);
    });
  });

  describe('DeleteComponentCommand', () => {
    it('should remove component on execute', () => {
      const stateWithComponent = {
        components: [resistor],
        selectedComponentId: null,
      };

      const cmd = new DeleteComponentCommand('r1', resistor);
      const newState = cmd.execute(stateWithComponent);

      expect(newState.components).toHaveLength(0);
    });

    it('should restore component on undo', () => {
      const stateWithComponent = {
        components: [resistor],
        selectedComponentId: null,
      };

      const cmd = new DeleteComponentCommand('r1', resistor);
      const afterDelete = cmd.execute(stateWithComponent);
      const afterUndo = cmd.undo(afterDelete);

      expect(afterUndo.components).toHaveLength(1);
      expect(afterUndo.components[0]).toEqual(resistor);
    });

    it('should clear selection if deleting selected component', () => {
      const stateWithSelection = {
        components: [resistor],
        selectedComponentId: 'r1',
      };

      const cmd = new DeleteComponentCommand('r1', resistor);
      const newState = cmd.execute(stateWithSelection);

      expect(newState.selectedComponentId).toBeNull();
    });

    it('should preserve selection if deleting different component', () => {
      const stateWithSelection = {
        components: [resistor, led],
        selectedComponentId: 'led1',
      };

      const cmd = new DeleteComponentCommand('r1', resistor);
      const newState = cmd.execute(stateWithSelection);

      expect(newState.selectedComponentId).toBe('led1');
    });
  });

  describe('MoveComponentCommand', () => {
    it('should update component positions on execute', () => {
      const stateWithComponent = {
        components: [resistor],
        selectedComponentId: null,
      };

      const newPositions = [
        { row: 12, col: 22 },
        { row: 12, col: 23 },
      ];

      const cmd = new MoveComponentCommand('r1', resistor.positions, newPositions);
      const newState = cmd.execute(stateWithComponent);

      expect(newState.components[0].positions).toEqual(newPositions);
    });

    it('should restore original positions on undo', () => {
      const stateWithComponent = {
        components: [resistor],
        selectedComponentId: null,
      };

      const newPositions = [
        { row: 12, col: 22 },
        { row: 12, col: 23 },
      ];

      const cmd = new MoveComponentCommand('r1', resistor.positions, newPositions);
      const afterMove = cmd.execute(stateWithComponent);
      const afterUndo = cmd.undo(afterMove);

      expect(afterUndo.components[0].positions).toEqual(resistor.positions);
    });
  });

  describe('RotateComponentCommand', () => {
    it('should update rotation and positions on execute', () => {
      const stateWithComponent = {
        components: [resistor],
        selectedComponentId: null,
      };

      const newPositions = [
        { row: 10, col: 20 },
        { row: 11, col: 20 },
      ];

      const cmd = new RotateComponentCommand('r1', 0, 90, resistor.positions, newPositions);
      const newState = cmd.execute(stateWithComponent);

      expect(newState.components[0].rotation).toBe(90);
      expect(newState.components[0].positions).toEqual(newPositions);
    });

    it('should restore original rotation and positions on undo', () => {
      const stateWithComponent = {
        components: [resistor],
        selectedComponentId: null,
      };

      const newPositions = [
        { row: 10, col: 20 },
        { row: 11, col: 20 },
      ];

      const cmd = new RotateComponentCommand('r1', 0, 90, resistor.positions, newPositions);
      const afterRotate = cmd.execute(stateWithComponent);
      const afterUndo = cmd.undo(afterRotate);

      expect(afterUndo.components[0].rotation).toBe(0);
      expect(afterUndo.components[0].positions).toEqual(resistor.positions);
    });
  });

  describe('EditPropertyCommand', () => {
    it('should update property on execute', () => {
      const stateWithComponent = {
        components: [resistor],
        selectedComponentId: null,
      };

      const cmd = new EditPropertyCommand('r1', 'resistance', 1000, 2200);
      const newState = cmd.execute(stateWithComponent);

      expect((newState.components[0] as Resistor).resistance).toBe(2200);
    });

    it('should restore original property on undo', () => {
      const stateWithComponent = {
        components: [resistor],
        selectedComponentId: null,
      };

      const cmd = new EditPropertyCommand('r1', 'resistance', 1000, 2200);
      const afterEdit = cmd.execute(stateWithComponent);
      const afterUndo = cmd.undo(afterEdit);

      expect((afterUndo.components[0] as Resistor).resistance).toBe(1000);
    });
  });
});

describe('HistoryManager', () => {
  let manager: HistoryManager;
  let initialState: BreadboardState;
  let resistor: Resistor;

  beforeEach(() => {
    manager = new HistoryManager(50);
    initialState = {
      components: [],
      selectedComponentId: null,
    };

    resistor = {
      id: 'r1',
      type: ComponentType.RESISTOR,
      positions: [
        { row: 10, col: 20 },
        { row: 10, col: 21 },
      ],
      rotation: 0,
      resistance: 1000,
    };
  });

  it('should execute command and add to history', () => {
    const cmd = new AddComponentCommand(resistor);
    const newState = manager.execute(cmd, initialState);

    expect(newState.components).toHaveLength(1);
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });

  it('should undo command', () => {
    const cmd = new AddComponentCommand(resistor);
    const afterAdd = manager.execute(cmd, initialState);
    const afterUndo = manager.undo(afterAdd);

    expect(afterUndo).not.toBeNull();
    expect(afterUndo!.components).toHaveLength(0);
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(true);
  });

  it('should redo command', () => {
    const cmd = new AddComponentCommand(resistor);
    const afterAdd = manager.execute(cmd, initialState);
    const afterUndo = manager.undo(afterAdd)!;
    const afterRedo = manager.redo(afterUndo);

    expect(afterRedo).not.toBeNull();
    expect(afterRedo!.components).toHaveLength(1);
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });

  it('should clear redo stack on new action', () => {
    const cmd1 = new AddComponentCommand(resistor);
    const afterAdd = manager.execute(cmd1, initialState);
    manager.undo(afterAdd);

    expect(manager.canRedo()).toBe(true);

    // Execute a new command
    const resistor2 = { ...resistor, id: 'r2' };
    const cmd2 = new AddComponentCommand(resistor2);
    manager.execute(cmd2, initialState);

    // Redo stack should be cleared
    expect(manager.canRedo()).toBe(false);
  });

  it('should enforce maximum history size', () => {
    const smallManager = new HistoryManager(3);
    let state = initialState;

    // Add 5 components
    for (let i = 0; i < 5; i++) {
      const r = { ...resistor, id: `r${i}` };
      const cmd = new AddComponentCommand(r);
      state = smallManager.execute(cmd, state);
    }

    // Should only keep last 3
    expect(smallManager.getUndoCount()).toBe(3);
  });

  it('should clear all history', () => {
    const cmd = new AddComponentCommand(resistor);
    manager.execute(cmd, initialState);

    expect(manager.canUndo()).toBe(true);

    manager.clear();

    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(false);
    expect(manager.getUndoCount()).toBe(0);
    expect(manager.getRedoCount()).toBe(0);
  });

  it('should return null when nothing to undo', () => {
    const result = manager.undo(initialState);
    expect(result).toBeNull();
  });

  it('should return null when nothing to redo', () => {
    const result = manager.redo(initialState);
    expect(result).toBeNull();
  });

  it('should handle multiple undo/redo operations', () => {
    const cmd1 = new AddComponentCommand(resistor);
    const resistor2 = { ...resistor, id: 'r2' };
    const cmd2 = new AddComponentCommand(resistor2);

    const state1 = manager.execute(cmd1, initialState);
    const state2 = manager.execute(cmd2, state1);

    expect(state2.components).toHaveLength(2);

    const afterUndo1 = manager.undo(state2)!;
    expect(afterUndo1.components).toHaveLength(1);

    const afterUndo2 = manager.undo(afterUndo1)!;
    expect(afterUndo2.components).toHaveLength(0);

    const afterRedo1 = manager.redo(afterUndo2)!;
    expect(afterRedo1.components).toHaveLength(1);

    const afterRedo2 = manager.redo(afterRedo1)!;
    expect(afterRedo2.components).toHaveLength(2);
  });

  it('should track undo and redo counts correctly', () => {
    const cmd = new AddComponentCommand(resistor);

    expect(manager.getUndoCount()).toBe(0);
    expect(manager.getRedoCount()).toBe(0);

    const afterAdd = manager.execute(cmd, initialState);
    expect(manager.getUndoCount()).toBe(1);
    expect(manager.getRedoCount()).toBe(0);

    manager.undo(afterAdd);
    expect(manager.getUndoCount()).toBe(0);
    expect(manager.getRedoCount()).toBe(1);
  });
});
