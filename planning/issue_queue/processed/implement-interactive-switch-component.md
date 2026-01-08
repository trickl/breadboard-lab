Implement Interactive Switch Component with Stateful Toggle Behavior

## Overview

This task implements the **interactive switch component** as explicitly required by goal.md Section 8 ("Switches and User Interaction") and Section 12.2 (default quick select items). The switch is a **stateful, interactive component** that enables users to manually control circuit behavior by opening/closing electrical connections, making it essential for interactive electronics education.

## Problem Statement

The current system implements 36 components in the library but **lacks any switch component**. Goal.md explicitly requires switches as one of the 5 default quick select items alongside LED, Wire, Resistor, and Battery/power source (Section 12.2, lines 337-344). Section 8 (lines 220-235) dedicates an entire section to switch behavior, defining the interaction model and state propagation requirements.

Without switches, users cannot:
- Build circuits with manual control (e.g., "press button to light LED")
- Explore series/parallel switch configurations
- Learn about open/closed circuit states
- Create interactive demonstrations

This is a **critical functional gap** preventing the tool from being used for fundamental electronics education.

## Requirements from goal.md

### Section 8: Switches and User Interaction (lines 220-235)

**Core requirements:**

1. **Stateful component**: Switches maintain state (open/closed) that persists until user changes it
2. **Interactive**: User can toggle state via UI interaction
3. **Interaction model** (lines 226-232):
   - **Short click** (below movement threshold): toggles switch state
   - **Click-and-drag**: moves the switch (standard component repositioning)
   - Optional future enhancement: dedicated toggle hotspot
4. **Immediate propagation**: "State changes must propagate immediately through the electrical simulation" (lines 233-234)

### Section 12.2: Default Quick Select Items (lines 337-344)

Switches are listed as one of the 5 prominently displayed components on initial load.

### Section 3.1: Nodes (lines 43-49)

Switches are explicitly listed as meaningful physical and electrical entities represented as Rete nodes.

## Functional Specification

### Switch Types

Implement **two switch types** to cover common educational scenarios:

1. **SPST (Single-Pole Single-Throw) Switch**
   - Two terminals
   - States: Open (infinite resistance) or Closed (near-zero resistance)
   - Most common type for simple on/off control
   - Visual: Toggle switch or push-button representation

2. **SPDT (Single-Pole Double-Throw) Switch** (optional, lower priority)
   - Three terminals (common, NO, NC)
   - Allows switching between two circuits
   - Visual: Three-terminal switch with moving contact indicator

**Recommendation**: Start with SPST only (simpler, covers 90% of educational use cases).

### Electrical Model

#### Open State (Switch Off)
- Resistance: **1 GΩ (1,000,000,000 Ω)** - effectively infinite for MNA solver
- Current flow: ~0 A (blocked)
- Behavior: Breaks circuit continuity

#### Closed State (Switch On)
- Resistance: **0.01 Ω** - same as wire resistance for consistency
- Current flow: Determined by circuit (Ohm's law)
- Behavior: Provides electrical connection equivalent to wire

#### State Representation in Component Model

Extend `Component` type in `src/core/types.ts`:

```typescript
export interface Component {
  // ... existing fields ...
  
  // For switch components
  switchState?: 'open' | 'closed'; // undefined for non-switch components
}
```

Default state: `'open'` (safe default - circuit starts disconnected)

### User Interaction Design

#### Toggle Mechanism (Goal.md Section 8, lines 226-232)

**Primary challenge**: Left-click is already used for drag-and-drop repositioning.

**Solution (as specified in goal.md)**:

1. **Short click detection**:
   - Track time between `pointerdown` and `pointerup` events
   - Threshold: **200ms** (below this = click, above = drag initiation)
   - Track movement distance: **5px** max (below this = click, above = drag)

2. **Interaction logic**:
   ```
   On pointerdown:
     - Record timestamp and position
     - Do NOT initiate drag immediately
   
   On pointermove (before threshold timeout):
     - If distance > 5px: Cancel click, initiate drag
   
   On pointerup (before threshold timeout):
     - If time < 200ms AND distance < 5px:
       - Toggle switch state
       - Prevent drag
     - Else:
       - Complete drag operation (if started)
   ```

3. **Visual feedback during interaction**:
   - On `pointerdown`: Subtle scale (0.98x) to indicate interactivity
   - On state change: Brief highlight animation (200ms color pulse)
   - No change to drag visual feedback (ghost preview, etc.)

#### Alternative Interaction (Optional Enhancement)

Goal.md mentions "dedicated toggle hotspot" as optional future enhancement (line 232). This could be:
- Small circular "button" overlaid on switch body
- Click on button = always toggle (never drag)
- Click on switch body = drag behavior

**Recommendation**: Implement short-click first, defer dedicated hotspot to future iteration.

### Visual Representation

#### Switch Visual Design (PixiJS Renderer Integration)

Add new case to `renderComponent()` in `src/ui/pixi-renderer.ts`:

**SPST Toggle Switch Visual**:

```
Open state:        Closed state:
┌─────────┐       ┌─────────┐
│  ⚫───○  │       │  ○───⚫  │
└─┬─────┬─┘       └─┬─────┬─┘
  │     │           │     │
  T1    T2          T1    T2
```

**Dimensions**:
- Body: 40px × 20px rounded rectangle
- Toggle circle: 8px diameter
- Terminals: 2px × 10px leads extending from body
- Terminal spacing: 30px (consistent with other 2-terminal components)

**Colors**:
- Body: `#404040` (dark gray)
- Toggle circle: `#FFAA00` (orange) when open, `#00FF00` (green) when closed
- Border: `#606060` (medium gray), 2px stroke
- Terminals: `#888888` (light gray metallic)

**State indicator**:
- Open: Toggle circle on left, gap visible in center
- Closed: Toggle circle on right, connection bar visible

#### Hover/Selection Effects

- Hover: Body lightens to `#505050`, cursor changes to pointer
- Selected: Blue drop-shadow filter (consistent with other components)
- During toggle animation: Brief glow effect (200ms duration)

### Component Library Integration

#### Library Entry (`src/library/other-components.ts`)

Add new switch entry to the library:

```typescript
export const SWITCH_SPST: ComponentLibraryEntry = {
  id: 'switch-spst',
  name: 'SPST Toggle Switch',
  type: ComponentType.SWITCH, // New enum value
  category: ComponentCategory.INTERCONNECT,
  description: 'Single-pole single-throw toggle switch for manual circuit control',
  
  // Physical specifications
  package: {
    type: 'THROUGH_HOLE',
    pinCount: 2,
    leadSpacing: { value: 5.08, unit: 'mm' }, // 0.2" standard
  },
  
  // Electrical specifications
  electrical: {
    // Contact resistance when closed
    resistance: { value: 0.01, unit: 'Ω' },
    
    // Voltage rating
    voltageRating: { value: 250, unit: 'V' }, // AC rated
    
    // Current rating
    currentRating: { value: 3, unit: 'A' },
    
    // Operating force (educational info)
    custom: {
      operatingForce: '150g',
      lifeCycles: '10,000',
      contactMaterial: 'Silver',
    }
  },
  
  // Manufacturer metadata
  manufacturer: {
    name: 'Generic',
    partFamily: 'Toggle Switch',
  },
  
  // Rendering
  renderer: 'procedural', // Procedurally drawn in PixiJS
  
  // Educational metadata
  typicalUses: [
    'Manual circuit control',
    'Power on/off switching',
    'Input device for digital circuits',
    'Series/parallel switch configurations',
  ],
};
```

#### Component Type Extension

Add `SWITCH` to `ComponentType` enum in `src/core/types.ts`:

```typescript
export enum ComponentType {
  WIRE = 'WIRE',
  RESISTOR = 'RESISTOR',
  LED = 'LED',
  POWER_SUPPLY = 'POWER_SUPPLY',
  GROUND = 'GROUND',
  MICROPROCESSOR = 'MICROPROCESSOR',
  SWITCH = 'SWITCH', // NEW
}
```

### Circuit Simulation Integration

#### MNA Solver Integration (`src/core/circuit-simulator.ts`)

Switches behave as **variable resistors** - resistance changes based on state.

**Modification to `buildMatrices()` method**:

```typescript
// In resistive component handling section
if (edge.component.type === ComponentType.SWITCH) {
  // Use state-dependent resistance
  const switchState = edge.component.switchState ?? 'open';
  const resistance = switchState === 'closed' 
    ? 0.01  // Wire-like when closed
    : 1e9;  // Near-infinite when open
  
  const conductance = 1 / resistance;
  
  // Standard resistor stamp with variable resistance
  if (n1Index !== undefined && n2Index !== undefined) {
    G[n1Index][n1Index] += conductance;
    G[n1Index][n2Index] -= conductance;
    G[n2Index][n1Index] -= conductance;
    G[n2Index][n2Index] += conductance;
  }
  // ... handle ground connections as usual
}
```

**Key insight**: No new solver logic required - switches are just resistors with user-controlled resistance values.

#### State Change Propagation

When switch state changes:

1. User clicks switch → `toggleSwitchState()` method in `BreadboardApp`
2. Update component's `switchState` field in state
3. Circuit re-extraction (if topology unchanged, reuse existing extraction)
4. Circuit re-simulation with new resistance value
5. Voltage overlays update
6. Current animation updates
7. LED brightness updates (if switch controls LED circuit)

**Implementation**:

```typescript
private toggleSwitchState(componentId: string): void {
  const component = this.state.components.find(c => c.id === componentId);
  if (!component || component.type !== ComponentType.SWITCH) {
    return;
  }
  
  // Toggle state
  const newState = component.switchState === 'closed' ? 'open' : 'closed';
  component.switchState = newState;
  
  // Visual feedback animation
  this.animateSwitchToggle(componentId);
  
  // Re-simulate circuit (topology unchanged, only resistance values changed)
  this.extractAndSimulate();
  
  // Re-render
  this.render();
}

private animateSwitchToggle(componentId: string): void {
  // Brief highlight animation on switch body
  // Implementation: temporary Graphics overlay, 200ms duration, fade out
}
```

### Serialization/Deserialization

#### Circuit JSON Format

Switch state must be persisted in saved circuits:

```json
{
  "components": [
    {
      "id": "switch-1",
      "type": "SWITCH",
      "libraryId": "switch-spst",
      "positions": [
        {"row": 10, "col": 5},
        {"row": 10, "col": 6}
      ],
      "rotation": 0,
      "switchState": "closed"  // NEW FIELD
    }
  ]
}
```

**Backward compatibility**: If `switchState` field is missing on load, default to `'open'`.

### Testing Requirements

#### Unit Tests (`src/core/__tests__/switch-component.test.ts`)

Create new test file with:

1. **Component creation**:
   - Test: Create switch with default state (open)
   - Test: Create switch with explicit closed state

2. **Library integration**:
   - Test: Switch entry exists in component library
   - Test: Library entry has correct specifications
   - Test: `findSwitch()` utility function returns SPST switch

3. **State management**:
   - Test: Toggle switch from open to closed
   - Test: Toggle switch from closed to open
   - Test: State persists across circuit re-extraction

4. **Serialization**:
   - Test: Serialize switch component with state
   - Test: Deserialize switch component with state
   - Test: Backward compatibility - missing switchState defaults to open

5. **Simulation integration**:
   - Test: Open switch produces ~0 A current
   - Test: Closed switch conducts current
   - Test: Toggling switch updates circuit voltages
   - Test: Switch in series with LED (open = LED off, closed = LED on)
   - Test: Switch in parallel with resistor (voltage divider behavior)

**Target**: 15-20 unit tests covering all switch-specific logic

#### Integration Tests (`src/ui/__tests__/switch-interaction.test.ts`)

1. **Placement**:
   - Test: Place switch component on breadboard
   - Test: Switch renders with initial state

2. **Interaction**:
   - Test: Short click toggles switch state
   - Test: Long click initiates drag (does not toggle)
   - Test: Drag after click does not toggle
   - Test: Toggle updates visual appearance

3. **Property editor**:
   - Test: Property editor shows switch state
   - Test: Can change state via property editor (optional)

4. **Save/load**:
   - Test: Save circuit with switches preserves state
   - Test: Load circuit with switches restores state

**Target**: 8-10 integration tests

#### Visual Regression Tests (`tests/visual/switch-circuit.spec.ts`)

Create new example circuit: "Switch Control LED"

Circuit design:
- Power supply (5V)
- Switch (SPST)
- Resistor (220Ω)
- LED (yellow)
- Ground

Two screenshots:
1. Switch open (LED off, no current flow)
2. Switch closed (LED on, current flowing)

### Example Circuits

#### Create New Example: "Switch Control LED" (`src/examples/switch-led.json`)

Demonstrates:
- Switch behavior (open/closed states)
- Series circuit control
- Interactive manual switching
- LED on/off control

Circuit topology:
```
[5V Power] → [Switch] → [220Ω Resistor] → [LED] → [Ground]
```

Component placement:
- Power supply on left rail (column 1)
- Switch at row 15, columns 4-5
- Resistor at row 15, columns 7-9
- LED at row 15, columns 11-12
- Ground on right rail (column 13)
- Wires connecting components

Initial state: Switch **closed** (LED on) to demonstrate working circuit immediately

#### Update Existing Examples

No changes required to existing examples (backward compatible)

### Documentation Updates

#### README.md

Add to "Components" section:

```markdown
### Switch Component

- **SPST Toggle Switch**: Manual on/off control with stateful behavior
  - Click switch to toggle between open (off) and closed (on) states
  - Open state: Infinite resistance, circuit disconnected
  - Closed state: Near-zero resistance, equivalent to wire
  - Visual indicator: Toggle position shows current state
  - Use for: Manual circuit control, exploring series/parallel configurations
```

Add to "Keyboard Shortcuts":
- No new keyboard shortcuts (switches use existing selection/delete shortcuts)

#### Component Library Documentation (`COMPONENT_LIBRARY.md`)

Add switch section:

```markdown
#### Switches (1 entry)

- **SPST Toggle Switch** (`switch-spst`):
  - Contact resistance: 0.01Ω (closed), 1GΩ (open)
  - Voltage rating: 250V AC
  - Current rating: 3A
  - Package: Through-hole, 2-pin, 5.08mm spacing
  - Operating force: 150g
  - Lifecycle: 10,000 operations
  - Contact material: Silver
```

### Implementation Phases

#### Phase 1: Core Switch Model (Priority: Critical)

1. Add `SWITCH` to `ComponentType` enum
2. Add `switchState` field to `Component` interface
3. Create switch library entry in `src/library/other-components.ts`
4. Register switch in component library
5. Update circuit serializer to handle `switchState` field

**Deliverable**: Switch components can be created, placed, and serialized

**Estimated effort**: 2-3 hours

#### Phase 2: Electrical Simulation (Priority: Critical)

1. Modify MNA solver to handle switch resistance
2. Implement state-dependent resistance logic
3. Test open/closed circuit behavior
4. Verify current blocking in open state
5. Verify current flow in closed state

**Deliverable**: Switches correctly affect circuit simulation

**Estimated effort**: 2-3 hours

#### Phase 3: Visual Rendering (Priority: High)

1. Add `renderSwitch()` method to PixiJS renderer
2. Implement toggle switch visual (open/closed states)
3. Add state-specific color indicators
4. Integrate with component rendering pipeline
5. Add hover/selection effects

**Deliverable**: Switches render visually on breadboard

**Estimated effort**: 3-4 hours

#### Phase 4: User Interaction (Priority: High)

1. Implement short-click detection logic
2. Add `toggleSwitchState()` method to BreadboardApp
3. Integrate click/drag disambiguation
4. Add toggle animation (200ms highlight)
5. Trigger circuit re-simulation on state change
6. Update voltage/current visualizations

**Deliverable**: Users can toggle switches via UI

**Estimated effort**: 4-5 hours

#### Phase 5: Testing (Priority: Critical)

1. Write unit tests for switch model
2. Write integration tests for interaction
3. Write simulation tests for electrical behavior
4. Create "Switch Control LED" example circuit
5. Add visual regression test
6. Manual exploratory testing

**Deliverable**: Comprehensive test coverage

**Estimated effort**: 4-5 hours

#### Phase 6: Documentation (Priority: Medium)

1. Update README.md
2. Update COMPONENT_LIBRARY.md
3. Add switch usage examples
4. Document interaction model

**Deliverable**: Complete user documentation

**Estimated effort**: 1-2 hours

### Total Estimated Effort

**Total: 16-22 hours** (approximately 2-3 days of focused development)

### Acceptance Criteria

The switch component implementation is complete when:

1. ✅ Switch component type exists in library with correct specifications
2. ✅ Switches can be placed on breadboard (2-terminal, standard placement)
3. ✅ Switches render visually with clear open/closed state indication
4. ✅ Short click toggles switch state (click-and-drag still works for repositioning)
5. ✅ Open switch blocks current flow (~0 A)
6. ✅ Closed switch conducts current (like wire)
7. ✅ Voltage overlays update when switch state changes
8. ✅ Current animation updates when switch state changes
9. ✅ LED brightness changes when switch controls LED circuit
10. ✅ Switch state persists in saved circuits
11. ✅ Switch state correctly deserializes when loading circuits
12. ✅ "Switch Control LED" example circuit demonstrates switch behavior
13. ✅ At least 20 unit/integration tests pass (switch-specific)
14. ✅ Visual regression test passes for switch circuit
15. ✅ Documentation updated (README, COMPONENT_LIBRARY.md)

### Dependencies

**Requires**:
- Existing component placement system (already implemented)
- Existing MNA solver (already implemented)
- Existing PixiJS renderer (already implemented)
- Existing circuit serialization (already implemented)

**Blocks**:
- Goal.md Section 12.2 completion (quick select bar with all 5 default items)
- Educational scenarios requiring manual circuit control
- Advanced switch types (SPDT, DPDT, push-button, momentary)

### Risk Assessment

**Low risk**:
- Switch model is simple (just variable resistor)
- No new solver algorithms required
- PixiJS rendering pattern established
- Testing infrastructure already exists
- No architectural changes required

**Potential challenges**:
1. Click/drag disambiguation - need precise threshold tuning
2. Visual design clarity - toggle state must be immediately obvious
3. Touch device compatibility - short click detection on mobile

**Mitigation**:
1. Use conservative thresholds (200ms, 5px) - can tune based on user feedback
2. Clear color coding (orange=open, green=closed) + position indicator
3. Test on touch devices, adjust thresholds if needed

### Future Enhancements (Out of Scope for This Task)

The following are explicitly **deferred** to future iterations:

- **SPDT switches** (three-terminal, select between two circuits)
- **DPDT switches** (double-pole double-throw, 6 terminals)
- **Push-button switches** (momentary vs latching behavior)
- **Dedicated toggle hotspot** (separate click target from drag handle)
- **Keyboard toggle shortcut** (e.g., 'T' key when switch selected)
- **Property editor state control** (change state via text input)
- **Switch animation** (smooth toggle movement, not just instant state change)
- **Realistic switch models** (contact bounce, arc suppression, wear modeling)

### References

**Goal.md citations**:
- Section 8 (lines 220-235): Switches and User Interaction
- Section 12.2 (lines 337-344): Default Quick Select Items
- Section 3.1 (lines 43-49): Nodes (switches listed as meaningful entities)

**Related PRs**:
- PR #143: Component library foundation
- PR #149: Component library browser UI
- PR #89: Component selection
- PR #101: Component drag-and-drop
- PR #167: PixiJS rendering

**Technical references**:
- Modified Nodal Analysis: Switch as variable resistor
- PixiJS Graphics API: Procedural shape rendering
- IEC 60617: Electrical symbol standards (toggle switch symbol)

---

## Implementation Notes for Developer

This task is **well-scoped and self-contained**. The switch component follows established patterns in the codebase:

1. **Data model**: Same pattern as LED, resistor (2-terminal component with state)
2. **Library entry**: Same format as existing 36 components
3. **Rendering**: Add case to existing `renderComponent()` method
4. **Simulation**: Extend existing resistor handling in MNA solver
5. **Interaction**: Enhance existing click handler with threshold detection
6. **Testing**: Follow existing test patterns (unit, integration, visual)

**Start here**:
1. Add `SWITCH` to `ComponentType` enum in `src/core/types.ts`
2. Create library entry in `src/library/other-components.ts`
3. Add rendering case in `src/ui/pixi-renderer.ts`
4. Modify MNA solver in `src/core/circuit-simulator.ts`
5. Add toggle handler in `src/ui/breadboard-app.ts`

**Test as you go**:
- After each phase, run `npm test` to verify no regressions
- After Phase 4, manually test switch toggling in browser
- After Phase 5, verify all new tests pass

**Expected outcome**:
A fully functional, well-tested, documented switch component that enables interactive circuit control and satisfies goal.md requirements.
