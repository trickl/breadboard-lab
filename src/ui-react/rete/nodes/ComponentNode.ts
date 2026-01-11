import { ClassicPreset } from 'rete';

import { ComponentType } from '@/core/types';
import { legSocket } from '@/ui-react/rete/nodes/sockets';

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
    super(componentType);

    // Create output sockets for each component leg
    for (let i = 0; i < legs; i++) {
      this.addOutput(`leg${i}`, new ClassicPreset.Output(legSocket, `Leg ${i}`));
    }
  }
}
