/**
 * Breadboard scene
 *
 * Rete-only rendering/viewport.
 * The breadboard skin and nets are rendered as Rete nodes so pan/zoom/rotate apply uniformly.
 */

import React, { useState, useEffect } from 'react';
import { Box, Button } from 'theme-ui';
import type { BreadboardController } from '@/ui-controller';
import type { AppState } from '@/ui-controller/types';
import { ReteGraphLayer } from './rete/ReteGraphLayer';

export interface BreadboardSceneProps {
  controller: BreadboardController;
}

/** BreadboardScene - host container + controller keybindings */
export const BreadboardScene: React.FC<BreadboardSceneProps> = ({ controller }) => {
  const [state, setState] = useState<AppState>(controller.getState());

  // Subscribe to controller state
  useEffect(() => {
    const unsubscribe = controller.subscribe(setState);
    return unsubscribe;
  }, [controller]);

  // Note: Pan/zoom is handled by Rete (AreaPlugin). There is no separate SVG viewBox.

  // Keyboard event handlers for component operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const selectedId = state.breadboard.selectedComponentId;

      // Never trigger global shortcuts while the user is typing in an input.
      // (E.g. Backspace is used to edit the resistance field and must not delete the component.)
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingTarget =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        Boolean(target?.isContentEditable);
      if (isTypingTarget) return;

      // Rotate selected component (R key)
      if ((e.key === 'r' || e.key === 'R') && selectedId) {
        e.preventDefault();
        const component = state.breadboard.components.find((c) => c.id === selectedId);
        if (!component) return;

        const newRotation = ((component.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        controller.dispatch({
          type: 'COMPONENT_ROTATED',
          componentId: selectedId,
          rotation: newRotation,
          positions: component.positions,
        });
      }

      // Delete selected component (Delete key only; Backspace is reserved for text editing)
      if (e.key === 'Delete' && selectedId && !e.repeat) {
        e.preventDefault();
        controller.dispatch({
          type: 'COMPONENT_DELETED',
          componentId: selectedId,
        });
      }

      // Cancel connection drag on Escape
      if (e.key === 'Escape' && state.connectionDrag.dragState) {
        e.preventDefault();
        controller.dispatch({
          type: 'CONNECTION_DRAG_CANCELLED',
        });
      }

      // Cancel component drag on Escape
      if (e.key === 'Escape' && state.componentDrag.dragState) {
        e.preventDefault();
        controller.dispatch({
          type: 'DRAG_CANCELLED',
        });
      }

      // Toggle voltage overlay (V key)
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        controller.dispatch({
          type: 'VOLTAGE_OVERLAY_TOGGLED',
        });
      }

      // Toggle current animation (C key)
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        controller.dispatch({
          type: 'CURRENT_ANIMATION_TOGGLED',
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    state.breadboard.selectedComponentId,
    state.breadboard.components,
    state.componentDrag.dragState,
    state.connectionDrag.dragState,
    controller,
  ]);

  const rotation = state.ui.breadboardOrientation;

  return (
    <Box
      className="breadboard-container"
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        bg: 'workspaceBg',
        borderRadius: 'md',
        p: 3,
        boxShadow: 'md',
      }}
    >
      <Button
        onClick={() => controller.dispatch({ type: 'BREADBOARD_ROTATED' })}
        title="Rotate view (90°)"
        aria-label="Rotate view (90 degrees)"
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 36,
          height: 36,
          p: 0,
          borderRadius: 8,
          bg: 'panelBg',
          color: 'text',
          border: '2px solid',
          borderColor: 'border',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          ':hover': { bg: 'hoverBg', transform: 'translateY(-1px)' },
        }}
      >
        {/* Simple rotate icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-3.3-6.9" />
          <path d="M21 3v7h-7" />
        </svg>
      </Button>
      <ReteGraphLayer controller={controller} rotation={rotation} />
    </Box>
  );
};
