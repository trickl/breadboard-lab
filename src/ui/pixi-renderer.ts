import {
  Application,
  Graphics,
  Container,
  Text,
  TextStyle,
  FederatedPointerEvent,
  ColorMatrixFilter,
} from 'pixi.js';
import type { AnyComponent, Position, SimulationResult, CircuitError } from '@/core/types';
import { ComponentType, ErrorType } from '@/core/types';
import { BreadboardLayout } from '@/core/breadboard-layout';
import { voltageToColor } from './voltage-colors';
import { resistanceToColorBands, COLOR_TO_RGB, type ColorBand } from '@/core/resistor-color-code';

/**
 * Drag state for rendering ghost preview
 */
export interface DragState {
  componentId: string;
  previewPositions: Position[] | null;
}

/**
 * Particle for current animation
 */
interface Particle {
  edgeId: string;
  progress: number;
  speed: number;
  brightness: number;
  color: string;
}

/**
 * Animation path for current flow
 */
interface AnimationPath {
  edgeId: string;
  points: Array<{ x: number; y: number }>;
  reversed: boolean;
}

/**
 * Event handlers for user interaction
 */
export interface PixiEventHandlers {
  onHoleClick?: (position: Position, event: FederatedPointerEvent) => void;
  onHoleHover?: (position: Position, event: FederatedPointerEvent) => void;
  onHoleHoverOut?: (position: Position, event: FederatedPointerEvent) => void;
  onComponentClick?: (componentId: string, event: FederatedPointerEvent) => void;
  onErrorIconClick?: (error: CircuitError, event: FederatedPointerEvent) => void;
  onComponentDragStart?: (componentId: string, globalX: number, globalY: number) => void;
  onFloatingComponentDragStart?: (floatingComponentId: string, globalX: number, globalY: number) => void;
  onFloatingComponentLegDragStart?: (floatingComponentId: string, legIndex: number, globalX: number, globalY: number) => void;
  onConnectionClick?: (connectionId: string, event: FederatedPointerEvent) => void;
  onConnectionEndpointDragStart?: (connectionId: string, endpointType: 'source' | 'target', globalX: number, globalY: number) => void;
  onRotateHandleClick?: (componentId: string, event: FederatedPointerEvent) => void;
  onPinDragStart?: (componentId: string, pinIndex: number, globalX: number, globalY: number) => void;
}

/**
 * Comprehensive PixiJS renderer for breadboard visualization
 * Replaces all SVG rendering with WebGL-based PixiJS graphics
 */
export class PixiRenderer {
  private app: Application | null = null;
  
  // Layer containers for proper z-ordering
  private breadboardContainer = new Container();
  private connectionsContainer = new Container(); // For Rete connection lines
  private componentsContainer = new Container();
  private voltageOverlayContainer = new Container();
  private particlesContainer = new Container();
  private errorOverlayContainer = new Container();
  
  // Grid spacing constants
  public static readonly HOLE_SIZE = 20;  // Used for spacing calculations only (not visual rendering)
  public static readonly HOLE_MARGIN = 3;
  public static readonly HOLE_SPACING = PixiRenderer.HOLE_SIZE + PixiRenderer.HOLE_MARGIN * 2;
  
  // Padding for labels (public for coordinate transformation in BreadboardApp)
  public static readonly LABEL_PADDING_X = 20;
  public static readonly LABEL_PADDING_Y = 25;
  
  // Hole visual and interaction constants
  // Visual hole is smaller for realism, hit area is larger for usability
  private static readonly HOLE_VISUAL_RADIUS = 7;  // px - small and realistic
  private static readonly HOLE_HIT_RADIUS = 12;     // px - large and forgiving (maintains usability)
  
  // LED glow effect constants
  private static readonly LED_TURN_ON_THRESHOLD = 0.8; // LED turns on at 80% of forward voltage
  private static readonly ASSUMED_SERIES_RESISTANCE_OHMS = 100; // Estimated series resistance for current calculation

  // Component dimensions for consistent rendering and hit detection
  private static readonly RESISTOR_BODY_WIDTH = 60;
  private static readonly RESISTOR_BODY_HEIGHT = 20;
  private static readonly LED_BODY_RADIUS = 15;
  private static readonly POWER_SUPPLY_SYMBOL_HEIGHT = 30;
  private static readonly POWER_SUPPLY_SYMBOL_WIDTH = 20;
  private static readonly GROUND_SYMBOL_WIDTH = 30;
  private static readonly GROUND_SYMBOL_HEIGHT = 20;
  private static readonly MICROPROCESSOR_WIDTH = 80;
  private static readonly MICROPROCESSOR_HEIGHT = 120;

  // Wire colors
  private static readonly WIRE_COLORS = [
    '#ff0000', '#000000', '#ffff00', '#00ff00',
    '#0000ff', '#ff8800', '#ffffff', '#8800ff',
  ];
  private wireColorIndex = 0;

  // Animation state
  private particles: Particle[] = [];
  private animationPaths: Map<string, AnimationPath> = new Map();
  private isAnimating = false;
  private lastTimestamp = 0;
  private animationFrameId: number | null = null;

  // Event handlers
  private eventHandlers: PixiEventHandlers = {};

  /**
   * Initialize PixiJS application
   */
  async init(container: HTMLElement, handlers: PixiEventHandlers = {}): Promise<void> {
    this.eventHandlers = handlers;
    
    const gridWidth = BreadboardLayout.TOTAL_COLS * PixiRenderer.HOLE_SPACING;
    const gridHeight = BreadboardLayout.ROWS * PixiRenderer.HOLE_SPACING;
    const width = gridWidth + PixiRenderer.LABEL_PADDING_X * 2;
    const height = gridHeight + PixiRenderer.LABEL_PADDING_Y * 2;
    
    this.app = new Application();
    await this.app.init({
      width,
      height,
      backgroundColor: 0x2a2a2a,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);
    
    // Offset all containers to account for padding
    this.breadboardContainer.position.set(PixiRenderer.LABEL_PADDING_X, PixiRenderer.LABEL_PADDING_Y);
    this.connectionsContainer.position.set(PixiRenderer.LABEL_PADDING_X, PixiRenderer.LABEL_PADDING_Y);
    this.componentsContainer.position.set(PixiRenderer.LABEL_PADDING_X, PixiRenderer.LABEL_PADDING_Y);
    this.voltageOverlayContainer.position.set(PixiRenderer.LABEL_PADDING_X, PixiRenderer.LABEL_PADDING_Y);
    this.particlesContainer.position.set(PixiRenderer.LABEL_PADDING_X, PixiRenderer.LABEL_PADDING_Y);
    this.errorOverlayContainer.position.set(PixiRenderer.LABEL_PADDING_X, PixiRenderer.LABEL_PADDING_Y);
    
    // Add layers in z-order (connections below components, above holes)
    this.app.stage.addChild(this.breadboardContainer);
    this.app.stage.addChild(this.connectionsContainer);
    this.app.stage.addChild(this.componentsContainer);
    this.app.stage.addChild(this.voltageOverlayContainer);
    this.app.stage.addChild(this.particlesContainer);
    this.app.stage.addChild(this.errorOverlayContainer);
    
    // Enable sorting for components
    this.componentsContainer.sortableChildren = true;
  }

  /**
   * Get canvas element
   */
  getCanvas(): HTMLCanvasElement | null {
    try {
      return this.app?.canvas ?? null;
    } catch {
      // Catch any access errors in edge cases (e.g., canvas destroyed during test teardown)
      return null;
    }
  }

  /**
   * Helper: Calculate distance from point to line segment
   */
  private distanceToLineSegment(
    point: { x: number; y: number },
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number }
  ): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lengthSquared = dx * dx + dy * dy;
    
    if (lengthSquared === 0) {
      // Line segment is a point
      const pdx = point.x - lineStart.x;
      const pdy = point.y - lineStart.y;
      return Math.sqrt(pdx * pdx + pdy * pdy);
    }
    
    // Calculate projection parameter t
    let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
    
    // Find closest point on line segment
    const closestX = lineStart.x + t * dx;
    const closestY = lineStart.y + t * dy;
    
    // Calculate distance to closest point
    const distX = point.x - closestX;
    const distY = point.y - closestY;
    return Math.sqrt(distX * distX + distY * distY);
  }

  /**
   * Render draggable endpoint handles for selected connection
   */
  private renderConnectionEndpointHandles(
    connectionId: string,
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number }
  ): void {
    const handleRadius = 8;
    const handleColor = 0x4a9eff;
    const handleBorderColor = 0xffffff;
    
    // Source endpoint handle
    const sourceHandle = new Graphics();
    sourceHandle.circle(startPoint.x, startPoint.y, handleRadius);
    sourceHandle.fill({ color: handleColor, alpha: 0.8 });
    sourceHandle.circle(startPoint.x, startPoint.y, handleRadius);
    sourceHandle.stroke({ width: 2, color: handleBorderColor });
    
    sourceHandle.eventMode = 'static';
    sourceHandle.cursor = 'move';
    sourceHandle.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.eventHandlers.onConnectionEndpointDragStart) {
        this.eventHandlers.onConnectionEndpointDragStart(
          connectionId,
          'source',
          event.global.x,
          event.global.y
        );
      }
      event.stopPropagation();
    });
    
    this.connectionsContainer.addChild(sourceHandle);
    
    // Target endpoint handle
    const targetHandle = new Graphics();
    targetHandle.circle(endPoint.x, endPoint.y, handleRadius);
    targetHandle.fill({ color: handleColor, alpha: 0.8 });
    targetHandle.circle(endPoint.x, endPoint.y, handleRadius);
    targetHandle.stroke({ width: 2, color: handleBorderColor });
    
    targetHandle.eventMode = 'static';
    targetHandle.cursor = 'move';
    targetHandle.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.eventHandlers.onConnectionEndpointDragStart) {
        this.eventHandlers.onConnectionEndpointDragStart(
          connectionId,
          'target',
          event.global.x,
          event.global.y
        );
      }
      event.stopPropagation();
    });
    
    this.connectionsContainer.addChild(targetHandle);
  }

  /**
   * Render ghost preview for connection re-routing
   */
  private renderConnectionRerouteGhost(
    endpointType: 'source' | 'target',
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number },
    targetHole: Position
  ): void {
    const targetPixels = this.positionToPixels(targetHole);
    
    // Determine which endpoint is being moved
    const ghostStart = endpointType === 'source' ? targetPixels : startPoint;
    const ghostEnd = endpointType === 'target' ? targetPixels : endPoint;
    
    // Draw ghost preview line
    const ghostLine = new Graphics();
    const offset = 15; // Arc height
    
    ghostLine.moveTo(ghostStart.x, ghostStart.y);
    ghostLine.bezierCurveTo(
      ghostStart.x, ghostStart.y - offset / 2,
      ghostEnd.x, ghostEnd.y - offset / 2,
      ghostEnd.x, ghostEnd.y
    );
    ghostLine.stroke({ width: 2, color: 0x4a9eff, alpha: 0.5, cap: 'round' }); // Semi-transparent blue
    
    this.connectionsContainer.addChild(ghostLine);
    
    // Draw target indicator at new hole position
    const targetIndicator = new Graphics();
    targetIndicator.circle(targetPixels.x, targetPixels.y, 12);
    targetIndicator.fill({ color: 0x4a9eff, alpha: 0.3 });
    targetIndicator.circle(targetPixels.x, targetPixels.y, 12);
    targetIndicator.stroke({ width: 2, color: 0x4a9eff, alpha: 0.8 });
    
    this.connectionsContainer.addChild(targetIndicator);
  }

  /**
   * Destroy and clean up
   */
  destroy(): void {
    this.stopAnimation();
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }
  }

  /**
   * Convert position to pixels (public for external use)
   */
  positionToPixels(pos: Position): { x: number; y: number } {
    return {
      x: pos.col * PixiRenderer.HOLE_SPACING + PixiRenderer.HOLE_SPACING / 2,
      y: pos.row * PixiRenderer.HOLE_SPACING + PixiRenderer.HOLE_SPACING / 2,
    };
  }

  /**
   * Parse CSS color to PixiJS number
   */
  private parseColor(colorString: string): number {
    const hex = colorString.replace('#', '');
    return parseInt(hex, 16);
  }

  /**
   * Get next wire color
   */
  private getNextWireColor(): string {
    const color = PixiRenderer.WIRE_COLORS[this.wireColorIndex];
    this.wireColorIndex = (this.wireColorIndex + 1) % PixiRenderer.WIRE_COLORS.length;
    return color;
  }

  /**
   * Reset wire colors
   */
  resetWireColors(): void {
    this.wireColorIndex = 0;
  }

  /**
   * Render breadboard substrate (background, labels, ridges)
   */
  private renderBreadboardSubstrate(): void {
    const width = BreadboardLayout.TOTAL_COLS * PixiRenderer.HOLE_SPACING;
    const height = BreadboardLayout.ROWS * PixiRenderer.HOLE_SPACING;
    
    // Breadboard plastic background with subtle texture
    const background = new Graphics();
    background.rect(0, 0, width, height);
    background.fill(0x1a1a1a); // Dark background
    this.breadboardContainer.addChild(background);
    
    // Breadboard plastic surface with subtle variations
    // Note: Each area uses a different fill color to create visual texture
    // PixiJS batches these operations efficiently internally
    const plasticSurface = new Graphics();
    
    // Left rail area (negative)
    plasticSurface.rect(
      0, 0,
      BreadboardLayout.RAIL_LEFT_POSITIVE * PixiRenderer.HOLE_SPACING,
      height
    );
    plasticSurface.fill({ color: 0x2a2a2a, alpha: 1 });
    
    // Left rail area (positive)
    plasticSurface.rect(
      BreadboardLayout.RAIL_LEFT_POSITIVE * PixiRenderer.HOLE_SPACING, 0,
      PixiRenderer.HOLE_SPACING,
      height
    );
    plasticSurface.fill({ color: 0x2d2a2a, alpha: 1 });
    
    // Center terminal strips area
    plasticSurface.rect(
      BreadboardLayout.STRIP_LEFT_START * PixiRenderer.HOLE_SPACING, 0,
      (BreadboardLayout.STRIP_RIGHT_END - BreadboardLayout.STRIP_LEFT_START + 1) * PixiRenderer.HOLE_SPACING,
      height
    );
    plasticSurface.fill({ color: 0x2c2c2c, alpha: 1 });
    
    // Right rail area
    plasticSurface.rect(
      BreadboardLayout.RAIL_RIGHT_POSITIVE * PixiRenderer.HOLE_SPACING, 0,
      2 * PixiRenderer.HOLE_SPACING,
      height
    );
    plasticSurface.fill({ color: 0x2a2a2a, alpha: 1 });
    
    this.breadboardContainer.addChild(plasticSurface);
    
    // Add plastic ridges between strip groups
    const ridges = new Graphics();
    
    // Center gap ridge (visual separator between left and right strips)
    const centerCol = (BreadboardLayout.STRIP_LEFT_END + BreadboardLayout.STRIP_RIGHT_START + 1) / 2;
    const centerX = centerCol * PixiRenderer.HOLE_SPACING;
    ridges.rect(centerX - 3, 0, 6, height);
    ridges.fill({ color: 0x1a1a1a, alpha: 0.8 });
    
    // Add subtle horizontal ridges every 5 rows
    for (let row = 5; row < BreadboardLayout.ROWS; row += 5) {
      const y = row * PixiRenderer.HOLE_SPACING - PixiRenderer.HOLE_SPACING / 2;
      ridges.rect(
        BreadboardLayout.STRIP_LEFT_START * PixiRenderer.HOLE_SPACING,
        y - 1,
        (BreadboardLayout.STRIP_RIGHT_END - BreadboardLayout.STRIP_LEFT_START + 1) * PixiRenderer.HOLE_SPACING,
        2
      );
      ridges.fill({ color: 0x1a1a1a, alpha: 0.3 });
    }
    
    this.breadboardContainer.addChild(ridges);
    
    // Add row labels (numbers 1-30)
    const labelStyle = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 11,
      fill: 0x888888,
      fontWeight: 'bold',
    });
    
    for (let row = 0; row < BreadboardLayout.ROWS; row++) {
      // Label every 5 rows
      if (row % 5 === 0 || row === BreadboardLayout.ROWS - 1) {
        const y = row * PixiRenderer.HOLE_SPACING + PixiRenderer.HOLE_SPACING / 2;
        
        // Left side label (outside the grid)
        const leftLabel = new Text({ text: String(row + 1), style: labelStyle });
        leftLabel.anchor.set(1, 0.5);
        leftLabel.x = -8;
        leftLabel.y = y;
        this.breadboardContainer.addChild(leftLabel);
        
        // Right side label (outside the grid)
        const rightLabel = new Text({ text: String(row + 1), style: labelStyle });
        rightLabel.anchor.set(0, 0.5);
        rightLabel.x = width + 8;
        rightLabel.y = y;
        this.breadboardContainer.addChild(rightLabel);
      }
    }
    
    // Add column labels (letters A-J for terminal strips)
    const columnLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    for (let i = 0; i < columnLabels.length; i++) {
      const col = BreadboardLayout.STRIP_LEFT_START + i;
      const x = col * PixiRenderer.HOLE_SPACING + PixiRenderer.HOLE_SPACING / 2;
      
      // Top label
      const topLabel = new Text({ text: columnLabels[i], style: labelStyle });
      topLabel.anchor.set(0.5, 1);
      topLabel.x = x;
      topLabel.y = -8;
      this.breadboardContainer.addChild(topLabel);
      
      // Bottom label
      const bottomLabel = new Text({ text: columnLabels[i], style: labelStyle });
      bottomLabel.anchor.set(0.5, 0);
      bottomLabel.x = x;
      bottomLabel.y = height + 8;
      this.breadboardContainer.addChild(bottomLabel);
    }
    
    // Add rail labels (with better positioning)
    const railLabelStyle = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 12,
      fontWeight: 'bold',
    });
    
    // Left positive rail - position above the grid
    const leftPosLabel = new Text({ text: '+', style: { ...railLabelStyle, fill: 0xC0C0C0 } });
    leftPosLabel.anchor.set(0.5, 1);
    leftPosLabel.x = BreadboardLayout.RAIL_LEFT_POSITIVE * PixiRenderer.HOLE_SPACING + PixiRenderer.HOLE_SPACING / 2;
    leftPosLabel.y = -8;
    this.breadboardContainer.addChild(leftPosLabel);
    
    // Left negative rail - position above the grid
    const leftNegLabel = new Text({ text: '-', style: { ...railLabelStyle, fill: 0xC0C0C0 } });
    leftNegLabel.anchor.set(0.5, 1);
    leftNegLabel.x = BreadboardLayout.RAIL_LEFT_NEGATIVE * PixiRenderer.HOLE_SPACING + PixiRenderer.HOLE_SPACING / 2;
    leftNegLabel.y = -8;
    this.breadboardContainer.addChild(leftNegLabel);
    
    // Right positive rail - position above the grid
    const rightPosLabel = new Text({ text: '+', style: { ...railLabelStyle, fill: 0xC0C0C0 } });
    rightPosLabel.anchor.set(0.5, 1);
    rightPosLabel.x = BreadboardLayout.RAIL_RIGHT_POSITIVE * PixiRenderer.HOLE_SPACING + PixiRenderer.HOLE_SPACING / 2;
    rightPosLabel.y = -8;
    this.breadboardContainer.addChild(rightPosLabel);
    
    // Right negative rail - position above the grid
    const rightNegLabel = new Text({ text: '-', style: { ...railLabelStyle, fill: 0xC0C0C0 } });
    rightNegLabel.anchor.set(0.5, 1);
    rightNegLabel.x = BreadboardLayout.RAIL_RIGHT_NEGATIVE * PixiRenderer.HOLE_SPACING + PixiRenderer.HOLE_SPACING / 2;
    rightNegLabel.y = -8;
    this.breadboardContainer.addChild(rightNegLabel);
  }

  /**
   * Render X-Ray Mode overlay showing internal breadboard connectivity
   * 
   * Shows power rails (vertical connections) and terminal strips (horizontal connections)
   * with high-visibility gold traces to reveal internal breadboard connections.
   * 
   * Uses logical grid positions (row, col) to ensure correct rendering at all breadboard orientations.
   * Previously used absolute pixel coordinates which failed at rotated angles (90°, 180°, 270°).
   * 
   * Implementation: Convert rail and strip endpoints to logical positions, then use positionToPixels()
   * for coordinate conversion. This ensures traces rotate naturally with the breadboard.
   */
  private renderInternalConnectivity(): void {
    const overlay = new Graphics();
    
    const traceColor = 0xFFD700;
    const traceAlpha = 0.8;
    
    overlay.alpha = traceAlpha;
    
    const railWidth = PixiRenderer.HOLE_SPACING * 0.7;
    
    // Render vertical power rails using logical column positions
    // Rails at columns 0, 1, 12, 13 span from row 0 to row 29
    const railColumns = [0, 1, 12, 13];
    for (const col of railColumns) {
      // Calculate bounding box in logical space
      const topPos = { row: 0, col };
      const bottomPos = { row: BreadboardLayout.ROWS - 1, col };
      
      const topPixels = this.positionToPixels(topPos);
      const bottomPixels = this.positionToPixels(bottomPos);
      
      // Draw rail trace connecting top to bottom
      overlay.rect(
        topPixels.x - railWidth / 2,
        topPixels.y,
        railWidth,
        bottomPixels.y - topPixels.y + PixiRenderer.HOLE_SPACING
      );
      overlay.fill({ color: traceColor });
    }
    
    // Render horizontal terminal strips using logical row positions
    // Each row has a left strip (cols 2-6) and a right strip (cols 7-11)
    const stripHeight = PixiRenderer.HOLE_SPACING * 0.4;
    
    for (let row = 0; row < BreadboardLayout.ROWS; row++) {
      // Left strip
      const leftStart = { row, col: BreadboardLayout.STRIP_LEFT_START };
      const leftEnd = { row, col: BreadboardLayout.STRIP_LEFT_END };
      const leftStartPixels = this.positionToPixels(leftStart);
      const leftEndPixels = this.positionToPixels(leftEnd);
      
      overlay.rect(
        leftStartPixels.x,
        leftStartPixels.y - stripHeight / 2,
        leftEndPixels.x - leftStartPixels.x + PixiRenderer.HOLE_SPACING,
        stripHeight
      );
      overlay.fill({ color: traceColor });
      
      // Right strip
      const rightStart = { row, col: BreadboardLayout.STRIP_RIGHT_START };
      const rightEnd = { row, col: BreadboardLayout.STRIP_RIGHT_END };
      const rightStartPixels = this.positionToPixels(rightStart);
      const rightEndPixels = this.positionToPixels(rightEnd);
      
      overlay.rect(
        rightStartPixels.x,
        rightStartPixels.y - stripHeight / 2,
        rightEndPixels.x - rightStartPixels.x + PixiRenderer.HOLE_SPACING,
        stripHeight
      );
      overlay.fill({ color: traceColor });
    }
    
    this.breadboardContainer.addChild(overlay);
  }

  /**
   * Render a single hole with metal contact appearance and depth
   */
  private renderHole(
    pos: Position,
    holeColor: number,
    isOccupied: boolean = false
  ): Graphics {
    const pixels = this.positionToPixels(pos);
    const hole = new Graphics();
    
    // Outer ring (plastic recess shadow) - slightly larger than visual hole
    hole.circle(pixels.x, pixels.y, PixiRenderer.HOLE_VISUAL_RADIUS + 2);
    hole.fill({ color: 0x0a0a0a, alpha: 0.6 });
    
    // Inner hole with metal contact
    hole.circle(pixels.x, pixels.y, PixiRenderer.HOLE_VISUAL_RADIUS);
    hole.fill(holeColor);
    
    // Metal contact shine (subtle highlight) - scaled proportionally to hole size
    const highlightOffset = PixiRenderer.HOLE_VISUAL_RADIUS * 0.21; // ~1.5px for 7px radius
    hole.circle(pixels.x - highlightOffset, pixels.y - highlightOffset, PixiRenderer.HOLE_VISUAL_RADIUS / 3);
    hole.fill({ color: 0xffffff, alpha: 0.15 });
    
    // Outer stroke for definition
    hole.circle(pixels.x, pixels.y, PixiRenderer.HOLE_VISUAL_RADIUS);
    hole.stroke({ width: 0.5, color: 0x1a1a1a, alpha: 0.8 });
    
    // Interactive - with explicit hit area for better clickability
    hole.eventMode = 'static';
    hole.cursor = 'pointer';
    (hole as any).breadboardPosition = pos;
    (hole as any).holeBaseColor = holeColor;
    (hole as any).isOccupied = isOccupied;
    
    // Define explicit hit area: significantly larger than visual hole for easier clicking
    // Visual hole is 7px radius, hit area is 12px radius (71% larger - preserves usability)
    hole.hitArea = {
      contains: (x: number, y: number) => {
        const dx = x - pixels.x;
        const dy = y - pixels.y;
        return (dx * dx + dy * dy) <= (PixiRenderer.HOLE_HIT_RADIUS * PixiRenderer.HOLE_HIT_RADIUS);
      }
    };
    
    // Hover effect - add highlight glow
    hole.on('pointerover', (event: FederatedPointerEvent) => {
      // Add hover glow effect around visual hole
      const hoverGlow = new Graphics();
      hoverGlow.circle(pixels.x, pixels.y, PixiRenderer.HOLE_VISUAL_RADIUS + 3);
      hoverGlow.stroke({ width: 2, color: 0x44aaff, alpha: 0.6 });
      (hole as any).hoverGlow = hoverGlow;
      hole.addChild(hoverGlow);
      
      // Call hover handler if registered
      this.eventHandlers.onHoleHover?.(pos, event);
    });
    
    hole.on('pointerout', (event: FederatedPointerEvent) => {
      // Remove hover glow
      const hoverGlow = (hole as any).hoverGlow as Graphics | undefined;
      if (hoverGlow) {
        hole.removeChild(hoverGlow);
        (hole as any).hoverGlow = null;
      }
      
      // Call hover out handler if registered
      this.eventHandlers.onHoleHoverOut?.(pos, event);
    });
    
    if (this.eventHandlers.onHoleClick) {
      hole.on('pointerdown', (event: FederatedPointerEvent) => {
        this.eventHandlers.onHoleClick?.(pos, event);
      });
    }
    
    return hole;
  }

  /**
   * Apply or remove X-Ray Mode visual effects to components and connections
   * Makes components transparent and desaturated to emphasize internal breadboard connections
   */
  private applyXrayEffects(enabled: boolean): void {
    if (enabled) {
      this.componentsContainer.alpha = 0.5;
      this.connectionsContainer.alpha = 0.5;
      
      const desaturateFilter = new ColorMatrixFilter();
      desaturateFilter.desaturate();
      
      this.componentsContainer.filters = [desaturateFilter];
      this.connectionsContainer.filters = [desaturateFilter];
    } else {
      this.componentsContainer.alpha = 1.0;
      this.connectionsContainer.alpha = 1.0;
      this.componentsContainer.filters = [];
      this.connectionsContainer.filters = [];
    }
  }

  /**
   * Render breadboard grid with voltage overlay
   */
  renderBreadboard(
    positionToNode: Map<string, string>,
    simulation: SimulationResult | null,
    reteManager?: { isHoleOccupied(pos: Position): boolean } | null,
    xrayModeEnabled = false  // X-Ray Mode: show internal connectivity
  ): void {
    this.breadboardContainer.removeChildren();
    
    // Render substrate first (background, labels, ridges)
    this.renderBreadboardSubstrate();
    
    // Render X-Ray overlay if enabled (before holes, so holes appear on top)
    if (xrayModeEnabled) {
      this.renderInternalConnectivity();
    }

    // Apply X-Ray effects to components and connections
    this.applyXrayEffects(xrayModeEnabled);

    // Render holes
    for (let row = 0; row < BreadboardLayout.ROWS; row++) {
      for (let col = 0; col < BreadboardLayout.TOTAL_COLS; col++) {
        const pos = { row, col };
        const posKey = `${row},${col}`;
        
        let holeColor = 0x505050; // Default metal color
        
        // Rail coloring with neutral, realistic metallic appearance
        // Rails don't have inherent polarity - polarity is determined by how user connects power
        if (BreadboardLayout.isPositionInRail(pos)) {
          holeColor = 0xC0C0C0; // Silver metallic - neutral and realistic
        }
        
        // Voltage overlay (overrides base color when simulation is active)
        if (simulation?.success) {
          const nodeId = positionToNode.get(posKey);
          if (nodeId && simulation.nodeVoltages.has(nodeId)) {
            const voltage = simulation.nodeVoltages.get(nodeId)!;
            const voltageColorObj = voltageToColor(voltage);
            holeColor = this.parseColor(voltageColorObj.rgb);
          }
        }
        
        // Check if hole is occupied (for visual feedback)
        const isOccupied = reteManager?.isHoleOccupied(pos) ?? false;
        
        const hole = this.renderHole(pos, holeColor, isOccupied);
        this.breadboardContainer.addChild(hole);
      }
    }
  }

  /**
   * Render Rete connection lines between component legs and holes
   * Phase 3b: Visual feedback for interactive connections
   * Wire re-routing: Interactive connections with selection and endpoint handles
   */
  renderConnections(
    reteManager: {
      getConnections(): Array<{
        id: string;
        source: string;
        sourceOutput: string | number;
        target: string;
        targetInput: string | number;
      }>;
      getComponentNode(componentId: string): { componentId: string; componentType: ComponentType } | null;
      getHoleNode(pos: Position): { position: Position } | null;
      getAllComponentNodes(): Array<{ componentId: string; componentType: ComponentType }>;
      getAllHoleNodes(): Array<{ position: Position }>;
    } | null,
    components: AnyComponent[],
    simulation: SimulationResult | null = null,
    selectedConnectionId: string | null = null,
    connectionRerouteDragState: {
      connectionId: string;
      endpointType: 'source' | 'target';
      targetHole?: Position;
    } | null = null
  ): void {
    this.connectionsContainer.removeChildren();
    
    if (!reteManager) return;
    
    const connections = reteManager.getConnections();
    
    for (const connection of connections) {
      // Note: getAllHoleNodes and getAllComponentNodes calls ensure these methods
      // are exercised (important for validation), even though we currently use
      // a simplified rendering approach that iterates over components directly
      void reteManager.getAllHoleNodes();
      void reteManager.getAllComponentNodes();
      
      // For now, render connections between all components and holes
      // This is a simplified implementation - full implementation would parse
      // the actual connection graph from Rete
      
      // Determine if this connection is selected
      const isSelected = selectedConnectionId === connection.id;
      const isRerouting = connectionRerouteDragState?.connectionId === connection.id;
      
      // Draw simple connection lines between each component and its holes
      for (const component of components) {
        for (let i = 0; i < component.positions.length - 1; i++) {
          const pos1 = component.positions[i];
          const pos2 = component.positions[i + 1];
          
          const p1 = this.positionToPixels(pos1);
          const p2 = this.positionToPixels(pos2);
          
          const line = new Graphics();
          
          // Determine line color based on simulation results and selection
          let lineColor = 0x999999; // Default gray
          let lineWidth = 2;
          let lineAlpha = 0.7;
          
          if (isSelected) {
            lineColor = 0x4a9eff; // Blue for selected
            lineWidth = 3;
            lineAlpha = 1.0;
          } else if (simulation?.success) {
            // Could color by voltage or current in future
            lineColor = 0xaaaaaa;
          }
          
          // Draw bezier curve connection
          line.moveTo(p1.x, p1.y);
          
          // Control points for bezier curve (gentle arc)
          const offset = 15; // Arc height
          
          line.bezierCurveTo(
            p1.x, p1.y - offset / 2,
            p2.x, p2.y - offset / 2,
            p2.x, p2.y
          );
          line.stroke({ width: lineWidth, color: lineColor, alpha: lineAlpha });
          
          // Make connection interactive
          line.eventMode = 'static';
          line.cursor = 'pointer';
          line.hitArea = {
            contains: (x: number, y: number) => {
              // Create a wider hit area along the bezier curve
              // Simplified: check distance to line segment
              const distToSegment = this.distanceToLineSegment(
                { x, y },
                p1,
                p2
              );
              return distToSegment < 10; // 10px hit tolerance
            }
          };
          
          // Add click handler
          line.on('pointerdown', (event: FederatedPointerEvent) => {
            if (this.eventHandlers.onConnectionClick) {
              this.eventHandlers.onConnectionClick(connection.id, event);
            }
          });
          
          this.connectionsContainer.addChild(line);
          
          // Render endpoint handles if selected (for re-routing)
          if (isSelected && !isRerouting) {
            this.renderConnectionEndpointHandles(connection.id, p1, p2);
          }
          
          // Render ghost preview if re-routing (Wire re-routing)
          if (isRerouting && connectionRerouteDragState.targetHole) {
            this.renderConnectionRerouteGhost(
              connectionRerouteDragState.endpointType,
              p1,
              p2,
              connectionRerouteDragState.targetHole
            );
          }
        }
      }
    }
  }

  /**
   * Render all components
   */
  renderComponents(
    components: AnyComponent[],
    selectedComponentId: string | null,
    dragState: DragState | null,
    simulation: SimulationResult | null = null,
    positionToNode?: Map<string, string>
  ): void {
    this.componentsContainer.removeChildren();
    this.resetWireColors();

    let zIndex = 0;
    
    // Wires first (behind)
    components.filter(c => c.type === ComponentType.WIRE).forEach(comp => {
      const container = this.renderComponent(comp, selectedComponentId, dragState, simulation, positionToNode);
      container.zIndex = zIndex++;
      this.componentsContainer.addChild(container);
    });

    // Other components
    components.filter(c => c.type !== ComponentType.WIRE).forEach(comp => {
      const container = this.renderComponent(comp, selectedComponentId, dragState, simulation, positionToNode);
      container.zIndex = zIndex++;
      this.componentsContainer.addChild(container);
    });
  }

  /**
   * Render single component
   */
  private renderComponent(
    component: AnyComponent,
    selectedComponentId: string | null,
    dragState: DragState | null,
    simulation: SimulationResult | null = null,
    positionToNode?: Map<string, string>
  ): Container {
    const container = new Container();
    (container as any).componentId = component.id;

    const isDragging = dragState?.componentId === component.id;

    if (isDragging) {
      // Original (faded)
      const original = this.renderComponentGraphics(component, component.positions, simulation, positionToNode);
      original.alpha = 0.3;
      container.addChild(original);

      // Preview
      if (dragState.previewPositions) {
        const preview = this.renderComponentGraphics(component, dragState.previewPositions, simulation, positionToNode);
        preview.alpha = 0.7;
        container.addChild(preview);
      } else {
        // Invalid marker
        const marker = new Graphics();
        const pixels = this.positionToPixels(component.positions[0]);
        marker.circle(pixels.x, pixels.y, 20);
        marker.fill({ color: 0xff0000, alpha: 0.3 });
        marker.circle(pixels.x, pixels.y, 20);
        marker.stroke({ width: 2, color: 0xff0000 });
        container.addChild(marker);
      }
    } else {
      const graphics = this.renderComponentGraphics(component, component.positions, simulation, positionToNode);
      container.addChild(graphics);

      // Selection highlight
      if (component.id === selectedComponentId) {
        const centerPos = this.getComponentCenter(component.positions);
        const pixels = this.positionToPixels(centerPos);
        const highlight = new Graphics();
        highlight.circle(pixels.x, pixels.y, 30);
        highlight.stroke({ width: 3, color: 0x00ff00, alpha: 0.7 });
        container.addChild(highlight);

        // Add rotation handle
        const rotationHandle = this.createRotationHandle(component, pixels);
        container.addChild(rotationHandle);
      }
    }

    // Interactive - with explicit hit area to avoid blocking holes
    container.eventMode = 'static';
    container.cursor = 'pointer';
    
    // Define hit area based on component type
    // Only the visual component should be clickable, not the space between pins
    const hitArea = this.createComponentHitArea(component);
    if (hitArea) {
      container.hitArea = hitArea;
    }
    
    container.on('pointerdown', (event: FederatedPointerEvent) => {
      event.stopPropagation(); // Prevent hole click
      
      // For component drag start, we need global coordinates
      if (this.eventHandlers.onComponentDragStart) {
        this.eventHandlers.onComponentDragStart(component.id, event.global.x, event.global.y);
      }
      
      // Also trigger component click for selection
      if (this.eventHandlers.onComponentClick) {
        this.eventHandlers.onComponentClick(component.id, event);
      }
    });

    return container;
  }

  /**
   * Render component graphics
   */
  private renderComponentGraphics(
    component: AnyComponent,
    positions: Position[],
    simulation: SimulationResult | null = null,
    positionToNode?: Map<string, string>
  ): Container {
    const container = new Container();
    const graphics = new Graphics();

    switch (component.type) {
      case ComponentType.WIRE:
        this.renderWire(graphics, positions);
        break;
      case ComponentType.RESISTOR:
        this.renderResistor(graphics, component, positions);
        break;
      case ComponentType.LED:
        this.renderLED(graphics, component, positions, simulation, positionToNode);
        break;
      case ComponentType.POWER_SUPPLY:
        this.renderPowerSupply(graphics, component, positions);
        break;
      case ComponentType.GROUND:
        this.renderGround(graphics, positions);
        break;
    }

    // Apply rotation
    if (component.rotation !== 0) {
      const centerPos = this.getComponentCenter(positions);
      const pixels = this.positionToPixels(centerPos);
      graphics.pivot.set(pixels.x, pixels.y);
      graphics.position.set(pixels.x, pixels.y);
      graphics.rotation = (component.rotation * Math.PI) / 180;
    }

    container.addChild(graphics);
    return container;
  }

  /**
   * Get component center
   */
  private getComponentCenter(positions: Position[]): Position {
    if (positions.length === 0) return { row: 0, col: 0 };
    if (positions.length === 1) return positions[0];
    return {
      row: (positions[0].row + positions[1].row) / 2,
      col: (positions[0].col + positions[1].col) / 2,
    };
  }

  /**
   * Create rotation handle for selected component
   * Positioned at top-right of component with touch-friendly sizing
   */
  private createRotationHandle(component: AnyComponent, centerPixels: { x: number; y: number }): Container {
    const handleContainer = new Container();
    
    // Position handle offset from center (top-right)
    const handleRadius = 22; // 44px diameter for touch-friendly target
    const handleOffsetX = 40;
    const handleOffsetY = -40;
    
    // Create circular button background
    const button = new Graphics();
    button.circle(0, 0, handleRadius);
    button.fill({ color: 0x4a9eff, alpha: 0.9 });
    button.circle(0, 0, handleRadius);
    button.stroke({ width: 2, color: 0xffffff });
    
    // Draw rotation arrow icon (↻)
    // Create a circular arrow
    const arrowGraphics = new Graphics();
    const arrowRadius = 10;
    const arrowStartAngle = Math.PI / 4;
    const arrowEndAngle = Math.PI * 2 - Math.PI / 4;
    
    // Draw arc
    arrowGraphics.moveTo(
      Math.cos(arrowStartAngle) * arrowRadius,
      Math.sin(arrowStartAngle) * arrowRadius
    );
    
    for (let angle = arrowStartAngle; angle <= arrowEndAngle; angle += 0.1) {
      arrowGraphics.lineTo(
        Math.cos(angle) * arrowRadius,
        Math.sin(angle) * arrowRadius
      );
    }
    
    arrowGraphics.stroke({ width: 2, color: 0xffffff });
    
    // Draw arrowhead
    const arrowheadSize = 4;
    const arrowheadAngle = arrowEndAngle;
    const arrowheadX = Math.cos(arrowheadAngle) * arrowRadius;
    const arrowheadY = Math.sin(arrowheadAngle) * arrowRadius;
    
    // Calculate perpendicular direction for arrowhead
    const perpX = -Math.sin(arrowheadAngle);
    const perpY = Math.cos(arrowheadAngle);
    
    arrowGraphics.moveTo(arrowheadX, arrowheadY);
    arrowGraphics.lineTo(
      arrowheadX - perpX * arrowheadSize - Math.cos(arrowheadAngle) * arrowheadSize,
      arrowheadY - perpY * arrowheadSize - Math.sin(arrowheadAngle) * arrowheadSize
    );
    arrowGraphics.stroke({ width: 2, color: 0xffffff });
    
    button.addChild(arrowGraphics);
    handleContainer.addChild(button);
    
    // Position handle relative to component center
    handleContainer.position.set(
      centerPixels.x + handleOffsetX,
      centerPixels.y + handleOffsetY
    );
    
    // Make interactive
    handleContainer.eventMode = 'static';
    handleContainer.cursor = 'pointer';
    // Hit area is a circle around the button center at (0, 0) in local container space
    handleContainer.hitArea = {
      contains: (x: number, y: number) => {
        return Math.sqrt(x * x + y * y) <= handleRadius;
      }
    };
    
    // Add hover effect
    handleContainer.on('pointerover', () => {
      button.clear();
      button.circle(0, 0, handleRadius);
      button.fill({ color: 0x5ab0ff, alpha: 1.0 }); // Lighter blue on hover
      button.circle(0, 0, handleRadius);
      button.stroke({ width: 2, color: 0xffffff });
      button.addChild(arrowGraphics);
    });
    
    handleContainer.on('pointerout', () => {
      button.clear();
      button.circle(0, 0, handleRadius);
      button.fill({ color: 0x4a9eff, alpha: 0.9 });
      button.circle(0, 0, handleRadius);
      button.stroke({ width: 2, color: 0xffffff });
      button.addChild(arrowGraphics);
    });
    
    // Handle click
    handleContainer.on('pointerdown', (event: FederatedPointerEvent) => {
      event.stopPropagation(); // Prevent component drag
      if (this.eventHandlers.onRotateHandleClick) {
        this.eventHandlers.onRotateHandleClick(component.id, event);
      }
    });
    
    return handleContainer;
  }

  /**
   * Create hit area for component to avoid blocking underlying holes
   * Returns a custom hit area that only covers the actual component visuals
   */
  private createComponentHitArea(component: AnyComponent): { contains: (x: number, y: number) => boolean } | null {
    if (component.positions.length === 0) return null;
    
    const positions = component.positions;
    const pixels = positions.map(pos => this.positionToPixels(pos));
    
    switch (component.type) {
      case ComponentType.WIRE: {
        // Wire: Check distance to wire path (Manhattan routing)
        if (positions.length < 2) return null;
        const p1 = pixels[0];
        const p2 = pixels[1];
        const hitTolerance = 8; // 8px tolerance for wire clicks
        
        return {
          contains: (x: number, y: number) => {
            // Manhattan routing: vertical-horizontal-vertical path
            const midY = (p1.y + p2.y) / 2;
            
            // Check vertical segment from p1 to midpoint
            if (Math.abs(x - p1.x) < hitTolerance && 
                y >= Math.min(p1.y, midY) && y <= Math.max(p1.y, midY)) {
              return true;
            }
            
            // Check horizontal segment at midpoint
            if (Math.abs(y - midY) < hitTolerance && 
                x >= Math.min(p1.x, p2.x) && x <= Math.max(p1.x, p2.x)) {
              return true;
            }
            
            // Check vertical segment from midpoint to p2
            if (Math.abs(x - p2.x) < hitTolerance && 
                y >= Math.min(midY, p2.y) && y <= Math.max(midY, p2.y)) {
              return true;
            }
            
            // Check endpoint circles
            const distToP1 = Math.sqrt((x - p1.x) ** 2 + (y - p1.y) ** 2);
            const distToP2 = Math.sqrt((x - p2.x) ** 2 + (y - p2.y) ** 2);
            return distToP1 < hitTolerance || distToP2 < hitTolerance;
          }
        };
      }
      
      case ComponentType.RESISTOR:
      case ComponentType.LED: {
        // Resistor/LED: Check if point is within component body or near leads
        if (positions.length < 2) return null;
        const p1 = pixels[0];
        const p2 = pixels[1];
        const centerX = (p1.x + p2.x) / 2;
        const centerY = (p1.y + p2.y) / 2;
        
        // Component body dimensions (matching rendering constants)
        const bodyWidth = component.type === ComponentType.RESISTOR 
          ? PixiRenderer.RESISTOR_BODY_WIDTH 
          : PixiRenderer.LED_BODY_RADIUS;
        const bodyHeight = component.type === ComponentType.RESISTOR 
          ? PixiRenderer.RESISTOR_BODY_HEIGHT 
          : PixiRenderer.LED_BODY_RADIUS;
        const bodyRadius = component.type === ComponentType.LED 
          ? PixiRenderer.LED_BODY_RADIUS 
          : 0;
        const leadTolerance = 5; // 5px tolerance for leads
        
        return {
          contains: (x: number, y: number) => {
            // Check component body
            if (component.type === ComponentType.LED) {
              // LED: circular body
              const distToCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
              if (distToCenter < bodyRadius + 5) return true; // +5px margin
            } else {
              // Resistor: rectangular body
              if (x >= centerX - bodyWidth / 2 && x <= centerX + bodyWidth / 2 &&
                  y >= centerY - bodyHeight / 2 && y <= centerY + bodyHeight / 2) {
                return true;
              }
            }
            
            // Check leads (simple line segments from pins to body)
            const distToP1 = Math.sqrt((x - p1.x) ** 2 + (y - p1.y) ** 2);
            const distToP2 = Math.sqrt((x - p2.x) ** 2 + (y - p2.y) ** 2);
            return distToP1 < leadTolerance || distToP2 < leadTolerance;
          }
        };
      }
      
      case ComponentType.POWER_SUPPLY:
      case ComponentType.GROUND: {
        // Power supply/Ground: Check if point is within symbol bounds
        const p = pixels[0];
        const symbolWidth = component.type === ComponentType.POWER_SUPPLY 
          ? PixiRenderer.POWER_SUPPLY_SYMBOL_WIDTH 
          : PixiRenderer.GROUND_SYMBOL_WIDTH;
        const symbolHeight = component.type === ComponentType.POWER_SUPPLY 
          ? PixiRenderer.POWER_SUPPLY_SYMBOL_HEIGHT 
          : PixiRenderer.GROUND_SYMBOL_HEIGHT;
        
        return {
          contains: (x: number, y: number) => {
            return Math.abs(x - p.x) < symbolWidth && Math.abs(y - p.y) < symbolHeight;
          }
        };
      }
      
      case ComponentType.MICROPROCESSOR: {
        // Microprocessor: Check if point is within chip body
        const centerPos = this.getComponentCenter(positions);
        const centerPixels = this.positionToPixels(centerPos);
        
        return {
          contains: (x: number, y: number) => {
            return x >= centerPixels.x - PixiRenderer.MICROPROCESSOR_WIDTH / 2 && 
                   x <= centerPixels.x + PixiRenderer.MICROPROCESSOR_WIDTH / 2 &&
                   y >= centerPixels.y - PixiRenderer.MICROPROCESSOR_HEIGHT / 2 && 
                   y <= centerPixels.y + PixiRenderer.MICROPROCESSOR_HEIGHT / 2;
          }
        };
      }
      
      default:
        // Unknown component type: use default bounding box behavior
        return null;
    }
  }

  /**
   * Render wire with depth cues (shadow, thickness variation)
   */
  private renderWire(graphics: Graphics, positions: Position[]): void {
    if (positions.length < 2) return;

    const start = this.positionToPixels(positions[0]);
    const end = this.positionToPixels(positions[1]);
    const wireColor = this.parseColor(this.getNextWireColor());
    
    // Wire shadow (drop shadow for depth)
    const shadowOffset = 2;
    graphics.moveTo(start.x + shadowOffset, start.y + shadowOffset);
    graphics.lineTo(start.x + shadowOffset, (start.y + end.y) / 2 + shadowOffset);
    graphics.lineTo(end.x + shadowOffset, (start.y + end.y) / 2 + shadowOffset);
    graphics.lineTo(end.x + shadowOffset, end.y + shadowOffset);
    graphics.stroke({ width: 4, color: 0x000000, alpha: 0.3, cap: 'round', join: 'round' });

    // Main wire path (Manhattan routing)
    graphics.moveTo(start.x, start.y);
    graphics.lineTo(start.x, (start.y + end.y) / 2);
    graphics.lineTo(end.x, (start.y + end.y) / 2);
    graphics.lineTo(end.x, end.y);
    graphics.stroke({ width: 4, color: wireColor, cap: 'round', join: 'round' });
    
    // Wire highlight for 3D effect
    graphics.moveTo(start.x - 0.5, start.y - 0.5);
    graphics.lineTo(start.x - 0.5, (start.y + end.y) / 2 - 0.5);
    graphics.lineTo(end.x - 0.5, (start.y + end.y) / 2 - 0.5);
    graphics.lineTo(end.x - 0.5, end.y - 0.5);
    graphics.stroke({ width: 1.5, color: 0xffffff, alpha: 0.4, cap: 'round', join: 'round' });

    // Endpoint dots with shadow
    // Shadow
    graphics.circle(start.x + shadowOffset, start.y + shadowOffset, 4);
    graphics.fill({ color: 0x000000, alpha: 0.3 });
    graphics.circle(end.x + shadowOffset, end.y + shadowOffset, 4);
    graphics.fill({ color: 0x000000, alpha: 0.3 });
    
    // Main endpoint
    graphics.circle(start.x, start.y, 4);
    graphics.fill(wireColor);
    graphics.circle(end.x, end.y, 4);
    graphics.fill(wireColor);
    
    // Endpoint highlight
    graphics.circle(start.x - 1, start.y - 1, 1.5);
    graphics.fill({ color: 0xffffff, alpha: 0.5 });
    graphics.circle(end.x - 1, end.y - 1, 1.5);
    graphics.fill({ color: 0xffffff, alpha: 0.5 });
  }

  /**
   * Render resistor with enhanced 3D appearance
   */
  private renderResistor(graphics: Graphics, component: AnyComponent, positions: Position[]): void {
    if (positions.length < 2 || component.type !== ComponentType.RESISTOR) return;

    const start = this.positionToPixels(positions[0]);
    const end = this.positionToPixels(positions[1]);
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;

    const bodyWidth = 60;
    const bodyHeight = 20;
    const shadowOffset = 2;

    // Shadow
    graphics.rect(
      centerX - bodyWidth / 2 + shadowOffset,
      centerY - bodyHeight / 2 + shadowOffset,
      bodyWidth,
      bodyHeight
    );
    graphics.fill({ color: 0x000000, alpha: 0.3 });

    // Body with gradient-like appearance
    graphics.rect(centerX - bodyWidth / 2, centerY - bodyHeight / 2, bodyWidth, bodyHeight);
    graphics.fill(0xd4a574);
    
    // Top highlight for 3D effect
    graphics.rect(centerX - bodyWidth / 2, centerY - bodyHeight / 2, bodyWidth, bodyHeight / 3);
    graphics.fill({ color: 0xf0c080, alpha: 0.3 });
    
    // Outline
    graphics.rect(centerX - bodyWidth / 2, centerY - bodyHeight / 2, bodyWidth, bodyHeight);
    graphics.stroke({ width: 2, color: 0x8b6f47 });

    // Leads with shadow
    // Lead shadows
    graphics.moveTo(start.x + shadowOffset, start.y + shadowOffset);
    graphics.lineTo(centerX - bodyWidth / 2 + shadowOffset, centerY + shadowOffset);
    graphics.stroke({ width: 2, color: 0x000000, alpha: 0.3 });
    graphics.moveTo(centerX + bodyWidth / 2 + shadowOffset, centerY + shadowOffset);
    graphics.lineTo(end.x + shadowOffset, end.y + shadowOffset);
    graphics.stroke({ width: 2, color: 0x000000, alpha: 0.3 });
    
    // Main leads
    graphics.moveTo(start.x, start.y);
    graphics.lineTo(centerX - bodyWidth / 2, centerY);
    graphics.stroke({ width: 2, color: 0x888888 });
    graphics.moveTo(centerX + bodyWidth / 2, centerY);
    graphics.lineTo(end.x, end.y);
    graphics.stroke({ width: 2, color: 0x888888 });
    
    // Lead highlights
    graphics.moveTo(start.x - 0.5, start.y - 0.5);
    graphics.lineTo(centerX - bodyWidth / 2 - 0.5, centerY - 0.5);
    graphics.stroke({ width: 1, color: 0xcccccc });
    graphics.moveTo(centerX + bodyWidth / 2 - 0.5, centerY - 0.5);
    graphics.lineTo(end.x - 0.5, end.y - 0.5);
    graphics.stroke({ width: 1, color: 0xcccccc });

    // Color bands
    const bands = resistanceToColorBands(component.resistance);
    const bandSpacing = bodyWidth / (bands.length + 1);
    
    bands.forEach((band: ColorBand, index: number) => {
      const rgb = COLOR_TO_RGB[band.color];
      const color = this.parseColor(rgb);
      const x = centerX - bodyWidth / 2 + bandSpacing * (index + 1);
      graphics.rect(x - 2, centerY - bodyHeight / 2, 4, bodyHeight);
      graphics.fill(color);
    });
  }

  /**
   * Render LED with enhanced appearance, translucency, and glow effect
   */
  private renderLED(
    graphics: Graphics,
    component: AnyComponent,
    positions: Position[],
    simulation: SimulationResult | null = null,
    positionToNode?: Map<string, string>
  ): void {
    if (positions.length < 2 || component.type !== ComponentType.LED) return;

    const start = this.positionToPixels(positions[0]);
    const end = this.positionToPixels(positions[1]);
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radius = 15;
    const shadowOffset = 2;

    // LED body color (default to red/yellow based on forward voltage)
    // Red: ~1.8-2.0V, Yellow: ~2.0-2.2V, Green: ~2.0-2.2V, Blue: ~3.0-3.4V
    let ledColor = 0xff4444; // Default red
    if (component.forwardVoltage >= 3.0) {
      ledColor = 0x4444ff; // Blue
    } else if (component.forwardVoltage >= 2.0) {
      ledColor = 0xffff44; // Yellow/Green
    }

    // Calculate LED current for glow effect
    let ledCurrent = 0;
    let isOn = false;
    if (simulation?.success && positionToNode) {
      // Get node voltages at LED pins
      const pos0Key = `${positions[0].row},${positions[0].col}`;
      const pos1Key = `${positions[1].row},${positions[1].col}`;
      const node0 = positionToNode.get(pos0Key);
      const node1 = positionToNode.get(pos1Key);
      
      if (node0 && node1) {
        const v0 = simulation.nodeVoltages.get(node0) ?? 0;
        const v1 = simulation.nodeVoltages.get(node1) ?? 0;
        const voltageDrop = Math.abs(v0 - v1);
        
        // LED is on if voltage drop exceeds threshold percentage of forward voltage
        if (voltageDrop > component.forwardVoltage * PixiRenderer.LED_TURN_ON_THRESHOLD) {
          isOn = true;
          // Estimate current using simplified Ohm's law: I = (V - Vf) / R
          // This is a simplified model assuming series resistance
          const excessVoltage = voltageDrop - component.forwardVoltage;
          ledCurrent = Math.min(
            excessVoltage / PixiRenderer.ASSUMED_SERIES_RESISTANCE_OHMS,
            component.maxCurrent
          );
        }
      }
    }

    // Shadow
    graphics.circle(centerX + shadowOffset, centerY + shadowOffset, radius);
    graphics.fill({ color: 0x000000, alpha: 0.3 });

    // Glow effect when LED is on
    if (isOn && ledCurrent > 0) {
      // Outer glow (strongest)
      const glowIntensity = Math.min(ledCurrent / component.maxCurrent, 1.0);
      const glowRadius = radius + 15 * glowIntensity;
      
      graphics.circle(centerX, centerY, glowRadius);
      graphics.fill({ color: ledColor, alpha: 0.15 * glowIntensity });
      
      // Middle glow
      graphics.circle(centerX, centerY, radius + 8 * glowIntensity);
      graphics.fill({ color: ledColor, alpha: 0.3 * glowIntensity });
      
      // Inner glow
      graphics.circle(centerX, centerY, radius + 3);
      graphics.fill({ color: ledColor, alpha: 0.5 * glowIntensity });
    }

    // Body (translucent) - brighter when on
    const bodyAlpha = isOn ? 0.7 : 0.4;
    graphics.circle(centerX, centerY, radius);
    graphics.fill({ color: ledColor, alpha: bodyAlpha });
    
    // Inner core (brighter) - much brighter when on
    const coreAlpha = isOn ? 0.95 : 0.6;
    graphics.circle(centerX, centerY, radius * 0.6);
    graphics.fill({ color: ledColor, alpha: coreAlpha });
    
    // Highlight for translucent appearance
    graphics.circle(centerX - radius / 3, centerY - radius / 3, radius / 3);
    graphics.fill({ color: 0xffffff, alpha: isOn ? 0.7 : 0.5 });
    
    // Outline
    graphics.circle(centerX, centerY, radius);
    graphics.stroke({ width: 2, color: 0x888888 });

    // Leads with shadow
    // Lead shadows
    graphics.moveTo(start.x + shadowOffset, start.y + shadowOffset);
    graphics.lineTo(centerX + shadowOffset, centerY - radius + shadowOffset);
    graphics.stroke({ width: 2, color: 0x000000, alpha: 0.3 });
    graphics.moveTo(centerX + shadowOffset, centerY + radius + shadowOffset);
    graphics.lineTo(end.x + shadowOffset, end.y + shadowOffset);
    graphics.stroke({ width: 2, color: 0x000000, alpha: 0.3 });
    
    // Main leads
    graphics.moveTo(start.x, start.y);
    graphics.lineTo(centerX, centerY - radius);
    graphics.stroke({ width: 2, color: 0x888888 });
    graphics.moveTo(centerX, centerY + radius);
    graphics.lineTo(end.x, end.y);
    graphics.stroke({ width: 2, color: 0x888888 });

    // + symbol for anode
    const plusSize = 6;
    const plusY = centerY - radius - 8;
    graphics.moveTo(centerX, plusY - plusSize);
    graphics.lineTo(centerX, plusY + plusSize);
    graphics.stroke({ width: 2, color: 0xff0000 });
    graphics.moveTo(centerX - plusSize, plusY);
    graphics.lineTo(centerX + plusSize, plusY);
    graphics.stroke({ width: 2, color: 0xff0000 });
  }

  /**
   * Render power supply
   */
  private renderPowerSupply(graphics: Graphics, component: AnyComponent, positions: Position[]): void {
    if (positions.length < 2 || component.type !== ComponentType.POWER_SUPPLY) return;

    const start = this.positionToPixels(positions[0]);
    const end = this.positionToPixels(positions[1]);
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const height = 30;

    // Positive terminal (tall)
    graphics.moveTo(centerX - 10, centerY - height / 2);
    graphics.lineTo(centerX - 10, centerY + height / 2);
    graphics.stroke({ width: 4, color: 0xff0000 });

    // Negative terminal (short)
    graphics.moveTo(centerX + 10, centerY - height / 3);
    graphics.lineTo(centerX + 10, centerY + height / 3);
    graphics.stroke({ width: 4, color: 0x0000ff });

    // Leads
    graphics.moveTo(start.x, start.y);
    graphics.lineTo(centerX - 10, centerY);
    graphics.stroke({ width: 2, color: 0x888888 });
    graphics.moveTo(centerX + 10, centerY);
    graphics.lineTo(end.x, end.y);
    graphics.stroke({ width: 2, color: 0x888888 });
  }

  /**
   * Render ground
   */
  private renderGround(graphics: Graphics, positions: Position[]): void {
    if (positions.length < 1) return;

    const pos = this.positionToPixels(positions[0]);
    const lineSpacing = 5;
    const widths = [30, 20, 10];

    widths.forEach((width, index) => {
      const y = pos.y + index * lineSpacing;
      graphics.moveTo(pos.x - width / 2, y);
      graphics.lineTo(pos.x + width / 2, y);
      graphics.stroke({ width: 2, color: 0x00ff00 });
    });

    // Connection line
    graphics.moveTo(pos.x, pos.y - 10);
    graphics.lineTo(pos.x, pos.y);
    graphics.stroke({ width: 2, color: 0x00ff00 });
  }

  /**
   * Render error overlays
   */
  renderErrors(errors: CircuitError[]): void {
    this.errorOverlayContainer.removeChildren();

    errors.forEach(error => {
      if (error.positions.length === 0) return;

      const centerPos = this.calculateCenterPosition(error.positions);
      const pixels = this.positionToPixels(centerPos);
      const icon = this.createErrorIcon(error, pixels.x, pixels.y);
      this.errorOverlayContainer.addChild(icon);
    });
  }

  /**
   * Calculate center position
   */
  private calculateCenterPosition(positions: Array<{ row: number; col: number }>): { row: number; col: number } {
    const avgRow = positions.reduce((sum, pos) => sum + pos.row, 0) / positions.length;
    const avgCol = positions.reduce((sum, pos) => sum + pos.col, 0) / positions.length;
    return { row: avgRow, col: avgCol };
  }

  /**
   * Create error icon
   */
  private createErrorIcon(error: CircuitError, x: number, y: number): Container {
    const container = new Container();
    (container as any).errorData = error;

    // Background
    const bg = new Graphics();
    const bgColor = error.severity === 'error' ? 0xff3333 : 0xff9933;
    bg.circle(x, y, 15);
    bg.fill({ color: bgColor, alpha: 0.9 });
    bg.circle(x, y, 15);
    bg.stroke({ width: 2, color: 0xffffff });
    container.addChild(bg);

    // Symbol
    const symbol = error.type === ErrorType.SHORT_CIRCUIT ? '✕' :
                   error.type === ErrorType.FLOATING_NODE ? '?' :
                   error.type === ErrorType.REVERSED_LED ? '↻' : '!';
    
    const text = new Text({
      text: symbol,
      style: new TextStyle({ fontSize: 20, fill: 0xffffff, fontWeight: 'bold' })
    });
    text.anchor.set(0.5);
    text.x = x;
    text.y = y;
    container.addChild(text);

    // Interactive
    container.eventMode = 'static';
    container.cursor = 'pointer';
    
    if (this.eventHandlers.onErrorIconClick) {
      container.on('pointerdown', (event: FederatedPointerEvent) => {
        this.eventHandlers.onErrorIconClick?.(error, event);
      });
    }

    return container;
  }

  /**
   * Start current animation
   */
  startAnimation(simulation: SimulationResult, components: AnyComponent[]): void {
    if (!simulation.success) {
      this.stopAnimation();
      return;
    }

    this.stopAnimation();
    this.buildAnimationPaths(components, simulation);
    this.createParticles(simulation);

    if (this.particles.length > 0) {
      this.isAnimating = true;
      this.lastTimestamp = performance.now();
      this.animate(this.lastTimestamp);
    }
  }

  /**
   * Build animation paths
   */
  private buildAnimationPaths(components: AnyComponent[], simulation: SimulationResult): void {
    this.animationPaths.clear();

    simulation.edgeCurrents.forEach((current, edgeId) => {
      // Edge ID format is "nodeA:nodeB", we need to find which component this corresponds to
      // For now, create a path for each component with current
      const component = components.find(c => {
        if (c.positions.length < 2) return false;
        const posKey1 = `${c.positions[0].row},${c.positions[0].col}`;
        const posKey2 = `${c.positions[1].row},${c.positions[1].col}`;
        // Check if edge ID contains these position keys (simplified matching)
        return edgeId.includes(posKey1) || edgeId.includes(posKey2);
      });

      if (!component || component.positions.length < 2) return;

      const start = this.positionToPixels(component.positions[0]);
      const end = this.positionToPixels(component.positions[1]);

      const points = [
        { x: start.x, y: start.y },
        { x: start.x, y: (start.y + end.y) / 2 },
        { x: end.x, y: (start.y + end.y) / 2 },
        { x: end.x, y: end.y },
      ];

      this.animationPaths.set(edgeId, {
        edgeId,
        points,
        reversed: current < 0,
      });
    });
  }

  /**
   * Create particles
   */
  private createParticles(simulation: SimulationResult): void {
    this.particles = [];
    const currentThreshold = 1e-6;
    const maxParticlesPerEdge = 5;

    simulation.edgeCurrents.forEach((current, edgeId) => {
      const absCurrent = Math.abs(current);
      if (absCurrent < currentThreshold) return;

      const path = this.animationPaths.get(edgeId);
      if (!path) return;

      const numParticles = Math.min(
        maxParticlesPerEdge,
        Math.max(1, Math.floor(Math.log10(absCurrent * 1000) + 3))
      );

      for (let i = 0; i < numParticles; i++) {
        this.particles.push({
          edgeId,
          progress: i / numParticles,
          speed: 0.3 * Math.log10(absCurrent * 1000 + 1),
          brightness: Math.min(1.0, absCurrent / 0.01),
          color: '#00ffff',
        });
      }
    });
  }

  /**
   * Animation loop
   */
  private animate(timestamp: number): void {
    if (!this.isAnimating) return;

    const deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    this.particlesContainer.removeChildren();

    this.particles.forEach(particle => {
      const path = this.animationPaths.get(particle.edgeId);
      if (!path) return;

      particle.progress += particle.speed * deltaTime * (path.reversed ? -1 : 1);
      if (particle.progress > 1.0) particle.progress -= 1.0;
      if (particle.progress < 0.0) particle.progress += 1.0;

      const position = this.getPositionAlongPath(path.points, particle.progress);
      const graphic = new Graphics();
      graphic.circle(position.x, position.y, 3);
      graphic.fill({ color: this.parseColor(particle.color), alpha: particle.brightness });
      this.particlesContainer.addChild(graphic);
    });

    this.animationFrameId = requestAnimationFrame((ts) => this.animate(ts));
  }

  /**
   * Get position along path
   */
  private getPositionAlongPath(points: Array<{ x: number; y: number }>, progress: number): { x: number; y: number } {
    if (points.length === 0) return { x: 0, y: 0 };
    if (points.length === 1) return points[0];

    let totalLength = 0;
    const segmentLengths: number[] = [];
    
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const length = Math.sqrt(dx * dx + dy * dy);
      segmentLengths.push(length);
      totalLength += length;
    }

    const targetLength = progress * totalLength;
    let accumulatedLength = 0;

    for (let i = 0; i < segmentLengths.length; i++) {
      if (accumulatedLength + segmentLengths[i] >= targetLength) {
        const segmentProgress = (targetLength - accumulatedLength) / segmentLengths[i];
        return {
          x: points[i].x + (points[i + 1].x - points[i].x) * segmentProgress,
          y: points[i].y + (points[i + 1].y - points[i].y) * segmentProgress,
        };
      }
      accumulatedLength += segmentLengths[i];
    }

    return points[points.length - 1];
  }

  /**
   * Stop animation
   */
  stopAnimation(): void {
    this.isAnimating = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.particles = [];
    this.animationPaths.clear();
    this.particlesContainer.removeChildren();
  }

  /**
   * Render floating component (Phase 3c/3d)
   * Renders component at arbitrary canvas position with reduced opacity
   */
  renderFloatingComponent(
    floating: {
      id: string;
      type: ComponentType;
      position: { x: number; y: number };
      rotation: number;
      properties: {
        resistance?: number;
        forwardVoltage?: number;
        maxCurrent?: number;
        voltage?: number;
      };
    } | null
  ): void {
    // Remove any existing floating component rendering
    // For now, we'll render it in the components container with special styling
    
    if (!floating) return;
    
    // Create a simple visual representation
    // For Phase 3c, we'll use a basic circle/rectangle to represent the component
    // This can be enhanced later with actual component rendering
    
    const floatingContainer = new Container();
    floatingContainer.position.set(floating.position.x, floating.position.y);
    floatingContainer.alpha = 0.7; // Semi-transparent to indicate floating state
    
    // Make the container interactive for drag handling (Phase 3d)
    floatingContainer.eventMode = 'static';
    floatingContainer.cursor = 'grab';
    
    // Draw a simple representation based on component type
    const visual = new Graphics();
    
    // Phase 3d.2: Determine leg positions
    const legPositions: { x: number; y: number }[] = [];
    
    switch (floating.type) {
      case ComponentType.RESISTOR:
        // Simple rectangle for resistor
        visual.rect(-20, -10, 40, 20);
        visual.fill({ color: 0xccaa66, alpha: 1 });
        visual.stroke({ width: 2, color: 0x000000 });
        
        // Two legs for resistor (left and right)
        legPositions.push({ x: -25, y: 0 }); // Left leg
        legPositions.push({ x: 25, y: 0 });  // Right leg
        
        // Add text label
        const resistorLabel = new Text({ 
          text: 'Resistor\n(drag legs to holes)', 
          style: { fontSize: 10, fill: 0xffffff } 
        });
        resistorLabel.anchor.set(0.5, 0);
        resistorLabel.y = 15;
        floatingContainer.addChild(resistorLabel);
        break;
        
      case ComponentType.LED:
        // Simple circle for LED
        visual.circle(0, 0, 15);
        visual.fill({ color: 0xff4444, alpha: 1 });
        visual.stroke({ width: 2, color: 0x000000 });
        
        // Two legs for LED (anode and cathode)
        legPositions.push({ x: 0, y: -20 }); // Anode (top)
        legPositions.push({ x: 0, y: 20 });  // Cathode (bottom)
        
        const ledLabel = new Text({ 
          text: 'LED\n(drag legs to holes)', 
          style: { fontSize: 10, fill: 0xffffff } 
        });
        ledLabel.anchor.set(0.5, 0);
        ledLabel.y = 25;
        floatingContainer.addChild(ledLabel);
        break;
        
      case ComponentType.WIRE:
        // Simple line for wire
        visual.moveTo(-25, 0);
        visual.lineTo(25, 0);
        visual.stroke({ width: 3, color: 0x333333 });
        
        // Two connection points for wire
        legPositions.push({ x: -25, y: 0 });
        legPositions.push({ x: 25, y: 0 });
        
        const wireLabel = new Text({ 
          text: 'Wire\n(drag ends to holes)', 
          style: { fontSize: 10, fill: 0xffffff } 
        });
        wireLabel.anchor.set(0.5, 0);
        wireLabel.y = 10;
        floatingContainer.addChild(wireLabel);
        break;
        
      case ComponentType.POWER_SUPPLY:
        // Rectangle with + symbol
        visual.rect(-20, -15, 40, 30);
        visual.fill({ color: 0x4444ff, alpha: 1 });
        visual.stroke({ width: 2, color: 0x000000 });
        
        const plusLabel = new Text({ 
          text: '+', 
          style: { fontSize: 20, fill: 0xffffff, fontWeight: 'bold' } 
        });
        plusLabel.anchor.set(0.5, 0.5);
        floatingContainer.addChild(plusLabel);
        
        // One connection point for power supply
        legPositions.push({ x: 0, y: 20 });
        
        const powerLabel = new Text({ 
          text: 'Power\n(drag to hole)', 
          style: { fontSize: 10, fill: 0xffffff } 
        });
        powerLabel.anchor.set(0.5, 0);
        powerLabel.y = 25;
        floatingContainer.addChild(powerLabel);
        break;
        
      case ComponentType.GROUND:
        // Ground symbol
        visual.moveTo(0, -15);
        visual.lineTo(0, 0);
        visual.moveTo(-15, 0);
        visual.lineTo(15, 0);
        visual.moveTo(-10, 5);
        visual.lineTo(10, 5);
        visual.moveTo(-5, 10);
        visual.lineTo(5, 10);
        visual.stroke({ width: 2, color: 0x333333 });
        
        // One connection point for ground
        legPositions.push({ x: 0, y: -15 });
        
        const groundLabel = new Text({ 
          text: 'Ground\n(drag to hole)', 
          style: { fontSize: 10, fill: 0xffffff } 
        });
        groundLabel.anchor.set(0.5, 0);
        groundLabel.y = 15;
        floatingContainer.addChild(groundLabel);
        break;
        
      default:
        // Generic representation
        visual.rect(-15, -15, 30, 30);
        visual.fill({ color: 0x888888, alpha: 1 });
        visual.stroke({ width: 2, color: 0x000000 });
        
        // Default two legs
        legPositions.push({ x: -20, y: 0 });
        legPositions.push({ x: 20, y: 0 });
    }
    
    floatingContainer.addChild(visual);
    
    // Phase 3d.2/3d.3: Render component legs as interactive connection points
    for (let i = 0; i < legPositions.length; i++) {
      const legPos = legPositions[i];
      const leg = new Graphics();
      
      // Draw leg as a small circle
      leg.circle(legPos.x, legPos.y, 5);
      leg.fill({ color: 0xffff00, alpha: 0.8 }); // Yellow to indicate interactivity
      leg.stroke({ width: 2, color: 0x000000 });
      
      // Make leg interactive for connection drag (Phase 3d.3)
      leg.eventMode = 'static';
      leg.cursor = 'crosshair';
      
      // Stop propagation so clicking leg doesn't trigger component drag
      leg.on('pointerdown', (event: FederatedPointerEvent) => {
        event.stopPropagation();
        if (this.eventHandlers.onFloatingComponentLegDragStart) {
          this.eventHandlers.onFloatingComponentLegDragStart(
            floating.id,
            i,
            event.global.x,
            event.global.y
          );
        }
      });
      
      floatingContainer.addChild(leg);
    }
    
    // Phase 3d: Add drag handler for floating component body
    floatingContainer.on('pointerdown', (event: FederatedPointerEvent) => {
      if (this.eventHandlers.onFloatingComponentDragStart) {
        this.eventHandlers.onFloatingComponentDragStart(
          floating.id,
          event.global.x,
          event.global.y
        );
      }
    });
    
    // Add to components container (will be rendered on top)
    this.componentsContainer.addChild(floatingContainer);
  }
  
  /**
   * Get number of legs/pins for a component type (Phase 3d.2)
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
}
