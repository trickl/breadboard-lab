import type { Area2D } from 'rete-area-plugin';
import type { RerouteExtra } from 'rete-connection-reroute-plugin';
import type { ClassicScheme, ReactArea2D } from 'rete-react-plugin';

export type Schemes = ClassicScheme;

// Rete plugin typing note:
// Some plugins (e.g. reroute/path) are typed against a parent scope that includes Area2D signals.
// The official docs recommend including Area2D + renderer extras + plugin extras in one union.
export type AreaExtra = Area2D<Schemes> | ReactArea2D<Schemes> | RerouteExtra;
