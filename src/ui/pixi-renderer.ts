import {
  Application,
  Graphics,
  Container,
  Text,
  TextStyle,
  FederatedPointerEvent,
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
  onComponentClick?: (componentId: string, event: FederatedPointerEvent) => void;
  onErrorIconClick?: (error: CircuitError, event: FederatedPointerEvent) => void;
  onComponentDragStart?: (componentId: string, globalX: number, globalY: number) => void;
}

/**
 * Comprehensive PixiJS renderer for breadboard visualization
 * Replaces all SVG rendering with WebGL-based PixiJS graphics
 */
export class PixiRenderer {
  private app: Application | null = null;
  
  // Layer containers for proper z-ordering
  private breadboardContainer = new Container();
  private componentsContainer = new Container();
  private voltageOverlayContainer = new Container();
  private particlesContainer = new Container();
  private errorOverlayContainer = new Container();
  
  // Grid spacing constants
  public static readonly HOLE_SIZE = 20;
  public static readonly HOLE_MARGIN = 3;
  public static readonly HOLE_SPACING = PixiRenderer.HOLE_SIZE + PixiRenderer.HOLE_MARGIN * 2;

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
    
    const width = BreadboardLayout.TOTAL_COLS * PixiRenderer.HOLE_SPACING;
    const height = BreadboardLayout.ROWS * PixiRenderer.HOLE_SPACING;
    
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
    
    // Add layers in z-order
    this.app.stage.addChild(this.breadboardContainer);
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
      // App might be in a broken state (e.g., in test environment)
      return null;
    }
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
      fontSize: 10,
      fill: 0x666666,
      fontWeight: 'bold',
    });
    
    for (let row = 0; row < BreadboardLayout.ROWS; row++) {
      // Label every 5 rows
      if (row % 5 === 0 || row === BreadboardLayout.ROWS - 1) {
        const y = row * PixiRenderer.HOLE_SPACING + PixiRenderer.HOLE_SPACING / 2;
        
        // Left side label
        const leftLabel = new Text({ text: String(row + 1), style: labelStyle });
        leftLabel.anchor.set(1, 0.5);
        leftLabel.x = BreadboardLayout.RAIL_LEFT_NEGATIVE * PixiRenderer.HOLE_SPACING - 5;
        leftLabel.y = y;
        this.breadboardContainer.addChild(leftLabel);
        
        // Right side label
        const rightLabel = new Text({ text: String(row + 1), style: labelStyle });
        rightLabel.anchor.set(0, 0.5);
        rightLabel.x = (BreadboardLayout.RAIL_RIGHT_NEGATIVE + 1) * PixiRenderer.HOLE_SPACING + 5;
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
      topLabel.y = -5;
      this.breadboardContainer.addChild(topLabel);
      
      // Bottom label
      const bottomLabel = new Text({ text: columnLabels[i], style: labelStyle });
      bottomLabel.anchor.set(0.5, 0);
      bottomLabel.x = x;
      bottomLabel.y = height + 5;
      this.breadboardContainer.addChild(bottomLabel);
    }
    
    // Add rail labels
    const railLabelStyle = new TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 12,
      fontWeight: 'bold',
    });
    
    // Left positive rail (red)
    const leftPosLabel = new Text({ text: '+', style: { ...railLabelStyle, fill: 0xcc3333 } });
    leftPosLabel.anchor.set(0.5, 1);
    leftPosLabel.x = BreadboardLayout.RAIL_LEFT_POSITIVE * PixiRenderer.HOLE_SPACING + PixiRenderer.HOLE_SPACING / 2;
    leftPosLabel.y = -5;
    this.breadboardContainer.addChild(leftPosLabel);
    
    // Left negative rail (blue)
    const leftNegLabel = new Text({ text: '-', style: { ...railLabelStyle, fill: 0x3333cc } });
    leftNegLabel.anchor.set(0.5, 1);
    leftNegLabel.x = BreadboardLayout.RAIL_LEFT_NEGATIVE * PixiRenderer.HOLE_SPACING + PixiRenderer.HOLE_SPACING / 2;
    leftNegLabel.y = -5;
    this.breadboardContainer.addChild(leftNegLabel);
    
    // Right positive rail (red)
    const rightPosLabel = new Text({ text: '+', style: { ...railLabelStyle, fill: 0xcc3333 } });
    rightPosLabel.anchor.set(0.5, 1);
    rightPosLabel.x = BreadboardLayout.RAIL_RIGHT_POSITIVE * PixiRenderer.HOLE_SPACING + PixiRenderer.HOLE_SPACING / 2;
    rightPosLabel.y = -5;
    this.breadboardContainer.addChild(rightPosLabel);
    
    // Right negative rail (blue)
    const rightNegLabel = new Text({ text: '-', style: { ...railLabelStyle, fill: 0x3333cc } });
    rightNegLabel.anchor.set(0.5, 1);
    rightNegLabel.x = BreadboardLayout.RAIL_RIGHT_NEGATIVE * PixiRenderer.HOLE_SPACING + PixiRenderer.HOLE_SPACING / 2;
    rightNegLabel.y = -5;
    this.breadboardContainer.addChild(rightNegLabel);
  }

  /**
   * Render a single hole with metal contact appearance and depth
   */
  private renderHole(
    pos: Position,
    holeColor: number
  ): Graphics {
    const pixels = this.positionToPixels(pos);
    const hole = new Graphics();
    
    // Outer ring (plastic recess shadow)
    hole.circle(pixels.x, pixels.y, PixiRenderer.HOLE_SIZE / 2 + 2);
    hole.fill({ color: 0x0a0a0a, alpha: 0.6 });
    
    // Inner hole with metal contact
    hole.circle(pixels.x, pixels.y, PixiRenderer.HOLE_SIZE / 2);
    hole.fill(holeColor);
    
    // Metal contact shine (subtle highlight)
    const highlightOffset = 2;
    hole.circle(pixels.x - highlightOffset, pixels.y - highlightOffset, PixiRenderer.HOLE_SIZE / 4);
    hole.fill({ color: 0xffffff, alpha: 0.15 });
    
    // Outer stroke for definition
    hole.circle(pixels.x, pixels.y, PixiRenderer.HOLE_SIZE / 2);
    hole.stroke({ width: 0.5, color: 0x1a1a1a, alpha: 0.8 });
    
    // Interactive
    hole.eventMode = 'static';
    hole.cursor = 'pointer';
    (hole as any).breadboardPosition = pos;
    
    if (this.eventHandlers.onHoleClick) {
      hole.on('pointerdown', (event: FederatedPointerEvent) => {
        this.eventHandlers.onHoleClick?.(pos, event);
      });
    }
    
    return hole;
  }

  /**
   * Render breadboard grid with voltage overlay
   */
  renderBreadboard(
    positionToNode: Map<string, string>,
    simulation: SimulationResult | null
  ): void {
    this.breadboardContainer.removeChildren();
    
    // Render substrate first (background, labels, ridges)
    this.renderBreadboardSubstrate();

    // Render holes
    for (let row = 0; row < BreadboardLayout.ROWS; row++) {
      for (let col = 0; col < BreadboardLayout.TOTAL_COLS; col++) {
        const pos = { row, col };
        const posKey = `${row},${col}`;
        
        let holeColor = 0x505050; // Default metal color
        
        // Rail coloring with more realistic colors
        if (BreadboardLayout.isPositionInRail(pos)) {
          const rail = BreadboardLayout.getRailForPosition(pos);
          if (rail?.type === 'positive') holeColor = 0x883333; // Reddish tint
          else if (rail?.type === 'negative') holeColor = 0x333388; // Bluish tint
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
        
        const hole = this.renderHole(pos, holeColor);
        this.breadboardContainer.addChild(hole);
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
      }
    }

    // Interactive
    container.eventMode = 'static';
    container.cursor = 'pointer';
    
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
        
        // LED is on if voltage drop is above forward voltage
        if (voltageDrop > component.forwardVoltage * 0.8) {
          isOn = true;
          // Estimate current (simplified)
          ledCurrent = Math.min((voltageDrop - component.forwardVoltage) / 100, component.maxCurrent);
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
}
