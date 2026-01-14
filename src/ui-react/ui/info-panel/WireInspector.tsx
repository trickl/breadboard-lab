import React from 'react';
import type { BreadboardController } from '@/ui-controller';
import { Box, Button, Select, Text } from 'theme-ui';

import type {
  ConnectionAppearance,
  ConnectionEndpointOrientation,
  ConnectionStyle,
} from '@/ui-controller/types';

export interface WireInspectorProps {
  controller: BreadboardController;
  connectionId: string;
  appearance: ConnectionAppearance | null;
}

const WIRE_COLOR_PRESETS: Array<{ label: string; color: string }> = [
  // Slightly muted palette (less saturated than the default Tailwind-like hues)
  // to avoid “neon” wires while keeping clear, conventional breadboard colors.
  { label: 'Red', color: '#d25555' },
  { label: 'Black', color: '#111827' },
  { label: 'Yellow', color: '#d1ab14' },
  { label: 'Green', color: '#2f8f5a' },
  { label: 'Blue', color: '#3f6fb5' },
  { label: 'Orange', color: '#d57a2a' },
  { label: 'White', color: '#f9fafb' },
  { label: 'Purple', color: '#7a5bd6' },
];

export const WireInspector: React.FC<WireInspectorProps> = ({ controller, connectionId, appearance }) => {
  const id = connectionId;
  const resolvedAppearance: ConnectionAppearance = appearance ?? {
    style: 'curved',
    color: '#3f6fb5',
    curved: { startOrientation: 'auto', endOrientation: 'auto' },
  };

  const setStyle = (style: ConnectionStyle) =>
    controller.dispatch({
      type: 'CONNECTION_APPEARANCE_UPDATED',
      connectionId: id,
      appearance: { style },
    });

  const setColor = (color: string) =>
    controller.dispatch({
      type: 'CONNECTION_APPEARANCE_UPDATED',
      connectionId: id,
      appearance: { color },
    });

  const setEndpoint = (
    endpoint: 'startOrientation' | 'endOrientation',
    value: ConnectionEndpointOrientation
  ) =>
    controller.dispatch({
      type: 'CONNECTION_APPEARANCE_UPDATED',
      connectionId: id,
      appearance: {
        curved: { [endpoint]: value } as Partial<ConnectionAppearance['curved']>,
      },
    });

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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Text sx={{ fontSize: 3, color: 'text', fontWeight: 600 }}>Wire</Text>
          <Button
            onClick={() =>
              controller.dispatch({
                type: 'CONNECTION_DELETED',
                connectionId: id,
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
              ':active': {
                bg: 'rgba(239, 68, 68, 0.25)',
                borderColor: 'rgba(239, 68, 68, 0.7)',
              },
            }}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderTopColor: 'border' }}>
        <Text as="h3" sx={{ m: 0, mb: 3, fontSize: 1, color: 'text' }}>
          Appearance
        </Text>

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
            Style
          </Text>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              onClick={() => setStyle('curved')}
              sx={{
                px: 2,
                py: 1,
                bg: resolvedAppearance.style === 'curved' ? 'primary' : 'panelBg',
                border: '1px solid',
                borderColor: resolvedAppearance.style === 'curved' ? 'primary' : 'border',
                borderRadius: 4,
                color: 'text',
                fontSize: 0,
                cursor: 'pointer',
                ':hover': { bg: 'hoverBg' },
              }}
            >
              Curved
            </Button>
            <Button
              onClick={() => setStyle('straight')}
              sx={{
                px: 2,
                py: 1,
                bg: resolvedAppearance.style === 'straight' ? 'primary' : 'panelBg',
                border: '1px solid',
                borderColor: resolvedAppearance.style === 'straight' ? 'primary' : 'border',
                borderRadius: 4,
                color: 'text',
                fontSize: 0,
                cursor: 'pointer',
                ':hover': { bg: 'hoverBg' },
              }}
            >
              Straight
            </Button>
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <label
            htmlFor="prop-wire-color"
            style={{
              display: 'block',
              fontSize: 12,
              color: 'var(--theme-ui-colors-secondaryText, #888)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Color
          </label>

          {/* Preset swatches: faster than a free-form color picker and encourages consistent wiring colors. */}
          <Box
            id="prop-wire-color"
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: 2,
              alignItems: 'center',
            }}
          >
            {WIRE_COLOR_PRESETS.map((p) => {
              const isSelected =
                String(resolvedAppearance.color).toLowerCase() === String(p.color).toLowerCase();

              return (
                <Button
                  key={p.color}
                  type="button"
                  onClick={() => setColor(p.color)}
                  title={p.label}
                  aria-label={`Wire color: ${p.label}`}
                  sx={{
                    p: 0,
                    width: 28,
                    height: 28,
                    minWidth: 28,
                    borderRadius: 8,
                    bg: p.color,
                    border: '2px solid',
                    borderColor: isSelected ? 'primary' : 'border',
                    boxShadow: isSelected
                      ? '0 0 0 2px rgba(59, 130, 246, 0.35)'
                      : '0 1px 0 rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                    ':hover': {
                      transform: 'translateY(-1px)',
                    },
                    ':active': {
                      transform: 'translateY(0px)',
                    },
                    ':focus': {
                      outline: 'none',
                      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.45)',
                    },
                  }}
                />
              );
            })}
          </Box>

          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              aria-hidden="true"
              sx={{
                width: 16,
                height: 16,
                borderRadius: 6,
                bg: resolvedAppearance.color,
                border: '1px solid',
                borderColor: 'border',
              }}
            />
            <Text sx={{ fontSize: 0, color: 'secondaryText' }}>{resolvedAppearance.color}</Text>
          </Box>
        </Box>

        {resolvedAppearance.style === 'curved' && (
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
              Curve endpoint orientation
            </Text>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
              <Box>
                <Text sx={{ fontSize: 0, color: 'secondaryText', mb: 1 }}>Start</Text>
                <Select
                  value={resolvedAppearance.curved.startOrientation}
                  onChange={(e) =>
                    setEndpoint('startOrientation', e.target.value as ConnectionEndpointOrientation)
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
                  <option value="auto">Auto</option>
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </Select>
              </Box>

              <Box>
                <Text sx={{ fontSize: 0, color: 'secondaryText', mb: 1 }}>End</Text>
                <Select
                  value={resolvedAppearance.curved.endOrientation}
                  onChange={(e) =>
                    setEndpoint('endOrientation', e.target.value as ConnectionEndpointOrientation)
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
                  <option value="auto">Auto</option>
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </Select>
              </Box>
            </Box>

            <Box
              sx={{
                mt: 2,
                p: 2,
                bg: 'panelBg',
                borderRadius: 4,
                fontSize: 0,
                color: 'secondaryText',
              }}
            >
              Tip: Shift-click a wire to add a reroute point. Click normally to select.
            </Box>
          </Box>
        )}
      </Box>
    </>
  );
};
