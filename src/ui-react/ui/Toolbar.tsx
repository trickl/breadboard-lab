import React, { useMemo, useState } from 'react';
import type { BreadboardController } from '@/ui-controller';
import { ComponentType, type AnyComponent, type Resistor, type LED, type PowerSupply, type Ground, type Wire } from '@/core/types';
import { deserializeCircuit } from '@/core/circuit-serializer';
import { ExamplesModal } from './ExamplesModal';
import type { ExampleCircuit } from '@/examples';
import { SimulationRunner } from '@/ui-controller/simulation-runner';
import { ClockControls } from './ClockControls';

export interface ToolbarProps {
  controller: BreadboardController;
}

function createDefaultComponent(type: ComponentType, id: string): AnyComponent {
  // Chosen to be safely inside typical breadboard bounds.
  const baseRow = 6;
  const baseCol = 8;

  switch (type) {
    case ComponentType.RESISTOR:
      return {
        id,
        type: ComponentType.RESISTOR,
        resistance: 220,
        positions: [
          { row: baseRow, col: baseCol },
          { row: baseRow, col: baseCol + 1 },
        ],
        rotation: 0,
      } satisfies Resistor;

    case ComponentType.LED:
      return {
        id,
        type: ComponentType.LED,
        forwardVoltage: 2.0,
        maxCurrent: 0.02,
        positions: [
          { row: baseRow + 3, col: baseCol },
          { row: baseRow + 3, col: baseCol + 1 },
        ],
        rotation: 0,
      } satisfies LED;

    case ComponentType.WIRE:
      return {
        id,
        type: ComponentType.WIRE,
        resistance: 0.01,
        positions: [
          { row: baseRow + 1, col: baseCol - 2 },
          { row: baseRow + 1, col: baseCol + 2 },
        ],
        rotation: 0,
      } satisfies Wire;

    case ComponentType.POWER_SUPPLY:
      return {
        id,
        type: ComponentType.POWER_SUPPLY,
        voltage: 5,
        positions: [{ row: 2, col: 2 }],
        rotation: 0,
      } satisfies PowerSupply;

    case ComponentType.GROUND:
      return {
        id,
        type: ComponentType.GROUND,
        positions: [{ row: 12, col: 2 }],
        rotation: 0,
      } satisfies Ground;

    default:
      // Fallback to a wire
      return {
        id,
        type: ComponentType.WIRE,
        resistance: 0.01,
        positions: [
          { row: baseRow, col: baseCol },
          { row: baseRow, col: baseCol + 1 },
        ],
        rotation: 0,
      } satisfies Wire;
  }
}

export const Toolbar: React.FC<ToolbarProps> = ({ controller }) => {
  const [examplesOpen, setExamplesOpen] = useState(false);

  const simulationRunner = useMemo(() => new SimulationRunner(controller, null), [controller]);

  const addComponent = (type: ComponentType) => {
    const id = `cmp-${type.toLowerCase()}-${Date.now()}`;
    const component = createDefaultComponent(type, id);

    controller.dispatch({ type: 'COMPONENT_ADDED', component });
    controller.dispatch({ type: 'COMPONENT_SELECTED', componentId: id });

    // Update simulation for immediate feedback
    simulationRunner.runSimulation();
  };

  const loadExample = (example: ExampleCircuit) => {
    const { state, metadata } = deserializeCircuit(example.json);

    controller.dispatch({
      type: 'CIRCUIT_LOADED',
      components: state.components,
      metadata,
    });

    simulationRunner.runSimulation();
    setExamplesOpen(false);
  };

  return (
    <aside className="toolbar">
      <h2>Components</h2>

      <div className="component-list">
        <button className="component-button" onClick={() => addComponent(ComponentType.RESISTOR)}>
          Resistor
        </button>
        <button className="component-button" onClick={() => addComponent(ComponentType.LED)}>
          LED
        </button>
        <button className="component-button" onClick={() => addComponent(ComponentType.WIRE)}>
          Wire
        </button>
        <button
          className="component-button"
          onClick={() => addComponent(ComponentType.POWER_SUPPLY)}
        >
          Power Supply
        </button>
        <button className="component-button" onClick={() => addComponent(ComponentType.GROUND)}>
          Ground
        </button>
      </div>

      <div className="toolbar-actions">
        <button id="examples-btn" className="toolbar-btn" onClick={() => setExamplesOpen(true)}>
          Examples
        </button>

        <button
          className="toolbar-btn primary"
          onClick={() => {
            simulationRunner.runSimulation();
          }}
        >
          Run simulation
        </button>

        <button className="toolbar-btn" onClick={() => controller.dispatch({ type: 'XRAY_MODE_TOGGLED' })}>
          Toggle X-Ray
        </button>

        <button className="toolbar-btn" onClick={() => controller.dispatch({ type: 'BREADBOARD_ROTATED' })}>
          Rotate board
        </button>

        <button className="toolbar-btn" onClick={() => controller.dispatch({ type: 'VOLTAGE_OVERLAY_TOGGLED' })}>
          Toggle voltage overlay (V)
        </button>

        <button className="toolbar-btn" onClick={() => controller.dispatch({ type: 'CURRENT_ANIMATION_TOGGLED' })}>
          Toggle current animation (C)
        </button>

        <button className="toolbar-btn" onClick={() => controller.dispatch({ type: 'CIRCUIT_CLEARED' })}>
          Clear circuit
        </button>
      </div>

      <ClockControls controller={controller} />

      <ExamplesModal
        visible={examplesOpen}
        onClose={() => setExamplesOpen(false)}
        onSelectExample={loadExample}
      />
    </aside>
  );
};
