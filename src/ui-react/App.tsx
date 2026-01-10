import { useMemo } from 'react';
import { Box, Flex } from 'theme-ui';
import { BreadboardController, createInitialState } from '@/ui-controller';
import { BreadboardScene } from './BreadboardScene';
import { HeaderBar } from './ui/HeaderBar';
import { Toolbar } from './ui/Toolbar';
import { InfoPanel } from './ui/InfoPanel';

export default function App() {
  const controller = useMemo(() => {
    const initialState = createInitialState();
    return new BreadboardController(initialState);
  }, []);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <HeaderBar controller={controller} />
      <Flex sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Toolbar controller={controller} />
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
          }}
        >
          <BreadboardScene controller={controller} />
        </Box>
        <InfoPanel controller={controller} />
      </Flex>
    </Box>
  );
}

