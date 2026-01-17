import { describe, expect, it } from 'vitest';

import { ComponentType, type AnyComponent } from '@/core/types';
import {
  getAutoWireAppearanceForComponent,
  getAutoWireComponentEndpointOrientation,
} from '../autoWireDefaults';

describe('auto-wire defaults', () => {
  it('defaults component-end orientation to vertical when unspecified', () => {
    const led: AnyComponent = {
      id: 'led-1',
      type: ComponentType.LED,
      positions: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ],
      rotation: 0,
      forwardVoltage: 2,
      maxCurrent: 0.02,
      color: 'red',
    };

    expect(getAutoWireComponentEndpointOrientation(led)).toBe('vertical');

    const app = getAutoWireAppearanceForComponent(led);
    expect(app.style).toBe('curved');
    expect(app.curved.startOrientation).toBe('vertical');
    expect(app.curved.endOrientation).toBe('vertical');
  });

  it('uses horizontal component-end orientation for resistors', () => {
    const r: AnyComponent = {
      id: 'r-1',
      type: ComponentType.RESISTOR,
      positions: [
        { row: 2, col: 2 },
        { row: 2, col: 7 },
      ],
      rotation: 0,
      resistance: 220,
    };

    const app = getAutoWireAppearanceForComponent(r);
    expect(app.curved.startOrientation).toBe('horizontal');
    // Board end is always vertical.
    expect(app.curved.endOrientation).toBe('vertical');
  });
});
