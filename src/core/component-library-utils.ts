/**
 * Component library utilities for mapping between abstract components and library entries
 * Provides backward compatibility and default mappings
 */

import type { AnyComponent, Resistor, LED, PowerSupply, Wire } from './types';
import { ComponentType } from './types';
import { componentLibrary } from './component-library';

/**
 * Find the closest library resistor to a given resistance value
 */
export function findClosestResistor(resistance: number, tolerance = 5): string | undefined {
  const resistors = componentLibrary
    .getByCategory('passive')
    .filter((r) => r.electrical.tolerance === tolerance);

  if (resistors.length === 0) return undefined;

  // Find resistor with closest resistance value
  let closest = resistors[0];
  let minDiff = Math.abs((closest.electrical.resistance as number) - resistance);

  for (const resistor of resistors) {
    const diff = Math.abs((resistor.electrical.resistance as number) - resistance);
    if (diff < minDiff) {
      minDiff = diff;
      closest = resistor;
    }
  }

  return closest.id;
}

/**
 * Find the closest library LED to a given forward voltage
 */
export function findClosestLED(forwardVoltage: number): string | undefined {
  const leds = componentLibrary.getByCategory('diode');

  if (leds.length === 0) return undefined;

  // Find LED with closest forward voltage
  let closest = leds[0];
  let minDiff = Math.abs((closest.electrical.forwardVoltage as number) - forwardVoltage);

  for (const led of leds) {
    const diff = Math.abs((led.electrical.forwardVoltage as number) - forwardVoltage);
    if (diff < minDiff) {
      minDiff = diff;
      closest = led;
    }
  }

  return closest.id;
}

/**
 * Find library power supply with matching voltage
 */
export function findPowerSupply(voltage: number): string | undefined {
  const powerSupplies = componentLibrary.getByCategory('power');
  const match = powerSupplies.find((ps) => ps.electrical.voltage === voltage);
  return match?.id;
}

/**
 * Find default library wire
 */
export function findDefaultWire(): string | undefined {
  const wires = componentLibrary.getByCategory('interconnect');
  return wires[0]?.id;
}

/**
 * Find library ground reference
 */
export function findGround(): string | undefined {
  const grounds = componentLibrary.getByCategory('virtual-educational');
  return grounds[0]?.id;
}

/**
 * Get default library ID for a component based on its type and properties
 * This provides backward compatibility for components created before library system
 */
export function getDefaultLibraryId(component: AnyComponent): string | undefined {
  // If component already has a library ID, use it
  if (component.libraryId) {
    return component.libraryId;
  }

  // Otherwise, find best match in library
  switch (component.type) {
    case ComponentType.RESISTOR:
      return findClosestResistor((component as Resistor).resistance);
    case ComponentType.LED:
      return findClosestLED((component as LED).forwardVoltage);
    case ComponentType.POWER_SUPPLY:
      return findPowerSupply((component as PowerSupply).voltage);
    case ComponentType.WIRE:
      return findDefaultWire();
    case ComponentType.GROUND:
      return findGround();
    default:
      return undefined;
  }
}

/**
 * Get component properties from library entry
 * Returns properties that should be used for simulation
 */
export function getComponentPropertiesFromLibrary(component: AnyComponent): Partial<AnyComponent> {
  const libraryId = component.libraryId || getDefaultLibraryId(component);
  if (!libraryId) {
    // No library entry, use component's own properties
    return component;
  }

  const entry = componentLibrary.get(libraryId);
  if (!entry) {
    // Library entry not found, use component's own properties
    return component;
  }

  // Map library electrical properties to component properties
  const props: Partial<AnyComponent> = {};

  switch (component.type) {
    case ComponentType.RESISTOR:
      if (entry.electrical.resistance !== undefined) {
        (props as Partial<Resistor>).resistance = entry.electrical.resistance as number;
      }
      break;

    case ComponentType.LED:
      if (entry.electrical.forwardVoltage !== undefined) {
        (props as Partial<LED>).forwardVoltage = entry.electrical.forwardVoltage as number;
      }
      if (entry.electrical.maxCurrent !== undefined) {
        (props as Partial<LED>).maxCurrent = entry.electrical.maxCurrent as number;
      }
      break;

    case ComponentType.POWER_SUPPLY:
      if (entry.electrical.voltage !== undefined) {
        (props as Partial<PowerSupply>).voltage = entry.electrical.voltage as number;
      }
      break;

    case ComponentType.WIRE:
      if (entry.electrical.resistance !== undefined) {
        (props as Partial<Wire>).resistance = entry.electrical.resistance as number;
      }
      break;
  }

  return props;
}
