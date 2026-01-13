import React, { useMemo, useState } from 'react';
import { Box, Button, Text } from 'theme-ui';
import type { BreadboardController } from '@/ui-controller';
import {
  ComponentType,
  type AnyComponent,
  type Resistor,
  type LED,
  type PowerSupply,
  type Ground,
} from '@/core/types';
import { deserializeCircuit } from '@/core/circuit-serializer';
import { ExamplesModal } from './ExamplesModal';
import type { ExampleCircuit } from '@/examples';
import { SimulationRunner } from '@/ui-controller/simulation-runner';
import { ClockControls } from './ClockControls';

export interface ToolbarProps {
  controller: BreadboardController;
}

type ToolbarComponentType =
  | ComponentType.RESISTOR
  | ComponentType.LED
  | ComponentType.POWER_SUPPLY
  | ComponentType.GROUND;

function createDefaultComponent(type: ToolbarComponentType, id: string): AnyComponent {
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
  }
}

export const Toolbar: React.FC<ToolbarProps> = ({ controller }) => {
  const [examplesOpen, setExamplesOpen] = useState(false);

  const simulationRunner = useMemo(() => new SimulationRunner(controller, null), [controller]);

  const addComponent = (type: ToolbarComponentType) => {
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
    <Box
      as="aside"
      className="toolbar"
      sx={{
        width: 250,
        bg: 'sidebarBg',
        p: 3,
        overflowY: 'auto',
        transition: 'background-color 0.3s ease',
        flexShrink: 0,
      }}
    >
      <Text as="h2" sx={{ m: 0, mb: 3, fontSize: 2, color: 'text' }}>
        Components
      </Text>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(
          [
            ['Resistor', ComponentType.RESISTOR],
            ['LED', ComponentType.LED],
            ['Power Supply', ComponentType.POWER_SUPPLY],
            ['Ground', ComponentType.GROUND],
          ] as const
        ).map(([label, type]) => (
          <Button
            key={type}
            className="component-button"
            onClick={() => addComponent(type)}
            sx={{
              bg: 'panelBg',
              border: '2px solid',
              borderColor: 'border',
              borderRadius: 'sm',
              color: 'text',
              px: 3,
              py: 2,
              cursor: 'pointer',
              fontSize: 1,
              textAlign: 'left',
              transition: 'transform 0.2s ease, background-color 0.2s ease',
              ':hover': { bg: 'hoverBg', transform: 'translateY(-1px)' },
            }}
          >
            {label}
          </Button>
        ))}
      </Box>

      <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          id="examples-btn"
          onClick={() => setExamplesOpen(true)}
          sx={{
            bg: 'panelBg',
            border: '2px solid',
            borderColor: 'border',
            borderRadius: 'sm',
            color: 'text',
            px: 3,
            py: 2,
            cursor: 'pointer',
            fontSize: 1,
            transition: 'transform 0.2s ease, background-color 0.2s ease',
            ':hover': { bg: 'hoverBg', transform: 'translateY(-1px)' },
          }}
        >
          Examples
        </Button>

        <Button
          onClick={() => simulationRunner.runSimulation()}
          sx={{
            bg: 'primary',
            border: '2px solid',
            borderColor: 'primary',
            borderRadius: 'sm',
            color: 'white',
            px: 3,
            py: 2,
            cursor: 'pointer',
            fontSize: 1,
            transition: 'transform 0.2s ease, filter 0.2s ease',
            ':hover': { filter: 'brightness(1.05)', transform: 'translateY(-1px)' },
          }}
        >
          Run simulation
        </Button>

        {(
          [
            ['Toggle X-Ray', () => controller.dispatch({ type: 'XRAY_MODE_TOGGLED' })],
            [
              'Toggle voltage overlay (V)',
              () => controller.dispatch({ type: 'VOLTAGE_OVERLAY_TOGGLED' }),
            ],
            [
              'Toggle current animation (C)',
              () => controller.dispatch({ type: 'CURRENT_ANIMATION_TOGGLED' }),
            ],
            ['Clear circuit', () => controller.dispatch({ type: 'CIRCUIT_CLEARED' })],
          ] as const
        ).map(([label, onClick]) => (
          <Button
            key={label}
            onClick={onClick}
            sx={{
              bg: 'panelBg',
              border: '2px solid',
              borderColor: 'border',
              borderRadius: 'sm',
              color: 'text',
              px: 3,
              py: 2,
              cursor: 'pointer',
              fontSize: 1,
              transition: 'transform 0.2s ease, background-color 0.2s ease',
              ':hover': { bg: 'hoverBg', transform: 'translateY(-1px)' },
            }}
          >
            {label}
          </Button>
        ))}
      </Box>

      <ClockControls controller={controller} />

      <ExamplesModal
        visible={examplesOpen}
        onClose={() => setExamplesOpen(false)}
        onSelectExample={loadExample}
      />
    </Box>
  );
};
