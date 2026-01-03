Implement save/load functionality with canonical example library

## Context

Breadboard Lab successfully provides interactive breadboard circuit building with voltage visualization, current animation, error detection, and an educational explain panel. However, all work is lost when the page reloads. Users cannot save their circuits, cannot load previous work, and have no way to access pre-built example circuits for learning.

This absence of persistence and examples severely limits the tool's educational utility and practical usability.

## Gap Analysis

**Long-term goal (planning/vision/goal.md)**: 
> "Save/Load, Export/Import, and Canonical Examples" (lines 415-432)
> - Load/save project JSON preserves placements, wiring, and component selections
> - Built-in examples are selectable from within the UI
> - Examples included: LED + resistor, Voltage divider, Simple clock-driven circuit

The planning document explicitly lists save/load and canonical examples as **required** capabilities in the target specification.

**Current state (planning/state/system_capabilities.md, lines 982-990)**:
- ❌ No save/load functionality
- ❌ No data persistence (state is lost on page reload)
- ❌ No example circuits available
- ❌ No import/export capabilities

**Specific gaps**:
1. No JSON serialization/deserialization of circuit state
2. No localStorage or file-based persistence
3. No UI for saving/loading circuits
4. No library of canonical example circuits
5. No example selector UI

**Impact of gap**:
- Users lose all work on page reload → frustrating, limits adoption
- No way to share circuits with others → limits collaboration and teaching
- No starting point for beginners → steep learning curve
- No demonstration of tool capabilities → limits user exploration
- Cannot test circuits iteratively across sessions → poor developer experience

## Proposed Task

Implement save/load functionality with a canonical example library that allows users to persist their work and access pre-built educational circuits.

### Core Components

1. **Circuit Serialization**
   - Define JSON schema for circuit state export
   - Implement serialization of `BreadboardState` to JSON:
     - All components (type, positions, rotation, properties)
     - Component selection state (optional)
     - Circuit metadata (name, description, author, created date)
   - Implement deserialization from JSON back to `BreadboardState`
   - Validation to ensure loaded circuits are valid

2. **Save Functionality**
   - Add "Save Circuit" button to UI
   - Generate JSON representation of current circuit
   - Save to browser localStorage with user-defined name
   - Provide JSON download as `.json` file for external storage
   - List saved circuits in UI (name, date, preview info)

3. **Load Functionality**
   - Add "Load Circuit" button/menu to UI
   - Display list of saved circuits from localStorage
   - Load selected circuit and replace current state
   - Support file upload to load `.json` files from disk
   - Validation and error handling for corrupt/invalid files

4. **Canonical Example Library**
   - Create 3-5 pre-built example circuits as JSON files:
     - **"LED + Resistor"**: Most basic circuit (LED with current-limiting resistor)
     - **"Voltage Divider"**: Two resistors dividing voltage (demonstrates voltage drop)
     - **"Parallel LEDs"**: Multiple LEDs in parallel (demonstrates current division)
     - **"Series vs Parallel"**: Side-by-side comparison circuit
     - **"Short Circuit Demo"**: Intentional error for learning error detection
   - Bundle examples into application (import as modules or embed)
   - Add "Examples" menu/panel to UI
   - One-click loading of example circuits
   - Examples should demonstrate:
     - Basic component usage
     - Correct circuit design patterns
     - Voltage/current visualization features
     - Error detection capabilities

5. **UI Integration**
   - Add toolbar buttons or menu for Save/Load/Examples
   - Modal dialog for save (enter circuit name/description)
   - Modal dialog for load (list saved circuits + file upload)
   - Modal dialog for examples (list with descriptions and preview info)
   - Clear confirmation when loading overwrites current work
   - Visual feedback for save/load operations

### Success Criteria

- [ ] Users can save current circuit to localStorage with a custom name
- [ ] Users can download circuit as JSON file
- [ ] Users can load previously saved circuits from localStorage
- [ ] Users can load circuits from JSON file upload
- [ ] At least 3 canonical example circuits are available
- [ ] Examples menu displays example descriptions and key features
- [ ] Loading an example replaces current circuit and triggers simulation
- [ ] JSON format is human-readable and documented
- [ ] Invalid/corrupted JSON files show clear error messages
- [ ] Save/load operations preserve all component properties (type, position, rotation, values)
- [ ] Loaded circuits display correctly with voltage/current visualization

### Implementation Approach

**Phase 1: Serialization/Deserialization**
- Define `CircuitData` interface for JSON schema
- Implement `serializeCircuit(state: BreadboardState): string`
- Implement `deserializeCircuit(json: string): BreadboardState`
- Add validation function for loaded circuits
- Unit tests for serialization roundtrip

**Phase 2: LocalStorage Persistence**
- Implement `saveToLocalStorage(name: string, data: CircuitData): void`
- Implement `loadFromLocalStorage(name: string): CircuitData | null`
- Implement `listSavedCircuits(): { name: string, date: Date }[]`
- Implement `deleteSavedCircuit(name: string): void`

**Phase 3: File Download/Upload**
- Implement download as JSON file (using `<a download>` or Blob API)
- Implement file upload with `<input type="file">` handler
- Parse uploaded file and validate JSON
- Error handling for file read errors

**Phase 4: Canonical Examples**
- Create example circuit JSON files in `src/examples/` directory
- Define example metadata (name, description, learning objectives)
- Import examples as TypeScript modules
- Implement example registry/catalog

**Phase 5: UI Implementation**
- Add Save/Load/Examples buttons to toolbar
- Create modal components for save/load/examples dialogs
- Implement form handling for save dialog (circuit name input)
- Implement list rendering for load/examples dialogs
- Add confirmation dialog when loading over unsaved work
- Style modals consistently with existing UI

**Phase 6: Integration and Testing**
- Wire up all UI components to persistence functions
- Test full save → reload page → load workflow
- Test all example circuits load and simulate correctly
- Add unit tests for serialization functions
- Add integration tests for persistence layer
- Document JSON schema format

### JSON Schema Example

```json
{
  "version": "1.0",
  "metadata": {
    "name": "LED and Resistor",
    "description": "Basic LED circuit with current-limiting resistor",
    "author": "Breadboard Lab",
    "created": "2026-01-03T14:00:00.000Z"
  },
  "components": [
    {
      "id": "comp_1",
      "type": "POWER_SUPPLY",
      "position1": { "row": 5, "col": 0 },
      "position2": { "row": 5, "col": 0 },
      "rotation": 0,
      "metadata": { "voltage": 5 }
    },
    {
      "id": "comp_2",
      "type": "RESISTOR",
      "position1": { "row": 10, "col": 0 },
      "position2": { "row": 15, "col": 0 },
      "rotation": 0,
      "metadata": { "resistance": 220 }
    }
  ]
}
```

### Alignment with Vision

This task directly addresses requirements from the planning document:

- **Save/Load** (goal.md, lines 415-432): "Load/save project JSON preserves placements, wiring, and component selections"
- **Canonical Examples** (goal.md, lines 421-432): "Built-in examples are selectable from within the UI"
- **Educational Mission**: Examples provide learning scaffolding and demonstrate features
- **Usability**: Persistence is fundamental for any serious tool
- **MVP Requirement**: Save/load listed in target specification

### Priority Justification

This is the most important next task because:

1. **Critical usability gap**: Losing work on page reload is unacceptable for any real usage
2. **Educational foundation**: Examples are essential for teaching and onboarding
3. **Prerequisite for user testing**: Can't get meaningful feedback without save/load
4. **High value-to-effort ratio**: Relatively straightforward to implement with high user impact
5. **Enables iteration**: Users can build circuits incrementally across sessions
6. **Demonstrates capabilities**: Examples showcase voltage/current visualization and error detection
7. **Foundation for future features**: Persistence layer enables sharing, collaboration, export to other formats
8. **Explicit requirement**: Listed as required in target specification (not optional)

Before adding more complex features (SPICE simulation, microprocessor, audio, schematic view), establishing basic circuit persistence and providing example circuits delivers immediate value and makes the tool actually usable for its intended purpose.

### Non-Goals

This task specifically does NOT include:
- Cloud storage or user accounts (localStorage only)
- Real-time collaboration or sharing URLs
- Circuit versioning or history
- Export to other formats (SPICE, Fritzing, etc.) - only JSON
- Import from other tools
- Circuit thumbnails or visual previews
- Auto-save functionality
- Schematic view persistence (will be added when schematic view exists)

These are separate tasks for future iterations.

## Estimated Effort

3-5 days of focused development:
- Day 1: Serialization/deserialization with validation and tests
- Day 2: LocalStorage persistence layer and file download/upload
- Day 3: Create 3-5 canonical example circuits with educational content
- Day 4: Implement save/load/examples UI (modals, buttons, lists)
- Day 5: Integration, testing, polish, documentation

## Dependencies

- Current component model ✅ (well-defined types in `types.ts`)
- Current breadboard state management ✅ (BreadboardState in `breadboard-app.ts`)
- Component property system ✅ (metadata field for component-specific values)
- UI framework ✅ (vanilla JS/TS with DOM manipulation)

## Risks and Mitigations

**Risk**: JSON format changes break old saved circuits
- *Mitigation*: Include version field in JSON; implement migration logic for format changes

**Risk**: localStorage space limits (typically 5-10MB)
- *Mitigation*: Monitor storage usage; limit number of saved circuits; add delete functionality

**Risk**: Browser compatibility issues with file download/upload
- *Mitigation*: Use standard APIs (`Blob`, `FileReader`); test on major browsers; provide fallbacks

**Risk**: Users accidentally overwrite work when loading
- *Mitigation*: Show confirmation dialog; detect unsaved changes; offer to save before loading

**Risk**: Example circuits become outdated as simulator improves
- *Mitigation*: Version examples; add tests that load and simulate examples; document expected behavior

## References

- `planning/vision/goal.md` - Section 10: "Save/Load, Export/Import, and Canonical Examples"
- `planning/state/system_capabilities.md` - Section "Known Limitations" (line 1006): "No persistence"
- `src/core/types.ts` - Component type definitions for serialization
- `src/ui/breadboard-app.ts` - BreadboardState management

## Success Metrics

After implementation, users should be able to:
1. Build a circuit, save it, reload the page, and load their circuit back
2. Download a circuit as JSON, send it to someone, who can then load it
3. Click "Examples" → "LED and Resistor" → see a working circuit appear
4. Explore 3-5 example circuits that demonstrate different concepts
5. See voltage/current visualization on loaded examples
6. Learn from example descriptions and metadata

This task transforms Breadboard Lab from a throwaway toy into a practical educational tool with persistent value.
