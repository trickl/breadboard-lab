/**
 * Power supply, wire, ground, and speaker component library entries
 */

import type { ComponentLibraryEntry } from '../core/types';

/**
 * Power supply library entries
 */
export const POWER_SUPPLY_LIBRARY: ComponentLibraryEntry[] = [
  {
    id: 'power-3v3',
    name: '3.3V Power Supply',
    category: 'power',
    package: {
      kind: 'module',
      pinCount: 2,
      body: {
        widthMm: 15,
        lengthMm: 20,
        heightMm: 10,
      },
    },
    footprint: {
      pins: [
        { pinId: 'positive', role: 'positive' },
        { pinId: 'negative', role: 'negative' },
      ],
    },
    electrical: {
      voltage: 3.3,
      maxCurrent: 1.0, // 1A typical
    },
    visuals: {
      renderer: 'procedural',
    },
    description: '3.3V DC power supply, commonly used for microcontrollers and logic circuits',
    typicalUses: ['Microcontroller power', 'Logic circuit power', 'Sensor power'],
  },
  {
    id: 'power-5v',
    name: '5V Power Supply',
    category: 'power',
    package: {
      kind: 'module',
      pinCount: 2,
      body: {
        widthMm: 15,
        lengthMm: 20,
        heightMm: 10,
      },
    },
    footprint: {
      pins: [
        { pinId: 'positive', role: 'positive' },
        { pinId: 'negative', role: 'negative' },
      ],
    },
    electrical: {
      voltage: 5.0,
      maxCurrent: 2.0, // 2A typical
    },
    visuals: {
      renderer: 'procedural',
    },
    description: '5V DC power supply, standard for Arduino, USB, and general electronics',
    typicalUses: ['Arduino power', 'USB power', 'General electronics', 'LED circuits'],
  },
  {
    id: 'power-9v',
    name: '9V Power Supply',
    category: 'power',
    package: {
      kind: 'module',
      pinCount: 2,
      body: {
        widthMm: 15,
        lengthMm: 20,
        heightMm: 10,
      },
    },
    footprint: {
      pins: [
        { pinId: 'positive', role: 'positive' },
        { pinId: 'negative', role: 'negative' },
      ],
    },
    electrical: {
      voltage: 9.0,
      maxCurrent: 1.0, // 1A typical
    },
    visuals: {
      renderer: 'procedural',
    },
    description: '9V DC power supply, commonly from 9V batteries or wall adapters',
    typicalUses: ['Battery-powered projects', 'Audio circuits', 'Voltage regulators'],
  },
  {
    id: 'power-12v',
    name: '12V Power Supply',
    category: 'power',
    package: {
      kind: 'module',
      pinCount: 2,
      body: {
        widthMm: 15,
        lengthMm: 20,
        heightMm: 10,
      },
    },
    footprint: {
      pins: [
        { pinId: 'positive', role: 'positive' },
        { pinId: 'negative', role: 'negative' },
      ],
    },
    electrical: {
      voltage: 12.0,
      maxCurrent: 2.0, // 2A typical
    },
    visuals: {
      renderer: 'procedural',
    },
    description: '12V DC power supply, commonly used for motors, relays, and automotive applications',
    typicalUses: ['Motor control', 'Relay circuits', 'Automotive projects', 'LED strips'],
  },
];

/**
 * Wire library entries
 */
export const WIRE_LIBRARY: ComponentLibraryEntry[] = [
  {
    id: 'wire-22awg-red',
    name: '22 AWG Solid Core Wire (Red)',
    category: 'interconnect',
    package: {
      kind: 'header',
      pinCount: 2,
      body: {
        lengthMm: 50, // Default length, adjustable
        widthMm: 0.644, // 22 AWG diameter
      },
    },
    footprint: {
      pins: [
        { pinId: 'end1', role: 'terminal' },
        { pinId: 'end2', role: 'terminal' },
      ],
    },
    electrical: {
      resistance: 0.01, // Very low resistance
      gauge: 22,
      color: 'red',
    },
    visuals: {
      renderer: 'procedural',
    },
    description: '22 AWG solid core hookup wire in red, perfect for breadboard connections',
    typicalUses: ['Point-to-point connections', 'Power distribution', 'Breadboard wiring'],
  },
  {
    id: 'wire-22awg-black',
    name: '22 AWG Solid Core Wire (Black)',
    category: 'interconnect',
    package: {
      kind: 'header',
      pinCount: 2,
      body: {
        lengthMm: 50,
        widthMm: 0.644,
      },
    },
    footprint: {
      pins: [
        { pinId: 'end1', role: 'terminal' },
        { pinId: 'end2', role: 'terminal' },
      ],
    },
    electrical: {
      resistance: 0.01,
      gauge: 22,
      color: 'black',
    },
    visuals: {
      renderer: 'procedural',
    },
    description: '22 AWG solid core hookup wire in black, commonly used for ground connections',
    typicalUses: ['Ground connections', 'Point-to-point connections', 'Breadboard wiring'],
  },
];

/**
 * Ground reference component
 */
export const GROUND_LIBRARY: ComponentLibraryEntry[] = [
  {
    id: 'ground',
    name: 'Ground Reference',
    category: 'virtual-educational',
    package: {
      kind: 'header',
      pinCount: 1,
      body: {
        widthMm: 5,
        heightMm: 10,
      },
    },
    footprint: {
      pins: [{ pinId: 'gnd', role: 'ground' }],
    },
    electrical: {
      voltage: 0,
    },
    visuals: {
      renderer: 'procedural',
    },
    description: 'Circuit ground reference point (0V), required for all circuits',
    typicalUses: ['Circuit reference point', 'Return path for current', 'Voltage measurement reference'],
  },
];

/**
 * Speaker library entry (required by goal.md)
 */
export const SPEAKER_LIBRARY: ComponentLibraryEntry[] = [
  {
    id: 'speaker-8ohm',
    name: '8Ω Breadboard Speaker Module',
    category: 'electro-acoustic',
    manufacturer: 'Generic',
    partFamily: 'Miniature Speaker',
    package: {
      kind: 'module',
      pinCount: 2,
      body: {
        diameterMm: 23, // ~23mm typical small speaker
        heightMm: 10,
      },
    },
    footprint: {
      pins: [
        { pinId: 'positive', role: 'positive' },
        { pinId: 'negative', role: 'negative' },
      ],
    },
    electrical: {
      impedance: 8, // Ohms
      powerRating: 0.5, // 0.5W typical
      frequencyResponse: '300Hz-5kHz',
    },
    visuals: {
      renderer: 'procedural',
    },
    description: 'Small 8Ω speaker module for breadboard use, foundation for audio output features',
    typicalUses: [
      'Audio output',
      'Tone generation',
      'Alert sounds',
      'Educational audio circuits',
    ],
  },
];
