import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BreadboardController } from '@/ui-controller';
import { useControllerState } from '@/ui-react/hooks/useControllerState';
import { ClockController } from '@/core/clock-controller';
import { ComponentType, type Microprocessor } from '@/core/types';
import { handleClockEdge, resetEDU8 } from '@/core/edu8-simulator';

export interface ClockControlsProps {
  controller: BreadboardController;
}

export const ClockControls: React.FC<ClockControlsProps> = ({ controller }) => {
  const state = useControllerState(controller);
  const clock = useMemo(() => new ClockController(), []);

  const microRef = useRef<Microprocessor | null>(null);

  // Find the first microprocessor (EDU-8) component, if any.
  const micro = state.breadboard.components.find(
    (c): c is Microprocessor => c.type === ComponentType.MICROPROCESSOR
  );

  useEffect(() => {
    microRef.current = micro ?? null;
  }, [micro]);

  const [clockState, setClockState] = useState(clock.getState());

  // Wire clock callbacks to update the microprocessor component.
  useEffect(() => {
    clock.setOnClockChange((level) => {
      setClockState(clock.getState());

      const current = microRef.current;
      if (!current) return;

      // TODO: Feed real digital input pin values; for now use 0.
      const nextState = handleClockEdge(current.state, level, 0);
      controller.dispatch({
        type: 'COMPONENT_PROPERTY_CHANGED',
        componentId: current.id,
        property: 'state',
        value: nextState,
      });
    });

    clock.setOnReset(() => {
      setClockState(clock.getState());

      const current = microRef.current;
      if (!current) return;

      controller.dispatch({
        type: 'COMPONENT_PROPERTY_CHANGED',
        componentId: current.id,
        property: 'state',
        value: resetEDU8(current.state),
      });
    });

    return () => {
      // Ensure we don't leave a running interval behind if this component unmounts.
      clock.pause();
    };
  }, [clock, controller]);

  // Keep UI state fresh while running.
  useEffect(() => {
    if (!clockState.isRunning) return;
    const id = window.setInterval(() => setClockState(clock.getState()), 100);
    return () => window.clearInterval(id);
  }, [clockState.isRunning, clock]);

  if (!micro) {
    // Not rendered (and therefore not visible) unless an EDU-8 is present.
    return null;
  }

  return (
    <div id="clock-controls" className="clock-controls">
      <h3>Clock Controls</h3>

      <div className="clock-buttons">
        <button id="step-btn" className="clock-btn step" onClick={() => clock.step()}>
          Step
        </button>

        <button
          id="run-btn"
          className={`clock-btn ${clockState.isRunning ? 'run-active' : ''}`}
          onClick={() => {
            if (clock.getState().isRunning) {
              clock.pause();
            } else {
              clock.run();
            }
            setClockState(clock.getState());
          }}
        >
          {clockState.isRunning ? 'Pause' : 'Run'}
        </button>

        <button id="reset-btn" className="clock-btn" onClick={() => clock.reset()}>
          Reset
        </button>
      </div>

      <div className="clock-frequency">
        <label htmlFor="freq-slider">
          <span>Frequency</span>
          <span className="freq-value">{clockState.frequency.toFixed(1)} Hz</span>
        </label>
        <input
          id="freq-slider"
          type="range"
          min={0.1}
          max={10}
          step={0.1}
          value={clockState.frequency}
          onChange={(e) => {
            clock.setFrequency(Number(e.target.value));
            setClockState(clock.getState());
          }}
        />
      </div>

      <div className="clock-state">
        <span className={`clock-indicator ${clockState.clockState ? 'high' : ''}`} />
        <span className={`clock-status ${clockState.isRunning ? 'running' : 'halted'}`}>
          {clockState.isRunning ? 'running' : 'paused'} • instr: {clockState.instructionCount}
        </span>
      </div>
    </div>
  );
};
