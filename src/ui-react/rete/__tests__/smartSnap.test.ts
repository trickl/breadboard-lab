import { describe, expect, it } from 'vitest';

import { pickBestLocalSnapDelta } from '../graph/smartSnap';
import {
  isValidPosition,
  pixelsToPosition,
  positionToPixels,
} from '../../geometry/breadboard-layout';

describe('pickBestLocalSnapDelta', () => {
  const nearestHoleCenterLocal = (p: { x: number; y: number }) => {
    const pos = pixelsToPosition(p.x, p.y);
    if (!isValidPosition(pos)) return null;
    return positionToPixels(pos);
  };

  it('nudges a single socket onto the nearest hole center when within threshold', () => {
    const hole = { row: 10, col: 2 };
    const center = positionToPixels(hole);

    const socket = { x: center.x + 5, y: center.y - 3 };
    const delta = pickBestLocalSnapDelta({
      socketLocals: [socket],
      nearestHoleCenterLocal,
      maxMovePx: 10,
    });

    expect(delta.x).toBeCloseTo(-5, 5);
    expect(delta.y).toBeCloseTo(3, 5);
  });

  it('does not move when nearest-hole delta exceeds threshold', () => {
    const hole = { row: 12, col: 3 };
    const center = positionToPixels(hole);

    const socket = { x: center.x + 20, y: center.y };
    const delta = pickBestLocalSnapDelta({
      socketLocals: [socket],
      nearestHoleCenterLocal,
      maxMovePx: 5,
    });

    expect(delta).toEqual({ x: 0, y: 0 });
  });

  it('finds a delta that improves alignment for multiple sockets', () => {
    const h1 = { row: 8, col: 2 };
    const h2 = { row: 9, col: 2 };
    const c1 = positionToPixels(h1);
    const c2 = positionToPixels(h2);

    // Both sockets are offset by the same amount; the best delta should cancel it.
    const sockets = [
      { x: c1.x + 4, y: c1.y + 4 },
      { x: c2.x + 4, y: c2.y + 4 },
    ];

    const delta = pickBestLocalSnapDelta({
      socketLocals: sockets,
      nearestHoleCenterLocal,
      maxMovePx: 10,
    });

    expect(delta.x).toBeCloseTo(-4, 5);
    expect(delta.y).toBeCloseTo(-4, 5);
  });
});
