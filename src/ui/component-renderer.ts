import type { AnyComponent, Position } from '@/core/types';
import { ComponentType } from '@/core/types';
import { resistanceToColorBands, COLOR_TO_RGB, ResistorColor } from '@/core/resistor-color-code';

/**
 * Drag state for rendering ghost preview
 */
interface DragState {
  componentId: string;
  previewPositions: Position[] | null;
}

/**
 * Visual component renderer that creates SVG representations of components on the breadboard
 */
export class ComponentRenderer {
  // Breadboard grid spacing (matches CSS in style.css)
  public static readonly HOLE_SIZE = 20;
  public static readonly HOLE_MARGIN = 3;
  public static readonly HOLE_SPACING = ComponentRenderer.HOLE_SIZE + ComponentRenderer.HOLE_MARGIN * 2;

  // Visual styling constants
  private static readonly WIRE_COLORS = [
    '#ff0000', // red
    '#000000', // black
    '#ffff00', // yellow
    '#00ff00', // green
    '#0000ff', // blue
    '#ff8800', // orange
    '#ffffff', // white
    '#8800ff', // purple
  ];

  private wireColorIndex = 0;

  /**
   * Convert breadboard position to pixel coordinates
   */
  private positionToPixels(pos: Position): { x: number; y: number } {
    return {
      x: pos.col * ComponentRenderer.HOLE_SPACING + ComponentRenderer.HOLE_SPACING / 2,
      y: pos.row * ComponentRenderer.HOLE_SPACING + ComponentRenderer.HOLE_SPACING / 2,
    };
  }

  /**
   * Get the next wire color (cycles through available colors)
   */
  private getNextWireColor(): string {
    const color = ComponentRenderer.WIRE_COLORS[this.wireColorIndex];
    this.wireColorIndex = (this.wireColorIndex + 1) % ComponentRenderer.WIRE_COLORS.length;
    return color;
  }

  /**
   * Reset wire color cycling
   */
  resetWireColors(): void {
    this.wireColorIndex = 0;
  }

  /**
   * Render all components to an SVG element
   */
  renderComponents(
    components: AnyComponent[],
    selectedComponentId: string | null = null,
    dragState: DragState | null = null
  ): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'component-overlay');

    // Reset wire color cycling for consistent colors
    this.resetWireColors();

    // Render wires first (behind other components)
    components
      .filter((c) => c.type === ComponentType.WIRE)
      .forEach((component) => {
        const group = this.renderComponent(
          component,
          selectedComponentId,
          dragState && dragState.componentId === component.id ? dragState : null
        );
        svg.appendChild(group);
      });

    // Render other components
    components
      .filter((c) => c.type !== ComponentType.WIRE)
      .forEach((component) => {
        const group = this.renderComponent(
          component,
          selectedComponentId,
          dragState && dragState.componentId === component.id ? dragState : null
        );
        svg.appendChild(group);
      });

    return svg;
  }

  /**
   * Render a single component
   */
  private renderComponent(
    component: AnyComponent,
    selectedComponentId: string | null = null,
    componentDragState: DragState | null = null
  ): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `component component-${component.type.toLowerCase()}`);
    group.setAttribute('data-component-id', component.id);
    
    // Enable pointer events for component interaction
    group.style.pointerEvents = 'auto';
    group.style.cursor = 'pointer';
    
    // Add selected class if this component is selected
    if (component.id === selectedComponentId) {
      group.classList.add('component-selected');
    }

    // If this component is being dragged, render both original (faded) and preview
    if (componentDragState) {
      // Render original component with reduced opacity
      group.style.opacity = '0.3';
      this.renderComponentByType(group, component, component.positions);

      // If we have valid preview positions, render ghost preview
      if (componentDragState.previewPositions) {
        const previewGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        previewGroup.setAttribute('class', 'component-preview component-preview-valid');
        previewGroup.style.opacity = '0.7';
        previewGroup.style.pointerEvents = 'none';
        
        // Create a temporary component with preview positions for rendering
        const previewComponent = { ...component, positions: componentDragState.previewPositions };
        this.renderComponentByType(previewGroup, previewComponent, componentDragState.previewPositions);
        
        // Return a wrapper group containing both original and preview
        const wrapperGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        wrapperGroup.appendChild(group);
        wrapperGroup.appendChild(previewGroup);
        return wrapperGroup;
      } else {
        // Invalid preview - render red overlay
        const invalidGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        invalidGroup.setAttribute('class', 'component-preview component-preview-invalid');
        invalidGroup.style.opacity = '0.5';
        invalidGroup.style.pointerEvents = 'none';
        
        // Add a red circle or marker to indicate invalid position
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const firstPinPixels = this.positionToPixels(component.positions[0]);
        marker.setAttribute('cx', firstPinPixels.x.toString());
        marker.setAttribute('cy', firstPinPixels.y.toString());
        marker.setAttribute('r', '20');
        marker.setAttribute('fill', 'rgba(255, 0, 0, 0.3)');
        marker.setAttribute('stroke', '#ff0000');
        marker.setAttribute('stroke-width', '2');
        invalidGroup.appendChild(marker);
        
        const wrapperGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        wrapperGroup.appendChild(group);
        wrapperGroup.appendChild(invalidGroup);
        return wrapperGroup;
      }
    }

    // Normal rendering (not dragging)
    this.renderComponentByType(group, component, component.positions);
    return group;
  }

  /**
   * Render component based on its type
   */
  private renderComponentByType(
    group: SVGGElement,
    component: AnyComponent,
    positions: Position[]
  ): void {
    // Calculate center point for rotation
    const centerPos = this.getComponentCenter(positions);
    const centerPixels = this.positionToPixels(centerPos);

    // Create a group for the component content that will be rotated
    const contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Apply rotation transform around the component center
    if (component.rotation !== 0) {
      contentGroup.setAttribute(
        'transform',
        `rotate(${component.rotation} ${centerPixels.x} ${centerPixels.y})`
      );
    }

    switch (component.type) {
      case ComponentType.WIRE:
        this.renderWireAtPositions(contentGroup, component, positions);
        break;
      case ComponentType.RESISTOR:
        this.renderResistorAtPositions(contentGroup, component, positions);
        break;
      case ComponentType.LED:
        this.renderLEDAtPositions(contentGroup, component, positions);
        break;
      case ComponentType.POWER_SUPPLY:
        this.renderPowerSupplyAtPositions(contentGroup, component, positions);
        break;
      case ComponentType.GROUND:
        this.renderGroundAtPositions(contentGroup, component, positions);
        break;
      case ComponentType.MICROPROCESSOR:
        this.renderMicroprocessorAtPositions(contentGroup, component, positions);
        break;
    }

    group.appendChild(contentGroup);
  }

  /**
   * Get the center position of a component
   */
  private getComponentCenter(positions: Position[]): Position {
    if (positions.length === 0) {
      return { row: 0, col: 0 };
    }
    if (positions.length === 1) {
      return positions[0];
    }
    
    return {
      row: (positions[0].row + positions[1].row) / 2,
      col: (positions[0].col + positions[1].col) / 2,
    };
  }

  /**
   * Render a wire component at specified positions
   */
  private renderWireAtPositions(group: SVGGElement, _component: AnyComponent, positions: Position[]): void {
    if (positions.length < 2) return;

    const start = this.positionToPixels(positions[0]);
    const end = this.positionToPixels(positions[1]);

    // Use Manhattan routing (orthogonal lines)
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    // Create path with rounded corners
    const pathData = `
      M ${start.x} ${start.y}
      L ${start.x} ${(start.y + end.y) / 2}
      L ${end.x} ${(start.y + end.y) / 2}
      L ${end.x} ${end.y}
    `;

    // Get wire color once and reuse it
    const wireColor = this.getNextWireColor();
    
    path.setAttribute('d', pathData.trim());
    path.setAttribute('stroke', wireColor);
    path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    group.appendChild(path);

    // Add dots at endpoints to show connection points
    this.addConnectionDot(group, start, wireColor);
    this.addConnectionDot(group, end, wireColor);
  }

  /**
   * Render a resistor component at specified positions
   */
  private renderResistorAtPositions(group: SVGGElement, component: AnyComponent, positions: Position[]): void {
    if (positions.length < 2) return;
    if (component.type !== ComponentType.RESISTOR) return;

    const start = this.positionToPixels(positions[0]);
    const end = this.positionToPixels(positions[1]);

    // Calculate center and angle
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);

    // Draw body (rectangle)
    const bodyWidth = 60;
    const bodyHeight = 20;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', (centerX - bodyWidth / 2).toString());
    rect.setAttribute('y', (centerY - bodyHeight / 2).toString());
    rect.setAttribute('width', bodyWidth.toString());
    rect.setAttribute('height', bodyHeight.toString());
    rect.setAttribute('fill', '#d4a574');
    rect.setAttribute('stroke', '#8b6f47');
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('rx', '4');

    // Apply rotation
    rect.setAttribute('transform', `rotate(${angle} ${centerX} ${centerY})`);
    group.appendChild(rect);

    // Draw leads
    this.drawLead(group, start, centerX, centerY, angle, start, end);
    this.drawLead(group, end, centerX, centerY, angle, start, end);

    // Draw color bands instead of text label
    try {
      // Default to 5% tolerance (4-band resistor)
      const tolerance = 5;
      const bands = resistanceToColorBands(component.resistance, tolerance);
      
      // Draw color bands
      this.drawColorBands(group, bands, centerX, centerY, bodyWidth, bodyHeight, angle);
    } catch (error) {
      // Fallback to text label if color band calculation fails
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', centerX.toString());
      text.setAttribute('y', centerY.toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', '#000');
      text.setAttribute('font-size', '10');
      text.setAttribute('font-weight', 'bold');
      
      // Format resistance value appropriately
      if (component.resistance >= 1000) {
        text.textContent = `${component.resistance / 1000}kΩ`;
      } else {
        text.textContent = `${component.resistance}Ω`;
      }
      
      group.appendChild(text);
    }
  }

  /**
   * Draw color bands on a resistor body
   */
  private drawColorBands(
    group: SVGGElement,
    bands: ReturnType<typeof resistanceToColorBands>,
    centerX: number,
    centerY: number,
    bodyWidth: number,
    bodyHeight: number,
    angle: number
  ): void {
    const bandCount = bands.length;
    const bandWidth = 4;
    const spacing = bodyWidth / (bandCount + 1);

    bands.forEach((band, index) => {
      const bandX = centerX - bodyWidth / 2 + spacing * (index + 1);
      
      const bandRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bandRect.setAttribute('x', (bandX - bandWidth / 2).toString());
      bandRect.setAttribute('y', (centerY - bodyHeight / 2).toString());
      bandRect.setAttribute('width', bandWidth.toString());
      bandRect.setAttribute('height', bodyHeight.toString());
      bandRect.setAttribute('fill', COLOR_TO_RGB[band.color]);
      
      // Add stroke to make bands more visible
      if (band.color === ResistorColor.WHITE || band.color === ResistorColor.YELLOW) {
        bandRect.setAttribute('stroke', '#888');
        bandRect.setAttribute('stroke-width', '0.5');
      }

      // Apply rotation
      bandRect.setAttribute('transform', `rotate(${angle} ${centerX} ${centerY})`);
      group.appendChild(bandRect);
    });
  }

  /**
   * Render an LED component at specified positions
   */
  private renderLEDAtPositions(group: SVGGElement, component: AnyComponent, positions: Position[]): void {
    if (positions.length < 2) return;
    if (component.type !== ComponentType.LED) return;

    const start = this.positionToPixels(positions[0]); // Anode (+)
    const end = this.positionToPixels(positions[1]); // Cathode (-)

    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;

    // Draw LED body (circle)
    const radius = 15;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', centerX.toString());
    circle.setAttribute('cy', centerY.toString());
    circle.setAttribute('r', radius.toString());
    circle.setAttribute('fill', '#ff4444');
    circle.setAttribute('stroke', '#cc0000');
    circle.setAttribute('stroke-width', '2');
    group.appendChild(circle);

    // Draw polarity indicator (flat side on cathode)
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', (end.x - 8).toString());
    line.setAttribute('y1', (end.y - 8).toString());
    line.setAttribute('x2', (end.x - 8).toString());
    line.setAttribute('y2', (end.y + 8).toString());
    line.setAttribute('stroke', '#000');
    line.setAttribute('stroke-width', '3');
    group.appendChild(line);

    // Draw leads
    this.drawSimpleLead(group, start, centerX, centerY);
    this.drawSimpleLead(group, end, centerX, centerY);

    // Add "+" symbol on anode side
    const plusText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    plusText.setAttribute('x', centerX.toString());
    plusText.setAttribute('y', centerY.toString());
    plusText.setAttribute('text-anchor', 'middle');
    plusText.setAttribute('dominant-baseline', 'middle');
    plusText.setAttribute('fill', '#fff');
    plusText.setAttribute('font-size', '12');
    plusText.setAttribute('font-weight', 'bold');
    plusText.textContent = '+';
    group.appendChild(plusText);
  }

  /**
   * Render a power supply component at specified positions
   */
  private renderPowerSupplyAtPositions(group: SVGGElement, component: AnyComponent, positions: Position[]): void {
    if (positions.length < 2) return;
    if (component.type !== ComponentType.POWER_SUPPLY) return;

    const start = this.positionToPixels(positions[0]); // Positive
    const end = this.positionToPixels(positions[1]); // Negative

    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;

    // Draw battery symbol
    const batteryWidth = 50;
    const batteryHeight = 30;

    // Main body
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', (centerX - batteryWidth / 2).toString());
    rect.setAttribute('y', (centerY - batteryHeight / 2).toString());
    rect.setAttribute('width', batteryWidth.toString());
    rect.setAttribute('height', batteryHeight.toString());
    rect.setAttribute('fill', '#4488ff');
    rect.setAttribute('stroke', '#2266cc');
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('rx', '5');
    group.appendChild(rect);

    // Draw leads
    this.drawSimpleLead(group, start, centerX - batteryWidth / 2, centerY);
    this.drawSimpleLead(group, end, centerX + batteryWidth / 2, centerY);

    // Positive terminal marker
    const plusLine1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    plusLine1.setAttribute('x1', (centerX - 15).toString());
    plusLine1.setAttribute('y1', centerY.toString());
    plusLine1.setAttribute('x2', (centerX - 5).toString());
    plusLine1.setAttribute('y2', centerY.toString());
    plusLine1.setAttribute('stroke', '#fff');
    plusLine1.setAttribute('stroke-width', '2');
    group.appendChild(plusLine1);

    const plusLine2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    plusLine2.setAttribute('x1', (centerX - 10).toString());
    plusLine2.setAttribute('y1', (centerY - 5).toString());
    plusLine2.setAttribute('x2', (centerX - 10).toString());
    plusLine2.setAttribute('y2', (centerY + 5).toString());
    plusLine2.setAttribute('stroke', '#fff');
    plusLine2.setAttribute('stroke-width', '2');
    group.appendChild(plusLine2);

    // Negative terminal marker
    const minusLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    minusLine.setAttribute('x1', (centerX + 5).toString());
    minusLine.setAttribute('y1', centerY.toString());
    minusLine.setAttribute('x2', (centerX + 15).toString());
    minusLine.setAttribute('y2', centerY.toString());
    minusLine.setAttribute('stroke', '#fff');
    minusLine.setAttribute('stroke-width', '2');
    group.appendChild(minusLine);

    // Add voltage label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', centerX.toString());
    text.setAttribute('y', (centerY + 20).toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', '#fff');
    text.setAttribute('font-size', '10');
    text.setAttribute('font-weight', 'bold');
    text.textContent = `${component.voltage}V`;
    group.appendChild(text);
  }

  /**
   * Render a ground component at specified positions
   */
  private renderGroundAtPositions(group: SVGGElement, _component: AnyComponent, positions: Position[]): void {
    if (positions.length < 1) return;

    const pos = this.positionToPixels(positions[0]);

    // Draw ground symbol (three decreasing horizontal lines)
    const lines = [
      { width: 30, y: 0 },
      { width: 20, y: 6 },
      { width: 10, y: 12 },
    ];

    lines.forEach(({ width, y }) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', (pos.x - width / 2).toString());
      line.setAttribute('y1', (pos.y + y).toString());
      line.setAttribute('x2', (pos.x + width / 2).toString());
      line.setAttribute('y2', (pos.y + y).toString());
      line.setAttribute('stroke', '#000');
      line.setAttribute('stroke-width', '3');
      line.setAttribute('stroke-linecap', 'round');
      group.appendChild(line);
    });

    // Draw vertical line to first horizontal
    const vertLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    vertLine.setAttribute('x1', pos.x.toString());
    vertLine.setAttribute('y1', (pos.y - 10).toString());
    vertLine.setAttribute('x2', pos.x.toString());
    vertLine.setAttribute('y2', pos.y.toString());
    vertLine.setAttribute('stroke', '#000');
    vertLine.setAttribute('stroke-width', '3');
    group.appendChild(vertLine);

    // Connection point
    this.addConnectionDot(group, pos, '#000');
  }

  /**
   * Helper: Draw a component lead from endpoint toward center
   */
  private drawLead(
    group: SVGGElement,
    endPoint: { x: number; y: number },
    centerX: number,
    centerY: number,
    angle: number,
    startPos: { x: number; y: number },
    _endPos: { x: number; y: number }
  ): void {
    const leadLength = 20;
    const dx = Math.cos((angle * Math.PI) / 180) * leadLength;
    const dy = Math.sin((angle * Math.PI) / 180) * leadLength;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

    // Determine if this is the start or end lead by comparing to original positions
    const isStart = endPoint.x === startPos.x && endPoint.y === startPos.y;

    if (isStart) {
      line.setAttribute('x1', endPoint.x.toString());
      line.setAttribute('y1', endPoint.y.toString());
      line.setAttribute('x2', (centerX - dx).toString());
      line.setAttribute('y2', (centerY - dy).toString());
    } else {
      line.setAttribute('x1', (centerX + dx).toString());
      line.setAttribute('y1', (centerY + dy).toString());
      line.setAttribute('x2', endPoint.x.toString());
      line.setAttribute('y2', endPoint.y.toString());
    }

    line.setAttribute('stroke', '#666');
    line.setAttribute('stroke-width', '2');
    group.appendChild(line);
  }

  /**
   * Helper: Draw a simple lead from endpoint to body edge
   */
  private drawSimpleLead(
    group: SVGGElement,
    endPoint: { x: number; y: number },
    bodyX: number,
    bodyY: number
  ): void {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', endPoint.x.toString());
    line.setAttribute('y1', endPoint.y.toString());
    line.setAttribute('x2', bodyX.toString());
    line.setAttribute('y2', bodyY.toString());
    line.setAttribute('stroke', '#666');
    line.setAttribute('stroke-width', '2');
    group.appendChild(line);
  }

  /**
   * Helper: Add a connection dot at a point
   */
  private addConnectionDot(
    group: SVGGElement,
    point: { x: number; y: number },
    color: string
  ): void {
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', point.x.toString());
    dot.setAttribute('cy', point.y.toString());
    dot.setAttribute('r', '3');
    dot.setAttribute('fill', color);
    group.appendChild(dot);
  }

  /**
   * Render a microprocessor (EDU-8) at specified positions
   * DIP-16 package with 8 pins per side
   */
  private renderMicroprocessorAtPositions(
    group: SVGGElement,
    _component: AnyComponent,
    positions: Position[]
  ): void {
    if (positions.length < 16) return;

    // Get pixel positions for all 16 pins
    const pinPixels = positions.map(pos => this.positionToPixels(pos));
    
    // Calculate chip body bounds
    const leftPins = pinPixels.slice(0, 8);   // Pins 1-8 (left side, top to bottom)
    const rightPins = pinPixels.slice(8, 16); // Pins 9-16 (right side, bottom to top)
    
    // Body bounds
    const bodyLeft = Math.min(...leftPins.map(p => p.x)) + 15;
    const bodyRight = Math.max(...rightPins.map(p => p.x)) - 15;
    const bodyTop = leftPins[0].y - 10;
    const bodyBottom = leftPins[7].y + 10;
    const bodyWidth = bodyRight - bodyLeft;
    const bodyHeight = bodyBottom - bodyTop;
    
    // Draw chip body
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    body.setAttribute('x', bodyLeft.toString());
    body.setAttribute('y', bodyTop.toString());
    body.setAttribute('width', bodyWidth.toString());
    body.setAttribute('height', bodyHeight.toString());
    body.setAttribute('fill', '#2c3e50');
    body.setAttribute('stroke', '#000');
    body.setAttribute('stroke-width', '2');
    body.setAttribute('rx', '4');
    group.appendChild(body);
    
    // Draw notch at top (pin 1 indicator)
    const notchRadius = 8;
    const notchCenterX = bodyLeft + bodyWidth / 2;
    const notch = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    notch.setAttribute('cx', notchCenterX.toString());
    notch.setAttribute('cy', bodyTop.toString());
    notch.setAttribute('r', notchRadius.toString());
    notch.setAttribute('fill', '#34495e');
    group.appendChild(notch);
    
    // Draw chip label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', (bodyLeft + bodyWidth / 2).toString());
    label.setAttribute('y', (bodyTop + bodyHeight / 2).toString());
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
    label.setAttribute('fill', '#ecf0f1');
    label.setAttribute('font-size', '12');
    label.setAttribute('font-weight', 'bold');
    label.setAttribute('font-family', 'monospace');
    label.textContent = 'EDU-8';
    group.appendChild(label);
    
    // Draw pins
    leftPins.forEach((pin) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', pin.x.toString());
      line.setAttribute('y1', pin.y.toString());
      line.setAttribute('x2', bodyLeft.toString());
      line.setAttribute('y2', pin.y.toString());
      line.setAttribute('stroke', '#666');
      line.setAttribute('stroke-width', '2');
      group.appendChild(line);
      
      // Connection dot at pin
      this.addConnectionDot(group, pin, '#666');
    });
    
    rightPins.forEach((pin) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', pin.x.toString());
      line.setAttribute('y1', pin.y.toString());
      line.setAttribute('x2', bodyRight.toString());
      line.setAttribute('y2', pin.y.toString());
      line.setAttribute('stroke', '#666');
      line.setAttribute('stroke-width', '2');
      group.appendChild(line);
      
      // Connection dot at pin
      this.addConnectionDot(group, pin, '#666');
    });
  }
}
