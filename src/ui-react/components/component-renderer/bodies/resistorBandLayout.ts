import type { ColorBand } from '@/core/resistor-color-code';

export type ResistorBandRect = {
  band: ColorBand;
  /** Rect in resistor SVG viewBox coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Compute band rectangles in the resistor placeholder SVG viewBox.
 *
 * Band placement follows `docs/RESISTOR_RENDERING_SPEC.md` (end margins, band width, gaps).
 */
export function computeResistorBandRects(options: {
  bands: ColorBand[];
  /** X of the resistor body left end (not the lead). */
  bodyLeftX: number;
  /** X of the resistor body right end (not the lead). */
  bodyRightX: number;
  bodyTopY: number;
  bodyBottomY: number;
  /** Canonical body length in mm for IEC placement formulas. */
  bodyLengthMm?: number;
  /** Enable subtle deterministic imperfections. */
  jitter?: boolean;
  /** Seed for jitter. */
  seed?: number;
}): ResistorBandRect[] {
  const {
    bands,
    bodyLeftX,
    bodyRightX,
    bodyTopY,
    bodyBottomY,
    bodyLengthMm = 6.3,
    jitter = true,
    seed = 1,
  } = options;

  const Lb = bodyLengthMm;
  const Me = 0.12 * Lb;
  const Wmm = 0.085 * Lb;
  const Gmm = 0.05 * Lb;
  const Gtmm = 0.09 * Lb;

  const bodySpanVb = bodyRightX - bodyLeftX;
  const mmToVb = bodySpanVb / Lb;

  // Base placement scalars (viewBox units).
  const WBase = Wmm * mmToVb;
  const G = Gmm * mmToVb;
  const Gt = Gtmm * mmToVb;

  const endMarginVb = Me * mmToVb;
  const allowedLeft = bodyLeftX + endMarginVb;
  const allowedRight = bodyRightX - endMarginVb;

  // Start at left margin.
  const x0 = allowedLeft;

  const r = mulberry32(seed);

  // Jitter magnitudes from the spec.
  const jitterCenterVb = 0.03 * mmToVb;
  const jitterWidthPct = 0.03;

  // Height fills most of the body, leaving a small top/bottom margin.
  const h = (bodyBottomY - bodyTopY) * 0.9;
  const y = bodyTopY + (bodyBottomY - bodyTopY - h) / 2;

  const centers: number[] = [];

  // Placement strategy (matches the intent of the spec / real-world readability):
  // - the "digit+multiplier" bands form a left-aligned group
  // - the tolerance band is isolated and placed near the right end
  // - ensure the gap before tolerance is at least Gt (it can be larger if there's slack)
  //
  // This produces the familiar look (tolerance clearly separated) across typical body aspect ratios.
  const toleranceIndex = Math.max(0, bands.length - 1);
  const leftCount = toleranceIndex; // number of bands before tolerance

  // Some short bodies / longer codes (e.g. 6-band) can run out of room.
  // The spec suggests shrinking W by ~8–10% (without shrinking the tolerance gap).
  let widthScale = 1;
  let W = WBase;

  const computeCenters = () => {
    const tmp: number[] = new Array(bands.length);
    // Left group
    for (let i = 0; i < leftCount; i++) {
      tmp[i] = x0 + W / 2 + i * (W + G);
    }

    // Tolerance band: right-aligned within allowed region.
    tmp[toleranceIndex] = allowedRight - W / 2;
    return tmp;
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    W = WBase * widthScale;
    const tmp = computeCenters();

    if (bands.length <= 1) {
      centers.splice(0, centers.length, ...tmp);
      break;
    }

    const lastLeft = tmp[leftCount - 1];
    const tol = tmp[toleranceIndex];
    const lastLeftEdge = lastLeft + W / 2;
    const tolLeftEdge = tol - W / 2;
    const gap = tolLeftEdge - lastLeftEdge;

    if (gap >= Gt || leftCount === 0) {
      centers.splice(0, centers.length, ...tmp);
      break;
    }

    // Not enough space to keep the tolerance gap: shrink band width slightly and retry.
    widthScale *= 0.92;
  }

  const out: ResistorBandRect[] = [];

  // Apply subtle deterministic imperfections.
  for (let i = 0; i < bands.length; i++) {
    const baseCenter = centers[i];
    const jC = jitter ? (r() * 2 - 1) * jitterCenterVb : 0;
    const jW = jitter ? 1 + (r() * 2 - 1) * jitterWidthPct : 1;

    let width = clamp(W * jW, W * 0.85, W * 1.2);
    const center = baseCenter + jC;
    // Hard constraint from the spec: no band edge may enter the end margins.
    const maxWidth = Math.max(0, allowedRight - allowedLeft);
    if (width > maxWidth) width = maxWidth;

    let x = center - width / 2;
    if (x < allowedLeft) x = allowedLeft;
    if (x + width > allowedRight) x = allowedRight - width;

    out.push({
      band: bands[i],
      x,
      y,
      width,
      height: h,
    });
  }

  return out;
}
