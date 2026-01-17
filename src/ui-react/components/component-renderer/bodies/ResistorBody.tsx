import React from 'react';

import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';
import { resistanceToColorBands, COLOR_TO_RGB } from '@/core/resistor-color-code';
import resistorPlaceholderUrl from '@/images/resistor-placeholder.svg';
import { computeTwoPointMatrixFromViewBoxAnchors } from '@/ui-react/components/component-renderer/svg/alignTwoPointImage';
import { componentLibrary } from '@/core/component-library';
import { computeResistorBandRects } from '@/ui-react/components/component-renderer/bodies/resistorBandLayout';

/**
 * ResistorBody - Renders resistor with color bands
 */
export const ResistorBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  if (component.type !== ComponentType.RESISTOR || component.positions.length < 2) return null;

  const start = positionToPixels(component.positions[0]);
  const end = positionToPixels(component.positions[1]);
  // The resistor SVG placeholder includes full legs. We align the leg tips to the two
  // socket points using a similarity transform.
  const iconLayout = {
    width: 160,
    height: 64,
    viewBox: { minX: 0, minY: 0, width: 160, height: 64 },
    preserveAspectRatio: 'xMidYMid meet' as const,
  };

  const legAnchors = {
    a0: { x: 0, y: 32 },
    a1: { x: 160, y: 32 },
  };

  const transform = computeTwoPointMatrixFromViewBoxAnchors(start, end, iconLayout, legAnchors);

  // Determine tolerance (and thus 4-band vs 5-band) from component settings when available.
  // Fallback to library metadata, then default to 4-band ±5% (gold), common in hobby kits.
  const tol = (() => {
    const explicit = (component as unknown as { tolerance?: unknown }).tolerance;
    if (typeof explicit === 'number' && isFinite(explicit) && explicit > 0) return explicit;

    if (component.libraryId) {
      const entry = componentLibrary.get(component.libraryId);
      const t = (entry?.electrical as unknown as { tolerance?: unknown })?.tolerance;
      if (typeof t === 'number' && isFinite(t) && t > 0) return t;
    }

    return 5;
  })();

  // Compute color bands per IEC 60062.
  let bands: ReturnType<typeof resistanceToColorBands> = [];
  try {
    bands = resistanceToColorBands(component.resistance, tol);
  } catch {
    bands = [];
  }

  // Placement constants for the current resistor placeholder SVG (viewBox coordinates).
  // These bounds correspond to the cylindrical body region (excluding leads).
  const BODY_LEFT_X = 37;
  const BODY_RIGHT_X = 123;
  const BODY_TOP_Y = 16.5;
  const BODY_BOTTOM_Y = 47.5;

  const bandRects = computeResistorBandRects({
    bands,
    bodyLeftX: BODY_LEFT_X,
    bodyRightX: BODY_RIGHT_X,
    bodyTopY: BODY_TOP_Y,
    bodyBottomY: BODY_BOTTOM_Y,
    bodyLengthMm: 6.3,
    jitter: true,
    // Deterministic seed so identical resistors look identical.
    seed: Math.floor(component.resistance * 1000) ^ (Math.floor(tol * 100) << 1),
  });

  const safeId = String(component.id).replace(/[^a-zA-Z0-9_-]/g, '_');
  const glossId = `resistor-band-gloss-${safeId}`;
  const blurId = `resistor-band-soft-${safeId}`;

  return (
    <>
      <g transform={transform} style={{ pointerEvents: 'none' }}>
        <defs>
          {/* Gloss highlight for band varnish (objectBoundingBox coords). */}
          <linearGradient id={glossId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.40" />
            <stop offset="0.45" stopColor="#ffffff" stopOpacity="0.10" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.00" />
          </linearGradient>

          {/* Soften band edges very slightly to avoid razor-sharp look. */}
          <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.35" />
          </filter>
        </defs>

        {/* Full-legged resistor icon */}
        <image
          href={resistorPlaceholderUrl}
          x={0}
          y={0}
          width={iconLayout.width}
          height={iconLayout.height}
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Dynamic color bands (IEC 60062; placed per docs/RESISTOR_RENDERING_SPEC.md). */}
        {bandRects.map((b, index) => {
          const fill = COLOR_TO_RGB[b.band.color];
          return (
            <g key={index}>
              {/* Soft edge underlay */}
              <rect
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                rx={1.2}
                fill={fill}
                opacity={0.28}
                filter={`url(#${blurId})`}
              />

              {/* Base band */}
              <rect
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                rx={1.2}
                fill={fill}
                opacity={0.96}
              />

              {/* Varnish gloss */}
              <rect
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                rx={1.2}
                fill={`url(#${glossId})`}
                opacity={0.55}
              />

              {/* Subtle raised edge */}
              <rect
                x={b.x + 0.2}
                y={b.y + 0.2}
                width={Math.max(0, b.width - 0.4)}
                height={Math.max(0, b.height - 0.4)}
                rx={1.1}
                fill="none"
                stroke="#000"
                strokeOpacity={0.18}
                strokeWidth={0.6}
              />
            </g>
          );
        })}
      </g>
    </>
  );
};
