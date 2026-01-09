import { useMemo } from 'react';
import { BreadboardController, createInitialState } from '@/ui-controller';
import { BreadboardScene } from './BreadboardScene';

export default function App() {
  const controller = useMemo(() => new BreadboardController(createInitialState()), []);

  return <BreadboardScene controller={controller} />;
}
