import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui-react/App';
import './style.css';

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
