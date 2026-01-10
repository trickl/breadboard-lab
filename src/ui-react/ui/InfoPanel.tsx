import React from 'react';
import type { BreadboardController } from '@/ui-controller';
import { useControllerState } from '@/ui-react/hooks/useControllerState';
import { ComponentType, type AnyComponent, type Resistor, type LED, type PowerSupply, type Wire, type Switch } from '@/core/types';

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

  const selected = state.breadboard.selectedComponentId
    ? state.breadboard.components.find((c) => c.id === state.breadboard.selectedComponentId) ?? null
    : null;

  return (
    <aside className="info-panel">
      <h2>Inspector</h2>

      {!selected ? (
        <div className="empty-state">
          <div className="empty-state-text">Select a component to edit its properties.</div>
        </div>
      ) : (
        <>
          <div className="info-section">
            <h3>Selected</h3>
            <div className="info-value">{formatComponentTitle(selected)}</div>
            <div className="component-item">id: {selected.id}</div>
          </div>

          <div className="property-editor">
            <h3>Properties</h3>

            {selected.type === ComponentType.RESISTOR && (
              <div className="property-field">
                <label htmlFor="prop-resistance">Resistance (Ω)</label>
                <input
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
                />
              </div>
            )}

            {selected.type === ComponentType.LED && (
              <>
                <div className="property-field">
                  <label htmlFor="prop-led-vf">Forward Voltage (V)</label>
                  <input
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
                  />
                </div>

                <div className="property-field">
                  <label htmlFor="prop-led-imax">Max Current (A)</label>
                  <input
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
                  />
                </div>
              </>
            )}

            {selected.type === ComponentType.POWER_SUPPLY && (
              <div className="property-field">
                <label htmlFor="prop-voltage">Voltage (V)</label>
                <input
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
                />
              </div>
            )}

            {selected.type === ComponentType.SWITCH && (
              <div className="property-field">
                <label>State</label>
                <div className="property-presets">
                  <button
                    className="preset-button"
                    onClick={() =>
                      controller.dispatch({
                        type: 'COMPONENT_PROPERTY_CHANGED',
                        componentId: selected.id,
                        property: 'switchState',
                        value: 'open',
                      })
                    }
                  >
                    Open
                  </button>
                  <button
                    className="preset-button"
                    onClick={() =>
                      controller.dispatch({
                        type: 'COMPONENT_PROPERTY_CHANGED',
                        componentId: selected.id,
                        property: 'switchState',
                        value: 'closed',
                      })
                    }
                  >
                    Closed
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="divider" />

          <div className="info-section">
            <h3>Simulation</h3>
            <div className="component-item">
              errors: {state.simulation.cachedSimulation?.errors?.length ?? 0}
            </div>
          </div>
        </>
      )}
    </aside>
  );
};
