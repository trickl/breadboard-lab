import { ClassicPreset } from 'rete';

import { ComponentType } from '@/core/types';
import { legSocket } from '@/ui-react/rete/nodes/sockets';

function getComponentNodeLabel(type: ComponentType): string {
  switch (type) {
    case ComponentType.RESISTOR:
      return 'Resistor';
    case ComponentType.LED:
      return 'LED';
    case ComponentType.WIRE:
      return 'Wire';
    case ComponentType.POWER_SUPPLY:
      return 'Power';
    case ComponentType.GROUND:
      return 'Ground';
    case ComponentType.MICROPROCESSOR:
      return 'Microprocessor';
    case ComponentType.SWITCH:
      return 'Switch';
    default:
      return String(type);
  }
}

/**
 * Rete node representing a component on the breadboard
 */
export class ComponentNode extends ClassicPreset.Node {
  width = 100;
  height = 60;

  constructor(
    public componentId: string,
    public componentType: ComponentType,
    public legs: number
  ) {
    super(getComponentNodeLabel(componentType));

    // Create output sockets for each component leg
    for (let i = 0; i < legs; i++) {
      // Intentionally do not label ports/legs (labels are distracting in the UI).
      this.addOutput(`leg${i}`, new ClassicPreset.Output(legSocket, ''));
    }
  }
}
