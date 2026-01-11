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
      return findClosestResistor(component.resistance);
    case ComponentType.LED:
      return findClosestLED(component.forwardVoltage);
    case ComponentType.POWER_SUPPLY:
      return findPowerSupply(component.voltage);
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
  const libraryId = component.libraryId ?? getDefaultLibraryId(component);
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
      {
        const resistance = coerceElectricalNumber(entry.electrical.resistance);
        if (resistance !== undefined) {
          (props as Partial<Resistor>).resistance = resistance;
        }
      }
      break;

    case ComponentType.LED:
      {
        const forwardVoltage = coerceElectricalNumber(entry.electrical.forwardVoltage);
        if (forwardVoltage !== undefined) {
          (props as Partial<LED>).forwardVoltage = forwardVoltage;
        }

        const maxCurrent = coerceElectricalNumber(entry.electrical.maxCurrent);
        if (maxCurrent !== undefined) {
          (props as Partial<LED>).maxCurrent = maxCurrent;
        }
      }
      break;

    case ComponentType.POWER_SUPPLY:
      {
        const voltage = coerceElectricalNumber(entry.electrical.voltage);
        if (voltage !== undefined) {
          (props as Partial<PowerSupply>).voltage = voltage;
        }
      }
      break;

    case ComponentType.WIRE:
      {
        const resistance = coerceElectricalNumber(entry.electrical.resistance);
        if (resistance !== undefined) {
          (props as Partial<Wire>).resistance = resistance;
        }
      }
      break;
  }

  return props;
}

function coerceElectricalNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}
