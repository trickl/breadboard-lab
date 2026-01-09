import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui-react/App';

const USE_REACT_UI = new URLSearchParams(window.location.search).get('react') === 'true';

if (USE_REACT_UI) {
  const rootElement = document.getElementById('app');
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } else {
    console.error('App element not found');
  }
} else {
  import('./main-legacy').then(() => {
  }).catch((error) => {
    console.error('Failed to load legacy app:', error);
  });
}
