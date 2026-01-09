/**
 * ErrorOverlay - Renders error badges for simulation errors
 * 
 * Displays clickable error icons at component/hole positions when errors are detected.
 * Different error types have different colors and icons.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { BreadboardController } from '@/ui-controller';
import type { AppState } from '@/ui-controller/types';
import type { CircuitError } from '@/core/types';
import { ErrorType } from '@/core/types';
import { 
  getSimulationErrors,
  getComponents,
} from '@/ui-controller/selectors';
import { positionToPixels } from '../geometry/breadboard-layout';

export interface ErrorOverlayProps {
  controller: BreadboardController;
  onErrorClick?: (error: CircuitError) => void;
}

/**
 * Get visual properties for error type
 */
function getErrorVisuals(errorType: ErrorType): {
  color: string;
  icon: string;
} {
  switch (errorType) {
    case ErrorType.SHORT_CIRCUIT:
      return { color: '#ff3333', icon: '✕' }; // Red X
    case ErrorType.FLOATING_NODE:
      return { color: '#ff9933', icon: '?' }; // Orange ?
    case ErrorType.REVERSED_LED:
      return { color: '#ffcc00', icon: '!' }; // Yellow !
    case ErrorType.OPEN_CIRCUIT:
      return { color: '#ffcc00', icon: '⚠' }; // Yellow warning
    case ErrorType.OVERCURRENT:
      return { color: '#ff9933', icon: '!' }; // Orange !
    default:
      return { color: '#999999', icon: '?' }; // Gray ?
  }
}

/**
 * Calculate center position from error positions
 */
function getErrorPosition(error: CircuitError, components: ReturnType<typeof getComponents>) {
  if (error.positions.length === 0) {
    return null;
  }

  // If error has a component ID, use component centroid
  if (error.componentId) {
    const component = components.find(c => c.id === error.componentId);
    if (component && component.positions.length > 0) {
      // Calculate component centroid
      const sumRow = component.positions.reduce((sum, pos) => sum + pos.row, 0);
      const sumCol = component.positions.reduce((sum, pos) => sum + pos.col, 0);
      return {
        row: sumRow / component.positions.length,
        col: sumCol / component.positions.length,
      };
    }
  }

  // Otherwise use center of error positions
  const sumRow = error.positions.reduce((sum, pos) => sum + pos.row, 0);
  const sumCol = error.positions.reduce((sum, pos) => sum + pos.col, 0);
  return {
    row: sumRow / error.positions.length,
    col: sumCol / error.positions.length,
  };
}

export const ErrorOverlay: React.FC<ErrorOverlayProps> = ({ controller, onErrorClick }) => {
  const [state, setState] = useState<AppState>(controller.getState());
  const [hoveredError, setHoveredError] = useState<string | null>(null);

  useEffect(() => {
    return controller.subscribe(setState);
  }, [controller]);

  const errors = getSimulationErrors(state);
  const components = getComponents(state);

  // Calculate error badge positions
  const errorBadges = useMemo(() => {
    return errors
      .map((error, index) => {
        const position = getErrorPosition(error, components);
        if (!position) return null;

        const pixels = positionToPixels(position);
        const visuals = getErrorVisuals(error.type);
        
        return {
          id: `error-${index}`,
          error,
          pixels,
          visuals,
        };
      })
      .filter(Boolean) as Array<{
        id: string;
        error: CircuitError;
        pixels: { x: number; y: number };
        visuals: { color: string; icon: string };
      }>;
  }, [errors, components]);

  const handleErrorClick = useCallback((error: CircuitError) => {
    if (onErrorClick) {
      onErrorClick(error);
    } else {
      // Default behavior: log error details
      console.log('Error clicked:', error);
      alert(`${error.type}: ${error.message}\n\n${error.explanation}\n\nSuggestions:\n${error.suggestions.join('\n')}`);
    }
  }, [onErrorClick]);

  if (errorBadges.length === 0) {
    return null;
  }

  return (
    <g className="error-overlay">
      {errorBadges.map(({ id, error, pixels, visuals }) => {
        const isHovered = hoveredError === id;
        const radius = isHovered ? 10 : 8;

        return (
          <g
            key={id}
            style={{ cursor: 'pointer' }}
            onClick={() => handleErrorClick(error)}
            onMouseEnter={() => setHoveredError(id)}
            onMouseLeave={() => setHoveredError(null)}
          >
            {/* Background circle */}
            <circle
              cx={pixels.x}
              cy={pixels.y}
              r={radius}
              fill={visuals.color}
              stroke="#ffffff"
              strokeWidth={2}
              opacity={0.9}
              style={{
                filter: isHovered 
                  ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))' 
                  : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                transition: 'all 0.2s ease',
              }}
            />
            
            {/* Icon text */}
            <text
              x={pixels.x}
              y={pixels.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#ffffff"
              fontSize={12}
              fontWeight="bold"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {visuals.icon}
            </text>

            {/* Tooltip on hover */}
            {isHovered && (
              <title>{`${error.type}: ${error.message}`}</title>
            )}
          </g>
        );
      })}
    </g>
  );
};
