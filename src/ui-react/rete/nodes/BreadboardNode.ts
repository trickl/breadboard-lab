import { ClassicPreset } from 'rete';

import { getBreadboardWorld } from '@/ui-react/world/breadboard-world';

/**
 * Rete node representing the breadboard itself (skin/background).
 * Rendered as an SVG inside the Rete canvas so it pans/zooms with the viewport.
 */
export class BreadboardNode extends ClassicPreset.Node {
  width = 0;
  height = 0;

  constructor(public labelText: string) {
    super(labelText);
    // Size the node to the full world extents (including padding)
    const world = getBreadboardWorld(0);
    this.width = world.total.width;
    this.height = world.total.height;
  }
}
