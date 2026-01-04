/**
 * Schematic diagram renderer
 * Renders schematic symbols and connections as SVG
 */

import type { SchematicDiagram, SchematicSymbol, SchematicConnection } from '@/core/schematic-types';
import { ComponentType } from '@/core/types';
import { voltageToColor } from './voltage-colors';
import type { SimulationResult } from '@/core/types';

/**
 * Renders schematic diagrams to SVG
 */
export class SchematicRenderer {
  private static readonly WIRE_WIDTH = 2;
  private static readonly TERMINAL_RADIUS = 4;

  /**
   * Render complete schematic diagram to SVG element
   */
  renderSchematic(
    diagram: SchematicDiagram,
    simulation: SimulationResult | null = null,
    selectedComponentId: string | null = null
  ): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'schematic-diagram');

    // Calculate viewBox from bounds
    const { minX, maxX, minY, maxY } = diagram.bounds;
    const width = maxX - minX;
    const height = maxY - minY;
    svg.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    // Render connections first (behind symbols)
    for (const connection of diagram.connections) {
      const group = this.renderConnection(connection, simulation);
      svg.appendChild(group);
    }

    // Render symbols
    for (const symbol of diagram.symbols) {
      const group = this.renderSymbol(symbol, simulation, selectedComponentId);
      svg.appendChild(group);
    }

    return svg;
  }

  /**
   * Render a connection line
   */
  private renderConnection(
    connection: SchematicConnection,
    simulation: SimulationResult | null
  ): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'schematic-connection');
    group.setAttribute('data-net-id', connection.netId);

    // Get voltage for this net
    let strokeColor = '#666';
    if (simulation?.success && simulation.nodeVoltages.has(connection.netId)) {
      const voltage = simulation.nodeVoltages.get(connection.netId)!;
      const color = voltageToColor(voltage);
      strokeColor = color.rgb;
    }

    // Render path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathData = this.createPathData(connection.path);
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', strokeColor);
    path.setAttribute('stroke-width', SchematicRenderer.WIRE_WIDTH.toString());
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');
    group.appendChild(path);

    return group;
  }

  /**
   * Create SVG path data from points
   */
  private createPathData(points: Array<{ x: number; y: number }>): string {
    if (points.length === 0) return '';
    
    let pathData = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathData += ` L ${points[i].x} ${points[i].y}`;
    }
    return pathData;
  }

  /**
   * Render a schematic symbol
   */
  private renderSymbol(
    symbol: SchematicSymbol,
    _simulation: SimulationResult | null,
    selectedComponentId: string | null
  ): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'schematic-symbol');
    group.setAttribute('data-component-id', symbol.componentId);
    group.setAttribute('transform', `translate(${symbol.position.x}, ${symbol.position.y})`);
    
    // Add selection highlight
    if (selectedComponentId === symbol.componentId) {
      group.classList.add('selected');
    }

    // Render symbol based on component type
    let symbolGraphic: SVGElement;
    switch (symbol.componentType) {
      case ComponentType.RESISTOR:
        symbolGraphic = this.renderResistorSymbol(symbol);
        break;
      case ComponentType.LED:
        symbolGraphic = this.renderLEDSymbol(symbol);
        break;
      case ComponentType.POWER_SUPPLY:
        symbolGraphic = this.renderPowerSupplySymbol(symbol);
        break;
      case ComponentType.GROUND:
        symbolGraphic = this.renderGroundSymbol(symbol);
        break;
      case ComponentType.WIRE:
        symbolGraphic = this.renderWireSymbol(symbol);
        break;
      default:
        symbolGraphic = this.renderGenericSymbol(symbol);
    }

    group.appendChild(symbolGraphic);

    // Render terminals
    for (const terminal of symbol.terminals) {
      const terminalEl = this.renderTerminal(terminal.position);
      group.appendChild(terminalEl);
    }

    // Add label with component value
    const label = this.createLabel(symbol);
    if (label) {
      group.appendChild(label);
    }

    return group;
  }

  /**
   * Render resistor symbol (zigzag)
   */
  private renderResistorSymbol(_symbol: SchematicSymbol): SVGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Draw zigzag resistor symbol
    const zigzag = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const height = 8;
    const segmentWidth = 6;
    const segments = 6;
    const startX = -segmentWidth * segments / 2;
    
    let pathData = `M ${startX} 0`;
    for (let i = 0; i < segments; i++) {
      const x = startX + i * segmentWidth + segmentWidth / 2;
      const y = (i % 2 === 0) ? -height : height;
      pathData += ` L ${x} ${y}`;
    }
    pathData += ` L ${-startX} 0`;
    
    zigzag.setAttribute('d', pathData);
    zigzag.setAttribute('stroke', '#333');
    zigzag.setAttribute('stroke-width', '2');
    zigzag.setAttribute('fill', 'none');
    group.appendChild(zigzag);

    // Add leads
    const leftLead = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    leftLead.setAttribute('x1', '-30');
    leftLead.setAttribute('y1', '0');
    leftLead.setAttribute('x2', startX.toString());
    leftLead.setAttribute('y2', '0');
    leftLead.setAttribute('stroke', '#333');
    leftLead.setAttribute('stroke-width', '2');
    group.appendChild(leftLead);

    const rightLead = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    rightLead.setAttribute('x1', (-startX).toString());
    rightLead.setAttribute('y1', '0');
    rightLead.setAttribute('x2', '30');
    rightLead.setAttribute('y2', '0');
    rightLead.setAttribute('stroke', '#333');
    rightLead.setAttribute('stroke-width', '2');
    group.appendChild(rightLead);

    return group;
  }

  /**
   * Render LED symbol (diode with arrows)
   */
  private renderLEDSymbol(_symbol: SchematicSymbol): SVGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Draw diode triangle
    const triangle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    triangle.setAttribute('points', '-8,-10 -8,10 8,0');
    triangle.setAttribute('fill', '#ff4444');
    triangle.setAttribute('stroke', '#333');
    triangle.setAttribute('stroke-width', '2');
    group.appendChild(triangle);

    // Draw cathode bar
    const cathode = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    cathode.setAttribute('x1', '8');
    cathode.setAttribute('y1', '-10');
    cathode.setAttribute('x2', '8');
    cathode.setAttribute('y2', '10');
    cathode.setAttribute('stroke', '#333');
    cathode.setAttribute('stroke-width', '2');
    group.appendChild(cathode);

    // Add leads
    const leftLead = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    leftLead.setAttribute('x1', '-30');
    leftLead.setAttribute('y1', '0');
    leftLead.setAttribute('x2', '-8');
    leftLead.setAttribute('y2', '0');
    leftLead.setAttribute('stroke', '#333');
    leftLead.setAttribute('stroke-width', '2');
    group.appendChild(leftLead);

    const rightLead = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    rightLead.setAttribute('x1', '8');
    rightLead.setAttribute('y1', '0');
    rightLead.setAttribute('x2', '30');
    rightLead.setAttribute('y2', '0');
    rightLead.setAttribute('stroke', '#333');
    rightLead.setAttribute('stroke-width', '2');
    group.appendChild(rightLead);

    // Add light emission arrows
    const arrow1 = this.createArrow(10, -8, 18, -16);
    const arrow2 = this.createArrow(10, 8, 18, 16);
    group.appendChild(arrow1);
    group.appendChild(arrow2);

    return group;
  }

  /**
   * Create an arrow for LED symbol
   */
  private createArrow(x1: number, y1: number, x2: number, y2: number): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1.toString());
    line.setAttribute('y1', y1.toString());
    line.setAttribute('x2', x2.toString());
    line.setAttribute('y2', y2.toString());
    line.setAttribute('stroke', '#ffaa00');
    line.setAttribute('stroke-width', '1.5');
    group.appendChild(line);

    // Arrowhead
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const arrowSize = 4;
    
    const arrowHead = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const ax1 = x2 - arrowSize * Math.cos(angle - Math.PI / 6);
    const ay1 = y2 - arrowSize * Math.sin(angle - Math.PI / 6);
    const ax2 = x2 - arrowSize * Math.cos(angle + Math.PI / 6);
    const ay2 = y2 - arrowSize * Math.sin(angle + Math.PI / 6);
    arrowHead.setAttribute('points', `${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`);
    arrowHead.setAttribute('fill', '#ffaa00');
    group.appendChild(arrowHead);

    return group;
  }

  /**
   * Render power supply symbol (battery)
   */
  private renderPowerSupplySymbol(_symbol: SchematicSymbol): SVGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Positive terminal (longer line)
    const posLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    posLine.setAttribute('x1', '-12');
    posLine.setAttribute('y1', '-5');
    posLine.setAttribute('x2', '12');
    posLine.setAttribute('y2', '-5');
    posLine.setAttribute('stroke', '#ff3333');
    posLine.setAttribute('stroke-width', '3');
    group.appendChild(posLine);

    // Negative terminal (shorter line)
    const negLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    negLine.setAttribute('x1', '-8');
    negLine.setAttribute('y1', '5');
    negLine.setAttribute('x2', '8');
    negLine.setAttribute('y2', '5');
    negLine.setAttribute('stroke', '#333');
    negLine.setAttribute('stroke-width', '3');
    group.appendChild(negLine);

    // Connection leads
    const topLead = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    topLead.setAttribute('x1', '0');
    topLead.setAttribute('y1', '-20');
    topLead.setAttribute('x2', '0');
    topLead.setAttribute('y2', '-5');
    topLead.setAttribute('stroke', '#333');
    topLead.setAttribute('stroke-width', '2');
    group.appendChild(topLead);

    const bottomLead = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    bottomLead.setAttribute('x1', '0');
    bottomLead.setAttribute('y1', '5');
    bottomLead.setAttribute('x2', '0');
    bottomLead.setAttribute('y2', '20');
    bottomLead.setAttribute('stroke', '#333');
    bottomLead.setAttribute('stroke-width', '2');
    group.appendChild(bottomLead);

    return group;
  }

  /**
   * Render ground symbol
   */
  private renderGroundSymbol(_symbol: SchematicSymbol): SVGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Connection line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', '-20');
    line.setAttribute('x2', '0');
    line.setAttribute('y2', '0');
    line.setAttribute('stroke', '#333');
    line.setAttribute('stroke-width', '2');
    group.appendChild(line);

    // Ground symbol (three horizontal lines)
    const lines = [
      { width: 20, y: 0 },
      { width: 12, y: 4 },
      { width: 6, y: 8 },
    ];

    for (const { width, y } of lines) {
      const groundLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      groundLine.setAttribute('x1', (-width / 2).toString());
      groundLine.setAttribute('y1', y.toString());
      groundLine.setAttribute('x2', (width / 2).toString());
      groundLine.setAttribute('y2', y.toString());
      groundLine.setAttribute('stroke', '#333');
      groundLine.setAttribute('stroke-width', '2');
      group.appendChild(groundLine);
    }

    return group;
  }

  /**
   * Render wire symbol (just a line with dots)
   */
  private renderWireSymbol(_symbol: SchematicSymbol): SVGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Wire line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '-30');
    line.setAttribute('y1', '0');
    line.setAttribute('x2', '30');
    line.setAttribute('y2', '0');
    line.setAttribute('stroke', '#666');
    line.setAttribute('stroke-width', '2');
    group.appendChild(line);

    return group;
  }

  /**
   * Render generic component symbol
   */
  private renderGenericSymbol(_symbol: SchematicSymbol): SVGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Draw box
    const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    box.setAttribute('x', '-15');
    box.setAttribute('y', '-15');
    box.setAttribute('width', '30');
    box.setAttribute('height', '30');
    box.setAttribute('fill', '#eee');
    box.setAttribute('stroke', '#333');
    box.setAttribute('stroke-width', '2');
    group.appendChild(box);

    return group;
  }

  /**
   * Render a terminal point
   */
  private renderTerminal(position: { x: number; y: number }): SVGElement {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', position.x.toString());
    circle.setAttribute('cy', position.y.toString());
    circle.setAttribute('r', SchematicRenderer.TERMINAL_RADIUS.toString());
    circle.setAttribute('fill', '#333');
    circle.setAttribute('class', 'terminal');
    return circle;
  }

  /**
   * Create label for symbol
   */
  private createLabel(symbol: SchematicSymbol): SVGElement | null {
    let labelText = '';
    
    if ('resistance' in symbol.properties) {
      const resistance = symbol.properties.resistance as number;
      if (resistance >= 1000000) {
        labelText = `${(resistance / 1000000).toFixed(1)}MΩ`;
      } else if (resistance >= 1000) {
        labelText = `${(resistance / 1000).toFixed(1)}kΩ`;
      } else {
        labelText = `${resistance}Ω`;
      }
    } else if ('voltage' in symbol.properties) {
      labelText = `${symbol.properties.voltage}V`;
    }

    if (!labelText) {
      return null;
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '0');
    text.setAttribute('y', '25');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '12');
    text.setAttribute('fill', '#333');
    text.textContent = labelText;
    
    return text;
  }
}
