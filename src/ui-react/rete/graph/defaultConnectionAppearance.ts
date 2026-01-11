import type { ConnectionAppearance } from '@/ui-controller/types';

export function getDefaultConnectionAppearance(): ConnectionAppearance {
  return {
    style: 'curved',
    color: '#3b82f6',
    curved: {
      startOrientation: 'auto',
      endOrientation: 'auto',
    },
  };
}
