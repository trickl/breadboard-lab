import { SmoothZoom } from '@/ui-react/rete/SmoothZoom';
import type { AreaPlugin } from 'rete-area-plugin';

import type { AreaExtra, Schemes } from '@/ui-react/rete/reteTypes';

export function setupSmoothZoom(area: AreaPlugin<Schemes, AreaExtra>) {
  // Replace rete-area-plugin's default quantized wheel zoom with a smooth, animated zoom.
  // This keeps trackpads continuous and makes mouse-wheel zoom feel much less "steppy".
  area.area.setZoomHandler(
    new SmoothZoom(0.1, {
      wheelZoomSpeed: 0.001,
      smoothTimeMs: 120,
      perGestureFactorClamp: { min: 0.25, max: 4 },
    })
  );
}
