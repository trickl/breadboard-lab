import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { componentLibrary } from '@/core/component-library';
import type { ConnectionAppearance, ConnectionEndpointOrientation } from '@/ui-controller/types';
import { getDefaultConnectionAppearance } from '@/ui-react/rete/graph/defaultConnectionAppearance';

function normalizeSocketOrientation(
  v: unknown
): Exclude<ConnectionEndpointOrientation, 'auto'> | null {
  if (v === 'horizontal' || v === 'vertical') return v;
  return null;
}

/**
 * Determine how an auto-created wire should leave the component endpoint.
 *
 * Defaults:
 * - vertical for all components
 * - resistor: horizontal
 * - if the component references a library entry that specifies `ui.autoWireSocketOrientation`,
 *   that wins.
 */
export function getAutoWireComponentEndpointOrientation(
  component: AnyComponent | null
): Exclude<ConnectionEndpointOrientation, 'auto'> {
  if (component?.libraryId) {
    const entry = componentLibrary.get(component.libraryId);
    const fromLib = normalizeSocketOrientation(entry?.ui?.autoWireSocketOrientation);
    if (fromLib) return fromLib;
  }

  if (component?.type === ComponentType.RESISTOR) return 'horizontal';
  return 'vertical';
}

/**
 * Default appearance for auto-created smart-snap wires.
 *
 * Requirements:
 * 1) Board end is always curved and vertically aligned.
 * 2) Component end is curved and depends on component configuration.
 */
export function getAutoWireAppearanceForComponent(
  component: AnyComponent | null
): ConnectionAppearance {
  const base = getDefaultConnectionAppearance();

  return {
    ...base,
    style: 'curved',
    curved: {
      startOrientation: getAutoWireComponentEndpointOrientation(component),
      endOrientation: 'vertical',
    },
  };
}
