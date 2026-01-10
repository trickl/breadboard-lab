import React from 'react';
import { EXAMPLE_CIRCUITS, type ExampleCircuit } from '@/examples';
import { Box, Button, Text } from 'theme-ui';

export interface ExamplesModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExample: (example: ExampleCircuit) => void;
}

export const ExamplesModal: React.FC<ExamplesModalProps> = ({
  visible,
  onClose,
  onSelectExample,
}) => {
  if (!visible) return null;

  return (
    <Box
      id="examples-modal"
      className="visible"
      role="dialog"
      aria-modal="true"
      sx={{
        position: 'fixed',
        inset: 0,
        bg: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        p: 3,
      }}
    >
      <Box
        sx={{
          width: 'min(900px, 96vw)',
          maxHeight: 'min(80vh, 900px)',
          bg: 'modalBg',
          borderRadius: 'md',
          border: '1px solid',
          borderColor: 'border',
          boxShadow: 'md',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 2,
            borderBottom: '1px solid',
            borderBottomColor: 'border',
          }}
        >
          <Text as="h2" sx={{ m: 0, fontSize: 3, color: 'text' }}>
            Examples
          </Text>
          <Button
            onClick={onClose}
            aria-label="Close examples"
            sx={{
              bg: 'transparent',
              border: 'none',
              color: 'text',
              fontSize: 4,
              lineHeight: 1,
              cursor: 'pointer',
              px: 2,
              py: 1,
              ':hover': { color: 'primary' },
            }}
          >
            ×
          </Button>
        </Box>

        <Box sx={{ p: 3, overflowY: 'auto' }}>
          <Box role="list" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {EXAMPLE_CIRCUITS.map((example) => (
              <Box
                key={example.id}
                data-example-id={example.id}
                className="list-item"
                role="listitem"
                tabIndex={0}
                onClick={() => onSelectExample(example)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectExample(example);
                  }
                }}
                sx={{
                  p: 3,
                  bg: 'panelBg',
                  border: '1px solid',
                  borderColor: 'border',
                  borderRadius: 'sm',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease',
                  ':hover': { borderColor: 'primary', transform: 'translateY(-1px)' },
                  ':focus-visible': { boxShadow: '0 0 0 2px rgba(68,136,255,0.6)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Text sx={{ fontSize: 2, fontWeight: 600, color: 'text' }}>{example.name}</Text>
                  <Box
                    sx={{
                      fontSize: 0,
                      px: 2,
                      py: 1,
                      borderRadius: 'pill',
                      bg: 'hoverBg',
                      color: 'text',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {example.category}
                  </Box>
                </Box>
                <Text sx={{ mt: 2, fontSize: 1, color: 'secondaryText' }}>{example.description}</Text>
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid',
            borderTopColor: 'border',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            onClick={onClose}
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
            Close
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
