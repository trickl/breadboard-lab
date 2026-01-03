import type { AnyComponent, BreadboardState, Position, Circuit, SimulationResult } from '@/core/types';
import { ComponentType } from '@/core/types';
import { BreadboardLayout } from '@/core/breadboard-layout';
import { CircuitExtractor } from '@/core/circuit-extractor';
import { CircuitSimulator } from '@/core/circuit-simulator';
import { voltageToColor } from './voltage-colors';
import { ComponentRenderer } from './component-renderer';
import { CurrentAnimator } from './current-animator';

/**
 * Main application class managing the breadboard UI and simulation
 */
export class BreadboardApp {
  private state: BreadboardState;
  private selectedComponentType: ComponentType | null = null;
  private placementStart: Position | null = null;
  private extractor: CircuitExtractor;
  private simulator: CircuitSimulator;
  private componentRenderer: ComponentRenderer;
  private currentAnimator: CurrentAnimator;
  private componentIdCounter = 0;
  private tooltipElement: HTMLElement | null = null;
  private cachedCircuit: Circuit | null = null;
  private cachedSimulation: SimulationResult | null = null;
  private handleKeyDownBound: (e: KeyboardEvent) => void;

  constructor(private container: HTMLElement) {
    this.state = { components: [], selectedComponentId: null };
    this.extractor = new CircuitExtractor();
    this.simulator = new CircuitSimulator();
    this.componentRenderer = new ComponentRenderer();
    this.currentAnimator = new CurrentAnimator();
    this.handleKeyDownBound = this.handleKeyDown.bind(this);
    this.render();
  }

  /**
   * Render the entire application
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="header">
        <h1>🔌 Breadboard Lab</h1>
        <p>Build circuits, visualize connections, simulate in real-time</p>
      </div>
      <div class="main-container">
        <div class="toolbar">
          <h2>Components</h2>
          <div class="component-list">
            <button class="component-button" data-component="WIRE">📏 Wire</button>
            <button class="component-button" data-component="RESISTOR">🔲 Resistor (1kΩ)</button>
            <button class="component-button" data-component="LED">💡 LED</button>
            <button class="component-button" data-component="POWER_SUPPLY">⚡ Power (5V)</button>
            <button class="component-button" data-component="GROUND">⏚ Ground</button>
          </div>
          <div style="margin-top: 2rem;">
            <button id="clear-btn" style="width: 100%; padding: 0.75rem; background: #ff4444; border: none; border-radius: 6px; color: white; cursor: pointer; font-size: 0.9rem;">
              Clear All
            </button>
          </div>
        </div>
        <div class="workspace">
          <div class="breadboard-container">
            <div id="breadboard" class="breadboard"></div>
            <div class="voltage-tooltip" id="voltage-tooltip"></div>
          </div>
        </div>
        <div class="info-panel">
          <h2>Circuit Info</h2>
          <div id="circuit-info"></div>
        </div>
      </div>
    `;

    this.tooltipElement = document.getElementById('voltage-tooltip');
    this.renderBreadboard();
    this.attachEventListeners();
    this.updateCircuitInfo();
  }

  /**
   * Render the breadboard grid
   */
  private renderBreadboard(): void {
    const breadboard = document.getElementById('breadboard');
    if (!breadboard) return;

    breadboard.innerHTML = '';

    // Extract circuit and run simulation (cache for performance)
    this.cachedCircuit = this.extractor.extract(this.state);
    this.cachedSimulation = this.simulator.simulate(this.cachedCircuit);

    // Build position-to-node mapping for voltage lookup
    const positionToNode = this.buildPositionToNodeMap(this.cachedCircuit);

    for (let row = 0; row < BreadboardLayout.ROWS; row++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'breadboard-row';

      for (let col = 0; col < BreadboardLayout.COLS_PER_SIDE * 2; col++) {
        const hole = document.createElement('div');
        hole.className = 'hole';
        hole.dataset.row = row.toString();
        hole.dataset.col = col.toString();

        // Check if position is occupied
        const position = { row, col };
        if (this.isPositionOccupied(position)) {
          hole.classList.add('occupied');
        }

        // Apply voltage overlay if simulation succeeded
        if (this.cachedSimulation.success) {
          this.applyVoltageOverlay(hole, position, positionToNode, this.cachedSimulation);
        }

        rowEl.appendChild(hole);
      }

      breadboard.appendChild(rowEl);
    }

    // Render components on top of the breadboard
    this.renderComponents(breadboard);
  }

  /**
   * Render all components as SVG overlay
   */
  private renderComponents(breadboard: HTMLElement): void {
    // Remove existing component overlay if present
    const existingOverlay = breadboard.querySelector('.component-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Create and add new component overlay with selection state
    const svg = this.componentRenderer.renderComponents(
      this.state.components,
      this.state.selectedComponentId
    );
    
    // Calculate SVG dimensions based on breadboard size
    const width = BreadboardLayout.COLS_PER_SIDE * 2 * 26; // 26px per hole (20px + 6px margin)
    const height = BreadboardLayout.ROWS * 26;
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    breadboard.appendChild(svg);

    // Attach component click handlers
    this.attachComponentEventHandlers(svg);

    // Start current animation if simulation succeeded
    if (this.cachedSimulation && this.cachedSimulation.success) {
      this.currentAnimator.start(
        this.cachedSimulation,
        this.state.components,
        svg
      );
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Component selection
    const componentButtons = document.querySelectorAll('.component-button');
    componentButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const componentType = (button as HTMLElement).dataset.component as ComponentType;
        this.selectComponent(componentType);
        componentButtons.forEach((b) => b.classList.remove('active'));
        button.classList.add('active');
      });
    });

    // Breadboard hole clicks
    const holes = document.querySelectorAll('.hole');
    holes.forEach((hole) => {
      hole.addEventListener('click', (e) => {
        const row = parseInt((e.target as HTMLElement).dataset.row || '0');
        const col = parseInt((e.target as HTMLElement).dataset.col || '0');
        this.handleHoleClick({ row, col });
      });

      // Add hover listeners for voltage tooltip
      hole.addEventListener('mouseenter', (e) => {
        const row = parseInt((e.target as HTMLElement).dataset.row || '0');
        const col = parseInt((e.target as HTMLElement).dataset.col || '0');
        this.showVoltageTooltip(e as MouseEvent, { row, col });
      });

      hole.addEventListener('mousemove', (e) => {
        this.updateTooltipPosition(e as MouseEvent);
      });

      hole.addEventListener('mouseleave', () => {
        this.hideVoltageTooltip();
      });
    });

    // Clear button
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.state.components = [];
        this.state.selectedComponentId = null;
        this.placementStart = null;
        this.render();
      });
    }

    // Breadboard background click to deselect
    const breadboard = document.getElementById('breadboard');
    if (breadboard) {
      breadboard.addEventListener('click', (e) => {
        // Only deselect if clicking on breadboard itself, not holes or components
        if (e.target === breadboard) {
          this.deselectComponent();
        }
      });
    }

    // Delete key handler
    document.addEventListener('keydown', this.handleKeyDownBound);
  }

  /**
   * Remove event listeners (cleanup)
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDownBound);
    this.currentAnimator.stop();
  }

  /**
   * Attach event handlers to component SVG elements
   */
  private attachComponentEventHandlers(svg: SVGElement): void {
    const components = svg.querySelectorAll('.component');
    components.forEach((componentEl) => {
      componentEl.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent hole click from firing
        const componentId = (componentEl as HTMLElement).dataset.componentId;
        if (componentId) {
          this.selectComponentById(componentId);
        }
      });
    });

    // Click on SVG background to deselect
    svg.addEventListener('click', (e) => {
      if (e.target === svg) {
        this.deselectComponent();
      }
    });
  }

  /**
   * Handle keyboard events (Delete key)
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Prevent browser back navigation on Backspace
      e.preventDefault();
      
      if (this.state.selectedComponentId) {
        this.deleteSelectedComponent();
      }
    }
  };

  /**
   * Select a component by ID
   */
  private selectComponentById(componentId: string): void {
    this.state.selectedComponentId = componentId;
    this.render();
  }

  /**
   * Deselect the currently selected component
   */
  private deselectComponent(): void {
    this.state.selectedComponentId = null;
    this.render();
  }

  /**
   * Delete the currently selected component
   */
  private deleteSelectedComponent(): void {
    if (!this.state.selectedComponentId) return;

    // Remove component from state
    this.state.components = this.state.components.filter(
      (c) => c.id !== this.state.selectedComponentId
    );

    // Clear selection
    this.state.selectedComponentId = null;

    // Re-render to update circuit
    this.render();
  }

  /**
   * Select a component type for placement
   */
  private selectComponent(type: ComponentType): void {
    this.selectedComponentType = type;
    this.placementStart = null;
  }

  /**
   * Handle click on a breadboard hole
   */
  private handleHoleClick(position: Position): void {
    if (!this.selectedComponentType) {
      return;
    }

    if (!this.placementStart) {
      // First click - start placement
      this.placementStart = position;
    } else {
      // Second click - complete placement
      this.placeComponent(this.placementStart, position);
      this.placementStart = null;
      this.render();
    }
  }

  /**
   * Place a component on the breadboard
   */
  private placeComponent(start: Position, end: Position): void {
    const id = `component-${this.componentIdCounter++}`;
    const positions = [start, end];

    let component: AnyComponent;

    switch (this.selectedComponentType) {
      case ComponentType.WIRE:
        component = {
          id,
          type: ComponentType.WIRE,
          positions,
          resistance: 0.01, // Very low resistance
        };
        break;

      case ComponentType.RESISTOR:
        component = {
          id,
          type: ComponentType.RESISTOR,
          positions,
          resistance: 1000, // 1kΩ
        };
        break;

      case ComponentType.LED:
        component = {
          id,
          type: ComponentType.LED,
          positions,
          forwardVoltage: 2.0,
          maxCurrent: 0.02,
        };
        break;

      case ComponentType.POWER_SUPPLY:
        component = {
          id,
          type: ComponentType.POWER_SUPPLY,
          positions,
          voltage: 5.0,
        };
        break;

      case ComponentType.GROUND:
        component = {
          id,
          type: ComponentType.GROUND,
          positions,
        };
        break;

      default:
        return;
    }

    this.state.components.push(component);
  }

  /**
   * Check if a position is occupied by a component
   */
  private isPositionOccupied(position: Position): boolean {
    return this.state.components.some((c) =>
      c.positions.some((p) => p.row === position.row && p.col === position.col)
    );
  }

  /**
   * Update the circuit information display
   */
  private updateCircuitInfo(): void {
    const infoDiv = document.getElementById('circuit-info');
    if (!infoDiv) return;

    const circuit = this.extractor.extract(this.state);
    const simulation = this.simulator.simulate(circuit);

    infoDiv.innerHTML = `
      <div class="info-section">
        <h3>Components</h3>
        <div class="info-value">${this.state.components.length}</div>
      </div>
      <div class="info-section">
        <h3>Nodes</h3>
        <div class="info-value">${circuit.nodes.size}</div>
      </div>
      <div class="info-section">
        <h3>Connections</h3>
        <div class="info-value">${circuit.edges.length}</div>
      </div>
      <div class="info-section">
        <h3>Simulation</h3>
        <div class="info-value">${simulation.success ? '✓ Success' : '✗ Failed'}</div>
      </div>
      ${
        this.state.components.length > 0
          ? `
      <div class="info-section">
        <h3>Component List</h3>
        ${this.state.components
          .map(
            (c) => `
          <div class="component-item">
            <strong>${c.type}</strong><br>
            ${this.getComponentDetails(c)}
          </div>
        `
          )
          .join('')}
      </div>
      `
          : ''
      }
    `;
  }

  /**
   * Get component-specific details for display
   */
  private getComponentDetails(component: AnyComponent): string {
    switch (component.type) {
      case ComponentType.RESISTOR:
        return `${component.resistance}Ω`;
      case ComponentType.LED:
        return `Vf: ${component.forwardVoltage}V`;
      case ComponentType.POWER_SUPPLY:
        return `${component.voltage}V`;
      case ComponentType.WIRE:
        return `R: ${component.resistance}Ω`;
      case ComponentType.GROUND:
        return 'GND';
      default:
        return '';
    }
  }

  /**
   * Build a map from breadboard position to circuit node ID
   */
  private buildPositionToNodeMap(circuit: Circuit): Map<string, string> {
    const map = new Map<string, string>();
    
    for (const [nodeId, node] of circuit.nodes) {
      for (const pos of node.positions) {
        const key = this.positionToKey(pos);
        map.set(key, nodeId);
      }
    }
    
    return map;
  }

  /**
   * Apply voltage overlay styling to a hole element
   */
  private applyVoltageOverlay(
    hole: HTMLElement,
    position: Position,
    positionToNode: Map<string, string>,
    simulation: SimulationResult
  ): void {
    const posKey = this.positionToKey(position);
    const nodeId = positionToNode.get(posKey);
    
    if (nodeId) {
      const voltage = simulation.nodeVoltages.get(nodeId);
      
      if (voltage !== undefined) {
        const color = voltageToColor(voltage);
        hole.classList.add('voltage-overlay');
        hole.style.background = color.rgb;
        hole.dataset.voltage = voltage.toFixed(3);
      }
    }
  }

  /**
   * Show voltage tooltip on hole hover
   */
  private showVoltageTooltip(event: MouseEvent, position: Position): void {
    if (!this.tooltipElement) return;

    // Use cached circuit and simulation results for performance
    if (!this.cachedCircuit || !this.cachedSimulation || !this.cachedSimulation.success) {
      return;
    }

    const positionToNode = this.buildPositionToNodeMap(this.cachedCircuit);
    const posKey = this.positionToKey(position);
    const nodeId = positionToNode.get(posKey);
    
    if (nodeId) {
      const voltage = this.cachedSimulation.nodeVoltages.get(nodeId);
      
      if (voltage !== undefined) {
        const color = voltageToColor(voltage);
        this.tooltipElement.textContent = color.description;
        this.tooltipElement.classList.add('visible');
        this.updateTooltipPosition(event);
      }
    }
  }

  /**
   * Update tooltip position
   */
  private updateTooltipPosition(event: MouseEvent): void {
    if (!this.tooltipElement) return;
    
    this.tooltipElement.style.left = `${event.clientX + 10}px`;
    this.tooltipElement.style.top = `${event.clientY + 10}px`;
  }

  /**
   * Hide voltage tooltip
   */
  private hideVoltageTooltip(): void {
    if (!this.tooltipElement) return;
    this.tooltipElement.classList.remove('visible');
  }

  /**
   * Convert position to string key
   */
  private positionToKey(pos: Position): string {
    return `${pos.row},${pos.col}`;
  }
}
