import React from 'react';
import type { BreadboardController } from '@/ui-controller';
import { Box, Button, Input, Text } from 'theme-ui';
import { useClockControlsModel } from '@/ui-react/ui/clock-controls/useClockControlsModel';

export interface ClockControlsProps {
  controller: BreadboardController;
}

export const ClockControls: React.FC<ClockControlsProps> = ({ controller }) => {
  const { micro, clockState, reset, setFrequency, step, toggleRun } = useClockControlsModel(controller);

  if (!micro) {
    // Not rendered (and therefore not visible) unless an EDU-8 is present.
    return null;
  }

  return (
    <Box
      id="clock-controls"
      sx={{
        mt: 3,
        p: 3,
        bg: 'panelBg',
        borderRadius: 'sm',
        border: '1px solid',
        borderColor: 'border',
      }}
    >
      <Text as="h3" sx={{ m: 0, mb: 2, fontSize: 2, color: 'text' }}>
        Clock Controls
      </Text>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Button
          id="step-btn"
          onClick={step}
          sx={{
            bg: 'panelBg',
            border: '2px solid',
            borderColor: 'border',
            borderRadius: 'sm',
            color: 'text',
            px: 3,
            py: 2,
            cursor: 'pointer',
            ':hover': { bg: 'hoverBg' },
          }}
        >
          Step
        </Button>

        <Button
          id="run-btn"
          onClick={toggleRun}
          sx={{
            bg: clockState.isRunning ? 'primary' : 'panelBg',
            border: '2px solid',
            borderColor: clockState.isRunning ? 'primary' : 'border',
            borderRadius: 'sm',
            color: clockState.isRunning ? 'white' : 'text',
            px: 3,
            py: 2,
            cursor: 'pointer',
            ':hover': { filter: 'brightness(1.05)' },
          }}
        >
          {clockState.isRunning ? 'Pause' : 'Run'}
        </Button>

        <Button
          id="reset-btn"
          onClick={reset}
          sx={{
            bg: 'panelBg',
            border: '2px solid',
            borderColor: 'border',
            borderRadius: 'sm',
            color: 'text',
            px: 3,
            py: 2,
            cursor: 'pointer',
            ':hover': { bg: 'hoverBg' },
          }}
        >
          Reset
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <label htmlFor="freq-slider" sx={{ fontSize: 0, color: 'secondaryText' }}>
            Frequency
          </label>
          <Text sx={{ fontSize: 0, color: 'text', fontWeight: 600 }}>
            {clockState.frequency.toFixed(1)} Hz
          </Text>
        </Box>
        <Input
          id="freq-slider"
          type="range"
          min={0.1}
          max={10}
          step={0.1}
          value={clockState.frequency}
          onChange={(e) => {
            setFrequency(Number(e.target.value));
          }}
          sx={{ width: '100%' }}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          aria-hidden="true"
          sx={{
            width: 10,
            height: 10,
            borderRadius: 'pill',
            bg: clockState.clockState ? '#34c759' : '#888',
            boxShadow: clockState.clockState ? '0 0 0 3px rgba(52,199,89,0.15)' : 'none',
          }}
        />
        <Text sx={{ fontSize: 1, color: 'secondaryText' }}>
          {clockState.isRunning ? 'running' : 'paused'} • instr: {clockState.instructionCount}
        </Text>
      </Box>
    </Box>
  );
};
