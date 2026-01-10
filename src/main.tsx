import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'theme-ui';
import { Global } from '@emotion/react';
import App from './ui-react/App';
import { theme } from './ui-react/theme';

const rootElement = document.getElementById('app');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider theme={theme}>
        <Global
          styles={{
            '*, *::before, *::after': { boxSizing: 'border-box' },
            html: { height: '100%' },
            body: {
              height: '100%',
              margin: 0,
              overflow: 'hidden',
            },
            '#app': { height: '100vh' },
          }}
        />
        <div sx={{ height: '100%' }}>
          <App />
        </div>
      </ThemeProvider>
    </StrictMode>
  );
} else {
  console.error('App element not found');
}
