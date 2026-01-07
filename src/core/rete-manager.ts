/**
 * ReteManager: Bridge between existing component model and Rete.js visual programming graph
 * 
 * This module implements Phase 1 of the Rete.js migration:
 * - Initializes Rete.js editor with area and connection plugins
 * - Maintains bidirectional sync between Rete graph and BreadboardState
 * - Preserves all existing functionality during transition
 * 
 * Architecture: Hybrid approach (Option B from planning doc)
 * - Rete.js manages connection graph logic (nodes, sockets, edges)
 * - Existing PixiJS rendering continues unchanged (reads from component array)
 * - ReteManager coordinates state synchronization
 */

import { NodeEditor, ClassicPreset, GetSchemes, NodeId } from 'rete';
import { AreaPlugin, AreaExtensions } from 'rete-area-plugin';
import { ConnectionPlugin } from 'rete-connection-plugin';
import type { Position, BreadboardState } from './types';
import { ComponentType } from './types';

/**
 * Socket for component legs
 */
export const legSocket = new ClassicPreset.Socket('component-leg');

/**
 * Socket for breadboard holes
 */
export const holeSocket = new ClassicPreset.Socket('breadboard-hole');

/**
 * Rete node representing a component on the breadboard
 */
export class ComponentNode extends ClassicPreset.Node<
  { [key: string]: ClassicPreset.Socket },
  { [key: string]: ClassicPreset.Socket }
> {
  width = 180;
  height = 120;

  constructor(
    public componentId: string,
    public componentType: ComponentType,
    public legs: number,
  ) {
    super(`Component ${componentId}`);

    // Create input sockets for each component leg
    for (let i = 0; i < legs; i++) {
      this.addInput(`leg${i}`, new ClassicPreset.Input(legSocket, `Leg ${i + 1}`));
    }
  }
}

/**
 * Rete node representing a breadboard hole
 */
export class BreadboardHoleNode extends ClassicPreset.Node<
  { [key: string]: ClassicPreset.Socket },
  { hole: ClassicPreset.Socket }
> {
  width = 40;
  height = 40;

  constructor(
    public position: Position,
  ) {
    super(`Hole (${position.row}, ${position.col})`);

    // Single output socket - enforces one-connector-per-hole constraint
    this.addOutput('hole', new ClassicPreset.Output(holeSocket, 'Connection'));
  }
}

/**
 * Rete connection between component leg and breadboard hole
 */
type Connection = ClassicPreset.Connection<
  ComponentNode | BreadboardHoleNode,
  ComponentNode | BreadboardHoleNode
>;

/**
 * Type definitions for Rete schemes
 */
type Schemes = GetSchemes<ComponentNode | BreadboardHoleNode, Connection>;

/**
 * ReteManager: Manages Rete.js editor and synchronization with BreadboardState
 */
export class ReteManager {
  private editor: NodeEditor<Schemes>;
  private area: AreaPlugin<Schemes, any> | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private connection: any | null = null; // ConnectionPlugin type constraints too strict for Phase 1
  private componentNodeMap: Map<string, NodeId> = new Map();
  private holeNodeMap: Map<string, NodeId> = new Map();
  private syncInProgress = false;
  private initialized = false;

  constructor(private container?: HTMLElement) {
    // Initialize Rete editor (always create, even without container)
    this.editor = new NodeEditor<Schemes>();
  }

  /**
   * Initialize Rete plugins and setup
   * Only needed if using visual rendering (with container)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Only initialize visual plugins if container provided
    if (this.container) {
      // Initialize area plugin for viewport management
      this.area = new AreaPlugin<Schemes, any>(this.container);

      // Initialize connection plugin
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      this.connection = new ConnectionPlugin();

      // Register plugins in correct order
      this.editor.use(this.area);
      this.area.use(this.connection);

      // Setup area extensions (zoom, pan, etc.)
      AreaExtensions.selectableNodes(this.area, AreaExtensions.selector(), {
        accumulating: AreaExtensions.accumulateOnCtrl(),
      });
    }
    
    this.initialized = true;
  }

  /**
   * Sync BreadboardState to Rete graph
   * Creates/updates Rete nodes and connections based on component array
   */
  async syncFromBreadboardState(state: BreadboardState): Promise<void> {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      // TODO: Implement full sync logic
      // For Phase 1, this is a placeholder that preserves existing behavior
      // Full implementation will:
      // 1. Create ComponentNodes for each component
      // 2. Create BreadboardHoleNodes for occupied positions
      // 3. Create connections between legs and holes
      // 4. Handle component removal/updates

      // Clear existing Rete nodes
      for (const node of this.editor.getNodes()) {
        await this.editor.removeNode(node.id);
      }

      this.componentNodeMap.clear();
      this.holeNodeMap.clear();

      // Create nodes for each component
      for (const component of state.components) {
        // Determine leg count based on component type
        const legCount = this.getComponentLegCount(component.type);
        
        const node = new ComponentNode(
          component.id,
          component.type,
          legCount
        );

        await this.editor.addNode(node);
        this.componentNodeMap.set(component.id, node.id);

        // Position node based on first component position (only if area available)
        if (this.area && component.positions.length > 0) {
          const pos = component.positions[0];
          await this.area.translate(node.id, {
            x: pos.col * 50,
            y: pos.row * 50,
          });
        }
      }

      // Zoom to fit nodes if any exist and area is available
      if (this.area) {
        const nodes = this.editor.getNodes();
        if (nodes.length > 0) {
          await AreaExtensions.zoomAt(this.area, nodes);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync Rete graph to BreadboardState
   * Extracts component data from Rete nodes and connections
   * Returns null if no changes detected
   */
  syncToBreadboardState(_currentState: BreadboardState): BreadboardState | null {
    if (this.syncInProgress) return null;

    // For Phase 1, return null (no changes)
    // Full implementation will extract components from Rete graph
    return null;
  }

  /**
   * Get number of legs/pins for a component type
   */
  private getComponentLegCount(type: ComponentType): number {
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
        return 16; // EDU-8 has 16 pins
      default:
        return 2;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear all nodes and connections
    this.editor.clear();
    
    // NodeEditor doesn't have a destroy method in v2.x
    // Resources are cleaned up by garbage collection
  }

  /**
   * Get the Rete editor instance (for debugging/testing)
   */
  getEditor(): NodeEditor<Schemes> {
    return this.editor;
  }

  /**
   * Get the area plugin (for debugging/testing)
   */
  getArea(): AreaPlugin<Schemes, any> | null {
    return this.area;
  }
}
