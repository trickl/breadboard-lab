export type Point = { x: number; y: number };

/**
 * Pick a small translation (in *local breadboard pixels*) that best aligns the given socket points
 * to breadboard hole centers.
 *
 * - Only candidates that move <= maxMovePx are considered.
 * - Scoring prefers better overall alignment, then smaller moves.
 */
export function pickBestLocalSnapDelta(options: {
  socketLocals: Point[];
  /** Return nearest hole center (local px) for a point, or null if snapping is not possible there. */
  nearestHoleCenterLocal: (p: Point) => Point | null;
  maxMovePx: number;
}): Point {
  const { socketLocals, nearestHoleCenterLocal, maxMovePx } = options;
  if (!socketLocals.length) return { x: 0, y: 0 };

  const candidates: Point[] = [{ x: 0, y: 0 }];

  for (const p of socketLocals) {
    const center = nearestHoleCenterLocal(p);
    if (!center) continue;

    const dx = center.x - p.x;
    const dy = center.y - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= maxMovePx) {
      candidates.push({ x: dx, y: dy });
    }
  }

  const score = (d: Point) => {
    let sum = 0;
    for (const p of socketLocals) {
      const moved = { x: p.x + d.x, y: p.y + d.y };
      const center = nearestHoleCenterLocal(moved);
      if (!center) return Number.POSITIVE_INFINITY;
      const ex = moved.x - center.x;
      const ey = moved.y - center.y;
      sum += ex * ex + ey * ey;
    }

    // Prefer smaller deltas once fit quality is comparable.
    const d2 = d.x * d.x + d.y * d.y;
    return sum + d2 * 0.05;
  };

  let best = candidates[0];
  let bestScore = score(best);

  for (let i = 1; i < candidates.length; i++) {
    const s = score(candidates[i]);
    if (s < bestScore) {
      bestScore = s;
      best = candidates[i];
    }
  }

  return best;
}
