import React from 'react';
import type { BreadboardController } from '@/ui-controller';
import { ComponentType, type AnyComponent, type LED, type PowerSupply, type Resistor } from '@/core/types';
import { Box, Button, Input, Select, Text } from 'theme-ui';
import { formatComponentTitle } from '@/ui-react/ui/info-panel/formatComponentTitle';

type ResistanceUnit = 'ohm' | 'kohm' | 'mohm';

function unitToMultiplier(unit: ResistanceUnit): number {
  switch (unit) {
    case 'ohm':
      return 1;
    case 'kohm':
      return 1_000;
    case 'mohm':
      return 1_000_000;
  }
}

function formatUnitLabel(unit: ResistanceUnit): string {
  switch (unit) {
    case 'ohm':
      return 'Ω';
    case 'kohm':
      return 'kΩ';
    case 'mohm':
      return 'MΩ';
  }
}

function pickUnitForOhms(ohms: number): ResistanceUnit {
  const abs = Math.abs(ohms);
  if (abs >= 1_000_000) return 'mohm';
  if (abs >= 1_000) return 'kohm';
  return 'ohm';
}

const ResistanceEditor: React.FC<{
  controller: BreadboardController;
  componentId: string;
  resistanceOhms: number;
}> = ({ controller, componentId, resistanceOhms }) => {
  const [unit, setUnit] = React.useState<ResistanceUnit>(() => pickUnitForOhms(resistanceOhms));
  const [valueText, setValueText] = React.useState<string>(() => {
    const u = pickUnitForOhms(resistanceOhms);
    return String(resistanceOhms / unitToMultiplier(u));
  });

  // If selection changes / resistance changes externally, resync editor.
  React.useEffect(() => {
    const nextUnit = pickUnitForOhms(resistanceOhms);
    setUnit(nextUnit);
    setValueText(String(resistanceOhms / unitToMultiplier(nextUnit)));
  }, [resistanceOhms]);

  const commitIfValid = (nextText: string, nextUnit: ResistanceUnit) => {
    const parsed = Number(nextText);
    if (!Number.isFinite(parsed)) return;
    const ohms = parsed * unitToMultiplier(nextUnit);
    if (!Number.isFinite(ohms) || ohms < 0) return;

    controller.dispatch({
      type: 'COMPONENT_PROPERTY_CHANGED',
      componentId,
      property: 'resistance',
      value: ohms,
    });
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <Input
        id="prop-resistance-value"
        type="number"
        value={valueText}
        min={0}
        step={1}
        onChange={(e) => {
          const next = e.target.value;
          setValueText(next);
          commitIfValid(next, unit);
        }}
        sx={{
          flex: '1 1 auto',
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
      <Select
        id="prop-resistance-unit"
        value={unit}
        onChange={(e) => {
          const nextUnit = e.target.value as ResistanceUnit;
          setUnit(nextUnit);

          // UX: switching units should NOT mutate the numeric text the user typed.
          // Instead, interpret the same number under the new unit (i.e. user is changing scale).
          // Example: "30" Ω -> switch to kΩ => becomes 30 kΩ (30,000 Ω) but the input still shows "30".
          commitIfValid(valueText, nextUnit);
        }}
        sx={{
          width: 96,
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
        <option value="ohm">{formatUnitLabel('ohm')}</option>
        <option value="kohm">{formatUnitLabel('kohm')}</option>
        <option value="mohm">{formatUnitLabel('mohm')}</option>
      </Select>
    </Box>
  );
};

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
          <>
            <Box sx={{ mb: 3 }}>
              <label
                htmlFor="prop-resistance-value"
                sx={{
                  display: 'block',
                  fontSize: 0,
                  color: 'secondaryText',
                  mb: 2,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Resistance
              </label>
              <ResistanceEditor
                controller={controller}
                componentId={selected.id}
                resistanceOhms={(selected as Resistor).resistance}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <label
                htmlFor="prop-resistance-tolerance"
                sx={{
                  display: 'block',
                  fontSize: 0,
                  color: 'secondaryText',
                  mb: 2,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Tolerance
              </label>
              <Select
                id="prop-resistance-tolerance"
                value={String((selected as Resistor).tolerance ?? 5)}
                onChange={(e) =>
                  controller.dispatch({
                    type: 'COMPONENT_PROPERTY_CHANGED',
                    componentId: selected.id,
                    property: 'tolerance',
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
              >
                <option value="20">±20%</option>
                <option value="10">±10%</option>
                <option value="5">±5%</option>
                <option value="2">±2%</option>
                <option value="1">±1%</option>
                <option value="0.5">±0.5%</option>
                <option value="0.25">±0.25%</option>
                <option value="0.1">±0.1%</option>
              </Select>
            </Box>
          </>
        )}

        {selected.type === ComponentType.LED && (
          <>
            <Box sx={{ mb: 3 }}>
              <label
                htmlFor="prop-led-color"
                sx={{
                  display: 'block',
                  fontSize: 0,
                  color: 'secondaryText',
                  mb: 2,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Color
              </label>
              <Select
                id="prop-led-color"
                value={(selected as LED).color ?? 'red'}
                onChange={(e) =>
                  controller.dispatch({
                    type: 'COMPONENT_PROPERTY_CHANGED',
                    componentId: selected.id,
                    property: 'color',
                    value: e.target.value,
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
              >
                <option value="red">Red</option>
                <option value="yellow">Yellow</option>
                <option value="green">Green</option>
                <option value="blue">Blue</option>
                <option value="white">White</option>
              </Select>
            </Box>

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
                  bg: selected.switchState === 'open' ? 'primary' : 'panelBg',
                  border: '1px solid',
                  borderColor: selected.switchState === 'open' ? 'primary' : 'border',
                  borderRadius: 4,
                  color: selected.switchState === 'open' ? 'background' : 'text',
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
                  bg: selected.switchState === 'closed' ? 'primary' : 'panelBg',
                  border: '1px solid',
                  borderColor: selected.switchState === 'closed' ? 'primary' : 'border',
                  borderRadius: 4,
                  color: selected.switchState === 'closed' ? 'background' : 'text',
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
