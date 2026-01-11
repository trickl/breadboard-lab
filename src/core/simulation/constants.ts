// Shared numerical constants for the circuit simulation implementation.
//
// Extracted from `CircuitSimulator` to allow splitting logic into modules
// without introducing circular imports.

export const WIRE_CONDUCTANCE = 100; // Very high conductance (low resistance)
export const MIN_CONDUCTANCE = 1e-12; // Minimum conductance to avoid singularities
export const SINGULAR_THRESHOLD = 1e-10; // Threshold for detecting singular matrices
