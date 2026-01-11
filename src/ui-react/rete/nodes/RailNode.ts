import { ClassicPreset } from 'rete';

import { ALLOW_MULTI_CONNECTIONS_PER_PORT } from '@/ui-react/rete/graph/envFlags';
import { holeSocket } from '@/ui-react/rete/nodes/sockets';

/**
 * Rete node representing a breadboard rail (one electrical net with many possible connection points).
 *
 * Note: For iteration 1 we keep classic preset layout (sockets stacked) to validate interactions.
 * Later we'll switch to a custom node renderer that positions sockets exactly over the breadboard holes.
 */
export class RailNode extends ClassicPreset.Node {
  // Keep this tiny; we render sockets at absolute positions and don't want a big invisible hitbox.
  width = 1;
  height = 1;

  constructor(
    public railId: string,
    public railLabel: string,
    public holePositions: Array<{ row: number; col: number }>
  ) {
    super(railLabel);

    // Create input/output sockets for each possible connection point (hole)
    for (let i = 0; i < holePositions.length; i++) {
      // Use distinct INPUT keys `in-hN` so output/output rail connections can be mapped cleanly
      // to output/input without any accidental key-equality edge cases.
      this.addInput(
        `in-h${i}`,
        // ClassicPreset.Input defaults to single-connection. For debugging we can optionally
        // allow multiple connections per input.
        new ClassicPreset.Input(holeSocket, '', ALLOW_MULTI_CONNECTIONS_PER_PORT)
      );

      // Important: output ports default to multiple connections. For breadboard holes we want
      // at most one wire per physical hole.
      // Important: output ports default to multiple connections. For breadboard holes we usually
      // want at most one wire per physical hole, so this is normally `false`.
      // For debugging we can optionally allow multiple connections.
      this.addOutput(
        `h${i}`,
        new ClassicPreset.Output(holeSocket, '', ALLOW_MULTI_CONNECTIONS_PER_PORT)
      );
    }
  }
}
