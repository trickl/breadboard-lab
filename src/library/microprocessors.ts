/**
 * EDU-8 Microprocessor component library entry
 */

import type { ComponentLibraryEntry } from '../core/types';

/**
 * EDU-8 Microprocessor library entry
 * 
 * A simple educational microprocessor with:
 * - 4-bit input and output ports
 * - Clock and reset signals
 * - 16-byte program memory
 * - Minimal instruction set
 */
export const MICROPROCESSOR_LIBRARY: ComponentLibraryEntry[] = [
  {
    id: 'edu8-microprocessor',
    name: 'EDU-8 Microprocessor (Educational)',
    category: 'virtual-educational',
    package: {
      kind: 'dip',
      pinCount: 16,
      body: {
        lengthMm: 19.05, // Standard DIP-16 length (0.75")
        widthMm: 6.35,   // Standard DIP-16 width (0.25")
        heightMm: 3.5,   // Standard IC height
      },
    },
    footprint: {
      pins: [
        // Left side (pins 1-8, top to bottom)
        { pinId: 'VCC', role: 'power' },      // Pin 1
        { pinId: 'IN0', role: 'digital-input' },   // Pin 2
        { pinId: 'IN1', role: 'digital-input' },   // Pin 3
        { pinId: 'IN2', role: 'digital-input' },   // Pin 4
        { pinId: 'IN3', role: 'digital-input' },   // Pin 5
        { pinId: 'CLK', role: 'clock-input' },     // Pin 6
        { pinId: 'RST', role: 'reset-input' },     // Pin 7
        { pinId: 'GND', role: 'ground' },          // Pin 8
        
        // Right side (pins 9-16, bottom to top)
        { pinId: 'HALT', role: 'digital-output' }, // Pin 9
        { pinId: 'OUT0', role: 'digital-output' }, // Pin 10
        { pinId: 'OUT1', role: 'digital-output' }, // Pin 11
        { pinId: 'OUT2', role: 'digital-output' }, // Pin 12
        { pinId: 'OUT3', role: 'digital-output' }, // Pin 13
        { pinId: 'NC1', role: 'no-connect' },      // Pin 14
        { pinId: 'NC2', role: 'no-connect' },      // Pin 15
        { pinId: 'NC3', role: 'no-connect' },      // Pin 16
      ],
    },
    electrical: {
      supplyVoltageMin: 3.0,
      supplyVoltageMax: 5.5,
      supplyVoltageTypical: 5.0,
      inputHighThreshold: 2.0,    // Volts (TTL-compatible)
      inputLowThreshold: 0.8,     // Volts (TTL-compatible)
      outputHighVoltage: 4.5,     // Volts (when powered by 5V)
      outputLowVoltage: 0.2,      // Volts
      maxOutputCurrent: 0.020,    // 20mA per output
    },
    visuals: {
      renderer: 'procedural',
    },
    flexibility: 'rigid',
    description:
      'Educational 8-bit microprocessor with 4-bit I/O ports, clock-driven execution, and programmable ROM. Designed for teaching computational electronics and the connection between software and hardware.',
    typicalUses: [
      'Clock-driven LED patterns',
      'Binary counter displays',
      'Input-controlled logic',
      'Sequential state machines',
      'Introduction to embedded systems',
    ],
  },
];
