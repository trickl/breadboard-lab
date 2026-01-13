import React from 'react';

import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '@/ui-react/geometry/breadboard-layout';
import { getComponentCenter } from '@/ui-react/components/component-renderer/geometry';
import { ResistorBody } from '@/ui-react/components/component-renderer/bodies/ResistorBody';
import { LEDBody } from '@/ui-react/components/component-renderer/bodies/LEDBody';
import { PowerSupplyBody } from '@/ui-react/components/component-renderer/bodies/PowerSupplyBody';
import { GroundBody } from '@/ui-react/components/component-renderer/bodies/GroundBody';
import { WireBody } from '@/ui-react/components/component-renderer/bodies/WireBody';
import { SwitchBody } from '@/ui-react/components/component-renderer/bodies/SwitchBody';
import { MicroprocessorBody } from '@/ui-react/components/component-renderer/bodies/MicroprocessorBody';

/**
 * ComponentBody - Renders the actual component shape
 */
export const ComponentBody: React.FC<{ component: AnyComponent }> = ({ component }) => {
  const positions = component.positions;
  if (positions.length === 0) return null;

  // Calculate center for rotation
  const centerPos = getComponentCenter(positions);
  const centerPixels = positionToPixels(centerPos);

  return (
    <g
      transform={
        component.rotation !== 0
          ? `rotate(${component.rotation} ${centerPixels.x} ${centerPixels.y})`
          : undefined
      }
    >
      {component.type === ComponentType.RESISTOR && <ResistorBody component={component} />}
      {component.type === ComponentType.LED && <LEDBody component={component} />}
      {component.type === ComponentType.POWER_SUPPLY && <PowerSupplyBody component={component} />}
      {component.type === ComponentType.GROUND && <GroundBody component={component} />}
      {component.type === ComponentType.WIRE && <WireBody component={component} />}
      {component.type === ComponentType.SWITCH && <SwitchBody component={component} />}
      {component.type === ComponentType.MICROPROCESSOR && (
        <MicroprocessorBody component={component} />
      )}
    </g>
  );
};
