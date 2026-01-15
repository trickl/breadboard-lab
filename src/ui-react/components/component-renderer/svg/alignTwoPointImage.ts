export type Point = { x: number; y: number };
export type ViewBox = { minX: number; minY: number; width: number; height: number };

export interface ImageLayout {
  /** The rendered <image> element width/height in the parent SVG coordinate system. */
  width: number;
  height: number;
  /** The SVG viewBox of the referenced SVG file (used to account for preserveAspectRatio). */
  viewBox: ViewBox;
  /** Only supports the mode we use everywhere today. */
  preserveAspectRatio?: 'xMidYMid meet';
}

export interface TwoAnchorSpec {
  /** Anchor points expressed in the *referenced SVG's viewBox coordinates*. */
  a0: Point;
  a1: Point;
}

export interface MultiAnchorSpec {
  /** Anchor points expressed in the *referenced SVG's viewBox coordinates*. */
  anchors: Point[];
}

function hypot2(dx: number, dy: number): number {
  return Math.hypot(dx, dy);
}

/**
 * Map a point from viewBox coordinates to the local coordinate system of an <image> element
 * with preserveAspectRatio="xMidYMid meet".
 */
export function viewBoxPointToImageLocal(p: Point, layout: ImageLayout): Point {
  const par = layout.preserveAspectRatio ?? 'xMidYMid meet';
  if (par !== 'xMidYMid meet') {
    // We can extend this later; for now keep it strict and explicit.
    throw new Error(`Unsupported preserveAspectRatio: ${par}`);
  }

  const { minX, minY, width: vbW, height: vbH } = layout.viewBox;
  const scale = Math.min(layout.width / vbW, layout.height / vbH);
  const offsetX = (layout.width - vbW * scale) / 2;
  const offsetY = (layout.height - vbH * scale) / 2;

  return {
    x: offsetX + (p.x - minX) * scale,
    y: offsetY + (p.y - minY) * scale,
  };
}

/**
 * Compute an SVG matrix() transform that maps two anchor points (a0,a1) in the image's
 * local coordinate space onto two target points (p0,p1) in the parent SVG space.
 *
 * This is a similarity transform (uniform scale + rotation + translation).
 */
export function computeTwoPointMatrix(p0: Point, p1: Point, a0: Point, a1: Point): string {
  const vAx = a1.x - a0.x;
  const vAy = a1.y - a0.y;
  const vPx = p1.x - p0.x;
  const vPy = p1.y - p0.y;

  const lenA = hypot2(vAx, vAy) || 1;
  const lenP = hypot2(vPx, vPy);

  const scale = lenP / lenA;
  const angleA = Math.atan2(vAy, vAx);
  const angleP = Math.atan2(vPy, vPx);
  const theta = angleP - angleA;

  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  // 2x2 rotation+scale matrix
  const a = scale * cos;
  const b = scale * sin;
  const c = scale * -sin;
  const d = scale * cos;

  // Translation so that a0 maps to p0
  const e = p0.x - (a * a0.x + c * a0.y);
  const f = p0.y - (b * a0.x + d * a0.y);

  // Use comma-separated syntax so the result works in BOTH:
  // - SVG transform="matrix(a b c d e f)" (SVG accepts commas or spaces)
  // - CSS transform: matrix(a, b, c, d, e, f) (CSS expects commas)
  return `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
}

/**
 * Convenience: anchors are expressed in viewBox coords, so we first map them into the
 * <image> local coords (accounting for preserveAspectRatio), then compute the matrix.
 */
export function computeTwoPointMatrixFromViewBoxAnchors(
  p0: Point,
  p1: Point,
  layout: ImageLayout,
  anchors: TwoAnchorSpec
): string {
  const a0 = viewBoxPointToImageLocal(anchors.a0, layout);
  const a1 = viewBoxPointToImageLocal(anchors.a1, layout);
  return computeTwoPointMatrix(p0, p1, a0, a1);
}

function centroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

/**
 * Compute a best-fit similarity transform (uniform scale + rotation + translation)
 * that maps anchor points A onto target points P in a least-squares sense.
 *
 * This is the multi-point generalization of computeTwoPointMatrix().
 */
export function computeBestFitSimilarityMatrix(targetPoints: Point[], anchorPoints: Point[]): string {
  if (targetPoints.length !== anchorPoints.length) {
    throw new Error(
      `computeBestFitSimilarityMatrix: point count mismatch (${targetPoints.length} vs ${anchorPoints.length})`
    );
  }
  if (targetPoints.length < 2) {
    throw new Error('computeBestFitSimilarityMatrix: need at least 2 points');
  }

  const cA = centroid(anchorPoints);
  const cP = centroid(targetPoints);

  // Centered coordinates.
  let sxx = 0;
  let sxy = 0;
  let denom = 0;

  for (let i = 0; i < targetPoints.length; i++) {
    const ax = anchorPoints[i].x - cA.x;
    const ay = anchorPoints[i].y - cA.y;
    const px = targetPoints[i].x - cP.x;
    const py = targetPoints[i].y - cP.y;

    // dot and cross terms used to estimate the optimal rotation in 2D
    sxx += ax * px + ay * py;
    sxy += ax * py - ay * px;
    denom += ax * ax + ay * ay;
  }

  const theta = Math.atan2(sxy, sxx);
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);

  // Best-fit uniform scale given the rotation.
  let numerScale = 0;
  for (let i = 0; i < targetPoints.length; i++) {
    const ax = anchorPoints[i].x - cA.x;
    const ay = anchorPoints[i].y - cA.y;
    const px = targetPoints[i].x - cP.x;
    const py = targetPoints[i].y - cP.y;

    const rax = cos * ax - sin * ay;
    const ray = sin * ax + cos * ay;
    numerScale += px * rax + py * ray;
  }

  const scale = denom > 0 ? numerScale / denom : 1;

  const a = scale * cos;
  const b = scale * sin;
  const c = scale * -sin;
  const d = scale * cos;

  // Translation so that centroid maps correctly.
  const e = cP.x - (a * cA.x + c * cA.y);
  const f = cP.y - (b * cA.x + d * cA.y);

  return `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
}

/**
 * Convenience for icons: anchors are expressed in viewBox coords, so we first map them into the
 * <image> local coords (accounting for preserveAspectRatio), then compute the best-fit matrix.
 */
export function computeBestFitSimilarityMatrixFromViewBoxAnchors(
  targetPoints: Point[],
  layout: ImageLayout,
  anchors: MultiAnchorSpec
): string {
  const anchorLocal = anchors.anchors.map((p) => viewBoxPointToImageLocal(p, layout));
  return computeBestFitSimilarityMatrix(targetPoints, anchorLocal);
}
