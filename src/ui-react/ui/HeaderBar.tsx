import React, { useEffect } from 'react';
import type { BreadboardController } from '@/ui-controller';
import { useControllerState } from '@/ui-react/hooks/useControllerState';

export interface HeaderBarProps {
  controller: BreadboardController;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ controller }) => {
  const state = useControllerState(controller);

  // Keep CSS theme selector in sync with controller state
  useEffect(() => {
    const root = document.documentElement;
    if (state.ui.currentTheme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
  }, [state.ui.currentTheme]);

  const isLight = state.ui.currentTheme === 'light';

  return (
    <header className="header">
      <div className="header-content">
        <h1>Breadboard Lab</h1>
        <p>
          Web-first breadboard UI with a first-class electrical model
          {state.circuit.hasUnsavedChanges ? ' • Unsaved changes' : ''}
        </p>
      </div>

      <button
        type="button"
        className={`theme-toggle ${isLight ? 'light' : ''}`}
        aria-label="Toggle theme"
        onClick={() => controller.dispatch({ type: 'THEME_TOGGLED' })}
      >
        <div className="theme-toggle-slider" aria-hidden="true">
          {isLight ? '☀' : '☾'}
        </div>
      </button>
    </header>
  );
};
