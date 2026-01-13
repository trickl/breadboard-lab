import type React from 'react';
import { NodeEditor } from 'rete';
import { AreaPlugin } from 'rete-area-plugin';

import type { BreadboardController } from '@/ui-controller';
import type { ConnectionAppearance } from '@/ui-controller/types';
import type { BoardRotation } from '@/ui-react/world/breadboard-world';
import type { AreaExtra, Schemes } from '@/ui-react/rete/reteTypes';
import { setupConnectionDiagnosticsPipe } from '@/ui-react/rete/init/setupConnectionDiagnosticsPipe';
import { setupSmoothZoom } from '@/ui-react/rete/init/setupSmoothZoom';
import { setupRetePlugins } from '@/ui-react/rete/init/setupRetePlugins';
import { fitReteViewportToWorld } from '@/ui-react/rete/init/fitReteViewportToWorld';

export type InitializeReteEditorOptions = {
  container: HTMLDivElement;
  controller: BreadboardController;

  editorRef: React.MutableRefObject<NodeEditor<Schemes> | null>;
  areaRef: React.MutableRefObject<AreaPlugin<Schemes, AreaExtra> | null>;

  rotationRef: React.MutableRefObject<BoardRotation>;
  debugUiRef: React.MutableRefObject<{ showDebugOverlays: boolean }>;
  layerRef: React.MutableRefObject<HTMLDivElement | null>;

  connectionUiRef: React.MutableRefObject<{
    selectedConnectionId: string | null;
    appearanceById: Record<string, ConnectionAppearance>;
  }>;
};

export function initializeReteEditor({
  container,
  controller,
  editorRef,
  areaRef,
  rotationRef,
  debugUiRef,
  layerRef,
  connectionUiRef,
}: InitializeReteEditorOptions) {
  // React StrictMode intentionally mounts/unmounts components twice in development.
  // If a previous AreaPlugin instance didn't fully remove its DOM, we can end up
  // with "ghost" content underneath. Clearing the container makes initialization
  // idempotent and prevents duplicate breadboards.
  container.innerHTML = '';

  const editor = new NodeEditor<Schemes>();
  const area = new AreaPlugin<Schemes, AreaExtra>(container);

  setupConnectionDiagnosticsPipe(editor, debugUiRef);
  setupSmoothZoom(area);
  setupRetePlugins({
    editor,
    area,
    controller,
    editorRef,
    rotationRef,
    debugUiRef,
    layerRef,
    connectionUiRef,
  });

  // Store references
  editorRef.current = editor;
  areaRef.current = area;

  fitReteViewportToWorld({ container, area, rotationRef });

  // Cleanup on unmount
  return () => {
    if (area) {
      area.destroy();
    }

    // Ensure no leftover DOM from Rete/AreaPlugin remains.
    container.innerHTML = '';
  };
}
