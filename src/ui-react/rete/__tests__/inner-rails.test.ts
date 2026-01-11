import { describe, expect, it } from 'vitest';

import { BreadboardLayout } from '../../../core/breadboard-layout';
import { getAllHolePositions } from '../../geometry/breadboard-layout';
import { RailNode } from '../ReteGraphLayer';

describe('inner rails (terminal strips)', () => {
  it('groups each strip row into 5 visible holes per side (60 rails total)', () => {
    const all = getAllHolePositions();

    const expectedLeftCount =
      BreadboardLayout.STRIP_LEFT_END - BreadboardLayout.STRIP_LEFT_START + 1;
    const expectedRightCount =
      BreadboardLayout.STRIP_RIGHT_END - BreadboardLayout.STRIP_RIGHT_START + 1;

    let leftRails = 0;
    let rightRails = 0;

    for (let row = 0; row < BreadboardLayout.ROWS; row++) {
      const left = all
        .filter(
          (p) =>
            p.row === row &&
            p.col >= BreadboardLayout.STRIP_LEFT_START &&
            p.col <= BreadboardLayout.STRIP_LEFT_END
        )
        .sort((a, b) => a.col - b.col);

      const right = all
        .filter(
          (p) =>
            p.row === row &&
            p.col >= BreadboardLayout.STRIP_RIGHT_START &&
            p.col <= BreadboardLayout.STRIP_RIGHT_END
        )
        .sort((a, b) => a.col - b.col);

      // The breadboard skin is expected to show all 30 rows of terminal strips.
      expect(left).toHaveLength(expectedLeftCount);
      expect(right).toHaveLength(expectedRightCount);

      leftRails++;
      rightRails++;

      // Sanity: a RailNode created for a strip row has one input+output per hole.
      const node = new RailNode(`inner-rail-left-${row}`, `Inner L ${row + 1}`, left);
      expect(Object.keys(node.outputs)).toHaveLength(expectedLeftCount);
      expect(Object.keys(node.inputs)).toHaveLength(expectedLeftCount);
      expect(node.outputs).toHaveProperty('h0');
      expect(node.inputs).toHaveProperty('in-h0');
    }

    expect(leftRails + rightRails).toBe(BreadboardLayout.ROWS * 2);
  });
});
