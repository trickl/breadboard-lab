/**
 * ComponentRenderer - Renders a single component as SVG
 * Handles different component types with appropriate visual representations
 */

import React from 'react';
import type { AnyComponent } from '@/core/types';
import { ComponentHitArea } from '@/ui-react/components/component-renderer/ComponentHitArea';
import { ComponentBody } from '@/ui-react/components/component-renderer/ComponentBody';
import { HoverOrSelectionOutline } from '@/ui-react/components/component-renderer/HoverOrSelectionOutline';
import { RotationHandle } from '@/ui-react/components/component-renderer/RotationHandle';

export interface ComponentRendererProps {
  component: AnyComponent;
  isSelected: boolean;
  isHovered?: boolean;
  onPointerDown?: (e: React.PointerEvent, componentId: string) => void;
  onPointerEnter?: (componentId: string) => void;
  onPointerLeave?: (componentId: string) => void;
}

/**
 * ComponentRenderer - Pure component for rendering individual components
 */
export const ComponentRenderer: React.FC<ComponentRendererProps> = React.memo(
  ({ component, isSelected, isHovered, onPointerDown, onPointerEnter, onPointerLeave }) => {
    const handlePointerDown = (e: React.PointerEvent) => {
      // Prevent the SVG container from receiving a synthetic mousedown/click (pan/deselect)
      e.preventDefault();
      onPointerDown?.(e, component.id);
    };

    return (
      <g
        data-component-id={component.id}
        onPointerDown={handlePointerDown}
        onPointerEnter={() => onPointerEnter?.(component.id)}
        onPointerLeave={() => onPointerLeave?.(component.id)}
        style={{
          cursor: 'pointer',
          pointerEvents: 'auto',
          transition: 'opacity 0.2s',
          filter: isSelected
            ? 'drop-shadow(0 0 8px rgba(68, 136, 255, 0.8)) drop-shadow(0 0 4px rgba(68, 136, 255, 1))'
            : undefined,
        }}
      >
        <ComponentHitArea component={component} />
        <ComponentBody component={component} />
        <HoverOrSelectionOutline
          component={component}
          isHovered={!!isHovered}
          isSelected={isSelected}
        />
        {isSelected && <RotationHandle component={component} />}
      </g>
    );
  }
);

ComponentRenderer.displayName = 'ComponentRenderer';


