/**
 * Component library catalog
 * Exports all real-world component library entries
 */

import { RESISTOR_LIBRARY } from './resistors';
import { LED_LIBRARY } from './leds';
import {
  POWER_SUPPLY_LIBRARY,
  WIRE_LIBRARY,
  GROUND_LIBRARY,
  SPEAKER_LIBRARY,
  SWITCH_LIBRARY,
} from './other-components';
import { MICROPROCESSOR_LIBRARY } from './microprocessors';
import type { ComponentLibraryEntry } from '../core/types';

/**
 * All component library entries
 */
export const ALL_LIBRARY_ENTRIES: ComponentLibraryEntry[] = [
  ...RESISTOR_LIBRARY,
  ...LED_LIBRARY,
  ...POWER_SUPPLY_LIBRARY,
  ...WIRE_LIBRARY,
  ...GROUND_LIBRARY,
  ...SPEAKER_LIBRARY,
  ...MICROPROCESSOR_LIBRARY,
  ...SWITCH_LIBRARY,
];

/**
 * Export individual categories for easy access
 */
export {
  RESISTOR_LIBRARY,
  LED_LIBRARY,
  POWER_SUPPLY_LIBRARY,
  WIRE_LIBRARY,
  GROUND_LIBRARY,
  SPEAKER_LIBRARY,
  MICROPROCESSOR_LIBRARY,
  SWITCH_LIBRARY,
};
