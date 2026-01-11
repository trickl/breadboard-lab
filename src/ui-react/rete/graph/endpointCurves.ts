import type { ConnectionEndpointOrientation } from '@/ui-controller/types';

function signOrOne(v: number) {
  if (v === 0) return 1;
  return v > 0 ? 1 : -1;
}

function pickOrientation(
  preference: ConnectionEndpointOrientation,
  dx: number,
  dy: number
): Exclude<ConnectionEndpointOrientation, 'auto'> {
  if (preference !== 'auto') return preference;
  return Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
}

export function makeEndpointCurvedTransformer(options: {
  start: ConnectionEndpointOrientation;
  end: ConnectionEndpointOrientation;
  curvature: number;
}) {
  const { start, end, curvature } = options;

  return (points: Array<{ x: number; y: number }>) => {
    if (points.length !== 2) throw new Error('number of points should be equal to 2');
    const [p0, p1] = points;
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const sx = signOrOne(dx);
    const sy = signOrOne(dy);

    const startOri = pickOrientation(start, dx, dy);
    const endOri = pickOrientation(end, dx, dy);

    const xDistance = Math.abs(dx);
    const yDistance = Math.abs(dy);

    // Match the classic transformer scaling, but per-endpoint.
    const startCross = startOri === 'vertical' ? xDistance : yDistance;
    const startAlong = startOri === 'vertical' ? yDistance : xDistance;
    const endCross = endOri === 'vertical' ? xDistance : yDistance;
    const endAlong = endOri === 'vertical' ? yDistance : xDistance;

    const startOffset = Math.max(startCross / 2, startAlong) * curvature;
    const endOffset = Math.max(endCross / 2, endAlong) * curvature;

    const p0a =
      startOri === 'vertical'
        ? { x: p0.x, y: p0.y + sy * startOffset }
        : { x: p0.x + sx * startOffset, y: p0.y };
    const p1a =
      endOri === 'vertical'
        ? { x: p1.x, y: p1.y - sy * endOffset }
        : { x: p1.x - sx * endOffset, y: p1.y };

    return [p0, p0a, p1a, p1];
  };
}
