import { ComponentType, type AnyComponent, type LED, type PowerSupply, type Resistor, type Switch, type Wire } from '@/core/types';

export function formatComponentTitle(c: AnyComponent): string {
  switch (c.type) {
    case ComponentType.RESISTOR:
      return `Resistor (${(c as Resistor).resistance} Ω)`;
    case ComponentType.LED:
      return `LED (${(c as LED).forwardVoltage} V)`;
    case ComponentType.POWER_SUPPLY:
      return `Power (${(c as PowerSupply).voltage} V)`;
    case ComponentType.WIRE:
      return `Wire (${(c as Wire).resistance} Ω)`;
    case ComponentType.SWITCH:
      return `Switch (${(c as Switch).switchState ?? 'open'})`;
    default:
      return c.type;
  }
}
