import type { AppState, Action } from './types';
import { BreadboardControllerReducer } from './reducers/breadboard-controller-reducer';

export class BreadboardController {
  private state: AppState;
  private readonly listeners: Set<(state: AppState) => void>;
  private readonly reducer: BreadboardControllerReducer;

  constructor(initialState: AppState) {
    this.state = initialState;
    this.listeners = new Set();
    this.reducer = new BreadboardControllerReducer();
  }

  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getState(): Readonly<AppState> {
    return this.state;
  }

  dispatch(action: Action): void {
    const nextState = this.reducer.reduceState(this.state, action);
    if (nextState !== this.state) {
      this.state = nextState;
      this.notifyListeners();
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }
}
