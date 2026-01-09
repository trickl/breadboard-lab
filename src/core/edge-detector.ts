/**
 * Edge Detector
 *
 * Detects rising and falling edges on digital signals by tracking state changes.
 */

import type { DigitalValue } from './digital-signals';
import { isDefinedDigital } from './digital-signals';

/**
 * Edge type
 */
export type EdgeType = 'rising' | 'falling' | 'none';

/**
 * Edge detection result
 */
export interface EdgeDetection {
  edge: EdgeType;
  previousValue: DigitalValue;
  currentValue: DigitalValue;
}

/**
 * Edge detector state for a single signal
 */
export interface EdgeDetectorState {
  previousValue: DigitalValue;
}

/**
 * Create initial edge detector state
 *
 * @param initialValue Initial value (defaults to 0)
 */
export function createEdgeDetector(initialValue: DigitalValue = 0): EdgeDetectorState {
  return {
    previousValue: initialValue,
  };
}

/**
 * Detect edge on a signal
 *
 * Compares current value to previous value and returns edge type.
 * Only detects edges on defined values (0 or 1).
 *
 * @param state Edge detector state (will be updated)
 * @param currentValue Current digital value
 * @returns Edge detection result
 */
export function detectEdge(state: EdgeDetectorState, currentValue: DigitalValue): EdgeDetection {
  const previousValue = state.previousValue;
  let edge: EdgeType = 'none';

  // Only detect edges between defined values
  if (isDefinedDigital(previousValue) && isDefinedDigital(currentValue)) {
    if (previousValue === 0 && currentValue === 1) {
      edge = 'rising';
    } else if (previousValue === 1 && currentValue === 0) {
      edge = 'falling';
    }
  }

  // Update state for next detection
  state.previousValue = currentValue;

  return {
    edge,
    previousValue,
    currentValue,
  };
}

/**
 * Detect rising edge specifically
 *
 * @param state Edge detector state (will be updated)
 * @param currentValue Current digital value
 * @returns True if rising edge detected
 */
export function detectRisingEdge(state: EdgeDetectorState, currentValue: DigitalValue): boolean {
  const detection = detectEdge(state, currentValue);
  return detection.edge === 'rising';
}

/**
 * Detect falling edge specifically
 *
 * @param state Edge detector state (will be updated)
 * @param currentValue Current digital value
 * @returns True if falling edge detected
 */
export function detectFallingEdge(state: EdgeDetectorState, currentValue: DigitalValue): boolean {
  const detection = detectEdge(state, currentValue);
  return detection.edge === 'falling';
}

/**
 * Reset edge detector to a specific value
 *
 * @param state Edge detector state to reset
 * @param value Value to reset to (defaults to 0)
 */
export function resetEdgeDetector(state: EdgeDetectorState, value: DigitalValue = 0): void {
  state.previousValue = value;
}
