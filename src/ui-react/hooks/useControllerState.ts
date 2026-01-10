import { useEffect, useState } from 'react';
import type { BreadboardController } from '@/ui-controller';
import type { AppState } from '@/ui-controller/types';

/**
 * React hook that keeps a component in sync with the imperative BreadboardController.
 */
export function useControllerState(controller: BreadboardController): AppState {
  const [state, setState] = useState<AppState>(controller.getState());

  useEffect(() => {
    const unsubscribe = controller.subscribe(setState);
    return unsubscribe;
  }, [controller]);

  return state;
}
