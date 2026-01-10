import React from 'react';
import type { BreadboardController } from '@/ui-controller';
import { useControllerState } from '@/ui-react/hooks/useControllerState';
import { ComponentType, type AnyComponent, type Resistor, type LED, type PowerSupply, type Wire, type Switch } from '@/core/types';
import { Box, Button, Input, Select, Text } from 'theme-ui';

import type { ConnectionAppearance, ConnectionEndpointOrientation, ConnectionStyle } from '@/ui-controller/types';

export interface InfoPanelProps {
  controller: BreadboardController;
}

function formatComponentTitle(c: AnyComponent): string {
  switch (c.type) {
    case ComponentType.RESISTOR:
      return `Resistor (${(c as Resistor).resistance} Ω)`;
    case ComponentType.LED:
      return `LED (${(c as LED).forwardVoltage} V)`;
    case ComponentType.POWER_SUPPLY:
      return `Power (${(c as PowerSupply).voltage} V)`;
    case ComponentType.WIRE:
      return `Wire (${(c as Wire).resistance} Ω)`;
    case ComponentType.SWITCH:
      return `Switch (${(c as Switch).switchState ?? 'open'})`;
    default:
      return c.type;
  }
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ controller }) => {
  const state = useControllerState(controller);

  const debugOverlaysOn = Boolean(state.ui.showDebugOverlays);

  const selectedConnectionId = state.connections.selectedConnectionId;
  const selectedConnectionAppearance: ConnectionAppearance | null =
    selectedConnectionId ? state.connections.appearanceById[selectedConnectionId] ?? null : null;

  const selected = state.breadboard.selectedComponentId
    ? state.breadboard.components.find((c) => c.id === state.breadboard.selectedComponentId) ?? null
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
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
        <Text sx={{ mt: 2, fontSize: 0, color: 'secondaryText' }}>
          Shortcut: Ctrl+Shift+D
        </Text>
      </Box>

      {showWireInspector ? (
        (() => {
          const id = selectedConnectionId!;
          const appearance: ConnectionAppearance =
            selectedConnectionAppearance ?? {
              style: 'curved',
              color: '#3b82f6',
              curved: { startOrientation: 'auto', endOrientation: 'auto' },
            };

          const setStyle = (style: ConnectionStyle) =>
            controller.dispatch({
              type: 'CONNECTION_APPEARANCE_UPDATED',
              connectionId: id,
              appearance: { style },
            });

          const setColor = (color: string) =>
            controller.dispatch({
              type: 'CONNECTION_APPEARANCE_UPDATED',
              connectionId: id,
              appearance: { color },
            });

          const setEndpoint = (endpoint: 'startOrientation' | 'endOrientation', value: ConnectionEndpointOrientation) =>
            controller.dispatch({
              type: 'CONNECTION_APPEARANCE_UPDATED',
              connectionId: id,
              appearance: { curved: { [endpoint]: value } as Partial<ConnectionAppearance['curved']> },
            });

          return (
            <>
              <Box sx={{ mb: 3 }}>
                <Text
                  as="h3"
                  sx={{
                    m: 0,
                    mb: 2,
                    fontSize: 0,
                    color: 'secondaryText',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Selected
                </Text>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Text sx={{ fontSize: 3, color: 'text', fontWeight: 600 }}>Wire</Text>
                  <Button
                    onClick={() =>
                      controller.dispatch({
                        type: 'CONNECTION_DELETED',
                        connectionId: id,
                      })
                    }
                    sx={{
                      px: 2,
                      py: 1,
                      bg: 'panelBg',
                      border: '1px solid',
                      borderColor: 'border',
                      borderRadius: 4,
                      color: 'text',
                      fontSize: 0,
                      cursor: 'pointer',
                      ':hover': { bg: 'hoverBg' },
                      ':active': { bg: 'rgba(239, 68, 68, 0.25)', borderColor: 'rgba(239, 68, 68, 0.7)' },
                    }}
                  >
                    Delete
                  </Button>
                </Box>
              </Box>

              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderTopColor: 'border' }}>
                <Text as="h3" sx={{ m: 0, mb: 3, fontSize: 1, color: 'text' }}>
                  Appearance
                </Text>

                <Box sx={{ mb: 3 }}>
                  <Text
                    as="div"
                    sx={{
                      fontSize: 0,
                      color: 'secondaryText',
                      mb: 2,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Style
                  </Text>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      onClick={() => setStyle('curved')}
                      sx={{
                        px: 2,
                        py: 1,
                        bg: appearance.style === 'curved' ? 'primary' : 'panelBg',
                        border: '1px solid',
                        borderColor: appearance.style === 'curved' ? 'primary' : 'border',
                        borderRadius: 4,
                        color: 'text',
                        fontSize: 0,
                        cursor: 'pointer',
                        ':hover': { bg: 'hoverBg' },
                      }}
                    >
                      Curved
                    </Button>
                    <Button
                      onClick={() => setStyle('straight')}
                      sx={{
                        px: 2,
                        py: 1,
                        bg: appearance.style === 'straight' ? 'primary' : 'panelBg',
                        border: '1px solid',
                        borderColor: appearance.style === 'straight' ? 'primary' : 'border',
                        borderRadius: 4,
                        color: 'text',
                        fontSize: 0,
                        cursor: 'pointer',
                        ':hover': { bg: 'hoverBg' },
                      }}
                    >
                      Straight
                    </Button>
                  </Box>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <label
                    htmlFor="prop-wire-color"
                    style={{
                      display: 'block',
                      fontSize: 12,
                      color: 'var(--theme-ui-colors-secondaryText, #888)',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Color
                  </label>
                  <Input
                    id="prop-wire-color"
                    type="color"
                    value={appearance.color}
                    onChange={(e) => setColor(String(e.target.value))}
                    sx={{
                      width: '100%',
                      p: 1,
                      bg: 'inputBg',
                      border: '2px solid',
                      borderColor: 'border',
                      borderRadius: 4,
                      color: 'text',
                      fontSize: 1,
                      height: 40,
                      ':focus': { outline: 'none', borderColor: 'primary' },
                    }}
                  />
                </Box>

                {appearance.style === 'curved' && (
                  <Box sx={{ mb: 3 }}>
                    <Text
                      as="div"
                      sx={{
                        fontSize: 0,
                        color: 'secondaryText',
                        mb: 2,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Curve endpoint orientation
                    </Text>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
                      <Box>
                        <Text sx={{ fontSize: 0, color: 'secondaryText', mb: 1 }}>Start</Text>
                        <Select
                          value={appearance.curved.startOrientation}
                          onChange={(e) =>
                            setEndpoint('startOrientation', e.target.value as ConnectionEndpointOrientation)
                          }
                          sx={{
                            width: '100%',
                            p: 2,
                            bg: 'inputBg',
                            border: '2px solid',
                            borderColor: 'border',
                            borderRadius: 4,
                            color: 'text',
                            fontSize: 1,
                            ':focus': { outline: 'none', borderColor: 'primary' },
                          }}
                        >
                          <option value="auto">Auto</option>
                          <option value="horizontal">Horizontal</option>
                          <option value="vertical">Vertical</option>
                        </Select>
                      </Box>

                      <Box>
                        <Text sx={{ fontSize: 0, color: 'secondaryText', mb: 1 }}>End</Text>
                        <Select
                          value={appearance.curved.endOrientation}
                          onChange={(e) =>
                            setEndpoint('endOrientation', e.target.value as ConnectionEndpointOrientation)
                          }
                          sx={{
                            width: '100%',
                            p: 2,
                            bg: 'inputBg',
                            border: '2px solid',
                            borderColor: 'border',
                            borderRadius: 4,
                            color: 'text',
                            fontSize: 1,
                            ':focus': { outline: 'none', borderColor: 'primary' },
                          }}
                        >
                          <option value="auto">Auto</option>
                          <option value="horizontal">Horizontal</option>
                          <option value="vertical">Vertical</option>
                        </Select>
                      </Box>
                    </Box>

                    <Box sx={{ mt: 2, p: 2, bg: 'panelBg', borderRadius: 4, fontSize: 0, color: 'secondaryText' }}>
                      Tip: Shift-click a wire to add a reroute point. Click normally to select.
                    </Box>
                  </Box>
                )}
              </Box>
            </>
          );
        })()
      ) : !selected ? (
        <Box sx={{ py: 3 }}>
          <Text sx={{ fontSize: 1, color: 'secondaryText' }}>
            Select a component or wire to edit its properties.
          </Text>
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 3 }}>
            <Text
              as="h3"
              sx={{
                m: 0,
                mb: 2,
                fontSize: 0,
                color: 'secondaryText',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Selected
            </Text>
            <Text sx={{ fontSize: 3, color: 'text', fontWeight: 600 }}>
              {formatComponentTitle(selected)}
            </Text>
            <Box sx={{ mt: 2, p: 2, bg: 'panelBg', borderRadius: 4, fontSize: 0 }}>
              id: {selected.id}
            </Box>
          </Box>

          <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderTopColor: 'border' }}>
            <Text as="h3" sx={{ m: 0, mb: 3, fontSize: 1, color: 'text' }}>
              Properties
            </Text>

            {selected.type === ComponentType.RESISTOR && (
              <Box sx={{ mb: 3 }}>
                <label
                  htmlFor="prop-resistance"
                  sx={{
                    display: 'block',
                    fontSize: 0,
                    color: 'secondaryText',
                    mb: 2,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Resistance (Ω)
                </label>
                <Input
                  id="prop-resistance"
                  type="number"
                  value={(selected as Resistor).resistance}
                  min={0}
                  step={10}
                  onChange={(e) =>
                    controller.dispatch({
                      type: 'COMPONENT_PROPERTY_CHANGED',
                      componentId: selected.id,
                      property: 'resistance',
                      value: Number(e.target.value),
                    })
                  }
                  sx={{
                    width: '100%',
                    p: 2,
                    bg: 'inputBg',
                    border: '2px solid',
                    borderColor: 'border',
                    borderRadius: 4,
                    color: 'text',
                    fontSize: 1,
                    ':focus': { outline: 'none', borderColor: 'primary' },
                  }}
                />
              </Box>
            )}

            {selected.type === ComponentType.LED && (
              <>
                <Box sx={{ mb: 3 }}>
                  <label
                    htmlFor="prop-led-vf"
                    sx={{
                      display: 'block',
                      fontSize: 0,
                      color: 'secondaryText',
                      mb: 2,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Forward Voltage (V)
                  </label>
                  <Input
                    id="prop-led-vf"
                    type="number"
                    value={(selected as LED).forwardVoltage}
                    min={0}
                    step={0.1}
                    onChange={(e) =>
                      controller.dispatch({
                        type: 'COMPONENT_PROPERTY_CHANGED',
                        componentId: selected.id,
                        property: 'forwardVoltage',
                        value: Number(e.target.value),
                      })
                    }
                    sx={{
                      width: '100%',
                      p: 2,
                      bg: 'inputBg',
                      border: '2px solid',
                      borderColor: 'border',
                      borderRadius: 4,
                      color: 'text',
                      fontSize: 1,
                      ':focus': { outline: 'none', borderColor: 'primary' },
                    }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <label
                    htmlFor="prop-led-imax"
                    sx={{
                      display: 'block',
                      fontSize: 0,
                      color: 'secondaryText',
                      mb: 2,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Max Current (A)
                  </label>
                  <Input
                    id="prop-led-imax"
                    type="number"
                    value={(selected as LED).maxCurrent}
                    min={0}
                    step={0.001}
                    onChange={(e) =>
                      controller.dispatch({
                        type: 'COMPONENT_PROPERTY_CHANGED',
                        componentId: selected.id,
                        property: 'maxCurrent',
                        value: Number(e.target.value),
                      })
                    }
                    sx={{
                      width: '100%',
                      p: 2,
                      bg: 'inputBg',
                      border: '2px solid',
                      borderColor: 'border',
                      borderRadius: 4,
                      color: 'text',
                      fontSize: 1,
                      ':focus': { outline: 'none', borderColor: 'primary' },
                    }}
                  />
                </Box>
              </>
            )}

            {selected.type === ComponentType.POWER_SUPPLY && (
              <Box sx={{ mb: 3 }}>
                <label
                  htmlFor="prop-voltage"
                  sx={{
                    display: 'block',
                    fontSize: 0,
                    color: 'secondaryText',
                    mb: 2,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Voltage (V)
                </label>
                <Input
                  id="prop-voltage"
                  type="number"
                  value={(selected as PowerSupply).voltage}
                  min={0}
                  step={0.1}
                  onChange={(e) =>
                    controller.dispatch({
                      type: 'COMPONENT_PROPERTY_CHANGED',
                      componentId: selected.id,
                      property: 'voltage',
                      value: Number(e.target.value),
                    })
                  }
                  sx={{
                    width: '100%',
                    p: 2,
                    bg: 'inputBg',
                    border: '2px solid',
                    borderColor: 'border',
                    borderRadius: 4,
                    color: 'text',
                    fontSize: 1,
                    ':focus': { outline: 'none', borderColor: 'primary' },
                  }}
                />
              </Box>
            )}

            {selected.type === ComponentType.SWITCH && (
              <Box sx={{ mb: 3 }}>
                <Text
                  as="div"
                  sx={{
                    fontSize: 0,
                    color: 'secondaryText',
                    mb: 2,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  State
                </Text>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    onClick={() =>
                      controller.dispatch({
                        type: 'COMPONENT_PROPERTY_CHANGED',
                        componentId: selected.id,
                        property: 'switchState',
                        value: 'open',
                      })
                    }
                    sx={{
                      px: 2,
                      py: 1,
                      bg: 'panelBg',
                      border: '1px solid',
                      borderColor: 'border',
                      borderRadius: 4,
                      color: 'text',
                      fontSize: 0,
                      cursor: 'pointer',
                      ':hover': { bg: 'hoverBg' },
                      ':active': { bg: 'primary', borderColor: 'primary' },
                    }}
                  >
                    Open
                  </Button>
                  <Button
                    onClick={() =>
                      controller.dispatch({
                        type: 'COMPONENT_PROPERTY_CHANGED',
                        componentId: selected.id,
                        property: 'switchState',
                        value: 'closed',
                      })
                    }
                    sx={{
                      px: 2,
                      py: 1,
                      bg: 'panelBg',
                      border: '1px solid',
                      borderColor: 'border',
                      borderRadius: 4,
                      color: 'text',
                      fontSize: 0,
                      cursor: 'pointer',
                      ':hover': { bg: 'hoverBg' },
                      ':active': { bg: 'primary', borderColor: 'primary' },
                    }}
                  >
                    Closed
                  </Button>
                </Box>
              </Box>
            )}
          </Box>

          <Box sx={{ height: 1, bg: 'border', opacity: 0.6, my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Text
              as="h3"
              sx={{
                m: 0,
                mb: 2,
                fontSize: 0,
                color: 'secondaryText',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Simulation
            </Text>
            <Box sx={{ p: 2, bg: 'panelBg', borderRadius: 4, fontSize: 0 }}>
              errors: {state.simulation.cachedSimulation?.errors?.length ?? 0}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};
