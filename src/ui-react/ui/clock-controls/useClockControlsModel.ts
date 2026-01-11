import { useEffect, useMemo, useRef, useState } from 'react';
import type { BreadboardController } from '@/ui-controller';
import { useControllerState } from '@/ui-react/hooks/useControllerState';
import { ClockController } from '@/core/clock-controller';
import { ComponentType, type Microprocessor } from '@/core/types';
import { handleClockEdge, resetEDU8 } from '@/core/edu8-simulator';

export interface ClockControlsModel {
  micro: Microprocessor | undefined;
  clockState: ReturnType<ClockController['getState']>;
  step: () => void;
  toggleRun: () => void;
  reset: () => void;
  setFrequency: (frequency: number) => void;
}

export function useClockControlsModel(controller: BreadboardController): ClockControlsModel {
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

      // Future: Feed real digital input pin values; for now use 0.
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

  return {
    micro,
    clockState,
    step: () => clock.step(),
    toggleRun: () => {
      if (clock.getState().isRunning) {
        clock.pause();
      } else {
        clock.run();
      }
      setClockState(clock.getState());
    },
    reset: () => clock.reset(),
    setFrequency: (frequency) => {
      clock.setFrequency(frequency);
      setClockState(clock.getState());
    },
  };
}
