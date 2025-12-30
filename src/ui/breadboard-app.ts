import type { AnyComponent, BreadboardState, Position } from '@/core/types';
import { ComponentType } from '@/core/types';
import { BreadboardLayout } from '@/core/breadboard-layout';
import { CircuitExtractor } from '@/core/circuit-extractor';
import { CircuitSimulator } from '@/core/circuit-simulator';

/**
 * Main application class managing the breadboard UI and simulation
 */
export class BreadboardApp {
  private state: BreadboardState;
  private selectedComponentType: ComponentType | null = null;
  private placementStart: Position | null = null;
  private extractor: CircuitExtractor;
  private simulator: CircuitSimulator;
  private componentIdCounter = 0;

  constructor(private container: HTMLElement) {
    this.state = { components: [] };
    this.extractor = new CircuitExtractor();
    this.simulator = new CircuitSimulator();
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
          </div>
        </div>
        <div class="info-panel">
          <h2>Circuit Info</h2>
          <div id="circuit-info"></div>
        </div>
      </div>
    `;

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

        rowEl.appendChild(hole);
      }

      breadboard.appendChild(rowEl);
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
    });

    // Clear button
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.state.components = [];
        this.placementStart = null;
        this.render();
      });
    }
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
}
