import type { Circuit, SimulationResult, AnyComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { resistanceToColorBands, COLOR_TO_RGB, ResistorColor } from '@/core/resistor-color-code';

/**
 * Panel content type - what kind of information to display
 */
export type ExplainPanelContent =
  | { type: 'error'; errorData: { message: string; explanation: string; suggestions: string[] } }
  | { type: 'node'; nodeId: string }
  | { type: 'component'; componentId: string }
  | null;

/**
 * Explain Panel - provides contextual information about circuits
 */
export class ExplainPanel {
  private panelElement: HTMLElement | null = null;
  private circuit: Circuit | null = null;
  private simulation: SimulationResult | null = null;
  private components: AnyComponent[] = [];

  /**
   * Initialize the explain panel and attach to container
   */
  initialize(container: HTMLElement): void {
    // Remove existing panel if present
    const existing = container.querySelector('.explain-panel');
    if (existing) {
      existing.remove();
    }

    // Create panel element
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'explain-panel';
    this.panelElement.innerHTML = `
      <div class="explain-panel-header">
        <h3>Circuit Explanation</h3>
        <button class="explain-panel-close" aria-label="Close panel">✕</button>
      </div>
      <div class="explain-panel-content">
        <p class="explain-panel-hint">Click on a component, net, or error icon to see details.</p>
      </div>
    `;

    container.appendChild(this.panelElement);

    // Attach close button handler
    const closeBtn = this.panelElement.querySelector('.explain-panel-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Initially hidden
    this.hide();
  }

  /**
   * Update circuit data for content generation
   */
  updateCircuitData(circuit: Circuit, simulation: SimulationResult, components: AnyComponent[]): void {
    this.circuit = circuit;
    this.simulation = simulation;
    this.components = components;
  }

  /**
   * Show panel with specific content
   */
  show(content: ExplainPanelContent): void {
    if (!this.panelElement) return;

    if (content === null) {
      this.hide();
      return;
    }

    // Generate content based on type
    let html = '';
    switch (content.type) {
      case 'error':
        html = this.generateErrorContent(content.errorData);
        break;
      case 'node':
        html = this.generateNodeContent(content.nodeId);
        break;
      case 'component':
        html = this.generateComponentContent(content.componentId);
        break;
    }

    // Update panel content
    const contentDiv = this.panelElement.querySelector('.explain-panel-content');
    if (contentDiv) {
      contentDiv.innerHTML = html;
    }

    // Show panel
    this.panelElement.classList.add('visible');
  }

  /**
   * Hide the panel
   */
  hide(): void {
    if (!this.panelElement) return;
    this.panelElement.classList.remove('visible');
  }

  /**
   * Generate content for error explanations
   */
  private generateErrorContent(errorData: { message: string; explanation: string; suggestions: string[] }): string {
    return `
      <div class="explain-error">
        <h4 class="explain-error-title">⚠️ ${errorData.message}</h4>
        <div class="explain-section">
          <h5>What's happening:</h5>
          <p>${errorData.explanation}</p>
        </div>
        <div class="explain-section">
          <h5>How to fix it:</h5>
          <ul class="explain-suggestions">
            ${errorData.suggestions.map((s) => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Generate content for node (net) explanations
   */
  private generateNodeContent(nodeId: string): string {
    if (!this.circuit || !this.simulation) {
      return '<p>No circuit data available.</p>';
    }

    const node = this.circuit.nodes.get(nodeId);
    if (!node) {
      return '<p>Node not found.</p>';
    }

    const voltage = this.simulation.nodeVoltages.get(nodeId) || 0;

    // Find connected components
    const connectedEdges = this.circuit.edges.filter(
      (edge) => edge.nodeA === nodeId || edge.nodeB === nodeId
    );

    const connectedComponents = connectedEdges.map((edge) => {
      const current = this.simulation!.edgeCurrents.get(edge.id) || 0;
      const direction = edge.nodeA === nodeId ? 'outgoing' : 'incoming';
      return {
        component: edge.component,
        current,
        direction,
      };
    });

    return `
      <div class="explain-node">
        <h4 class="explain-node-title">⚡ Net Information</h4>
        <div class="explain-section">
          <h5>Voltage:</h5>
          <p class="explain-value">${voltage.toFixed(3)}V</p>
        </div>
        <div class="explain-section">
          <h5>Connected Components:</h5>
          <ul class="explain-component-list">
            ${connectedComponents
              .map(
                (c) => `
              <li>
                <strong>${this.getComponentName(c.component)}</strong>
                ${Math.abs(c.current) > 1e-6 ? ` - ${(c.current * 1000).toFixed(2)}mA (${c.direction})` : ' - no current'}
              </li>
            `
              )
              .join('')}
          </ul>
        </div>
        ${this.generateNodeExplanation(voltage, connectedComponents)}
      </div>
    `;
  }

  /**
   * Generate educational explanation for a node
   */
  private generateNodeExplanation(
    voltage: number,
    connectedComponents: Array<{ component: AnyComponent; current: number; direction: string }>
  ): string {
    let explanation = '';

    // Check if it's ground
    if (Math.abs(voltage) < 0.01) {
      explanation = '<h5>Why this voltage?</h5><p>This net is at ground (0V), which serves as the reference point for all other voltages in the circuit.</p>';
    } else if (voltage > 4) {
      explanation = '<h5>Why this voltage?</h5><p>This net is connected to a power supply, providing the voltage needed to drive the circuit.</p>';
    } else if (voltage > 0.5) {
      const hasResistor = connectedComponents.some((c) => c.component.type === ComponentType.RESISTOR);
      if (hasResistor) {
        explanation =
          '<h5>Why this voltage?</h5><p>This net is part of a voltage divider. The voltage here is determined by the ratio of resistances between power and ground.</p>';
      } else {
        explanation =
          '<h5>Why this voltage?</h5><p>This net has an intermediate voltage due to voltage drops across components in the circuit.</p>';
      }
    }

    return explanation ? `<div class="explain-section">${explanation}</div>` : '';
  }

  /**
   * Generate content for component explanations
   */
  private generateComponentContent(componentId: string): string {
    if (!this.circuit || !this.simulation) {
      return '<p>No circuit data available.</p>';
    }

    const component = this.components.find((c) => c.id === componentId);
    if (!component) {
      return '<p>Component not found.</p>';
    }

    // Find the edge for this component
    const edge = this.circuit.edges.find((e) => e.component.id === componentId);
    if (!edge) {
      return '<p>Component not connected.</p>';
    }

    const voltageA = this.simulation.nodeVoltages.get(edge.nodeA) || 0;
    const voltageB = this.simulation.nodeVoltages.get(edge.nodeB) || 0;
    const voltageDiff = voltageA - voltageB;
    const current = this.simulation.edgeCurrents.get(edge.id) || 0;
    const power = Math.abs(voltageDiff * current);

    return `
      <div class="explain-component">
        <h4 class="explain-component-title">🔌 ${this.getComponentName(component)}</h4>
        ${this.generateComponentProperties(component)}
        <div class="explain-section">
          <h5>Terminal Voltages:</h5>
          <p>Terminal A: ${voltageA.toFixed(3)}V</p>
          <p>Terminal B: ${voltageB.toFixed(3)}V</p>
          <p>Voltage across: ${Math.abs(voltageDiff).toFixed(3)}V</p>
        </div>
        <div class="explain-section">
          <h5>Current:</h5>
          <p class="explain-value">${(Math.abs(current) * 1000).toFixed(2)}mA ${current >= 0 ? '→' : '←'}</p>
        </div>
        <div class="explain-section">
          <h5>Power Dissipation:</h5>
          <p class="explain-value">${(power * 1000).toFixed(2)}mW</p>
        </div>
        ${this.generateComponentExplanation(component, voltageDiff, current, power)}
      </div>
    `;
  }

  /**
   * Generate component-specific properties display
   */
  private generateComponentProperties(component: AnyComponent): string {
    switch (component.type) {
      case ComponentType.RESISTOR:
        return this.generateResistorProperties(component);
      case ComponentType.LED:
        return `<div class="explain-section"><h5>Specifications:</h5><p>Forward Voltage: ${component.forwardVoltage}V<br>Max Current: ${(component.maxCurrent * 1000).toFixed(1)}mA</p></div>`;
      case ComponentType.POWER_SUPPLY:
        return `<div class="explain-section"><h5>Output Voltage:</h5><p>${component.voltage}V</p></div>`;
      default:
        return '';
    }
  }

  /**
   * Generate detailed resistor properties including color band explanation
   */
  private generateResistorProperties(component: AnyComponent): string {
    if (component.type !== ComponentType.RESISTOR) return '';

    const resistance = component.resistance;
    const resistanceStr = resistance >= 1000 
      ? (resistance / 1000).toFixed(1) + 'kΩ' 
      : resistance + 'Ω';

    try {
      // Default to 5% tolerance (4-band resistor)
      const tolerance = 5;
      const bands = resistanceToColorBands(resistance, tolerance);

      // Generate color band visualization
      const bandHTML = bands.map(band => {
        const colorName = this.formatColorName(band.color);
        const meaning = this.formatBandMeaning(band.meaning);
        const bgColor = COLOR_TO_RGB[band.color];
        const textColor = this.shouldUseDarkText(band.color) ? '#000' : '#fff';
        
        return `
          <div class="color-band-item" style="background: ${bgColor}; color: ${textColor}; border: 1px solid #666;">
            <div class="band-color">${colorName}</div>
            <div class="band-meaning">${meaning}</div>
            <div class="band-value">${this.formatBandValue(band)}</div>
          </div>
        `;
      }).join('');

      return `
        <div class="explain-section">
          <h5>Resistance:</h5>
          <p class="explain-value">${resistanceStr}</p>
        </div>
        <div class="explain-section">
          <h5>Color Code (${bands.length}-band, ${tolerance}% tolerance):</h5>
          <div class="color-bands-display">
            ${bandHTML}
          </div>
          <p style="margin-top: 8px; font-size: 0.9em; color: #888;">
            Reading: ${this.generateColorCodeReading(bands, resistance)}
          </p>
        </div>
      `;
    } catch (error) {
      // Fallback if color code calculation fails
      return `<div class="explain-section"><h5>Resistance:</h5><p>${resistanceStr}</p></div>`;
    }
  }

  /**
   * Format color name for display
   */
  private formatColorName(color: ResistorColor): string {
    return color.charAt(0) + color.slice(1).toLowerCase();
  }

  /**
   * Format band meaning for display
   */
  private formatBandMeaning(meaning: string): string {
    switch (meaning) {
      case 'digit1':
        return '1st Digit';
      case 'digit2':
        return '2nd Digit';
      case 'digit3':
        return '3rd Digit';
      case 'multiplier':
        return 'Multiplier';
      case 'tolerance':
        return 'Tolerance';
      default:
        return meaning;
    }
  }

  /**
   * Format band value for display
   */
  private formatBandValue(band: { meaning: string; value: number }): string {
    if (band.meaning === 'multiplier') {
      if (band.value >= 1000000) {
        return `×${band.value / 1000000}M`;
      } else if (band.value >= 1000) {
        return `×${band.value / 1000}k`;
      } else if (band.value < 1) {
        return `×${band.value}`;
      } else {
        return `×${band.value}`;
      }
    } else if (band.meaning === 'tolerance') {
      return `±${band.value}%`;
    } else {
      return band.value.toString();
    }
  }

  /**
   * Generate a readable explanation of the color code
   */
  private generateColorCodeReading(bands: ReturnType<typeof resistanceToColorBands>, resistance: number): string {
    if (bands.length === 4) {
      // 4-band: digit1-digit2-multiplier-tolerance
      const digit1 = bands[0].value;
      const digit2 = bands[1].value;
      const multiplier = bands[2].value;
      const tolerance = bands[3].value;
      return `${digit1}${digit2} × ${this.formatMultiplier(multiplier)} = ${this.formatResistance(resistance)} ±${tolerance}%`;
    } else if (bands.length === 5) {
      // 5-band: digit1-digit2-digit3-multiplier-tolerance
      const digit1 = bands[0].value;
      const digit2 = bands[1].value;
      const digit3 = bands[2].value;
      const multiplier = bands[3].value;
      const tolerance = bands[4].value;
      return `${digit1}${digit2}${digit3} × ${this.formatMultiplier(multiplier)} = ${this.formatResistance(resistance)} ±${tolerance}%`;
    }
    return '';
  }

  /**
   * Format multiplier for readable display
   */
  private formatMultiplier(multiplier: number): string {
    if (multiplier >= 1000000) {
      return `${multiplier / 1000000}M`;
    } else if (multiplier >= 1000) {
      return `${multiplier / 1000}k`;
    } else if (multiplier < 1) {
      return multiplier.toString();
    } else {
      return multiplier.toString();
    }
  }

  /**
   * Format resistance value
   */
  private formatResistance(resistance: number): string {
    if (resistance >= 1000000) {
      return `${(resistance / 1000000).toFixed(2)}MΩ`;
    } else if (resistance >= 1000) {
      return `${(resistance / 1000).toFixed(1)}kΩ`;
    } else {
      return `${resistance}Ω`;
    }
  }

  /**
   * Determine if dark text should be used on this color background
   */
  private shouldUseDarkText(color: ResistorColor): boolean {
    // Use dark text on light colors
    return color === ResistorColor.YELLOW || 
           color === ResistorColor.WHITE || 
           color === ResistorColor.GOLD || 
           color === ResistorColor.SILVER;
  }

  /**
   * Generate educational explanation for a component
   */
  private generateComponentExplanation(
    component: AnyComponent,
    voltageDiff: number,
    current: number,
    power: number
  ): string {
    let explanation = '';

    switch (component.type) {
      case ComponentType.RESISTOR:
        explanation = `
          <div class="explain-section">
            <h5>Role in Circuit:</h5>
            <p>This resistor limits current flow according to Ohm's Law (V = IR). 
            With ${Math.abs(voltageDiff).toFixed(2)}V across it and ${(component as any).resistance}Ω resistance,
            it allows ${(Math.abs(current) * 1000).toFixed(2)}mA of current to flow.</p>
          </div>
        `;
        break;

      case ComponentType.LED:
        if (Math.abs(current) < 1e-6) {
          explanation = `
            <div class="explain-section">
              <h5>Why isn't it lighting?</h5>
              <p>The LED has no current flowing through it. Check if it's connected backwards or if the circuit is incomplete.</p>
            </div>
          `;
        } else if (current < 0) {
          explanation = `
            <div class="explain-section">
              <h5>Problem Detected:</h5>
              <p>Current is flowing backwards through this LED. LEDs only conduct in one direction - rotate it 180° to fix.</p>
            </div>
          `;
        } else {
          const maxCurrent = (component as any).maxCurrent;
          if (current > maxCurrent * 1.2) {
            explanation = `
              <div class="explain-section">
                <h5>⚠️ Warning:</h5>
                <p>This LED is drawing ${(current * 1000).toFixed(1)}mA, which is above its ${(maxCurrent * 1000).toFixed(1)}mA rating. Add a larger resistor to reduce current.</p>
              </div>
            `;
          } else {
            explanation = `
              <div class="explain-section">
                <h5>Status:</h5>
                <p>✓ The LED is conducting properly with ${(current * 1000).toFixed(1)}mA of current, which is within its safe operating range.</p>
              </div>
            `;
          }
        }
        break;

      case ComponentType.POWER_SUPPLY:
        explanation = `
          <div class="explain-section">
            <h5>Role in Circuit:</h5>
            <p>This power supply provides ${(component as any).voltage}V to the circuit. It's currently delivering ${(Math.abs(current) * 1000).toFixed(1)}mA with ${(power * 1000).toFixed(1)}mW of total power.</p>
          </div>
        `;
        break;
    }

    return explanation;
  }

  /**
   * Get human-readable component name
   */
  private getComponentName(component: AnyComponent): string {
    switch (component.type) {
      case ComponentType.RESISTOR:
        return `Resistor (${(component as any).resistance >= 1000 ? (component as any).resistance / 1000 + 'kΩ' : (component as any).resistance + 'Ω'})`;
      case ComponentType.LED:
        return 'LED';
      case ComponentType.WIRE:
        return 'Wire';
      case ComponentType.POWER_SUPPLY:
        return `Power Supply (${(component as any).voltage}V)`;
      case ComponentType.GROUND:
        return 'Ground';
      default:
        return 'Component';
    }
  }
}
