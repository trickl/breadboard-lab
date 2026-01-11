import React from 'react';
import type { BreadboardController } from '@/ui-controller';
import { ComponentType, type AnyComponent, type LED, type PowerSupply, type Resistor } from '@/core/types';
import { Box, Button, Input, Text } from 'theme-ui';
import { formatComponentTitle } from '@/ui-react/ui/info-panel/formatComponentTitle';

export interface ComponentInspectorProps {
  controller: BreadboardController;
  selected: AnyComponent;
  simulationErrorCount: number;
}

export const ComponentInspector: React.FC<ComponentInspectorProps> = ({
  controller,
  selected,
  simulationErrorCount,
}) => {
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
          errors: {simulationErrorCount}
        </Box>
      </Box>
    </>
  );
};
