/**
 * Mixed-Signal Simulator
 *
 * Combines analog DC simulation with digital event-driven simulation.
 * Orchestrates the interaction between CircuitSimulator and DigitalSimulator.
 */

import type { Circuit, SimulationResult, AnyComponent } from './types';
import { ComponentType } from './types';
import { CircuitSimulator } from './circuit-simulator';
import {
  createDigitalSimulationState,
  stepDigitalSimulation,
  type DigitalSimulationState,
} from './digital-simulator';

/**
 * Mixed-signal simulation configuration
 */
export interface MixedSignalConfig {
  enableDigitalSimulation: boolean;
  clockNodeId?: string; // Node ID of the clock signal (required if digital simulation enabled)
  maxIterations?: number; // Maximum convergence iterations (default: 10)
}

/**
 * Mixed-signal simulation result
 */
export interface MixedSignalResult extends SimulationResult {
  digitalState?: DigitalSimulationState;
  iterations?: number; // Number of convergence iterations performed
}

/**
 * Mixed-Signal Simulator
 *
 * Orchestrates analog and digital simulation:
 * 1. Run DC analysis to get analog voltages
 * 2. Abstract clock signal to digital
 * 3. Execute digital components on clock edges
 * 4. Update circuit with digital outputs
 * 5. Repeat until convergence (or max iterations)
 */
export class MixedSignalSimulator {
  private dcSimulator: CircuitSimulator;
  private digitalState: DigitalSimulationState;

  constructor() {
    this.dcSimulator = new CircuitSimulator();
    this.digitalState = createDigitalSimulationState();
  }

  /**
   * Simulate circuit with optional digital simulation
   *
   * @param circuit Circuit to simulate
   * @param components Component array (will be updated for digital components)
   * @param config Simulation configuration
   * @returns Simulation result with updated components
   */
  simulate(
    circuit: Circuit,
    components: AnyComponent[],
    config: MixedSignalConfig = { enableDigitalSimulation: false }
  ): { result: MixedSignalResult; updatedComponents: AnyComponent[] } {
    // If digital simulation disabled, just run DC analysis
    if (!config.enableDigitalSimulation) {
      const result = this.dcSimulator.simulate(circuit);
      return {
        result: {
          ...result,
          digitalState: undefined,
          iterations: 0,
        },
        updatedComponents: components,
      };
    }

    // Validate configuration
    if (!config.clockNodeId) {
      const result = this.dcSimulator.simulate(circuit);
      return {
        result: {
          ...result,
          digitalState: undefined,
          iterations: 0,
          error: 'Clock node ID required for digital simulation',
        },
        updatedComponents: components,
      };
    }

    // Check if any digital components exist
    const hasDigitalComponents = components.some((c) => c.type === ComponentType.MICROPROCESSOR);

    if (!hasDigitalComponents) {
      const result = this.dcSimulator.simulate(circuit);
      return {
        result: {
          ...result,
          digitalState: this.digitalState,
          iterations: 0,
        },
        updatedComponents: components,
      };
    }

    // Run mixed-signal simulation
    let iterations = 0;
    let updatedComponents = components;

    // For now, we do a single iteration:
    // 1. Run DC analysis
    // 2. Execute digital simulation based on clock voltage
    // 3. Return results

    // Future enhancement: iterate until convergence if digital outputs
    // affect analog circuit (requires modeling digital outputs as voltage sources)

    // Step 1: Run DC analysis
    const dcResult = this.dcSimulator.simulate(circuit);

    if (!dcResult.success) {
      return {
        result: {
          ...dcResult,
          digitalState: this.digitalState,
          iterations: 0,
        },
        updatedComponents,
      };
    }

    // Update circuit nodes with simulated voltages
    for (const [nodeId, voltage] of dcResult.nodeVoltages) {
      const node = circuit.nodes.get(nodeId);
      if (node) {
        node.voltage = voltage;
      }
    }

    // Step 2: Execute digital simulation
    updatedComponents = stepDigitalSimulation(
      circuit,
      updatedComponents,
      this.digitalState,
      config.clockNodeId
    );

    iterations = 1;

    // Return combined result
    return {
      result: {
        ...dcResult,
        digitalState: this.digitalState,
        iterations,
      },
      updatedComponents,
    };
  }

  /**
   * Reset digital simulation state
   * Call this when circuit is reset or modified
   */
  resetDigitalState(): void {
    this.digitalState = createDigitalSimulationState();
  }

  /**
   * Get current digital simulation state
   */
  getDigitalState(): DigitalSimulationState {
    return this.digitalState;
  }
}
