import React from 'react';
import type { BreadboardController } from '@/ui-controller';
import { useControllerState } from '@/ui-react/hooks/useControllerState';
import { Box, Button, Text } from 'theme-ui';

import type {
  ConnectionAppearance,
} from '@/ui-controller/types';

import { ComponentInspector } from '@/ui-react/ui/info-panel/ComponentInspector';
import { WireInspector } from '@/ui-react/ui/info-panel/WireInspector';

export interface InfoPanelProps {
  controller: BreadboardController;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ controller }) => {
  const state = useControllerState(controller);

  const debugOverlaysOn = Boolean(state.ui.showDebugOverlays);

  const selectedConnectionId = state.connections.selectedConnectionId;
  const selectedConnectionKind = state.connections.selectedConnectionKind;
  const selectedConnectionAppearance: ConnectionAppearance | null = selectedConnectionId
    ? (state.connections.appearanceById[selectedConnectionId] ?? null)
    : null;

  const selected = state.breadboard.selectedComponentId
    ? (state.breadboard.components.find((c) => c.id === state.breadboard.selectedComponentId) ??
      null)
    : null;

  const showWireInspector = Boolean(selectedConnectionId);

  return (
    <Box
      as="aside"
      className="info-panel"
      sx={{
        width: 300,
        bg: 'sidebarBg',
        p: 3,
        overflowY: 'auto',
        transition: 'background-color 0.3s ease',
        flexShrink: 0,
      }}
    >
      <Text as="h2" sx={{ m: 0, mb: 3, fontSize: 2, color: 'text' }}>
        Inspector
      </Text>

      <Box sx={{ mb: 3, pb: 3, borderBottom: '1px solid', borderBottomColor: 'border' }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
        >
          <Text sx={{ fontSize: 1, color: 'secondaryText' }}>Debug overlays</Text>
          <Button
            onClick={() => controller.dispatch({ type: 'DEBUG_OVERLAYS_TOGGLED' })}
            sx={{
              px: 2,
              py: 1,
              bg: debugOverlaysOn ? 'primary' : 'panelBg',
              border: '1px solid',
              borderColor: debugOverlaysOn ? 'primary' : 'border',
              borderRadius: 4,
              color: 'text',
              fontSize: 0,
              cursor: 'pointer',
              ':hover': { bg: 'hoverBg' },
            }}
            title="Toggle debug overlays (Ctrl+Shift+D)"
          >
            {debugOverlaysOn ? 'On' : 'Off'}
          </Button>
        </Box>
        <Text sx={{ mt: 2, fontSize: 0, color: 'secondaryText' }}>Shortcut: Ctrl+Shift+D</Text>
      </Box>

      {showWireInspector ? (
        <WireInspector
          controller={controller}
          connectionId={selectedConnectionId!}
          connectionKind={selectedConnectionKind}
          appearance={selectedConnectionAppearance}
        />
      ) : !selected ? (
        <Box sx={{ py: 3 }}>
          <Text sx={{ fontSize: 1, color: 'secondaryText' }}>
            Select a component or wire to edit its properties.
          </Text>
        </Box>
      ) : (
        <ComponentInspector
          controller={controller}
          selected={selected}
          simulationErrorCount={state.simulation.cachedSimulation?.errors?.length ?? 0}
        />
      )}
    </Box>
  );
};
