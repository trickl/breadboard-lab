/**
 * Resistor component library entries
 * Standard through-hole axial resistors (1/4W, E12 series)
 * Based on common datasheet specifications
 */

import type { ComponentLibraryEntry } from '../core/types';

/**
 * E12 series resistor values (commonly available)
 */
const E12_VALUES = [
  100, 120, 150, 180, 220, 270, 330, 390, 470, 560, 680, 820, 1000, 2200, 4700, 10000,
];

/**
 * Generate resistor library entry
 */
function createResistorEntry(resistance: number, tolerance: number): ComponentLibraryEntry {
  const isHighPrecision = tolerance <= 2;
  const id = `resistor-${resistance}-${tolerance}pct`;
  const resistanceStr = formatResistance(resistance);
  const toleranceStr = tolerance === 5 ? '5%' : tolerance === 1 ? '1%' : `${tolerance}%`;
  const bandCount = isHighPrecision ? 5 : 4;

  return {
    id,
    name: `${resistanceStr} 1/4W ${toleranceStr} Resistor`,
    category: 'passive',
    manufacturer: 'Yageo',
    partFamily: 'CFR Series',
    package: {
      kind: 'axial',
      pinCount: 2,
      leadSpacingMm: 10,
      body: {
        lengthMm: 6.5,
        widthMm: 2.5,
        heightMm: 2.5,
      },
    },
    footprint: {
      pins: [
        { pinId: 'pin1', role: 'terminal' },
        { pinId: 'pin2', role: 'terminal' },
      ],
    },
    electrical: {
      resistance,
      tolerance,
      powerRating: 0.25, // 1/4W
      temperatureCoefficient: 100, // ppm/°C
    },
    visuals: {
      renderer: 'procedural',
    },
    flexibility: 'flexible',
    maxPinSpan: 20,
    minPinSpan: 3,
    description: `Standard through-hole axial resistor, ${resistanceStr} ±${toleranceStr}, 1/4W power rating, ${bandCount}-band color code`,
    typicalUses: [
      'Current limiting',
      'Voltage division',
      'Pull-up/pull-down resistors',
      'General purpose circuits',
    ],
  };
}

/**
 * Format resistance value with unit suffix
 */
function formatResistance(ohms: number): string {
  if (ohms >= 1000000) {
    return `${ohms / 1000000}MΩ`;
  } else if (ohms >= 1000) {
    const kiloOhms = ohms / 1000;
    return kiloOhms % 1 === 0 ? `${kiloOhms}kΩ` : `${kiloOhms.toFixed(1)}kΩ`;
  } else {
    return `${ohms}Ω`;
  }
}

/**
 * All resistor library entries
 */
export const RESISTOR_LIBRARY: ComponentLibraryEntry[] = [
  // 5% tolerance resistors (4-band color code)
  ...E12_VALUES.map((value) => createResistorEntry(value, 5)),

  // 1% tolerance resistors (5-band color code) - common values
  createResistorEntry(100, 1),
  createResistorEntry(220, 1),
  createResistorEntry(470, 1),
  createResistorEntry(1000, 1),
  createResistorEntry(2200, 1),
  createResistorEntry(4700, 1),
  createResistorEntry(10000, 1),
];
