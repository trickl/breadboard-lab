import { useMemo } from 'react';
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
    <>
      <HeaderBar controller={controller} />
      <div className="main-container">
        <Toolbar controller={controller} />
        <div className="workspace">
          <BreadboardScene controller={controller} />
        </div>
        <InfoPanel controller={controller} />
      </div>
    </>
  );
}

