/**
 * ReteManager: Bridge between existing component model and Rete.js visual programming graph
 * 
 * This module implements Phase 1, 2, and 3 of the Rete.js migration:
 * - Phase 1: Initializes Rete.js editor with area and connection plugins
 * - Phase 2: Maintains bidirectional sync between Rete graph and BreadboardState
 * - Phase 3: Interactive connection creation with validation and event handling
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
 * Connection event handler callback type
 */
export type ConnectionEventHandler = (connection: Connection) => void | Promise<void>;

/**
 * Connection validation result
 */
export interface ConnectionValidation {
  valid: boolean;
  reason?: string;
}

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
export type Connection = ClassicPreset.Connection<
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
  
  // Phase 3: Connection event handlers
  private onConnectionCreatedHandler: ConnectionEventHandler | null = null;
  private onConnectionRemovedHandler: ConnectionEventHandler | null = null;
  private connectionValidatorHandler: ((connection: Connection) => ConnectionValidation) | null = null;

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
      
      // Phase 3: Setup connection event handlers
      this.setupConnectionHandlers();
    }
    
    this.initialized = true;
  }
  
  /**
   * Phase 3: Setup connection event listeners
   * Configures the ConnectionPlugin to handle create/remove events and validation
   */
  private setupConnectionHandlers(): void {
    if (!this.connection) return;
    
    // Listen for connection creation events
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    this.editor.addPipe((context) => {
      // Intercept connection add events
      if (context.type === 'connectioncreated') {
        const connection = context.data as Connection;
        
        // Validate connection before allowing it
        if (this.connectionValidatorHandler) {
          const validation = this.connectionValidatorHandler(connection);
          if (!validation.valid) {
            // Connection invalid - prevent it by not calling the handler
            console.warn(`Connection rejected: ${validation.reason || 'Unknown reason'}`);
            // Remove the connection immediately
            void this.editor.removeConnection(connection.id);
            return;
          }
        }
        
        // Call onCreate handler if registered
        if (this.onConnectionCreatedHandler) {
          void this.onConnectionCreatedHandler(connection);
        }
      }
      
      // Intercept connection remove events
      if (context.type === 'connectionremoved') {
        const connection = context.data as Connection;
        
        // Call onRemove handler if registered
        if (this.onConnectionRemovedHandler) {
          void this.onConnectionRemovedHandler(connection);
        }
      }
      
      return context;
    });
  }

  /**
   * Sync BreadboardState to Rete graph
   * Creates/updates Rete nodes and connections based on component array
   * 
   * Phase 2 Implementation:
   * - Creates ComponentNodes for each component
   * - Creates BreadboardHoleNodes for each occupied breadboard position
   * - Creates connections (edges) between component legs and holes
   * - Handles component rotation and position updates
   */
  async syncFromBreadboardState(state: BreadboardState): Promise<void> {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      // Clear existing Rete nodes and connections
      for (const node of this.editor.getNodes()) {
        await this.editor.removeNode(node.id);
      }

      this.componentNodeMap.clear();
      this.holeNodeMap.clear();

      // Step 1: Create BreadboardHoleNodes for all occupied positions
      // We need to collect all unique positions first
      const occupiedPositions = new Map<string, Position>();
      
      for (const component of state.components) {
        for (const pos of component.positions) {
          const key = this.positionToKey(pos);
          if (!occupiedPositions.has(key)) {
            occupiedPositions.set(key, pos);
          }
        }
      }

      // Create hole nodes
      for (const [key, pos] of occupiedPositions) {
        const holeNode = new BreadboardHoleNode(pos);
        await this.editor.addNode(holeNode);
        this.holeNodeMap.set(key, holeNode.id);

        // Position hole node if area available
        if (this.area) {
          await this.area.translate(holeNode.id, {
            x: pos.col * 50,
            y: pos.row * 50,
          });
        }
      }

      // Step 2: Create ComponentNodes for each component
      for (const component of state.components) {
        // Determine leg count based on component type
        const legCount = this.getComponentLegCount(component.type);
        
        const componentNode = new ComponentNode(
          component.id,
          component.type,
          legCount
        );

        await this.editor.addNode(componentNode);
        this.componentNodeMap.set(component.id, componentNode.id);

        // Position node based on first component position (only if area available)
        if (this.area && component.positions.length > 0) {
          const pos = component.positions[0];
          await this.area.translate(componentNode.id, {
            x: pos.col * 50 + 100, // Offset to not overlap with hole nodes
            y: pos.row * 50,
          });
        }

        // Step 3: Create connections between component legs and holes
        // Each position corresponds to a component leg in order
        for (let i = 0; i < component.positions.length && i < legCount; i++) {
          const pos = component.positions[i];
          const posKey = this.positionToKey(pos);
          const holeNodeId = this.holeNodeMap.get(posKey);

          if (holeNodeId) {
            // Get the hole node
            const holeNode = this.editor.getNode(holeNodeId);
            
            if (holeNode && holeNode instanceof BreadboardHoleNode) {
              // Create connection from hole to component leg
              // Connection direction: hole (output) -> component leg (input)
              const connection = new ClassicPreset.Connection(
                holeNode as ComponentNode | BreadboardHoleNode,
                'hole', // output socket
                componentNode as ComponentNode | BreadboardHoleNode,
                `leg${i}` // input socket
              ) as Connection;

              await this.editor.addConnection(connection);
            }
          }
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
   * 
   * Phase 2 Implementation:
   * Currently returns null as BreadboardState remains the source of truth
   * for component properties (resistance, voltage, etc.)
   * Rete graph is used for connectivity validation and constraint enforcement
   * Future phases may extract full state from Rete graph if needed
   */
  syncToBreadboardState(_currentState: BreadboardState): BreadboardState | null {
    if (this.syncInProgress) return null;

    // Phase 2: Return null as we're using hybrid approach
    // BreadboardState is source of truth for component properties
    // Rete graph is source of truth for connectivity
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
   * Convert position to string key for mapping
   */
  private positionToKey(pos: Position): string {
    return `${pos.row},${pos.col}`;
  }

  /**
   * Get all connections from the Rete graph
   */
  getConnections(): Connection[] {
    return this.editor.getConnections();
  }

  /**
   * Get component node by component ID
   */
  getComponentNode(componentId: string): ComponentNode | null {
    const nodeId = this.componentNodeMap.get(componentId);
    if (!nodeId) return null;
    
    const node = this.editor.getNode(nodeId);
    return node instanceof ComponentNode ? node : null;
  }

  /**
   * Get hole node by position
   */
  getHoleNode(pos: Position): BreadboardHoleNode | null {
    const key = this.positionToKey(pos);
    const nodeId = this.holeNodeMap.get(key);
    if (!nodeId) return null;
    
    const node = this.editor.getNode(nodeId);
    return node instanceof BreadboardHoleNode ? node : null;
  }

  /**
   * Get all hole nodes
   */
  getAllHoleNodes(): BreadboardHoleNode[] {
    const nodes: BreadboardHoleNode[] = [];
    for (const node of this.editor.getNodes()) {
      if (node instanceof BreadboardHoleNode) {
        nodes.push(node);
      }
    }
    return nodes;
  }

  /**
   * Get all component nodes
   */
  getAllComponentNodes(): ComponentNode[] {
    const nodes: ComponentNode[] = [];
    for (const node of this.editor.getNodes()) {
      if (node instanceof ComponentNode) {
        nodes.push(node);
      }
    }
    return nodes;
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
  
  /**
   * Phase 3: Register connection created event handler
   */
  onConnectionCreated(handler: ConnectionEventHandler): void {
    this.onConnectionCreatedHandler = handler;
  }
  
  /**
   * Phase 3: Register connection removed event handler
   */
  onConnectionRemoved(handler: ConnectionEventHandler): void {
    this.onConnectionRemovedHandler = handler;
  }
  
  /**
   * Phase 3: Register connection validator
   * Validator should return { valid: true } or { valid: false, reason: string }
   */
  setConnectionValidator(validator: (connection: Connection) => ConnectionValidation): void {
    this.connectionValidatorHandler = validator;
  }
  
  /**
   * Phase 3: Validate one-connector-per-hole constraint
   * Checks if a hole already has a connection before allowing a new one
   */
  validateOneConnectorPerHole(connection: Connection): ConnectionValidation {
    // Get the source and target nodes
    const sourceNode = this.editor.getNode(connection.source);
    const targetNode = this.editor.getNode(connection.target);
    
    // Check if either node is a BreadboardHoleNode
    let holeNode: BreadboardHoleNode | null = null;
    
    if (sourceNode instanceof BreadboardHoleNode) {
      holeNode = sourceNode;
    } else if (targetNode instanceof BreadboardHoleNode) {
      holeNode = targetNode;
    }
    
    if (!holeNode) {
      // No hole involved, connection is valid
      return { valid: true };
    }
    
    // Check if the hole already has a connection
    const existingConnections = this.editor.getConnections();
    const holeHasConnection = existingConnections.some(
      (conn) => 
        (conn.source === holeNode!.id || conn.target === holeNode!.id) &&
        conn.id !== connection.id // Don't count the current connection
    );
    
    if (holeHasConnection) {
      return {
        valid: false,
        reason: `Hole at (${holeNode.position.row}, ${holeNode.position.col}) is already occupied`
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Phase 3: Check if a hole is occupied (has a connection)
   */
  isHoleOccupied(pos: Position): boolean {
    const holeNode = this.getHoleNode(pos);
    if (!holeNode) return false;
    
    const connections = this.editor.getConnections();
    return connections.some(
      (conn) => conn.source === holeNode.id || conn.target === holeNode.id
    );
  }
  
  /**
   * Phase 3: Create a new ComponentNode and add it to the editor
   * Used for floating component placement workflow
   */
  async createFloatingComponent(
    componentId: string,
    componentType: ComponentType,
    position: { x: number; y: number }
  ): Promise<ComponentNode> {
    const legCount = this.getComponentLegCount(componentType);
    const componentNode = new ComponentNode(componentId, componentType, legCount);
    
    await this.editor.addNode(componentNode);
    this.componentNodeMap.set(componentId, componentNode.id);
    
    // Position the node if area is available
    if (this.area) {
      await this.area.translate(componentNode.id, position);
    }
    
    return componentNode;
  }
  
  /**
   * Phase 3: Create a connection between a component leg and a hole
   * Returns true if successful, false if validation failed
   */
  async createConnection(
    sourceNodeId: NodeId,
    sourceSocket: string,
    targetNodeId: NodeId,
    targetSocket: string
  ): Promise<boolean> {
    try {
      const sourceNode = this.editor.getNode(sourceNodeId);
      const targetNode = this.editor.getNode(targetNodeId);
      
      if (!sourceNode || !targetNode) {
        console.warn('Source or target node not found');
        return false;
      }
      
      const connection = new ClassicPreset.Connection(
        sourceNode as ComponentNode | BreadboardHoleNode,
        sourceSocket,
        targetNode as ComponentNode | BreadboardHoleNode,
        targetSocket
      ) as Connection;
      
      // Validate before adding
      if (this.connectionValidatorHandler) {
        const validation = this.connectionValidatorHandler(connection);
        if (!validation.valid) {
          console.warn(`Connection validation failed: ${validation.reason}`);
          return false;
        }
      }
      
      await this.editor.addConnection(connection);
      return true;
    } catch (error) {
      console.error('Error creating connection:', error);
      return false;
    }
  }
  
  /**
   * Wire re-routing: Re-route a connection endpoint to a new hole
   * Returns true if successful, false if validation failed
   */
  async rerouteConnection(
    connectionId: string,
    newHolePosition: Position,
    endpointType: 'source' | 'target'
  ): Promise<boolean> {
    try {
      // Find the connection
      const connection = this.editor.getConnections().find(c => c.id === connectionId);
      if (!connection) {
        console.warn(`Connection ${connectionId} not found`);
        return false;
      }
      
      // Get the new hole node
      const newHoleNode = this.getHoleNode(newHolePosition);
      if (!newHoleNode) {
        console.warn(`Hole at (${newHolePosition.row}, ${newHolePosition.col}) not found`);
        return false;
      }
      
      // Check if the new hole is already occupied (unless it's the other end of this connection)
      const otherEndNodeId = endpointType === 'source' ? connection.target : connection.source;
      if (newHoleNode.id !== otherEndNodeId && this.isHoleOccupied(newHolePosition)) {
        console.warn(`Hole at (${newHolePosition.row}, ${newHolePosition.col}) is already occupied`);
        return false;
      }
      
      // Remove the old connection
      await this.editor.removeConnection(connectionId);
      
      // Create a new connection with the updated endpoint
      const sourceNodeId = endpointType === 'source' ? newHoleNode.id : connection.source;
      const targetNodeId = endpointType === 'target' ? newHoleNode.id : connection.target;
      // Convert socket identifiers to strings (Rete connections can have string or number socket IDs)
      const sourceSocket = endpointType === 'source' ? 'hole' : String(connection.sourceOutput);
      const targetSocket = endpointType === 'target' ? 'hole' : String(connection.targetInput);
      
      return await this.createConnection(
        sourceNodeId,
        sourceSocket,
        targetNodeId,
        targetSocket
      );
    } catch (error) {
      console.error('Error re-routing connection:', error);
      return false;
    }
  }
}
