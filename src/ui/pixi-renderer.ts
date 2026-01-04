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
    return this.app?.canvas ?? null;
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
   * Convert position to pixels
   */
  private positionToPixels(pos: Position): { x: number; y: number } {
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
   * Render breadboard grid with voltage overlay
   */
  renderBreadboard(
    positionToNode: Map<string, string>,
    simulation: SimulationResult | null
  ): void {
    this.breadboardContainer.removeChildren();

    for (let row = 0; row < BreadboardLayout.ROWS; row++) {
      for (let col = 0; col < BreadboardLayout.TOTAL_COLS; col++) {
        const pos = { row, col };
        const posKey = `${row},${col}`;
        const pixels = this.positionToPixels(pos);
        
        let holeColor = 0x3a3a3a;
        
        // Rail coloring
        if (BreadboardLayout.isPositionInRail(pos)) {
          const rail = BreadboardLayout.getRailForPosition(pos);
          if (rail?.type === 'positive') holeColor = 0x4a2020;
          else if (rail?.type === 'negative') holeColor = 0x202040;
        }
        
        // Voltage overlay
        if (simulation?.success) {
          const nodeId = positionToNode.get(posKey);
          if (nodeId && simulation.nodeVoltages.has(nodeId)) {
            const voltage = simulation.nodeVoltages.get(nodeId)!;
            const voltageColorObj = voltageToColor(voltage);
            holeColor = this.parseColor(voltageColorObj.rgb);
          }
        }
        
        const hole = new Graphics();
        hole.circle(pixels.x, pixels.y, PixiRenderer.HOLE_SIZE / 2);
        hole.fill(holeColor);
        hole.circle(pixels.x, pixels.y, PixiRenderer.HOLE_SIZE / 2);
        hole.stroke({ width: 1, color: 0x1a1a1a, alpha: 0.5 });
        
        // Interactive
        hole.eventMode = 'static';
        hole.cursor = 'pointer';
        (hole as any).breadboardPosition = pos;
        
        if (this.eventHandlers.onHoleClick) {
          hole.on('pointerdown', (event: FederatedPointerEvent) => {
            this.eventHandlers.onHoleClick?.(pos, event);
          });
        }
        
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
    dragState: DragState | null
  ): void {
    this.componentsContainer.removeChildren();
    this.resetWireColors();

    let zIndex = 0;
    
    // Wires first (behind)
    components.filter(c => c.type === ComponentType.WIRE).forEach(comp => {
      const container = this.renderComponent(comp, selectedComponentId, dragState);
      container.zIndex = zIndex++;
      this.componentsContainer.addChild(container);
    });

    // Other components
    components.filter(c => c.type !== ComponentType.WIRE).forEach(comp => {
      const container = this.renderComponent(comp, selectedComponentId, dragState);
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
    dragState: DragState | null
  ): Container {
    const container = new Container();
    (container as any).componentId = component.id;

    const isDragging = dragState?.componentId === component.id;

    if (isDragging) {
      // Original (faded)
      const original = this.renderComponentGraphics(component, component.positions);
      original.alpha = 0.3;
      container.addChild(original);

      // Preview
      if (dragState.previewPositions) {
        const preview = this.renderComponentGraphics(component, dragState.previewPositions);
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
      const graphics = this.renderComponentGraphics(component, component.positions);
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
    
    if (this.eventHandlers.onComponentClick) {
      container.on('pointerdown', (event: FederatedPointerEvent) => {
        this.eventHandlers.onComponentClick?.(component.id, event);
      });
    }

    return container;
  }

  /**
   * Render component graphics
   */
  private renderComponentGraphics(component: AnyComponent, positions: Position[]): Container {
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
        this.renderLED(graphics, component, positions);
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
   * Render wire
   */
  private renderWire(graphics: Graphics, positions: Position[]): void {
    if (positions.length < 2) return;

    const start = this.positionToPixels(positions[0]);
    const end = this.positionToPixels(positions[1]);
    const wireColor = this.parseColor(this.getNextWireColor());

    // Manhattan routing
    graphics.moveTo(start.x, start.y);
    graphics.lineTo(start.x, (start.y + end.y) / 2);
    graphics.lineTo(end.x, (start.y + end.y) / 2);
    graphics.lineTo(end.x, end.y);
    graphics.stroke({ width: 3, color: wireColor, cap: 'round', join: 'round' });

    // Endpoint dots
    graphics.circle(start.x, start.y, 4);
    graphics.fill(wireColor);
    graphics.circle(end.x, end.y, 4);
    graphics.fill(wireColor);
  }

  /**
   * Render resistor
   */
  private renderResistor(graphics: Graphics, component: AnyComponent, positions: Position[]): void {
    if (positions.length < 2 || component.type !== ComponentType.RESISTOR) return;

    const start = this.positionToPixels(positions[0]);
    const end = this.positionToPixels(positions[1]);
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;

    const bodyWidth = 60;
    const bodyHeight = 20;

    // Body
    graphics.rect(centerX - bodyWidth / 2, centerY - bodyHeight / 2, bodyWidth, bodyHeight);
    graphics.fill(0xd4a574);
    graphics.rect(centerX - bodyWidth / 2, centerY - bodyHeight / 2, bodyWidth, bodyHeight);
    graphics.stroke({ width: 2, color: 0x8b6f47 });

    // Leads
    graphics.moveTo(start.x, start.y);
    graphics.lineTo(centerX - bodyWidth / 2, centerY);
    graphics.stroke({ width: 2, color: 0x888888 });
    graphics.moveTo(centerX + bodyWidth / 2, centerY);
    graphics.lineTo(end.x, end.y);
    graphics.stroke({ width: 2, color: 0x888888 });

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
   * Render LED
   */
  private renderLED(graphics: Graphics, component: AnyComponent, positions: Position[]): void {
    if (positions.length < 2 || component.type !== ComponentType.LED) return;

    const start = this.positionToPixels(positions[0]);
    const end = this.positionToPixels(positions[1]);
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const radius = 15;

    // LED body color (default to red/yellow based on forward voltage)
    // LEDs don't have a 'color' property - color is implied by forward voltage
    // Red: ~1.8-2.0V, Yellow: ~2.0-2.2V, Green: ~2.0-2.2V, Blue: ~3.0-3.4V
    let ledColor = 0xff4444; // Default red
    if (component.forwardVoltage >= 3.0) {
      ledColor = 0x4444ff; // Blue
    } else if (component.forwardVoltage >= 2.0) {
      ledColor = 0xffff44; // Yellow/Green
    }

    // Body
    graphics.circle(centerX, centerY, radius);
    graphics.fill({ color: ledColor, alpha: 0.3 });
    graphics.circle(centerX, centerY, radius);
    graphics.stroke({ width: 2, color: 0x888888 });

    // Leads
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
