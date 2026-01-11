/**
 * Digital Simulator
 *
 * Orchestrates event-driven digital simulation for clocked components.
 * Bridges between analog DC solver and digital component logic.
 */

import type { Circuit, Microprocessor, AnyComponent } from './types';
import { ComponentType } from './types';
import type { DigitalValue } from './digital-signals';
import {
  analogToDigital,
  digitalToAnalog,
  nibbleToDigital,
  digitalToNibble,
} from './digital-signals';
import type { EdgeDetectorState } from './edge-detector';
import { createEdgeDetector, detectRisingEdge } from './edge-detector';
import { DigitalEventQueue } from './digital-event-queue';
import { handleClockEdge as edu8HandleClockEdge } from './edu8-simulator';

/**
 * Digital pin configuration for a component
 */
export interface DigitalPinConfig {
  componentId: string;
  pins: {
    clock?: string; // Clock pin identifier (e.g., 'CLK')
    inputs?: string[]; // Input pin identifiers (e.g., ['IN0', 'IN1', 'IN2', 'IN3'])
    outputs?: string[]; // Output pin identifiers (e.g., ['OUT0', 'OUT1', 'OUT2', 'OUT3'])
    reset?: string; // Reset pin identifier (e.g., 'RST')
  };
}

/**
 * Digital simulation state
 */
export interface DigitalSimulationState {
  eventQueue: DigitalEventQueue;
  edgeDetectors: Map<string, EdgeDetectorState>; // Key: componentId-pinId
  digitalOutputs: Map<string, DigitalValue>; // Key: componentId-pinId
  currentTime: number; // Current simulation time
}

/**
 * Create initial digital simulation state
 */
export function createDigitalSimulationState(): DigitalSimulationState {
  return {
    eventQueue: new DigitalEventQueue(),
    edgeDetectors: new Map(),
    digitalOutputs: new Map(),
    currentTime: 0,
  };
}

/**
 * Step digital simulation forward by one clock cycle
 *
 * This is the main entry point for digital simulation:
 * 1. Takes analog voltages from DC solver
 * 2. Abstracts clock signals to digital values
 * 3. Detects edges
 * 4. Executes digital component logic on edges
 * 5. Returns updated component states
 *
 * @param circuit Circuit with analog simulation results
 * @param components Array of all components (will be updated)
 * @param digitalState Digital simulation state
 * @param clockNodeId Node ID of the clock signal
 * @returns Updated components array
 */
export function stepDigitalSimulation(
  circuit: Circuit,
  components: AnyComponent[],
  digitalState: DigitalSimulationState,
  clockNodeId: string
): AnyComponent[] {
  // Find microprocessor components
  const microprocessors = components.filter(
    (c): c is Microprocessor => c.type === ComponentType.MICROPROCESSOR
  );

  if (microprocessors.length === 0) {
    return components; // No digital components to simulate
  }

  // Get clock voltage from circuit
  const clockNode = circuit.nodes.get(clockNodeId);
  if (clockNode?.voltage === undefined) {
    return components; // No clock signal
  }

  // Convert clock voltage to digital value
  const clockDigital = analogToDigital(clockNode.voltage);
  const clockValue = clockDigital === 1;

  // Update each microprocessor
  const updatedComponents = components.map((component) => {
    if (component.type !== ComponentType.MICROPROCESSOR) {
      return component;
    }

    // Get or create edge detector for this component's clock
    const detectorKey = `${component.id}-CLK`;
    if (!digitalState.edgeDetectors.has(detectorKey)) {
      digitalState.edgeDetectors.set(detectorKey, createEdgeDetector(0));
    }
    const detector = digitalState.edgeDetectors.get(detectorKey)!;

    // Detect rising edge
    const risingEdge = detectRisingEdge(detector, clockValue ? 1 : 0);

    if (risingEdge) {
      // Execute one instruction on rising edge
      // For now, we assume inputs are 0 (can be extended later)
      const inputs = 0;
      const newState = edu8HandleClockEdge(component.state, clockValue, inputs);

      // Update component with new state
      return {
        ...component,
        state: newState,
      } as Microprocessor;
    }

    // Update clock state even if no rising edge
    const newState = edu8HandleClockEdge(component.state, clockValue, 0);
    return {
      ...component,
      state: newState,
    } as Microprocessor;
  });

  return updatedComponents;
}

/**
 * Get digital output voltages from microprocessor
 *
 * Converts the 4-bit output register to 4 separate analog voltages.
 *
 * @param microprocessor Microprocessor component
 * @returns Array of [OUT0, OUT1, OUT2, OUT3] voltages
 */
export function getMicroprocessorOutputVoltages(
  microprocessor: Microprocessor
): [number, number, number, number] {
  const outputs = microprocessor.state.outputs;
  const digitalOutputs = nibbleToDigital(outputs);

  return [
    digitalToAnalog(digitalOutputs[3]) ?? 0, // OUT0 is bit 0
    digitalToAnalog(digitalOutputs[2]) ?? 0, // OUT1 is bit 1
    digitalToAnalog(digitalOutputs[1]) ?? 0, // OUT2 is bit 2
    digitalToAnalog(digitalOutputs[0]) ?? 0, // OUT3 is bit 3
  ];
}

/**
 * Get digital input values from analog voltages
 *
 * Converts 4 analog input voltages to a 4-bit input value.
 *
 * @param voltages Array of [IN0, IN1, IN2, IN3] voltages
 * @returns 4-bit input value (0-15), or 0 if any input is undefined
 */
export function analogVoltagesToInputs(voltages: [number, number, number, number]): number {
  const digitalInputs: [DigitalValue, DigitalValue, DigitalValue, DigitalValue] = [
    analogToDigital(voltages[3]), // IN3 is bit 3
    analogToDigital(voltages[2]), // IN2 is bit 2
    analogToDigital(voltages[1]), // IN1 is bit 1
    analogToDigital(voltages[0]), // IN0 is bit 0
  ];

  return digitalToNibble(digitalInputs) ?? 0;
}

/**
 * Reset digital simulation state
 */
export function resetDigitalSimulation(state: DigitalSimulationState): void {
  state.eventQueue.clear();
  state.edgeDetectors.clear();
  state.digitalOutputs.clear();
  state.currentTime = 0;
}
