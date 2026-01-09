/**
 * Command pattern for undo/redo functionality.
 * Each command encapsulates a state mutation and knows how to reverse it.
 */

import type { AnyComponent, BreadboardState, Position } from './types';

/**
 * Base interface for all commands that mutate breadboard state.
 * Commands are immutable and produce new state rather than mutating in place.
 */
export interface Command {
  /**
   * Execute the command, returning new state
   */
  execute(state: BreadboardState): BreadboardState;

  /**
   * Undo the command, returning previous state
   */
  undo(state: BreadboardState): BreadboardState;

  /**
   * Human-readable description of the command (for debugging/UI)
   */
  readonly description: string;
}

/**
 * Command to add a component to the breadboard
 */
export class AddComponentCommand implements Command {
  readonly description: string;

  constructor(private component: AnyComponent) {
    this.description = `Add ${component.type}`;
  }

  execute(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: [...state.components, this.component],
    };
  }

  undo(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: state.components.filter((c) => c.id !== this.component.id),
    };
  }
}

/**
 * Command to delete a component from the breadboard
 */
export class DeleteComponentCommand implements Command {
  readonly description: string;

  constructor(
    private componentId: string,
    private component: AnyComponent
  ) {
    this.description = `Delete ${component.type}`;
  }

  execute(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: state.components.filter((c) => c.id !== this.componentId),
      // Clear selection if we're deleting the selected component
      selectedComponentId:
        state.selectedComponentId === this.componentId ? null : state.selectedComponentId,
    };
  }

  undo(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: [...state.components, this.component],
    };
  }
}

/**
 * Command to move a component to new positions
 */
export class MoveComponentCommand implements Command {
  readonly description: string;

  constructor(
    private componentId: string,
    private oldPositions: Position[],
    private newPositions: Position[]
  ) {
    this.description = `Move component`;
  }

  execute(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: state.components.map((c) =>
        c.id === this.componentId ? { ...c, positions: this.newPositions } : c
      ),
    };
  }

  undo(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: state.components.map((c) =>
        c.id === this.componentId ? { ...c, positions: this.oldPositions } : c
      ),
    };
  }
}

/**
 * Command to rotate a component
 */
export class RotateComponentCommand implements Command {
  readonly description: string;

  constructor(
    private componentId: string,
    private oldRotation: 0 | 90 | 180 | 270,
    private newRotation: 0 | 90 | 180 | 270,
    private oldPositions: Position[],
    private newPositions: Position[]
  ) {
    this.description = `Rotate component`;
  }

  execute(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: state.components.map((c) =>
        c.id === this.componentId
          ? { ...c, rotation: this.newRotation, positions: this.newPositions }
          : c
      ),
    };
  }

  undo(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: state.components.map((c) =>
        c.id === this.componentId
          ? { ...c, rotation: this.oldRotation, positions: this.oldPositions }
          : c
      ),
    };
  }
}

/**
 * Command to edit a component property
 */
export class EditPropertyCommand implements Command {
  readonly description: string;

  constructor(
    private componentId: string,
    private propertyName: string,
    private oldValue: unknown,
    private newValue: unknown
  ) {
    this.description = `Edit ${propertyName}`;
  }

  execute(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: state.components.map((c) => {
        if (c.id === this.componentId) {
          return { ...c, [this.propertyName]: this.newValue };
        }
        return c;
      }),
    };
  }

  undo(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: state.components.map((c) => {
        if (c.id === this.componentId) {
          return { ...c, [this.propertyName]: this.oldValue };
        }
        return c;
      }),
    };
  }
}

/**
 * Command to reposition a single pin of a component
 */
export class RepositionPinCommand implements Command {
  readonly description: string;

  constructor(
    private componentId: string,
    private pinIndex: number,
    private oldPosition: Position,
    private newPosition: Position
  ) {
    this.description = `Reposition pin ${pinIndex}`;
  }

  execute(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: state.components.map((c) => {
        if (c.id === this.componentId) {
          const newPositions = [...c.positions];
          newPositions[this.pinIndex] = this.newPosition;
          return { ...c, positions: newPositions };
        }
        return c;
      }),
    };
  }

  undo(state: BreadboardState): BreadboardState {
    return {
      ...state,
      components: state.components.map((c) => {
        if (c.id === this.componentId) {
          const newPositions = [...c.positions];
          newPositions[this.pinIndex] = this.oldPosition;
          return { ...c, positions: newPositions };
        }
        return c;
      }),
    };
  }
}
