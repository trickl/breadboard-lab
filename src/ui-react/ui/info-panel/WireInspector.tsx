import React from 'react';
import type { BreadboardController } from '@/ui-controller';
import { Box, Button, Input, Select, Text } from 'theme-ui';

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

export const WireInspector: React.FC<WireInspectorProps> = ({ controller, connectionId, appearance }) => {
  const id = connectionId;
  const resolvedAppearance: ConnectionAppearance = appearance ?? {
    style: 'curved',
    color: '#3b82f6',
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
          <Input
            id="prop-wire-color"
            type="color"
            value={resolvedAppearance.color}
            onChange={(e) => setColor(String(e.target.value))}
            sx={{
              width: '100%',
              p: 1,
              bg: 'inputBg',
              border: '2px solid',
              borderColor: 'border',
              borderRadius: 4,
              color: 'text',
              fontSize: 1,
              height: 40,
              ':focus': { outline: 'none', borderColor: 'primary' },
            }}
          />
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
