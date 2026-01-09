import type { BreadboardController } from './breadboard-controller';
import { CircuitExtractor } from '@/core/circuit-extractor';
import { CircuitSimulator } from '@/core/circuit-simulator';
import type { ReteManager } from '@/core/rete-manager';

export class SimulationRunner {
  private controller: BreadboardController;
  private extractor: CircuitExtractor;
  private simulator: CircuitSimulator;
  private debounceTimer: number | null = null;
  private reteManager: ReteManager | null = null;

  constructor(controller: BreadboardController, reteManager?: ReteManager | null) {
    this.controller = controller;
    this.extractor = new CircuitExtractor();
    this.simulator = new CircuitSimulator();
    this.reteManager = reteManager ?? null;
  }

  runSimulation(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.executeSimulation();
      this.debounceTimer = null;
    }, 100);
  }

  private executeSimulation(): void {
    const state = this.controller.getState();

    const breadboardState = {
      components: state.breadboard.components,
      selectedComponentId: state.breadboard.selectedComponentId,
      selectedPinIndex: state.breadboard.selectedPinIndex,
    };

    let circuit;
    if (this.reteManager) {
      circuit = this.extractor.extractFromReteGraph(this.reteManager, breadboardState);
    } else {
      circuit = this.extractor.extract(breadboardState);
    }

    const result = this.simulator.simulate(circuit);

    this.controller.dispatch({
      type: 'SIMULATION_COMPLETED',
      circuit,
      result,
    });
  }

  setReteManager(reteManager: ReteManager | null): void {
    this.reteManager = reteManager;
  }

  clear(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
