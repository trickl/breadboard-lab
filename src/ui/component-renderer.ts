import type { AnyComponent, Position } from '@/core/types';
import { ComponentType } from '@/core/types';

/**
 * Visual component renderer that creates SVG representations of components on the breadboard
 */
export class ComponentRenderer {
  // Breadboard grid spacing (matches CSS in style.css)
  private static readonly HOLE_SIZE = 20;
  private static readonly HOLE_MARGIN = 3;
  private static readonly HOLE_SPACING = ComponentRenderer.HOLE_SIZE + ComponentRenderer.HOLE_MARGIN * 2;

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
  renderComponents(components: AnyComponent[]): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'component-overlay');

    // Reset wire color cycling for consistent colors
    this.resetWireColors();

    // Render wires first (behind other components)
    components
      .filter((c) => c.type === ComponentType.WIRE)
      .forEach((component) => {
        const group = this.renderComponent(component);
        svg.appendChild(group);
      });

    // Render other components
    components
      .filter((c) => c.type !== ComponentType.WIRE)
      .forEach((component) => {
        const group = this.renderComponent(component);
        svg.appendChild(group);
      });

    return svg;
  }

  /**
   * Render a single component
   */
  private renderComponent(component: AnyComponent): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `component component-${component.type.toLowerCase()}`);
    group.setAttribute('data-component-id', component.id);

    switch (component.type) {
      case ComponentType.WIRE:
        this.renderWire(group, component);
        break;
      case ComponentType.RESISTOR:
        this.renderResistor(group, component);
        break;
      case ComponentType.LED:
        this.renderLED(group, component);
        break;
      case ComponentType.POWER_SUPPLY:
        this.renderPowerSupply(group, component);
        break;
      case ComponentType.GROUND:
        this.renderGround(group, component);
        break;
    }

    return group;
  }

  /**
   * Render a wire component
   */
  private renderWire(group: SVGGElement, component: AnyComponent): void {
    if (component.positions.length < 2) return;

    const start = this.positionToPixels(component.positions[0]);
    const end = this.positionToPixels(component.positions[1]);

    // Use Manhattan routing (orthogonal lines)
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    // Create path with rounded corners
    const pathData = `
      M ${start.x} ${start.y}
      L ${start.x} ${(start.y + end.y) / 2}
      L ${end.x} ${(start.y + end.y) / 2}
      L ${end.x} ${end.y}
    `;

    path.setAttribute('d', pathData.trim());
    path.setAttribute('stroke', this.getNextWireColor());
    path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    group.appendChild(path);

    // Add dots at endpoints to show connection points
    this.addConnectionDot(group, start, path.getAttribute('stroke') || '#000');
    this.addConnectionDot(group, end, path.getAttribute('stroke') || '#000');
  }

  /**
   * Render a resistor component
   */
  private renderResistor(group: SVGGElement, component: AnyComponent): void {
    if (component.positions.length < 2) return;
    if (component.type !== ComponentType.RESISTOR) return;

    const start = this.positionToPixels(component.positions[0]);
    const end = this.positionToPixels(component.positions[1]);

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
    this.drawLead(group, start, centerX, centerY, angle);
    this.drawLead(group, end, centerX, centerY, angle);

    // Add label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', centerX.toString());
    text.setAttribute('y', centerY.toString());
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', '#000');
    text.setAttribute('font-size', '10');
    text.setAttribute('font-weight', 'bold');
    text.textContent = `${component.resistance / 1000}kΩ`;
    group.appendChild(text);
  }

  /**
   * Render an LED component
   */
  private renderLED(group: SVGGElement, component: AnyComponent): void {
    if (component.positions.length < 2) return;
    if (component.type !== ComponentType.LED) return;

    const start = this.positionToPixels(component.positions[0]); // Anode (+)
    const end = this.positionToPixels(component.positions[1]); // Cathode (-)

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
   * Render a power supply component
   */
  private renderPowerSupply(group: SVGGElement, component: AnyComponent): void {
    if (component.positions.length < 2) return;
    if (component.type !== ComponentType.POWER_SUPPLY) return;

    const start = this.positionToPixels(component.positions[0]); // Positive
    const end = this.positionToPixels(component.positions[1]); // Negative

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
   * Render a ground component
   */
  private renderGround(group: SVGGElement, component: AnyComponent): void {
    if (component.positions.length < 1) return;

    const pos = this.positionToPixels(component.positions[0]);

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
    angle: number
  ): void {
    const leadLength = 20;
    const dx = Math.cos((angle * Math.PI) / 180) * leadLength;
    const dy = Math.sin((angle * Math.PI) / 180) * leadLength;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

    // Determine if this is the start or end lead
    const isStart = endPoint.x < centerX || (endPoint.x === centerX && endPoint.y < centerY);

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
}
