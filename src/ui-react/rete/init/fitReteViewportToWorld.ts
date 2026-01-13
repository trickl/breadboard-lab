import type React from 'react';
import type { AreaPlugin } from 'rete-area-plugin';

import { getBreadboardWorld, type BoardRotation } from '@/ui-react/world/breadboard-world';
import type { AreaExtra, Schemes } from '@/ui-react/rete/reteTypes';

export function fitReteViewportToWorld({
  container,
  area,
  rotationRef,
}: {
  container: HTMLDivElement;
  area: AreaPlugin<Schemes, AreaExtra>;
  rotationRef: React.MutableRefObject<BoardRotation>;
}) {
  // Initialize viewport to fit the breadboard world.
  // Rete is the only viewport in this mode.
  const bounds = container.getBoundingClientRect();
  const w = bounds.width || 1;
  const h = bounds.height || 1;
  const world = getBreadboardWorld(rotationRef.current);
  const kw = w / (world.total.width || 1);
  const kh = h / (world.total.height || 1);
  const k = Math.min(kw, kh) * 0.95;
  area.area.transform.k = Number.isFinite(k) && k > 0 ? k : 1;
  // Center the world.
  area.area.transform.x = (w - world.total.width * area.area.transform.k) / 2;
  area.area.transform.y = (h - world.total.height * area.area.transform.k) / 2;
  // rete-area-plugin's internal Area.update() is typed as private.
  // At runtime this is the correct way to apply the transform.
  (area.area as unknown as { update: () => void }).update();
}
