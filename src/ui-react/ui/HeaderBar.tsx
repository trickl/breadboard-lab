import React, { useEffect } from 'react';
import type { BreadboardController } from '@/ui-controller';
import { useControllerState } from '@/ui-react/hooks/useControllerState';
import { Box, Button, Flex, Text, useColorMode } from 'theme-ui';

export interface HeaderBarProps {
  controller: BreadboardController;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ controller }) => {
  const state = useControllerState(controller);

  const [colorMode, setColorMode] = useColorMode<'dark' | 'light'>();

  // Keep Theme UI color mode in sync with controller state.
  useEffect(() => {
    if (state.ui.currentTheme !== colorMode) {
      setColorMode(state.ui.currentTheme);
    }
  }, [state.ui.currentTheme, colorMode, setColorMode]);

  const isLight = state.ui.currentTheme === 'light';

  return (
    <Flex
      as="header"
      sx={{
        bg: 'headerBg',
        px: 4,
        py: 3,
        boxShadow: 'sm',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 3,
        flexShrink: 0,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Text as="h1" sx={{ m: 0, fontSize: 4, fontWeight: 600, lineHeight: 'heading' }}>
          Breadboard Lab
        </Text>
        <Text as="p" sx={{ m: 0, mt: 1, fontSize: 1, color: 'secondaryText' }}>
          Web-first breadboard UI with a first-class electrical model
          {state.circuit.hasUnsavedChanges ? ' • Unsaved changes' : ''}
        </Text>
      </Box>

      <Button
        type="button"
        aria-label="Toggle theme"
        onClick={() => {
          const next = isLight ? 'dark' : 'light';
          setColorMode(next);
          controller.dispatch({ type: 'THEME_TOGGLED' });
        }}
        sx={{
          p: 0,
          width: 60,
          height: 32,
          bg: 'panelBg',
          border: '2px solid',
          borderColor: 'border',
          borderRadius: 'pill',
          cursor: 'pointer',
          position: 'relative',
          transition: 'transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
          ':hover': { borderColor: 'primary', transform: 'scale(1.05)' },
          ':focus-visible': { outline: '2px solid', outlineColor: 'primary', outlineOffset: 2 },
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: 24,
            height: 24,
            borderRadius: 'pill',
            bg: 'primary',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 1,
            boxShadow: 'sm',
            transform: isLight ? 'translate(32px, -50%)' : 'translate(0px, -50%)',
            transition: 'transform 0.3s ease',
            willChange: 'transform',
          }}
        >
          {isLight ? '☀' : '☾'}
        </Box>
      </Button>
    </Flex>
  );
};
