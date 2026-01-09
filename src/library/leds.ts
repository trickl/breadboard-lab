/**
 * LED component library entries
 * Standard through-hole LEDs (3mm and 5mm packages)
 * Based on common datasheet specifications
 */

import type { ComponentLibraryEntry } from '../core/types';

/**
 * LED specifications
 */
interface LEDSpec {
  id: string;
  name: string;
  color: string;
  packageSize: '3mm' | '5mm';
  forwardVoltage: number;
  maxCurrent: number;
  typicalCurrent: number;
  wavelength?: string;
  luminousIntensity?: string;
  description: string;
}

const LED_SPECS: LEDSpec[] = [
  {
    id: 'led-3mm-yellow',
    name: '3mm Ultra-Bright Yellow LED',
    color: 'yellow',
    packageSize: '3mm',
    forwardVoltage: 2.1,
    maxCurrent: 0.02, // 20mA
    typicalCurrent: 0.015, // 15mA
    wavelength: '590nm',
    luminousIntensity: '1000-2000mcd',
    description: 'Ultra-bright 3mm yellow LED, T1 package, 590nm wavelength, high visibility',
  },
  {
    id: 'led-5mm-red',
    name: '5mm Red LED',
    color: 'red',
    packageSize: '5mm',
    forwardVoltage: 1.9,
    maxCurrent: 0.02, // 20mA
    typicalCurrent: 0.015, // 15mA
    wavelength: '625nm',
    luminousIntensity: '200-400mcd',
    description: 'Standard 5mm red LED, T1-3/4 package, 625nm wavelength',
  },
  {
    id: 'led-5mm-green',
    name: '5mm Green LED',
    color: 'green',
    packageSize: '5mm',
    forwardVoltage: 2.1,
    maxCurrent: 0.02, // 20mA
    typicalCurrent: 0.015, // 15mA
    wavelength: '525nm',
    luminousIntensity: '200-400mcd',
    description: 'Standard 5mm green LED, T1-3/4 package, 525nm wavelength',
  },
  {
    id: 'led-5mm-blue',
    name: '5mm Blue LED',
    color: 'blue',
    packageSize: '5mm',
    forwardVoltage: 3.1,
    maxCurrent: 0.02, // 20mA
    typicalCurrent: 0.015, // 15mA
    wavelength: '470nm',
    luminousIntensity: '200-400mcd',
    description: 'Standard 5mm blue LED, T1-3/4 package, 470nm wavelength',
  },
];

/**
 * Create LED library entry from specification
 */
function createLEDEntry(spec: LEDSpec): ComponentLibraryEntry {
  const packageKind = spec.packageSize === '3mm' ? 't1' : 't1-3-4';
  const diameterMm = spec.packageSize === '3mm' ? 3 : 5;

  return {
    id: spec.id,
    name: spec.name,
    category: 'diode',
    manufacturer: 'Generic',
    partFamily: 'Standard LED',
    package: {
      kind: packageKind,
      pinCount: 2,
      leadSpacingMm: 2.54, // Standard 0.1" spacing
      body: {
        diameterMm,
        heightMm: spec.packageSize === '3mm' ? 4.5 : 8.6,
      },
    },
    footprint: {
      pins: [
        { pinId: 'anode', role: 'anode' },
        { pinId: 'cathode', role: 'cathode' },
      ],
    },
    electrical: {
      forwardVoltage: spec.forwardVoltage,
      maxCurrent: spec.maxCurrent,
      typicalCurrent: spec.typicalCurrent,
      reverseVoltage: 5, // Typical reverse voltage
      ...(spec.wavelength && { wavelength: spec.wavelength }),
      ...(spec.luminousIntensity && { luminousIntensity: spec.luminousIntensity }),
      color: spec.color,
    },
    visuals: {
      renderer: 'procedural',
    },
    flexibility: 'flexible',
    maxPinSpan: 20,
    minPinSpan: 3,
    description: spec.description,
    typicalUses: [
      'Status indicators',
      'Visual feedback',
      'Illumination',
      'Educational circuits',
    ],
  };
}

/**
 * All LED library entries
 */
export const LED_LIBRARY: ComponentLibraryEntry[] = LED_SPECS.map(createLEDEntry);
