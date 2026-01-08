/**
 * Canonical example circuits for Breadboard Lab
 */

import ledResistorJson from './led-resistor.json';
import voltageDividerJson from './voltage-divider.json';
import parallelLedsJson from './parallel-leds.json';
import shortCircuitDemoJson from './short-circuit-demo.json';
import edu8BlinkJson from './edu8-blink.json';

/**
 * Example circuit with metadata
 */
export interface ExampleCircuit {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'intermediate' | 'demo' | 'microprocessor';
  learningObjectives: string[];
  json: string;
}

/**
 * All available example circuits
 */
export const EXAMPLE_CIRCUITS: ExampleCircuit[] = [
  {
    id: 'led-resistor',
    name: 'LED and Resistor',
    description:
      'The simplest circuit: an LED with a current-limiting resistor. Perfect for beginners.',
    category: 'basic',
    learningObjectives: [
      'Basic circuit construction',
      'Voltage drop across components',
      'Proper LED usage with current limiting',
      'Series circuit behavior',
    ],
    json: JSON.stringify(ledResistorJson),
  },
  {
    id: 'voltage-divider',
    name: 'Voltage Divider',
    description: 'Two resistors in series divide voltage proportionally to their resistance.',
    category: 'basic',
    learningObjectives: [
      'Voltage division principle',
      'Series resistance',
      'Ohm\'s Law application',
      'Proportional voltage relationships',
    ],
    json: JSON.stringify(voltageDividerJson),
  },
  {
    id: 'parallel-leds',
    name: 'Parallel LEDs',
    description: 'Three LEDs in parallel, each with its own current-limiting resistor.',
    category: 'intermediate',
    learningObjectives: [
      'Parallel circuit configuration',
      'Current division',
      'Independent current limiting',
      'Scaling circuits with parallel branches',
    ],
    json: JSON.stringify(parallelLedsJson),
  },
  {
    id: 'short-circuit-demo',
    name: 'Short Circuit Demo',
    description:
      'An intentional short circuit to demonstrate error detection. Power supply directly connected to ground.',
    category: 'demo',
    learningObjectives: [
      'Recognizing short circuits',
      'Understanding circuit errors',
      'Using the error detection system',
      'Why short circuits are dangerous',
    ],
    json: JSON.stringify(shortCircuitDemoJson),
  },
  {
    id: 'edu8-blink',
    name: 'EDU-8 Blink Program',
    description:
      'Educational microprocessor running a Blink program. Use clock controls (Space to step, or Run for automatic execution) to toggle an LED.',
    category: 'microprocessor',
    learningObjectives: [
      'Clock-driven computation',
      'Program counter and instruction execution',
      'Digital output to LED',
      'Fetch-decode-execute cycle',
      'Sequential program flow',
    ],
    json: JSON.stringify(edu8BlinkJson),
  },
];

/**
 * Get an example circuit by ID
 */
export function getExampleById(id: string): ExampleCircuit | undefined {
  return EXAMPLE_CIRCUITS.find((example) => example.id === id);
}

/**
 * Get examples by category
 */
export function getExamplesByCategory(
  category: 'basic' | 'intermediate' | 'demo' | 'microprocessor'
): ExampleCircuit[] {
  return EXAMPLE_CIRCUITS.filter((example) => example.category === category);
}

/**
 * Get the default example circuit to load on application initialization
 * Returns the EDU-8 Blink circuit as specified in goal.md Section 13
 */
export function getDefaultExample(): ExampleCircuit {
  const defaultCircuit = getExampleById('edu8-blink');
  if (!defaultCircuit) {
    throw new Error('Default example circuit (edu8-blink) not found');
  }
  return defaultCircuit;
}
