/**
 * ReteGraphLayer - Integrates Rete.js editor into React UI
 * 
 * This component:
 * - Creates and manages Rete editor instance
 * - Synchronizes component nodes with controller state
 * - Renders connections between component legs and breadboard holes
 * - Aligns Rete coordinate space with breadboard world space
 * - Manages pan/zoom synchronization (Rete as source of truth per DR-3)
 * 
 * Architecture Decision (DR-3): One shared coordinate system
 * - Rete's AreaPlugin manages viewport transform (pan/zoom)
 * - Rete transform is synchronized to parent SVG viewBox
 * - Eliminates coordinate drift between layers
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { NodeEditor, ClassicPreset } from 'rete';
import { AreaPlugin } from 'rete-area-plugin';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';
import { ReactPlugin, Presets as ReactPresets, type ClassicScheme } from 'rete-react-plugin';
import type { BreadboardController } from '@/ui-controller';
import type { AppState } from '@/ui-controller/types';
import type { AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { positionToPixels } from '../geometry/breadboard-layout';

/**
 * Socket for component legs
 */
const legSocket = new ClassicPreset.Socket('component-leg');

/**
 * Rete node representing a component on the breadboard
 */
class ComponentNode extends ClassicPreset.Node {
  width = 100;
  height = 60;

  constructor(
    public componentId: string,
    public componentType: ComponentType,
    public legs: number
  ) {
    super(componentType);

    // Create output sockets for each component leg
    for (let i = 0; i < legs; i++) {
      this.addOutput(`leg${i}`, new ClassicPreset.Output(legSocket, `Leg ${i}`));
    }
  }
}

type Schemes = ClassicScheme;

export interface ReteGraphLayerProps {
  controller: BreadboardController;
  svgRef: React.RefObject<SVGSVGElement>;
  onTransformChange?: (x: number, y: number, zoom: number) => void;
}

/**
 * Get number of legs/pins for a component type
 */
function getComponentLegCount(type: ComponentType): number {
  switch (type) {
    case ComponentType.RESISTOR:
      return 2;
    case ComponentType.LED:
      return 2;
    case ComponentType.WIRE:
      return 2;
    case ComponentType.POWER_SUPPLY:
      return 1;
    case ComponentType.GROUND:
      return 1;
    case ComponentType.MICROPROCESSOR:
      return 16;
    case ComponentType.SWITCH:
      return 2;
    default:
      return 2;
  }
}

/**
 * ReteGraphLayer - Renders Rete editor aligned with breadboard coordinate system
 */
export const ReteGraphLayer: React.FC<ReteGraphLayerProps> = ({ 
  controller, 
  onTransformChange 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<NodeEditor<Schemes> | null>(null);
  const areaRef = useRef<AreaPlugin<Schemes, any> | null>(null);
  const componentNodeMapRef = useRef<Map<string, string>>(new Map());

  // Initialize Rete editor
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const editor = new NodeEditor<Schemes>();
    const area = new AreaPlugin<Schemes, any>(container);
    const connection = new ConnectionPlugin<Schemes, any>();
    const render = new ReactPlugin<Schemes, any>({ createRoot });

    // Configure React renderer with classic preset
    render.addPreset(ReactPresets.classic.setup());

    // Configure connection renderer with classic preset
    connection.addPreset(ConnectionPresets.classic.setup());

    // Register plugins in correct order
    editor.use(area);
    area.use(connection);
    area.use(render);

    // Store references
    editorRef.current = editor;
    areaRef.current = area;

    // Listen for area transform changes to sync with SVG viewBox
    // This implements DR-3: Rete as source of truth for pan/zoom
    area.addPipe((context) => {
      if (context.type === 'transformed') {
        const transform = area.area.transform;
        if (onTransformChange) {
          onTransformChange(transform.x, transform.y, transform.k);
        }
      }
      return context;
    });

    // Cleanup on unmount
    return () => {
      if (area) {
        area.destroy();
      }
    };
  }, [onTransformChange]);

  // Synchronize component nodes with controller state
  const syncNodes = useCallback(async (state: AppState) => {
    const editor = editorRef.current;
    const area = areaRef.current;
    if (!editor || !area) return;

    const components = state.breadboard.components;
    const componentNodeMap = componentNodeMapRef.current;

    // Track which components should exist
    const currentComponentIds = new Set(components.map((c) => c.id));

    // Remove nodes for deleted components
    for (const [componentId, nodeId] of componentNodeMap.entries()) {
      if (!currentComponentIds.has(componentId)) {
        const node = editor.getNode(nodeId);
        if (node) {
          await editor.removeNode(nodeId);
        }
        componentNodeMap.delete(componentId);
      }
    }

    // Add or update nodes for current components
    for (const component of components) {
      let nodeId = componentNodeMap.get(component.id);
      let node: ComponentNode;

      if (nodeId) {
        // Node exists, get it
        const existingNode = editor.getNode(nodeId);
        if (existingNode && existingNode instanceof ComponentNode) {
          node = existingNode;
        } else {
          // Node missing, recreate
          node = await createComponentNode(editor, component);
          componentNodeMap.set(component.id, node.id);
        }
      } else {
        // Create new node
        node = await createComponentNode(editor, component);
        componentNodeMap.set(component.id, node.id);
      }

      // Update node position based on component's first position (world space)
      if (component.positions.length > 0) {
        const firstPos = component.positions[0];
        const worldCoords = positionToPixels(firstPos);
        
        // Position the node at the component's location
        await area.translate(node.id, {
          x: worldCoords.x - node.width / 2,
          y: worldCoords.y - node.height / 2,
        });
      }
    }
  }, []);

  // Helper to create a component node
  const createComponentNode = async (
    editor: NodeEditor<Schemes>,
    component: AnyComponent
  ): Promise<ComponentNode> => {
    const legCount = getComponentLegCount(component.type);
    const node = new ComponentNode(component.id, component.type, legCount);
    await editor.addNode(node);
    return node;
  };

  // Subscribe to controller state changes
  useEffect(() => {
    const unsubscribe = controller.subscribe((state) => {
      void syncNodes(state);
    });

    // Initial sync
    void syncNodes(controller.getState());

    return unsubscribe;
  }, [controller, syncNodes]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'all',
        zIndex: 10,
      }}
    />
  );
};
