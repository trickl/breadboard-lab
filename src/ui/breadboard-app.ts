import type { AnyComponent, BreadboardState, Position, Circuit, SimulationResult, ComponentLibraryEntry, FloatingComponent } from '@/core/types';
import { ComponentType } from '@/core/types';
import { BreadboardLayout } from '@/core/breadboard-layout';
import { CircuitExtractor } from '@/core/circuit-extractor';
import { CircuitSimulator } from '@/core/circuit-simulator';
import { PixiRenderer, type PixiEventHandlers } from './pixi-renderer';
import { ExplainPanel } from './explain-panel';
import {
  serializeCircuit,
  deserializeCircuit,
  type CircuitMetadata,
} from '@/core/circuit-serializer';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  listSavedCircuits,
  downloadCircuitFile,
  uploadCircuitFile,
} from '@/core/circuit-storage';
import { EXAMPLE_CIRCUITS } from '@/examples';
import { componentLibrary } from '@/core/component-library';
import { ALL_LIBRARY_ENTRIES } from '@/library';
import { AudioManager } from '@/audio/audio-manager';
import { SchematicLayoutGenerator } from '@/core/schematic-layout';
import { SchematicRenderer } from './schematic-renderer';
import type { SchematicDiagram } from '@/core/schematic-types';
import { ClockController } from '@/core/clock-controller';
import { resetEDU8, handleClockEdge as edu8HandleClockEdge } from '@/core/edu8-simulator';
import { HistoryManager } from '@/core/history-manager';
import {
  AddComponentCommand,
  DeleteComponentCommand,
  MoveComponentCommand,
  RotateComponentCommand,
  EditPropertyCommand,
} from '@/core/command';
import { ReteManager } from '@/core/rete-manager';

/**
 * Feature flag: Enable Rete.js integration
 * When true, ReteManager runs in parallel and syncs with component state
 * When false, existing PixiJS-only implementation is used
 * 
 * Phase 2: ACTIVATED - Rete.js manages connection graph and circuit extraction
 */
const USE_RETE = true;

/**
 * Feature flag: Enable Rete.js interactive connection creation (Phase 3)
 * When true, enables drag-and-drop connection creation and floating component placement
 * When false, uses traditional two-click placement workflow
 * 
 * Phase 3: IN DEVELOPMENT - Interactive connection UI with visual feedback
 * 
 * Current Status: Phase 3b complete, Phase 3c partial (infrastructure ready)
 * - Hole hover effects implemented
 * - Connection line rendering infrastructure added
 * - Floating component model implemented
 * - Remaining: Drag handling, connection creation, tests need updating
 * 
 * NOTE: Keeping disabled until test suite is updated for new workflow
 */
const USE_RETE_INTERACTIVE = false;

/**
 * Drag state for component repositioning
 */
export interface DragState {
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
  private selectedLibraryId: string | null = null;
  private placementStart: Position | null = null;
  private floatingComponent: FloatingComponent | null = null; // Phase 3c: Floating component for new placement workflow
  private extractor: CircuitExtractor;
  private simulator: CircuitSimulator;
  private pixiRenderer: PixiRenderer;
  private explainPanel: ExplainPanel;
  private audioManager: AudioManager;
  private clockController: ClockController;
  private schematicGenerator: SchematicLayoutGenerator;
  private schematicRenderer: SchematicRenderer;
  private historyManager: HistoryManager;
  private componentIdCounter = 0;
  private cachedCircuit: Circuit | null = null;
  private cachedSimulation: SimulationResult | null = null;
  private cachedSchematic: SchematicDiagram | null = null;
  private handleKeyDownBound: (e: KeyboardEvent) => void;
  private updateDebounceTimer: number | null = null;
  private dragState: DragState | null = null;
  private handleMouseMoveBound: (e: MouseEvent) => void;
  private handleMouseUpBound: (e: MouseEvent) => void;
  private currentCircuitMetadata: CircuitMetadata | null = null;
  private hasUnsavedChanges = false;
  private reteManager: ReteManager | null = null; // Optional Rete.js integration

  constructor(private container: HTMLElement) {
    this.state = { components: [], selectedComponentId: null };
    this.extractor = new CircuitExtractor();
    this.simulator = new CircuitSimulator();
    this.pixiRenderer = new PixiRenderer();
    this.explainPanel = new ExplainPanel();
    this.audioManager = new AudioManager();
    this.clockController = new ClockController();
    this.schematicGenerator = new SchematicLayoutGenerator();
    this.schematicRenderer = new SchematicRenderer();
    this.historyManager = new HistoryManager(50); // 50-step history as per goal.md
    this.handleKeyDownBound = this.handleKeyDown.bind(this);
    this.handleMouseMoveBound = this.handleMouseMove.bind(this);
    this.handleMouseUpBound = this.handleMouseUp.bind(this);
    
    // Set up clock controller callbacks
    this.clockController.setOnClockChange((clockHigh) => {
      this.handleClockChange(clockHigh);
    });
    this.clockController.setOnReset(() => {
      this.handleClockReset();
    });
    
    // Initialize component library
    this.initializeLibrary();
    
    // Initialize Rete.js integration (if enabled)
    if (USE_RETE) {
      void this.initializeReteIntegration();
    }
    
    this.render();
  }

  /**
   * Initialize Rete.js integration (Phase 1 POC & Phase 3 interactive mode)
   * Creates ReteManager and syncs with current state
   */
  private async initializeReteIntegration(): Promise<void> {
    try {
      // Create a separate container for Rete.js (hidden during Phase 1)
      const reteContainer = document.createElement('div');
      reteContainer.style.display = 'none'; // Hidden in Phase 1
      reteContainer.style.position = 'absolute';
      reteContainer.style.top = '0';
      reteContainer.style.left = '0';
      reteContainer.style.width = '100%';
      reteContainer.style.height = '100%';
      reteContainer.style.pointerEvents = 'none'; // Don't interfere with PixiJS
      this.container.appendChild(reteContainer);

      this.reteManager = new ReteManager(reteContainer);
      await this.reteManager.initialize();
      
      // Sync initial state
      await this.reteManager.syncFromBreadboardState(this.state);
      
      console.log('[Rete Integration] Initialized successfully');
      
      // Phase 3: Setup interactive connection handlers if enabled
      if (USE_RETE_INTERACTIVE) {
        this.setupReteInteractiveHandlers();
      }
    } catch (error) {
      console.error('[Rete Integration] Failed to initialize:', error);
      this.reteManager = null;
    }
  }
  
  /**
   * Phase 3: Setup connection event handlers for interactive mode
   * Syncs Rete connection events back to BreadboardState
   */
  private setupReteInteractiveHandlers(): void {
    if (!this.reteManager) return;
    
    // Set up connection validator to enforce one-connector-per-hole
    this.reteManager.setConnectionValidator((connection) => {
      return this.reteManager!.validateOneConnectorPerHole(connection);
    });
    
    // Handle connection created events
    this.reteManager.onConnectionCreated((connection) => {
      console.log('[Rete Interactive] Connection created:', connection);
      
      // In full implementation, this would:
      // 1. Extract component and hole information from connection
      // 2. Update BreadboardState positions array
      // 3. Trigger render update
      // For now, just log the event
    });
    
    // Handle connection removed events
    this.reteManager.onConnectionRemoved((connection) => {
      console.log('[Rete Interactive] Connection removed:', connection);
      
      // In full implementation, this would:
      // 1. Extract component and hole information from connection
      // 2. Remove position from BreadboardState
      // 3. Trigger render update
      // For now, just log the event
    });
    
    console.log('[Rete Interactive] Connection handlers configured');
  }

  /**
   * Initialize the component library with all entries
   */
  private initializeLibrary(): void {
    ALL_LIBRARY_ENTRIES.forEach((entry) => {
      try {
        componentLibrary.register(entry);
      } catch (error) {
        // Entry might already be registered (e.g., in tests), ignore
      }
    });
  }

  /**
   * Sync state to Rete.js graph (if enabled)
   * Called after state changes to keep Rete graph in sync
   * NOTE: Currently unused as USE_RETE=false. Will be called in Phase 2.
   */
  private async syncStateToRete(): Promise<void> {
    if (this.reteManager && USE_RETE) {
      try {
        await this.reteManager.syncFromBreadboardState(this.state);
      } catch (error) {
        console.error('[Rete Integration] Sync failed:', error);
      }
    }
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
            <button id="component-library-btn" class="component-button primary">📦 Component Library</button>
          </div>
          <div class="toolbar-actions">
            <button id="examples-btn" class="toolbar-btn primary">📚 Examples</button>
            <button id="load-btn" class="toolbar-btn">📂 Load Circuit</button>
            <button id="save-btn" class="toolbar-btn">💾 Save Circuit</button>
            <button id="clear-btn" class="toolbar-btn" style="background: #ff4444; border-color: #ff5555;">🗑️ Clear All</button>
          </div>
          <div class="view-controls">
            <h3>View</h3>
            <div class="view-tabs">
              <button id="breadboard-view-btn" class="view-tab active">🔌 Breadboard</button>
              <button id="schematic-view-btn" class="view-tab">📐 Schematic</button>
            </div>
          </div>
          <div class="audio-controls">
            <h3>Audio Output</h3>
            <button id="toggle-audio-btn" class="toolbar-btn audio-toggle" title="Enable audio output for speaker components">
              🔇 Enable Sound
            </button>
            <div class="volume-control" id="volume-control-container" style="display: none;">
              <label for="volume-slider">Volume</label>
              <input type="range" id="volume-slider" min="0" max="100" value="50" />
              <span id="volume-value">50%</span>
            </div>
            <div id="audio-indicator" class="audio-indicator" style="display: none;">
              🔊 <span id="audio-speaker-count">0</span> speaker(s) active
            </div>
          </div>
          <div class="clock-controls" id="clock-controls" style="display: none;">
            <h3>Clock Control</h3>
            <div class="clock-buttons">
              <button id="step-btn" class="clock-btn step" title="Execute one instruction (Space)">⏯ Step</button>
              <button id="run-btn" class="clock-btn" title="Run continuously">▶️ Run</button>
              <button id="reset-btn" class="clock-btn" title="Reset microprocessor">🔄 Reset</button>
            </div>
            <div class="clock-frequency">
              <label>
                <span>Frequency:</span>
                <span class="freq-value" id="freq-value">1.0 Hz</span>
              </label>
              <input type="range" id="freq-slider" min="0.5" max="10" step="0.5" value="1" />
            </div>
            <div class="clock-state">
              <span class="clock-indicator" id="clock-indicator"></span>
              <span class="clock-status" id="clock-status">Paused</span>
            </div>
          </div>
        </div>
        <div class="workspace">
          <div class="breadboard-container" id="breadboard-view-container">
            <div id="breadboard" class="breadboard"></div>
            <div class="voltage-tooltip" id="voltage-tooltip"></div>
          </div>
          <div class="schematic-container" id="schematic-view-container" style="display: none;">
            <div id="schematic" class="schematic"></div>
          </div>
        </div>
        <div class="info-panel">
          <h2>Circuit Info</h2>
          <div id="circuit-info"></div>
        </div>
      </div>
    `;

    
    // Initialize explain panel
    this.explainPanel.initialize(this.container);
    
    this.renderBreadboard();
    this.attachEventListeners();
    this.updateCircuitInfo();
    this.updateAudioControls();
    this.updateClockControls();
  }

  /**
   * Render the breadboard grid using PixiJS
   */
  private async renderBreadboard(): Promise<void> {
    const breadboard = document.getElementById('breadboard');
    if (!breadboard) return;

    // IMPORTANT: `render()` rebuilds the entire DOM (including a fresh #breadboard element).
    // If we blindly clear `breadboard.innerHTML` and skip Pixi init because the renderer
    // already exists, we permanently detach the canvas and the breadboard appears blank.
    //
    // So: if a Pixi canvas already exists, ensure it is attached to the *current* #breadboard.
    const existingCanvas = this.pixiRenderer.getCanvas();
    if (existingCanvas) {
      if (existingCanvas.parentElement !== breadboard) {
        breadboard.replaceChildren(existingCanvas);
      }
    } else {
      // No canvas yet (first render). Clear any previous contents before init.
      breadboard.innerHTML = '';
    }

    // Sync state to Rete graph if enabled (Phase 2)
    if (USE_RETE && this.reteManager) {
      await this.syncStateToRete();
    }

    // Extract circuit and run simulation (cache for performance)
    // Use Rete-based extraction if enabled, otherwise use position-based
    if (USE_RETE && this.reteManager) {
      this.cachedCircuit = this.extractor.extractFromReteGraph(this.reteManager, this.state);
    } else {
      this.cachedCircuit = this.extractor.extract(this.state);
    }
    this.cachedSimulation = this.simulator.simulate(this.cachedCircuit);
    
    // Invalidate schematic cache when circuit changes
    this.cachedSchematic = null;

    // Build position-to-node mapping for voltage lookup
    const positionToNode = this.buildPositionToNodeMap(this.cachedCircuit);

    // Initialize PixiJS renderer if not already initialized
    if (!existingCanvas) {
      const handlers: PixiEventHandlers = {
        onHoleClick: (position, _event) => {
          this.handleHoleClick(position);
        },
        onComponentClick: (componentId, _event) => {
          this.handleComponentClick(componentId);
        },
        onErrorIconClick: (error, _event) => {
          this.showErrorDialog(error);
        },
        onComponentDragStart: (componentId, globalX, globalY) => {
          this.handleComponentDragStart(componentId, globalX, globalY);
        },
      };
      try {
        await this.pixiRenderer.init(breadboard, handlers);
      } catch (error) {
        // PixiJS initialization failed (likely in test environment without canvas support)
        // Continue without rendering - tests can still verify app state
        console.warn('PixiJS renderer initialization failed:', error);
        return;
      }
    }

    // Render breadboard grid with voltage overlay
    this.pixiRenderer.renderBreadboard(positionToNode, this.cachedSimulation, this.reteManager);

    // Render Rete connection lines (Phase 3b)
    if (USE_RETE_INTERACTIVE && this.reteManager) {
      this.pixiRenderer.renderConnections(this.reteManager, this.state.components, this.cachedSimulation);
    }

    // Render components with simulation results for LED glow
    this.pixiRenderer.renderComponents(
      this.state.components,
      this.state.selectedComponentId,
      this.dragState,
      this.cachedSimulation,
      positionToNode
    );

    // Render floating component (Phase 3c)
    if (USE_RETE_INTERACTIVE && this.floatingComponent) {
      this.pixiRenderer.renderFloatingComponent(this.floatingComponent);
    }

    // Render error overlays
    if (this.cachedSimulation && this.cachedSimulation.errors.length > 0) {
      this.pixiRenderer.renderErrors(this.cachedSimulation.errors);
    }

    // Start current animation if simulation succeeded
    if (this.cachedSimulation && this.cachedSimulation.success) {
      this.pixiRenderer.startAnimation(this.cachedSimulation, this.state.components);
    } else {
      this.pixiRenderer.stopAnimation();
    }

    // Update explain panel with current circuit data
    if (this.cachedCircuit && this.cachedSimulation) {
      this.explainPanel.updateCircuitData(
        this.cachedCircuit,
        this.cachedSimulation,
        this.state.components
      );
    }

    // Update speaker audio based on simulation results
    this.updateSpeakerAudio();
    this.updateAudioControls();
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Component library button
    const componentLibraryBtn = document.getElementById('component-library-btn');
    if (componentLibraryBtn) {
      componentLibraryBtn.addEventListener('click', () => {
        this.showComponentLibraryDialog();
      });
    }

    // Note: Breadboard hole clicks and component clicks are now handled by PixiJS event handlers

    // Clear button
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (this.hasUnsavedChanges && this.state.components.length > 0) {
          if (!confirm('You have unsaved changes. Clear the circuit anyway?')) {
            return;
          }
        }
        this.state.components = [];
        this.state.selectedComponentId = null;
        this.placementStart = null;
        this.hasUnsavedChanges = false;
        this.currentCircuitMetadata = null;
        this.render();
      });
    }

    // Save button
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.showSaveDialog();
      });
    }

    // Load button
    const loadBtn = document.getElementById('load-btn');
    if (loadBtn) {
      loadBtn.addEventListener('click', () => {
        this.showLoadDialog();
      });
    }

    // Examples button
    const examplesBtn = document.getElementById('examples-btn');
    if (examplesBtn) {
      examplesBtn.addEventListener('click', () => {
        this.showExamplesDialog();
      });
    }

    // Audio toggle button
    const toggleAudioBtn = document.getElementById('toggle-audio-btn');
    if (toggleAudioBtn) {
      toggleAudioBtn.addEventListener('click', async () => {
        await this.toggleAudio();
      });
    }

    // Volume slider
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value) / 100;
        this.audioManager.setVolume(value);
        this.updateAudioControls();
      });
    }

    // Clock control buttons
    const stepBtn = document.getElementById('step-btn');
    if (stepBtn) {
      stepBtn.addEventListener('click', () => {
        this.clockController.step();
        this.updateClockControls();
      });
    }

    const runBtn = document.getElementById('run-btn');
    if (runBtn) {
      runBtn.addEventListener('click', () => {
        const state = this.clockController.getState();
        if (state.isRunning) {
          this.clockController.pause();
        } else {
          this.clockController.run();
        }
        this.updateClockControls();
      });
    }

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.clockController.reset();
        this.updateClockControls();
      });
    }

    // Clock frequency slider
    const freqSlider = document.getElementById('freq-slider') as HTMLInputElement;
    if (freqSlider) {
      freqSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.clockController.setFrequency(value);
        this.updateClockControls();
      });
    }

    // View switching buttons
    const breadboardViewBtn = document.getElementById('breadboard-view-btn');
    if (breadboardViewBtn) {
      breadboardViewBtn.addEventListener('click', () => {
        this.switchView('breadboard');
      });
    }

    const schematicViewBtn = document.getElementById('schematic-view-btn');
    if (schematicViewBtn) {
      schematicViewBtn.addEventListener('click', () => {
        this.switchView('schematic');
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
    this.pixiRenderer.stopAnimation();
    
    // Clear any pending debounce timers
    if (this.updateDebounceTimer !== null) {
      clearTimeout(this.updateDebounceTimer);
      this.updateDebounceTimer = null;
    }
  }

  /**
   * Attach event handlers to component SVG elements
   */
  

  /**
   * Attach event handlers to error icon SVG elements
   */
  

  /**
   * Handle keyboard events (Delete key, Escape key, R key, M key)
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    // Undo: Ctrl+Z (Cmd+Z on Mac)
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      this.undo();
      return;
    }

    // Redo: Ctrl+Shift+Z (Cmd+Shift+Z on Mac) or Ctrl+Y
    if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
      e.preventDefault();
      this.redo();
      return;
    }

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

    // Toggle audio on M key (mute/unmute)
    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      this.toggleAudio();
    }

    // Step clock on Space key (only if microprocessor present)
    if (e.key === ' ' || e.key === 'Spacebar') {
      const hasMicroprocessor = this.state.components.some(
        (c) => c.type === ComponentType.MICROPROCESSOR
      );
      if (hasMicroprocessor && !this.clockController.getState().isRunning) {
        e.preventDefault();
        this.clockController.step();
        this.updateClockControls();
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
   * Handle component click from PixiJS
   */
  private handleComponentClick(componentId: string): void {
    if (!this.dragState) {
      this.selectComponentById(componentId);
      // Show explain panel for component
      this.explainPanel.show({ type: 'component', componentId });
    }
  }

  /**
   * Show error dialog from PixiJS error icon click
   */
  private showErrorDialog(error: { message: string; explanation: string; suggestions: string[] }): void {
    this.explainPanel.show({
      type: 'error',
      errorData: error,
    });
  }

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

    // Find the component to delete
    const component = this.state.components.find(
      (c) => c.id === this.state.selectedComponentId
    );
    if (!component) return;

    // If deleting a speaker, remove its audio
    if (component.libraryId === 'speaker-8ohm') {
      this.audioManager.removeSpeaker(component.id);
    }

    // Execute delete command through history manager
    const command = new DeleteComponentCommand(this.state.selectedComponentId, component);
    this.state = this.historyManager.execute(command, this.state);

    // Mark as changed
    this.markAsChanged();

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

    // Execute rotate command through history manager
    const command = new RotateComponentCommand(
      component.id,
      currentRotation,
      nextRotation,
      component.positions,
      newPositions
    );
    this.state = this.historyManager.execute(command, this.state);

    // Mark as changed
    this.markAsChanged();

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
   * Undo the last action
   */
  private undo(): void {
    const newState = this.historyManager.undo(this.state);
    if (newState) {
      this.state = newState;
      this.markAsChanged();
      this.render();
    }
  }

  /**
   * Redo the last undone action
   */
  private redo(): void {
    const newState = this.historyManager.redo(this.state);
    if (newState) {
      this.state = newState;
      this.markAsChanged();
      this.render();
    }
  }

  /**
   * Handle click on a breadboard hole
   */
  private handleHoleClick(position: Position): void {
    if (!this.selectedComponentType) {
      // No component type selected - show node information in explain panel
      if (this.cachedCircuit && this.cachedSimulation && this.cachedSimulation.success) {
        const positionToNode = this.buildPositionToNodeMap(this.cachedCircuit);
        const posKey = this.positionToKey(position);
        const nodeId = positionToNode.get(posKey);
        
        if (nodeId) {
          this.explainPanel.show({ type: 'node', nodeId });
        }
      }
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

    // Get properties from library if libraryId is set
    const libraryEntry = this.selectedLibraryId ? componentLibrary.get(this.selectedLibraryId) : undefined;

    switch (this.selectedComponentType) {
      case ComponentType.WIRE:
        component = {
          id,
          type: ComponentType.WIRE,
          positions,
          resistance: (libraryEntry?.electrical.resistance as number) ?? 0.01, // Very low resistance
          rotation: 0,
          libraryId: this.selectedLibraryId ?? undefined,
        };
        break;

      case ComponentType.RESISTOR:
        component = {
          id,
          type: ComponentType.RESISTOR,
          positions,
          resistance: (libraryEntry?.electrical.resistance as number) ?? 1000, // Default 1kΩ
          rotation: 0,
          libraryId: this.selectedLibraryId ?? undefined,
        };
        break;

      case ComponentType.LED:
        component = {
          id,
          type: ComponentType.LED,
          positions,
          forwardVoltage: (libraryEntry?.electrical.forwardVoltage as number) ?? 2.0,
          maxCurrent: (libraryEntry?.electrical.maxCurrent as number) ?? 0.02,
          rotation: 0,
          libraryId: this.selectedLibraryId ?? undefined,
        };
        break;

      case ComponentType.POWER_SUPPLY:
        component = {
          id,
          type: ComponentType.POWER_SUPPLY,
          positions,
          voltage: (libraryEntry?.electrical.voltage as number) ?? 5.0,
          rotation: 0,
          libraryId: this.selectedLibraryId ?? undefined,
        };
        break;

      case ComponentType.GROUND:
        component = {
          id,
          type: ComponentType.GROUND,
          positions,
          rotation: 0,
          libraryId: this.selectedLibraryId ?? undefined,
        };
        break;

      case ComponentType.MICROPROCESSOR:
        // Microprocessor requires 16 positions for DIP-16 package
        // For now, use simplified 2-position placement (will be expanded)
        component = {
          id,
          type: ComponentType.MICROPROCESSOR,
          positions,
          rotation: 0,
          libraryId: this.selectedLibraryId ?? undefined,
          state: {
            accumulator: 0,
            programCounter: 0,
            zeroFlag: false,
            halted: false,
            rom: new Uint8Array(16),
            inputs: 0,
            outputs: 0,
            clockState: false,
          },
        };
        break;

      default:
        return;
    }

    // Execute add command through history manager
    const command = new AddComponentCommand(component);
    this.state = this.historyManager.execute(command, this.state);
    this.markAsChanged();
    
    // Clear library selection after placement
    this.selectedLibraryId = null;
  }

  /**
   * Check if a position is occupied by a component
   */
  

  /**
   * Update the circuit information display
   */
  private updateCircuitInfo(): void {
    const infoDiv = document.getElementById('circuit-info');
    if (!infoDiv) return;

    // Use Rete-based extraction if enabled, otherwise use position-based
    const circuit = USE_RETE && this.reteManager
      ? this.extractor.extractFromReteGraph(this.reteManager, this.state)
      : this.extractor.extract(this.state);
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

    // Determine property name and get old value based on field ID
    let propertyName: string | null = null;
    let oldValue: unknown = null;

    switch (fieldId) {
      case 'prop-resistance':
        if (component.type === ComponentType.RESISTOR) {
          propertyName = 'resistance';
          oldValue = component.resistance;
        }
        break;

      case 'prop-forwardVoltage':
        if (component.type === ComponentType.LED) {
          propertyName = 'forwardVoltage';
          oldValue = component.forwardVoltage;
        }
        break;

      case 'prop-voltage':
        if (component.type === ComponentType.POWER_SUPPLY) {
          propertyName = 'voltage';
          oldValue = component.voltage;
        }
        break;
    }

    if (!propertyName || oldValue === null) {
      return;
    }

    // Execute edit property command through history manager
    const command = new EditPropertyCommand(componentId, propertyName, oldValue, value);
    this.state = this.historyManager.execute(command, this.state);

    // Debounce re-render to avoid performance issues with rapid input changes
    if (this.updateDebounceTimer !== null) {
      clearTimeout(this.updateDebounceTimer);
    }
    
    this.markAsChanged();
    
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
  

  /**
   * Show voltage tooltip on hole hover
   */
  

  /**
   * Update tooltip position
   */
  

  /**
   * Hide voltage tooltip
   */
  

  /**
   * Convert position to string key
   */
  private positionToKey(pos: Position): string {
    return `${pos.row},${pos.col}`;
  }

  /**
   * Start dragging a component
   */
  private handleComponentDragStart(componentId: string, globalX: number, globalY: number): void {
    const component = this.state.components.find((c) => c.id === componentId);
    if (!component) return;

    // Select component if not already selected
    if (this.state.selectedComponentId !== componentId) {
      this.state.selectedComponentId = componentId;
    }

    // Get the breadboard element to calculate relative coordinates
    const breadboard = document.getElementById('breadboard');
    if (!breadboard) return;

    const rect = breadboard.getBoundingClientRect();
    // Convert PixiJS global coordinates to breadboard-relative coordinates
    const mouseX = globalX - rect.left;
    const mouseY = globalY - rect.top;

    // Calculate offset from mouse to first pin (for smooth dragging)
    const firstPinPixels = this.pixiRenderer.positionToPixels(component.positions[0]);
    const offsetX = firstPinPixels.x - mouseX;
    const offsetY = firstPinPixels.y - mouseY;

    // Initialize drag state
    this.dragState = {
      componentId: componentId,
      startMousePos: { x: mouseX, y: mouseY },
      currentMousePos: { x: mouseX, y: mouseY },
      originalPositions: [...component.positions],
      previewPositions: null,
      offsetFromFirstPin: { x: offsetX, y: offsetY },
    };

    // Attach global mouse handlers for move and up
    document.addEventListener('mousemove', this.handleMouseMoveBound);
    document.addEventListener('mouseup', this.handleMouseUpBound);

    // Re-render to show initial drag state
    this.renderBreadboard();
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
        // Execute move command through history manager
        const command = new MoveComponentCommand(
          component.id,
          this.dragState.originalPositions,
          this.dragState.previewPositions
        );
        this.state = this.historyManager.execute(command, this.state);
        this.markAsChanged();
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
    const col = Math.round(pixels.x / PixiRenderer.HOLE_SPACING);
    const row = Math.round(pixels.y / PixiRenderer.HOLE_SPACING);

    // Clamp to valid grid range
    return {
      row: Math.max(0, Math.min(BreadboardLayout.ROWS - 1, row)),
      col: Math.max(0, Math.min(BreadboardLayout.COLS_PER_SIDE * 2 - 1, col)),
    };
  }

  /**
   * Convert position to pixel coordinates
   */
  

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

  /**
   * Show save dialog
   */
  private showSaveDialog(): void {
    const defaultName = this.currentCircuitMetadata?.name || 'My Circuit';
    const defaultDescription = this.currentCircuitMetadata?.description || '';

    const modalHTML = `
      <div class="modal-overlay visible" id="save-modal">
        <div class="modal">
          <div class="modal-header">
            <h2>💾 Save Circuit</h2>
            <button class="modal-close" id="save-modal-close">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="circuit-name">Circuit Name</label>
              <input type="text" id="circuit-name" value="${this.escapeHtml(defaultName)}" placeholder="Enter circuit name">
            </div>
            <div class="form-group">
              <label for="circuit-description">Description (optional)</label>
              <textarea id="circuit-description" placeholder="Describe what this circuit does">${this.escapeHtml(defaultDescription)}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="save-cancel">Cancel</button>
            <button class="btn btn-secondary" id="save-download">Download JSON</button>
            <button class="btn btn-primary" id="save-local">Save Locally</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Attach event listeners
    document.getElementById('save-modal-close')?.addEventListener('click', () => {
      this.closeModal('save-modal');
    });

    document.getElementById('save-cancel')?.addEventListener('click', () => {
      this.closeModal('save-modal');
    });

    document.getElementById('save-download')?.addEventListener('click', () => {
      const name = (document.getElementById('circuit-name') as HTMLInputElement).value;
      const description = (document.getElementById('circuit-description') as HTMLTextAreaElement)
        .value;
      this.downloadCircuit(name, description);
      this.closeModal('save-modal');
    });

    document.getElementById('save-local')?.addEventListener('click', () => {
      const name = (document.getElementById('circuit-name') as HTMLInputElement).value;
      const description = (document.getElementById('circuit-description') as HTMLTextAreaElement)
        .value;
      this.saveCircuitLocally(name, description);
      this.closeModal('save-modal');
    });

    // Close on overlay click
    document.getElementById('save-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.closeModal('save-modal');
      }
    });
  }

  /**
   * Show load dialog
   */
  private showLoadDialog(): void {
    const savedCircuits = listSavedCircuits();

    let listHTML = '';
    if (savedCircuits.length === 0) {
      listHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📂</div>
          <div class="empty-state-text">No saved circuits yet</div>
        </div>
      `;
    } else {
      listHTML = `
        <div class="list-container">
          ${savedCircuits
            .map(
              (circuit) => `
            <div class="list-item" data-circuit-name="${this.escapeHtml(circuit.name)}">
              <div class="list-item-title">${this.escapeHtml(circuit.name)}</div>
              ${circuit.description ? `<div class="list-item-description">${this.escapeHtml(circuit.description)}</div>` : ''}
              <div class="list-item-meta">
                <span>Last modified: ${this.formatDate(circuit.modified || circuit.created)}</span>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    }

    const modalHTML = `
      <div class="modal-overlay visible" id="load-modal">
        <div class="modal">
          <div class="modal-header">
            <h2>📂 Load Circuit</h2>
            <button class="modal-close" id="load-modal-close">×</button>
          </div>
          <div class="modal-body">
            <h3 style="margin-bottom: 1rem;">Saved Circuits</h3>
            ${listHTML}
            <hr class="divider">
            <button class="file-upload-btn" id="upload-file-btn">
              📄 Upload from File
            </button>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="load-cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Attach event listeners
    document.getElementById('load-modal-close')?.addEventListener('click', () => {
      this.closeModal('load-modal');
    });

    document.getElementById('load-cancel')?.addEventListener('click', () => {
      this.closeModal('load-modal');
    });

    // Load circuit on click
    document.querySelectorAll('#load-modal .list-item').forEach((item) => {
      item.addEventListener('click', () => {
        const circuitName = (item as HTMLElement).dataset.circuitName;
        if (circuitName) {
          this.loadCircuitFromStorage(circuitName);
          this.closeModal('load-modal');
        }
      });
    });

    // File upload
    document.getElementById('upload-file-btn')?.addEventListener('click', async () => {
      try {
        const json = await uploadCircuitFile();
        this.loadCircuitFromJSON(json);
        this.closeModal('load-modal');
      } catch (error) {
        if (error instanceof Error && error.message !== 'File selection cancelled') {
          alert('Failed to load circuit: ' + error.message);
        }
      }
    });

    // Close on overlay click
    document.getElementById('load-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.closeModal('load-modal');
      }
    });
  }

  /**
   * Show examples dialog
   */
  private showExamplesDialog(): void {
    const listHTML = `
      <div class="list-container">
        ${EXAMPLE_CIRCUITS.map(
          (example) => `
          <div class="list-item" data-example-id="${example.id}">
            <div class="list-item-title">
              ${this.escapeHtml(example.name)}
              <span class="list-item-badge ${example.category}">${example.category}</span>
            </div>
            <div class="list-item-description">${this.escapeHtml(example.description)}</div>
            <div class="learning-objectives">
              <h4>What you'll learn:</h4>
              <ul>
                ${example.learningObjectives.map((obj) => `<li>${this.escapeHtml(obj)}</li>`).join('')}
              </ul>
            </div>
          </div>
        `
        ).join('')}
      </div>
    `;

    const modalHTML = `
      <div class="modal-overlay visible" id="examples-modal">
        <div class="modal">
          <div class="modal-header">
            <h2>📚 Example Circuits</h2>
            <button class="modal-close" id="examples-modal-close">×</button>
          </div>
          <div class="modal-body">
            <p style="margin-bottom: 1rem; color: #999;">Click an example to load it into the breadboard</p>
            ${listHTML}
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="examples-cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Attach event listeners
    document.getElementById('examples-modal-close')?.addEventListener('click', () => {
      this.closeModal('examples-modal');
    });

    document.getElementById('examples-cancel')?.addEventListener('click', () => {
      this.closeModal('examples-modal');
    });

    // Load example on click
    document.querySelectorAll('#examples-modal .list-item').forEach((item) => {
      item.addEventListener('click', () => {
        const exampleId = (item as HTMLElement).dataset.exampleId;
        if (exampleId) {
          this.loadExample(exampleId);
          this.closeModal('examples-modal');
        }
      });
    });

    // Close on overlay click
    document.getElementById('examples-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.closeModal('examples-modal');
      }
    });
  }

  /**
   * Show component library browser dialog
   */
  private showComponentLibraryDialog(): void {
    const allComponents = componentLibrary.getAll();
    
    // Group components by category
    const categories = new Map<string, ComponentLibraryEntry[]>();
    allComponents.forEach((entry) => {
      if (!categories.has(entry.category)) {
        categories.set(entry.category, []);
      }
      categories.get(entry.category)!.push(entry);
    });

    // Category display names and order
    const categoryOrder: Array<{key: string; label: string; emoji: string}> = [
      { key: 'passive', label: 'Passive Components', emoji: '🔲' },
      { key: 'diode', label: 'Diodes & LEDs', emoji: '💡' },
      { key: 'power', label: 'Power Supplies', emoji: '⚡' },
      { key: 'interconnect', label: 'Wires & Connectors', emoji: '📏' },
      { key: 'electro-acoustic', label: 'Audio Components', emoji: '🔊' },
      { key: 'virtual-educational', label: 'Virtual Components', emoji: '⏚' },
    ];

    const modalHTML = `
      <div class="modal-overlay visible" id="component-library-modal">
        <div class="modal modal-large">
          <div class="modal-header">
            <h2>📦 Component Library</h2>
            <button class="modal-close" id="library-modal-close">×</button>
          </div>
          <div class="modal-body">
            <div class="library-search">
              <input 
                type="text" 
                id="library-search-input" 
                placeholder="Search by name, description, or part number..."
                class="search-input"
              />
              <button id="library-search-clear" class="search-clear" style="display: none;">×</button>
            </div>
            
            <div class="library-categories">
              <button class="category-pill active" data-category="all">All (${allComponents.length})</button>
              ${categoryOrder
                .filter(cat => categories.has(cat.key))
                .map(cat => `
                  <button class="category-pill" data-category="${cat.key}">
                    ${cat.emoji} ${cat.label} (${categories.get(cat.key)!.length})
                  </button>
                `).join('')}
            </div>

            <div class="component-grid" id="component-grid">
              ${this.renderComponentCards(allComponents)}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="library-cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Store current search state
    let currentCategory = 'all';
    let currentSearchQuery = '';

    // Function to filter and display components
    const updateComponentDisplay = () => {
      let filteredComponents = allComponents;

      // Apply category filter
      if (currentCategory !== 'all') {
        filteredComponents = categories.get(currentCategory) || [];
      }

      // Apply search filter
      if (currentSearchQuery) {
        filteredComponents = componentLibrary.search(currentSearchQuery);
        if (currentCategory !== 'all') {
          filteredComponents = filteredComponents.filter(c => c.category === currentCategory);
        }
      }

      const grid = document.getElementById('component-grid');
      if (grid) {
        grid.innerHTML = this.renderComponentCards(filteredComponents);
        
        // Re-attach click handlers to new cards
        grid.querySelectorAll('.component-card').forEach((card) => {
          card.addEventListener('click', () => {
            const libraryId = (card as HTMLElement).dataset.libraryId;
            if (libraryId) {
              this.selectComponentFromLibrary(libraryId);
              this.closeModal('component-library-modal');
            }
          });
        });
      }
    };

    // Attach event listeners
    document.getElementById('library-modal-close')?.addEventListener('click', () => {
      this.closeModal('component-library-modal');
    });

    document.getElementById('library-cancel')?.addEventListener('click', () => {
      this.closeModal('component-library-modal');
    });

    // Search input handler
    const searchInput = document.getElementById('library-search-input') as HTMLInputElement;
    const searchClear = document.getElementById('library-search-clear');
    
    searchInput?.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value;
      currentSearchQuery = query;
      
      if (searchClear) {
        searchClear.style.display = query ? 'block' : 'none';
      }
      
      updateComponentDisplay();
    });

    searchClear?.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        currentSearchQuery = '';
        searchClear.style.display = 'none';
        updateComponentDisplay();
        searchInput.focus();
      }
    });

    // Category pill handlers
    document.querySelectorAll('.category-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const category = (pill as HTMLElement).dataset.category || 'all';
        currentCategory = category;
        
        // Update active state
        document.querySelectorAll('.category-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        
        updateComponentDisplay();
      });
    });

    // Component card click handlers
    document.querySelectorAll('.component-card').forEach((card) => {
      card.addEventListener('click', () => {
        const libraryId = (card as HTMLElement).dataset.libraryId;
        if (libraryId) {
          this.selectComponentFromLibrary(libraryId);
          this.closeModal('component-library-modal');
        }
      });
    });

    // Close on overlay click
    document.getElementById('component-library-modal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.closeModal('component-library-modal');
      }
    });

    // Focus search input
    searchInput?.focus();
  }

  /**
   * Render component cards for the library browser
   */
  private renderComponentCards(components: ComponentLibraryEntry[]): string {
    if (components.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-text">No components found</div>
        </div>
      `;
    }

    return components
      .map((entry) => {
        // Extract key specs for display
        const specs = this.getComponentSpecs(entry);
        
        return `
          <div class="component-card" data-library-id="${entry.id}">
            <div class="component-card-header">
              <div class="component-card-name">${this.escapeHtml(entry.name)}</div>
              <div class="component-card-category">${this.getCategoryEmoji(entry.category)}</div>
            </div>
            <div class="component-card-specs">
              ${specs.map(spec => `<div class="spec-item">${this.escapeHtml(spec)}</div>`).join('')}
            </div>
            ${entry.package ? `
              <div class="component-card-package">
                Package: ${this.escapeHtml(entry.package.kind.toUpperCase())} • ${entry.package.pinCount} pins
              </div>
            ` : ''}
            ${entry.description ? `
              <div class="component-card-description">${this.escapeHtml(entry.description)}</div>
            ` : ''}
            ${entry.manufacturerPartNumber ? `
              <div class="component-card-part-number">Part: ${this.escapeHtml(entry.manufacturerPartNumber)}</div>
            ` : ''}
          </div>
        `;
      })
      .join('');
  }

  /**
   * Get formatted specs for a component
   */
  private getComponentSpecs(entry: ComponentLibraryEntry): string[] {
    const specs: string[] = [];
    
    if (entry.electrical.resistance !== undefined) {
      const r = entry.electrical.resistance as number;
      const rStr = r >= 1000 ? `${r / 1000}kΩ` : `${r}Ω`;
      specs.push(`R: ${rStr}`);
      
      if (entry.electrical.tolerance !== undefined) {
        specs.push(`±${entry.electrical.tolerance}%`);
      }
    }
    
    if (entry.electrical.forwardVoltage !== undefined) {
      specs.push(`Vf: ${entry.electrical.forwardVoltage}V`);
    }
    
    if (entry.electrical.voltage !== undefined) {
      specs.push(`${entry.electrical.voltage}V`);
    }
    
    if (entry.electrical.maxCurrent !== undefined) {
      const current = entry.electrical.maxCurrent as number;
      const currentStr = current >= 1 ? `${current}A` : `${current * 1000}mA`;
      specs.push(`Max: ${currentStr}`);
    }
    
    if (entry.electrical.powerRating !== undefined) {
      specs.push(`${entry.electrical.powerRating}W`);
    }
    
    if (entry.electrical.impedance !== undefined) {
      specs.push(`Z: ${entry.electrical.impedance}Ω`);
    }
    
    return specs;
  }

  /**
   * Get emoji for category
   */
  private getCategoryEmoji(category: string): string {
    const emojiMap: Record<string, string> = {
      'passive': '🔲',
      'diode': '💡',
      'power': '⚡',
      'interconnect': '📏',
      'electro-acoustic': '🔊',
      'virtual-educational': '⏚',
    };
    return emojiMap[category] || '📦';
  }

  /**
   * Select a component from the library
   */
  private selectComponentFromLibrary(libraryId: string): void {
    const entry = componentLibrary.get(libraryId);
    if (!entry) return;

    // Determine component type from library entry
    let componentType: ComponentType;
    
    if (entry.electrical.resistance !== undefined && entry.category === 'passive') {
      componentType = ComponentType.RESISTOR;
    } else if (entry.electrical.forwardVoltage !== undefined) {
      componentType = ComponentType.LED;
    } else if (entry.electrical.voltage !== undefined && entry.category === 'power') {
      componentType = ComponentType.POWER_SUPPLY;
    } else if (entry.category === 'interconnect') {
      componentType = ComponentType.WIRE;
    } else if (entry.category === 'virtual-educational') {
      componentType = ComponentType.GROUND;
    } else {
      // Default fallback
      componentType = ComponentType.WIRE;
    }

    this.selectedComponentType = componentType;
    this.selectedLibraryId = libraryId;
    this.placementStart = null;
  }

  /**
   * Close modal dialog
   */
  private closeModal(modalId: string): void {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.remove();
    }
  }

  /**
   * Save circuit to localStorage
   */
  private saveCircuitLocally(name: string, description: string): void {
    if (!name.trim()) {
      alert('Please enter a circuit name');
      return;
    }

    try {
      const metadata: Partial<CircuitMetadata> = {
        name: name.trim(),
        description: description.trim() || undefined,
        author: 'User',
        created: this.currentCircuitMetadata?.created,
      };

      const json = serializeCircuit(this.state, metadata);
      saveToLocalStorage(name.trim(), json);

      this.currentCircuitMetadata = JSON.parse(json).metadata;
      this.hasUnsavedChanges = false;

      alert(`Circuit "${name}" saved successfully!`);
    } catch (error) {
      alert('Failed to save circuit: ' + (error as Error).message);
    }
  }

  /**
   * Download circuit as JSON file
   */
  private downloadCircuit(name: string, description: string): void {
    if (!name.trim()) {
      alert('Please enter a circuit name');
      return;
    }

    try {
      const metadata: Partial<CircuitMetadata> = {
        name: name.trim(),
        description: description.trim() || undefined,
        author: 'User',
        created: this.currentCircuitMetadata?.created,
      };

      const json = serializeCircuit(this.state, metadata);
      const filename = name.trim().toLowerCase().replace(/\s+/g, '-');
      downloadCircuitFile(json, filename);

      this.currentCircuitMetadata = JSON.parse(json).metadata;
      this.hasUnsavedChanges = false;
    } catch (error) {
      alert('Failed to download circuit: ' + (error as Error).message);
    }
  }

  /**
   * Load circuit from localStorage
   */
  private loadCircuitFromStorage(name: string): void {
    if (this.hasUnsavedChanges && this.state.components.length > 0) {
      if (!confirm('You have unsaved changes. Load anyway?')) {
        return;
      }
    }

    try {
      const json = loadFromLocalStorage(name);
      if (!json) {
        alert('Circuit not found');
        return;
      }

      this.loadCircuitFromJSON(json);
    } catch (error) {
      alert('Failed to load circuit: ' + (error as Error).message);
    }
  }

  /**
   * Load circuit from JSON string
   */
  private loadCircuitFromJSON(json: string): void {
    try {
      const { state, metadata } = deserializeCircuit(json);

      this.state = state;
      this.currentCircuitMetadata = metadata;
      this.hasUnsavedChanges = false;
      this.selectedComponentType = null;
      this.placementStart = null;

      // Clear history when loading a new circuit
      this.historyManager.clear();

      // Update component ID counter to avoid conflicts
      let maxId = 0;
      for (const component of this.state.components) {
        // Extract numeric ID from any component ID format (component-N, comp_N, etc.)
        const idMatch = component.id.match(/\d+$/);
        if (idMatch) {
          const id = parseInt(idMatch[0]);
          if (id > maxId) {
            maxId = id;
          }
        }
      }
      this.componentIdCounter = maxId + 1;

      this.render();
    } catch (error) {
      alert('Failed to load circuit: ' + (error as Error).message);
    }
  }

  /**
   * Load an example circuit
   */
  private loadExample(exampleId: string): void {
    if (this.hasUnsavedChanges && this.state.components.length > 0) {
      if (
        !confirm(
          'Loading an example will replace your current circuit. You have unsaved changes. Continue anyway?'
        )
      ) {
        return;
      }
    }

    const example = EXAMPLE_CIRCUITS.find((e) => e.id === exampleId);
    if (!example) {
      alert('Example not found');
      return;
    }

    try {
      this.loadCircuitFromJSON(example.json);
    } catch (error) {
      alert('Failed to load example: ' + (error as Error).message);
    }
  }

  /**
   * Escape HTML for safe rendering
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format date for display
   */
  private formatDate(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Mark state as changed
   */
  private markAsChanged(): void {
    this.hasUnsavedChanges = true;
  }

  /**
   * Toggle audio output on/off
   */
  private async toggleAudio(): Promise<void> {
    try {
      if (this.audioManager.isEnabled()) {
        this.audioManager.disable();
      } else {
        await this.audioManager.enable();
      }
      this.updateAudioControls();
      this.updateSpeakerAudio();
    } catch (error) {
      alert('Failed to enable audio: ' + (error as Error).message);
    }
  }

  /**
   * Update audio controls UI based on current state
   */
  private updateAudioControls(): void {
    const toggleBtn = document.getElementById('toggle-audio-btn');
    const volumeContainer = document.getElementById('volume-control-container');
    const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    const volumeValue = document.getElementById('volume-value');
    const audioIndicator = document.getElementById('audio-indicator');
    const speakerCount = document.getElementById('audio-speaker-count');

    if (toggleBtn) {
      if (this.audioManager.isEnabled()) {
        toggleBtn.textContent = '🔊 Disable Sound';
        toggleBtn.classList.add('active');
      } else {
        toggleBtn.textContent = '🔇 Enable Sound';
        toggleBtn.classList.remove('active');
      }
    }

    if (volumeContainer) {
      volumeContainer.style.display = this.audioManager.isEnabled() ? 'block' : 'none';
    }

    if (volumeSlider && volumeValue) {
      const volume = Math.round(this.audioManager.getVolume() * 100);
      volumeSlider.value = volume.toString();
      volumeValue.textContent = `${volume}%`;
    }

    if (audioIndicator && speakerCount) {
      const count = this.audioManager.getActiveSpeakerCount();
      speakerCount.textContent = count.toString();
      audioIndicator.style.display = this.audioManager.isEnabled() && count > 0 ? 'block' : 'none';
    }
  }

  /**
   * Update clock controls based on current state
   */
  private updateClockControls(): void {
    const clockControls = document.getElementById('clock-controls');
    const stepBtn = document.getElementById('step-btn');
    const runBtn = document.getElementById('run-btn');
    const freqSlider = document.getElementById('freq-slider') as HTMLInputElement;
    const freqValue = document.getElementById('freq-value');
    const clockIndicator = document.getElementById('clock-indicator');
    const clockStatus = document.getElementById('clock-status');

    // Check if microprocessor is present
    const hasMicroprocessor = this.state.components.some(
      (c) => c.type === ComponentType.MICROPROCESSOR
    );

    if (clockControls) {
      clockControls.style.display = hasMicroprocessor ? 'block' : 'none';
    }

    if (!hasMicroprocessor) {
      return; // Don't update if no microprocessor
    }

    const state = this.clockController.getState();
    
    // Update step button (disable when running)
    if (stepBtn) {
      (stepBtn as HTMLButtonElement).disabled = state.isRunning;
    }

    // Update run/pause button
    if (runBtn) {
      if (state.isRunning) {
        runBtn.textContent = '⏸ Pause';
        runBtn.classList.add('run-active');
      } else {
        runBtn.textContent = '▶️ Run';
        runBtn.classList.remove('run-active');
      }
    }

    // Update frequency slider and display
    if (freqSlider && freqValue) {
      freqSlider.value = state.frequency.toString();
      freqValue.textContent = `${state.frequency.toFixed(1)} Hz`;
    }

    // Update clock indicator (high/low)
    if (clockIndicator) {
      if (state.clockState) {
        clockIndicator.classList.add('high');
      } else {
        clockIndicator.classList.remove('high');
      }
    }

    // Update status text
    if (clockStatus) {
      const microprocessor = this.state.components.find(
        (c) => c.type === ComponentType.MICROPROCESSOR
      );
      
      if (microprocessor && microprocessor.type === ComponentType.MICROPROCESSOR) {
        if (microprocessor.state.halted) {
          clockStatus.textContent = `Halted (${state.instructionCount} instructions)`;
          clockStatus.className = 'clock-status halted';
        } else if (state.isRunning) {
          clockStatus.textContent = `Running at ${state.frequency.toFixed(1)} Hz`;
          clockStatus.className = 'clock-status running';
        } else {
          clockStatus.textContent = `Paused (${state.instructionCount} instructions)`;
          clockStatus.className = 'clock-status';
        }
      }
    }
  }

  /**
   * Handle clock change from ClockController
   */
  private handleClockChange(clockHigh: boolean): void {
    // Find microprocessor - if none exists, nothing to do
    const microprocessorIndex = this.state.components.findIndex(
      (c) => c.type === ComponentType.MICROPROCESSOR
    );

    if (microprocessorIndex === -1) {
      return;
    }

    const microprocessor = this.state.components[microprocessorIndex];
    if (microprocessor.type !== ComponentType.MICROPROCESSOR) {
      return;
    }

    // Execute clock edge on microprocessor
    // This will handle rising edge detection and instruction execution internally
    const newState = edu8HandleClockEdge(microprocessor.state, clockHigh, 0);
    
    // Update component with new state
    this.state.components[microprocessorIndex] = {
      ...microprocessor,
      state: newState,
    };
    
    // Re-render breadboard to show updated state
    // This will update the explain panel and voltage overlays
    this.renderBreadboard();
    
    // Update clock controls to reflect new state
    this.updateClockControls();
  }

  /**
   * Handle clock reset from ClockController
   */
  private handleClockReset(): void {
    // Reset all microprocessor components
    this.state.components = this.state.components.map((component) => {
      if (component.type === ComponentType.MICROPROCESSOR) {
        return {
          ...component,
          state: resetEDU8(component.state),
        };
      }
      return component;
    });

    // Re-render to show reset state
    this.renderBreadboard();
    this.updateClockControls();
  }

  /**
   * Update speaker audio based on current simulation results
   */
  private updateSpeakerAudio(): void {
    if (!this.audioManager.isEnabled() || !this.cachedSimulation || !this.cachedCircuit) {
      return;
    }

    // Find all speaker components
    const speakerComponents = this.state.components.filter(
      (comp) => comp.libraryId === 'speaker-8ohm'
    );

    // Track which speakers are active
    const activeSpeakerIds = new Set<string>();

    // Update audio for each speaker based on voltage/current
    for (const speaker of speakerComponents) {
      // Find the circuit edge for this speaker
      const edge = this.cachedCircuit.edges.find((e) => e.component.id === speaker.id);
      
      if (edge) {
        // Get voltage across speaker terminals
        const nodeA = this.cachedCircuit.nodes.get(edge.nodeA);
        const nodeB = this.cachedCircuit.nodes.get(edge.nodeB);
        const voltageA = nodeA?.voltage ?? 0;
        const voltageB = nodeB?.voltage ?? 0;
        const voltage = Math.abs(voltageA - voltageB);

        // Get current through speaker
        const current = Math.abs(edge.current ?? 0);

        // Update audio manager
        this.audioManager.updateSpeaker(speaker.id, voltage, current);
        activeSpeakerIds.add(speaker.id);
      }
    }

    // AudioManager will automatically stop speakers when voltage/current is too low
    // No need to explicitly track removed speakers here
  }

  /**
   * Create a floating component (Phase 3c)
   * Component appears at canvas edge, ready for drag-and-drop placement
   */
  private createFloatingComponent(type: ComponentType, libraryId?: string): void {
    const id = `floating-${this.componentIdCounter++}`;
    
    // Position at right edge of breadboard
    const gridWidth = BreadboardLayout.TOTAL_COLS * PixiRenderer.HOLE_SPACING;
    const xOffset = 50; // 50px to the right of breadboard
    const yOffset = 100; // 100px from top
    
    // Get properties from library if available
    const libraryEntry = libraryId ? componentLibrary.get(libraryId) : undefined;
    
    // Create floating component with default properties
    const properties: FloatingComponent['properties'] = {};
    
    switch (type) {
      case ComponentType.RESISTOR:
        properties.resistance = (libraryEntry?.electrical.resistance as number) ?? 1000;
        break;
      case ComponentType.LED:
        properties.forwardVoltage = (libraryEntry?.electrical.forwardVoltage as number) ?? 2.0;
        properties.maxCurrent = (libraryEntry?.electrical.maxCurrent as number) ?? 0.02;
        break;
      case ComponentType.POWER_SUPPLY:
        properties.voltage = (libraryEntry?.electrical.voltage as number) ?? 5.0;
        break;
      case ComponentType.WIRE:
        properties.resistance = (libraryEntry?.electrical.resistance as number) ?? 0.01;
        break;
    }
    
    this.floatingComponent = {
      id,
      type,
      libraryId,
      position: { x: gridWidth + xOffset, y: yOffset },
      rotation: 0, // Start at 0 degrees
      properties,
    };
    
    // Clear old placement state
    this.placementStart = null;
    this.render();
  }

  /**
   * Select a component type for placement (test/programmatic API)
   * This method is primarily for testing purposes and backward compatibility
   */
  selectComponentType(type: ComponentType): void {
    if (USE_RETE_INTERACTIVE) {
      // Phase 3c: Create floating component instead of two-click placement
      this.createFloatingComponent(type, this.selectedLibraryId ?? undefined);
      this.selectedComponentType = null; // Clear after creating floating component
      this.selectedLibraryId = null;
    } else {
      // Original two-click placement workflow
      this.selectedComponentType = type;
      this.placementStart = null;
      this.selectedLibraryId = null;
    }
  }

  /**
   * Get current breadboard state (for testing)
   */
  getState(): BreadboardState {
    return this.state;
  }

  /**
   * Get all components (for testing)
   */
  getComponents(): AnyComponent[] {
    return this.state.components;
  }

  /**
   * Get selected component ID (for testing)
   */
  getSelectedComponentId(): string | null {
    return this.state.selectedComponentId;
  }

  /**
   * Select a component by ID (for testing)
   */
  selectComponent(componentId: string): void {
    this.selectComponentById(componentId);
  }

  /**
   * Simulate clicking a hole at the given position (for testing)
   */
  clickHole(position: Position): void {
    this.handleHoleClick(position);
  }

  /**
   * Simulate clicking a component by ID (for testing)
   */
  clickComponent(componentId: string): void {
    this.handleComponentClick(componentId);
  }

  /**
   * Start dragging a component (for testing)
   */
  startDragComponent(componentId: string): void {
    const component = this.state.components.find((c) => c.id === componentId);
    if (!component) return;

    // Simulate a drag start at the component's first pin position
    const firstPinPixels = this.pixiRenderer.positionToPixels(component.positions[0]);
    this.handleComponentDragStart(componentId, firstPinPixels.x, firstPinPixels.y);
  }

  /**
   * Move the drag preview to a new position (for testing)
   */
  moveDragTo(position: Position): void {
    if (!this.dragState) return;

    // Convert position to pixel coordinates
    // Note: We use position * HOLE_SPACING to get top-left corner coordinates
    // which matches how mouse coordinates work in real drag operations
    const pixelX = position.col * PixiRenderer.HOLE_SPACING;
    const pixelY = position.row * PixiRenderer.HOLE_SPACING;
    
    const breadboard = document.getElementById('breadboard');
    if (!breadboard) return;

    const rect = breadboard.getBoundingClientRect();
    // Create a fake MouseEvent with the target coordinates
    const fakeEvent = new MouseEvent('mousemove', {
      clientX: rect.left + pixelX,
      clientY: rect.top + pixelY,
    });
    this.handleMouseMove(fakeEvent);
  }

  /**
   * Complete the drag operation (for testing)
   */
  completeDrag(): void {
    if (!this.dragState) return;

    const fakeEvent = new MouseEvent('mouseup');
    this.handleMouseUp(fakeEvent);
  }

  /**
   * Get the current drag state (for testing)
   */
  getDragState(): DragState | null {
    return this.dragState;
  }

  /**
   * Simulate Escape key press (for testing)
   */
  pressEscape(): void {
    const fakeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    this.handleKeyDown(fakeEvent);
  }

  /**
   * Switch between breadboard and schematic views
   */
  private switchView(view: 'breadboard' | 'schematic'): void {
    
    // Update view containers visibility
    const breadboardContainer = document.getElementById('breadboard-view-container');
    const schematicContainer = document.getElementById('schematic-view-container');
    const breadboardBtn = document.getElementById('breadboard-view-btn');
    const schematicBtn = document.getElementById('schematic-view-btn');
    
    if (view === 'breadboard') {
      if (breadboardContainer) breadboardContainer.style.display = 'flex';
      if (schematicContainer) schematicContainer.style.display = 'none';
      breadboardBtn?.classList.add('active');
      schematicBtn?.classList.remove('active');
    } else {
      if (breadboardContainer) breadboardContainer.style.display = 'none';
      if (schematicContainer) schematicContainer.style.display = 'flex';
      breadboardBtn?.classList.remove('active');
      schematicBtn?.classList.add('active');
      
      // Render schematic view
      this.renderSchematic();
    }
  }

  /**
   * Render schematic view
   */
  private renderSchematic(): void {
    const schematicDiv = document.getElementById('schematic');
    if (!schematicDiv) return;

    // Clear previous schematic
    schematicDiv.innerHTML = '';

    // Check if we have a circuit to render
    if (!this.cachedCircuit || this.cachedCircuit.edges.length === 0) {
      schematicDiv.innerHTML = `
        <div class="schematic-empty-state">
          <div class="empty-state-icon">📐</div>
          <div class="empty-state-text">No circuit to display</div>
          <div class="empty-state-hint">Add components in breadboard view to see the schematic</div>
        </div>
      `;
      return;
    }

    // Generate schematic layout if not cached or circuit changed
    if (!this.cachedSchematic) {
      this.cachedSchematic = this.schematicGenerator.generate(this.cachedCircuit);
    }

    // Render schematic diagram
    const svg = this.schematicRenderer.renderSchematic(
      this.cachedSchematic,
      this.cachedSimulation,
      this.state.selectedComponentId
    );

    schematicDiv.appendChild(svg);

    // Attach click handlers to schematic symbols
    this.attachSchematicEventHandlers(svg);
  }

  /**
   * Attach event handlers to schematic symbols
   */
  private attachSchematicEventHandlers(svg: SVGElement): void {
    const symbols = svg.querySelectorAll('.schematic-symbol');
    
    symbols.forEach((symbolEl) => {
      // Click handler for selection and explain panel
      symbolEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const componentId = (symbolEl as HTMLElement).dataset.componentId;
        if (componentId) {
          this.selectComponentById(componentId);
          // Show explain panel for component
          this.explainPanel.show({ type: 'component', componentId });
        }
      });
    });

    // Click on connections to show net info
    const connections = svg.querySelectorAll('.schematic-connection');
    connections.forEach((connEl) => {
      connEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const netId = (connEl as HTMLElement).dataset.netId;
        if (netId && this.cachedCircuit) {
          this.explainPanel.show({ type: 'node', nodeId: netId });
        }
      });
    });

    // Click on SVG background to deselect
    svg.addEventListener('click', (e) => {
      if (e.target === svg) {
        this.deselectComponent();
        this.explainPanel.hide();
      }
    });
  }
}
