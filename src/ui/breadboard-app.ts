import type { AnyComponent, BreadboardState, Position, Circuit, SimulationResult } from '@/core/types';
import { ComponentType } from '@/core/types';
import { BreadboardLayout } from '@/core/breadboard-layout';
import { CircuitExtractor } from '@/core/circuit-extractor';
import { CircuitSimulator } from '@/core/circuit-simulator';
import { voltageToColor } from './voltage-colors';
import { ComponentRenderer } from './component-renderer';
import { CurrentAnimator } from './current-animator';

/**
 * Drag state for component repositioning
 */
interface DragState {
  componentId: string;
  startMousePos: { x: number; y: number };
  currentMousePos: { x: number; y: number };
  originalPositions: Position[];
  previewPositions: Position[] | null; // null if invalid
  offsetFromFirstPin: { x: number; y: number }; // Offset from mouse to first pin
}

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
  private updateDebounceTimer: number | null = null;
  private dragState: DragState | null = null;
  private handleMouseMoveBound: (e: MouseEvent) => void;
  private handleMouseUpBound: (e: MouseEvent) => void;

  constructor(private container: HTMLElement) {
    this.state = { components: [], selectedComponentId: null };
    this.extractor = new CircuitExtractor();
    this.simulator = new CircuitSimulator();
    this.componentRenderer = new ComponentRenderer();
    this.currentAnimator = new CurrentAnimator();
    this.handleKeyDownBound = this.handleKeyDown.bind(this);
    this.handleMouseMoveBound = this.handleMouseMove.bind(this);
    this.handleMouseUpBound = this.handleMouseUp.bind(this);
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
      this.state.selectedComponentId,
      this.dragState
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
    
    // Clear any pending debounce timers
    if (this.updateDebounceTimer !== null) {
      clearTimeout(this.updateDebounceTimer);
      this.updateDebounceTimer = null;
    }
  }

  /**
   * Attach event handlers to component SVG elements
   */
  private attachComponentEventHandlers(svg: SVGElement): void {
    const components = svg.querySelectorAll('.component');
    components.forEach((componentEl) => {
      // Click handler for selection
      componentEl.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent hole click from firing
        const componentId = (componentEl as HTMLElement).dataset.componentId;
        if (componentId && !this.dragState) {
          this.selectComponentById(componentId);
        }
      });

      // Mousedown handler for drag initiation
      componentEl.addEventListener('mousedown', (e: Event) => {
        const mouseEvent = e as MouseEvent;
        mouseEvent.stopPropagation();
        mouseEvent.preventDefault();
        
        const componentId = (componentEl as HTMLElement).dataset.componentId;
        if (componentId) {
          this.startDrag(componentId, mouseEvent);
        }
      });
    });

    // Click on SVG background to deselect
    svg.addEventListener('click', (e) => {
      if (e.target === svg && !this.dragState) {
        this.deselectComponent();
      }
    });
  }

  /**
   * Handle keyboard events (Delete key, Escape key, R key)
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    // Cancel drag on Escape
    if (e.key === 'Escape') {
      if (this.dragState) {
        e.preventDefault();
        this.cancelDrag();
        return;
      }
    }

    // Rotate selected component on R key
    if (e.key === 'r' || e.key === 'R') {
      if (this.state.selectedComponentId && !this.dragState) {
        e.preventDefault();
        this.rotateSelectedComponent();
      }
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Prevent browser back navigation on Backspace
      e.preventDefault();
      
      if (this.state.selectedComponentId && !this.dragState) {
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
   * Rotate the currently selected component 90 degrees clockwise
   */
  private rotateSelectedComponent(): void {
    if (!this.state.selectedComponentId) return;

    const component = this.state.components.find(
      (c) => c.id === this.state.selectedComponentId
    );
    if (!component) return;

    // Calculate next rotation (0 -> 90 -> 180 -> 270 -> 0)
    const currentRotation = component.rotation;
    const nextRotation = ((currentRotation + 90) % 360) as 0 | 90 | 180 | 270;

    // Calculate new positions after rotation
    const newPositions = this.calculateRotatedPositions(component.positions, component.rotation, nextRotation);

    // Validate new positions
    if (!this.isValidComponentPosition(component.id, newPositions)) {
      // Rotation would result in invalid position - do nothing
      // Could add visual feedback here (e.g., red flash)
      return;
    }

    // Update component rotation and positions
    component.rotation = nextRotation;
    component.positions = newPositions;

    // Re-render to update circuit
    this.render();
  }

  /**
   * Calculate new positions after rotating a component
   */
  private calculateRotatedPositions(
    positions: Position[],
    currentRotation: number,
    newRotation: number
  ): Position[] {
    if (positions.length === 0) return positions;

    // For single-position components (like ground), position doesn't change
    if (positions.length === 1) return positions;

    // Calculate the center point between the two pins
    const centerRow = (positions[0].row + positions[1].row) / 2;
    const centerCol = (positions[0].col + positions[1].col) / 2;

    // Calculate rotation angle difference
    const rotationDiff = newRotation - currentRotation;

    // Rotate each position around the center
    return positions.map((pos) => {
      const relRow = pos.row - centerRow;
      const relCol = pos.col - centerCol;

      let newRelRow: number;
      let newRelCol: number;

      // Apply rotation transform
      switch (rotationDiff) {
        case 90:
        case -270:
          // 90° clockwise: (x, y) -> (y, -x)
          newRelRow = relCol;
          newRelCol = -relRow;
          break;
        case 180:
        case -180:
          // 180°: (x, y) -> (-x, -y)
          newRelRow = -relRow;
          newRelCol = -relCol;
          break;
        case 270:
        case -90:
          // 270° clockwise / 90° counter-clockwise: (x, y) -> (-y, x)
          newRelRow = -relCol;
          newRelCol = relRow;
          break;
        default:
          // No rotation
          newRelRow = relRow;
          newRelCol = relCol;
      }

      return {
        row: Math.round(centerRow + newRelRow),
        col: Math.round(centerCol + newRelCol),
      };
    });
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
          rotation: 0,
        };
        break;

      case ComponentType.RESISTOR:
        component = {
          id,
          type: ComponentType.RESISTOR,
          positions,
          resistance: 1000, // 1kΩ
          rotation: 0,
        };
        break;

      case ComponentType.LED:
        component = {
          id,
          type: ComponentType.LED,
          positions,
          forwardVoltage: 2.0,
          maxCurrent: 0.02,
          rotation: 0,
        };
        break;

      case ComponentType.POWER_SUPPLY:
        component = {
          id,
          type: ComponentType.POWER_SUPPLY,
          positions,
          voltage: 5.0,
          rotation: 0,
        };
        break;

      case ComponentType.GROUND:
        component = {
          id,
          type: ComponentType.GROUND,
          positions,
          rotation: 0,
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
      ${this.renderPropertyEditor()}
    `;

    // Attach property editor event listeners after rendering
    this.attachPropertyEditorListeners();
  }

  /**
   * Get component-specific details for display
   */
  private getComponentDetails(component: AnyComponent): string {
    switch (component.type) {
      case ComponentType.RESISTOR:
        return `${component.resistance >= 1000 ? component.resistance / 1000 + 'kΩ' : component.resistance + 'Ω'}`;
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
   * Render property editor for selected component
   */
  private renderPropertyEditor(): string {
    if (!this.state.selectedComponentId) {
      return '';
    }

    const component = this.state.components.find(c => c.id === this.state.selectedComponentId);
    if (!component) {
      return '';
    }

    let fields = '';

    switch (component.type) {
      case ComponentType.RESISTOR:
        fields = `
          <div class="property-field">
            <label>Resistance (Ω)</label>
            <input type="number" id="prop-resistance" value="${component.resistance}" min="0.1" step="any">
            <div class="property-presets">
              <button class="preset-button" data-preset="100">100Ω</button>
              <button class="preset-button" data-preset="1000">1kΩ</button>
              <button class="preset-button" data-preset="10000">10kΩ</button>
              <button class="preset-button" data-preset="100000">100kΩ</button>
            </div>
            <div class="error-message property-error" style="display: none;"></div>
          </div>
        `;
        break;

      case ComponentType.LED:
        fields = `
          <div class="property-field">
            <label>Forward Voltage (V)</label>
            <input type="number" id="prop-forwardVoltage" value="${component.forwardVoltage}" min="0.1" max="5" step="0.1">
            <div class="property-presets">
              <button class="preset-button" data-preset="1.8">1.8V (IR)</button>
              <button class="preset-button" data-preset="2.0">2.0V (Red)</button>
              <button class="preset-button" data-preset="2.2">2.2V (Yellow)</button>
              <button class="preset-button" data-preset="3.0">3.0V (Blue)</button>
            </div>
            <div class="error-message property-error" style="display: none;"></div>
          </div>
        `;
        break;

      case ComponentType.POWER_SUPPLY:
        fields = `
          <div class="property-field">
            <label>Voltage (V)</label>
            <input type="number" id="prop-voltage" value="${component.voltage}" min="1" max="20" step="0.1">
            <div class="property-presets">
              <button class="preset-button" data-preset="3.3">3.3V</button>
              <button class="preset-button" data-preset="5">5V</button>
              <button class="preset-button" data-preset="9">9V</button>
              <button class="preset-button" data-preset="12">12V</button>
            </div>
            <div class="error-message property-error" style="display: none;"></div>
          </div>
        `;
        break;

      case ComponentType.WIRE:
      case ComponentType.GROUND:
        // No editable properties for these components
        return '';
    }

    return `
      <div class="property-editor">
        <h3>Component Properties</h3>
        ${fields}
      </div>
    `;
  }

  /**
   * Attach event listeners to property editor inputs and buttons
   */
  private attachPropertyEditorListeners(): void {
    if (!this.state.selectedComponentId) {
      return;
    }

    const component = this.state.components.find(c => c.id === this.state.selectedComponentId);
    if (!component) {
      return;
    }

    // Handle input changes
    const inputs = document.querySelectorAll('.property-field input[type="number"]');
    inputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const value = parseFloat(target.value);
        const fieldId = target.id;

        if (this.validatePropertyValue(component.type, fieldId, value)) {
          this.updateComponentProperty(component.id, fieldId, value);
          this.hidePropertyError();
        } else {
          this.showPropertyError(this.getValidationErrorMessage(component.type, fieldId, value));
        }
      });
    });

    // Handle preset buttons
    const presetButtons = document.querySelectorAll('.property-editor .preset-button');
    presetButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const presetValue = parseFloat(target.dataset.preset || '0');
        // Find the input field within the same property editor
        const propertyEditor = document.querySelector('.property-editor');
        const input = propertyEditor?.querySelector('.property-field input[type="number"]') as HTMLInputElement;
        
        if (input) {
          input.value = presetValue.toString();
          const fieldId = input.id;
          this.updateComponentProperty(component.id, fieldId, presetValue);
          this.hidePropertyError();
        }
      });
    });
  }

  /**
   * Validate property value based on component type
   */
  private validatePropertyValue(componentType: ComponentType, fieldId: string, value: number): boolean {
    if (isNaN(value)) {
      return false;
    }

    switch (componentType) {
      case ComponentType.RESISTOR:
        if (fieldId === 'prop-resistance') {
          return value > 0;
        }
        break;

      case ComponentType.LED:
        if (fieldId === 'prop-forwardVoltage') {
          return value >= 0.1 && value <= 5;
        }
        break;

      case ComponentType.POWER_SUPPLY:
        if (fieldId === 'prop-voltage') {
          return value >= 1 && value <= 20;
        }
        break;
    }

    return true;
  }

  /**
   * Get validation error message
   */
  private getValidationErrorMessage(componentType: ComponentType, fieldId: string, value: number): string {
    if (isNaN(value)) {
      return 'Please enter a valid number';
    }

    switch (componentType) {
      case ComponentType.RESISTOR:
        if (fieldId === 'prop-resistance') {
          return 'Resistance must be greater than 0Ω';
        }
        break;

      case ComponentType.LED:
        if (fieldId === 'prop-forwardVoltage') {
          return 'Forward voltage must be between 0.1V and 5V';
        }
        break;

      case ComponentType.POWER_SUPPLY:
        if (fieldId === 'prop-voltage') {
          return 'Voltage must be between 1V and 20V';
        }
        break;
    }

    return 'Invalid value';
  }

  /**
   * Show property validation error
   */
  private showPropertyError(message: string): void {
    const errorElement = document.querySelector('.property-editor .property-error') as HTMLElement;
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.display = 'block';
    }
  }

  /**
   * Hide property validation error
   */
  private hidePropertyError(): void {
    const errorElement = document.querySelector('.property-editor .property-error') as HTMLElement;
    if (errorElement) {
      errorElement.style.display = 'none';
    }
  }

  /**
   * Update component property value
   */
  private updateComponentProperty(componentId: string, fieldId: string, value: number): void {
    const component = this.state.components.find(c => c.id === componentId);
    if (!component) {
      return;
    }

    // Update the component property based on field ID
    switch (fieldId) {
      case 'prop-resistance':
        if (component.type === ComponentType.RESISTOR) {
          component.resistance = value;
        }
        break;

      case 'prop-forwardVoltage':
        if (component.type === ComponentType.LED) {
          component.forwardVoltage = value;
        }
        break;

      case 'prop-voltage':
        if (component.type === ComponentType.POWER_SUPPLY) {
          component.voltage = value;
        }
        break;
    }

    // Debounce re-render to avoid performance issues with rapid input changes
    if (this.updateDebounceTimer !== null) {
      clearTimeout(this.updateDebounceTimer);
    }
    
    this.updateDebounceTimer = window.setTimeout(() => {
      this.render();
      this.updateDebounceTimer = null;
    }, 300);
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

  /**
   * Start dragging a component
   */
  private startDrag(componentId: string, event: MouseEvent): void {
    const component = this.state.components.find((c) => c.id === componentId);
    if (!component) return;

    // Get breadboard element to calculate relative positions
    const breadboard = document.getElementById('breadboard');
    if (!breadboard) return;

    const rect = breadboard.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Calculate position of first pin in pixels
    const firstPinPixels = this.positionToPixels(component.positions[0]);

    this.dragState = {
      componentId,
      startMousePos: { x: mouseX, y: mouseY },
      currentMousePos: { x: mouseX, y: mouseY },
      originalPositions: [...component.positions],
      previewPositions: null,
      offsetFromFirstPin: {
        x: mouseX - firstPinPixels.x,
        y: mouseY - firstPinPixels.y,
      },
    };

    // Select the component being dragged
    this.state.selectedComponentId = componentId;

    // Attach global mouse handlers
    document.addEventListener('mousemove', this.handleMouseMoveBound);
    document.addEventListener('mouseup', this.handleMouseUpBound);

    // Initial preview calculation
    this.updateDragPreview(event);
  }

  /**
   * Handle mouse move during drag
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.dragState) return;

    this.updateDragPreview(event);
  }

  /**
   * Update drag preview position
   */
  private updateDragPreview(event: MouseEvent): void {
    if (!this.dragState) return;

    const breadboard = document.getElementById('breadboard');
    if (!breadboard) return;

    const rect = breadboard.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    this.dragState.currentMousePos = { x: mouseX, y: mouseY };

    // Calculate target position for first pin
    const targetX = mouseX - this.dragState.offsetFromFirstPin.x;
    const targetY = mouseY - this.dragState.offsetFromFirstPin.y;

    // Convert to grid position with snapping
    const snappedFirstPin = this.snapToGrid({ x: targetX, y: targetY });

    // Calculate new positions for all pins based on offset from first pin
    const component = this.state.components.find((c) => c.id === this.dragState!.componentId);
    if (!component) return;

    const offset = {
      row: snappedFirstPin.row - this.dragState.originalPositions[0].row,
      col: snappedFirstPin.col - this.dragState.originalPositions[0].col,
    };

    const newPositions = this.dragState.originalPositions.map((pos) => ({
      row: pos.row + offset.row,
      col: pos.col + offset.col,
    }));

    // Validate the new positions
    if (this.isValidComponentPosition(component.id, newPositions)) {
      this.dragState.previewPositions = newPositions;
    } else {
      this.dragState.previewPositions = null;
    }

    // Re-render to show preview
    this.renderBreadboard();
  }

  /**
   * Handle mouse up to complete or cancel drag
   */
  private handleMouseUp(_event: MouseEvent): void {
    if (!this.dragState) return;

    // If we have valid preview positions, update component
    if (this.dragState.previewPositions) {
      const component = this.state.components.find((c) => c.id === this.dragState!.componentId);
      if (component) {
        component.positions = this.dragState.previewPositions;
      }
    }

    // Clean up drag state
    this.cleanupDrag();

    // Re-render without preview
    this.render();
  }

  /**
   * Cancel the current drag operation
   */
  private cancelDrag(): void {
    if (!this.dragState) return;

    this.cleanupDrag();
    this.render();
  }

  /**
   * Clean up drag state and event listeners
   */
  private cleanupDrag(): void {
    document.removeEventListener('mousemove', this.handleMouseMoveBound);
    document.removeEventListener('mouseup', this.handleMouseUpBound);
    this.dragState = null;
  }

  /**
   * Convert pixel coordinates to grid position with snapping
   */
  private snapToGrid(pixels: { x: number; y: number }): Position {
    const col = Math.round(pixels.x / ComponentRenderer.HOLE_SPACING);
    const row = Math.round(pixels.y / ComponentRenderer.HOLE_SPACING);

    // Clamp to valid grid range
    return {
      row: Math.max(0, Math.min(BreadboardLayout.ROWS - 1, row)),
      col: Math.max(0, Math.min(BreadboardLayout.COLS_PER_SIDE * 2 - 1, col)),
    };
  }

  /**
   * Convert position to pixel coordinates
   */
  private positionToPixels(pos: Position): { x: number; y: number } {
    return {
      x: pos.col * ComponentRenderer.HOLE_SPACING + ComponentRenderer.HOLE_SPACING / 2,
      y: pos.row * ComponentRenderer.HOLE_SPACING + ComponentRenderer.HOLE_SPACING / 2,
    };
  }

  /**
   * Validate if a component can be placed at the given positions
   */
  private isValidComponentPosition(componentId: string, positions: Position[]): boolean {
    // Check all positions are within bounds
    for (const pos of positions) {
      if (
        pos.row < 0 ||
        pos.row >= BreadboardLayout.ROWS ||
        pos.col < 0 ||
        pos.col >= BreadboardLayout.COLS_PER_SIDE * 2
      ) {
        return false;
      }
    }

    // Check for collisions with other components (excluding the component being moved)
    for (const component of this.state.components) {
      if (component.id === componentId) continue;

      for (const componentPos of component.positions) {
        for (const newPos of positions) {
          if (componentPos.row === newPos.row && componentPos.col === newPos.col) {
            return false;
          }
        }
      }
    }

    return true;
  }
}
