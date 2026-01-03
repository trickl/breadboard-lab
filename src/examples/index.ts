/**
 * Canonical example circuits for Breadboard Lab
 */

import ledResistorJson from './led-resistor.json';
import voltageDividerJson from './voltage-divider.json';
import parallelLedsJson from './parallel-leds.json';
import shortCircuitDemoJson from './short-circuit-demo.json';

/**
 * Example circuit with metadata
 */
export interface ExampleCircuit {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'intermediate' | 'demo';
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
  category: 'basic' | 'intermediate' | 'demo'
): ExampleCircuit[] {
  return EXAMPLE_CIRCUITS.filter((example) => example.category === category);
}
