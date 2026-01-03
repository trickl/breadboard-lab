Implement breadboard power rails with proper connectivity

## Context

Breadboard Lab currently models a 30-row × 10-column breadboard with left-side and right-side terminal strips separated by a center gap. However, real breadboards have **power rails** (also called bus strips) running vertically along both edges. These rails provide convenient power distribution and are fundamental to how breadboards work in the physical world.

The current implementation explicitly states: "No power rails: The current implementation does not model power rails" (planning/state/system_capabilities.md, line 45). Users must place power supplies and grounds directly into terminal strips, which does not match real breadboard workflows and limits educational fidelity.

## Gap Analysis

**Long-term goal** (planning/vision/goal.md, lines 202-225):

The data model explicitly defines power rails as first-class elements in the breadboard topology:

```typescript
interface BreadboardTopology {
  rows: number;
  columns: number;
  strips: Strip[];
  rails: Rail[];  // ← Rails are part of the core model
}

interface Rail {
  id: string;
  type: 'positive' | 'negative';
  side: 'top' | 'bottom';
  holes: Position[];
}
```

The planning document specifies:
- Rails are distinct from terminal strips
- Rails have explicit type (positive/negative) and placement (top/bottom)
- Rails consist of multiple hole positions with internal connectivity
- Rails enable proper power distribution patterns

**Current state** (planning/state/system_capabilities.md, lines 38-55):

The breadboard model has:
- ✅ 30 rows × 10 columns grid
- ✅ Terminal strip connectivity (columns 0-4 left, 5-9 right)
- ✅ Center gap isolation
- ❌ **No power rails at all**

The `BreadboardLayout` class (src/core/breadboard-layout.ts) only models terminal strips. There is no concept of rails in the current implementation.

**Gap**: The most fundamental physical feature of real breadboards — power rails for distribution — is completely missing. This limits educational realism and forces awkward workarounds.

## Proposed Development Task

**Implement power rails in breadboard topology with full connectivity modeling**

### Scope

Extend the breadboard model to include power rails:

1. **Data model updates**:
   - Add `Rail` interface to types (id, type, side, holes)
   - Extend `BreadboardTopology` to include rails array
   - Define standard rail geometry (2 rails per side: +/-, 4 total)

2. **Connectivity logic**:
   - Update `BreadboardLayout` to model rail connectivity
   - Rails run vertically (all holes in a rail are connected)
   - Rails are independent of terminal strips
   - Rails have no center gap (optional: some breadboards have rail gaps at midpoint)

3. **Circuit extraction**:
   - Update `CircuitExtractor` to recognize rail connections
   - Rail holes connect to the same electrical net
   - Components can bridge rails to terminal strips
   - Ground components should naturally connect to negative rail

4. **Visual rendering**:
   - Add rail holes to breadboard grid (4 columns total: 2 left, 2 right)
   - Visual distinction for rails (color coding: red for +, blue/black for -)
   - Labels: `+` and `-` markers on rail strips
   - Update grid dimensions to accommodate rails

5. **Component placement**:
   - Allow component pins to snap to rail holes
   - Power supply components should logically connect to rails
   - Ground components should connect to negative rails
   - Update placement validation to allow rail positions

6. **Example updates**:
   - Update canonical examples to use power rails
   - Demonstrate proper rail-based power distribution
   - Show rail-to-strip wiring patterns

### Technical Approach

**Phase 1: Data model and types**
- Define `Rail` interface in `src/core/types.ts`
- Add `rails` property to `BreadboardTopology`
- Define standard rail configuration (2 per side, covering all 30 rows)

**Phase 2: Core connectivity logic**
- Extend `BreadboardLayout` class to include rail positions
- Add method `isPositionInRail(position: Position): boolean`
- Add method `getRailForPosition(position: Position): Rail | null`
- Update `getConnectedPositions()` to include rail connectivity
- Update `arePositionsConnected()` to check rail membership

**Phase 3: Circuit extraction**
- Update `CircuitExtractor` to include rail positions in union-find
- Ensure rail holes connect to same net during initialization
- Test extraction with components spanning rails and strips

**Phase 4: Visual rendering**
- Extend grid from 10 columns to 14 columns (2 rail columns per side)
  - Columns 0-1: Left rails (-, +)
  - Columns 2-6: Left terminal strips (was 0-4)
  - Columns 7-11: Right terminal strips (was 5-9)
  - Columns 12-13: Right rails (+, -)
- Render rail holes with distinct styling (background colors)
- Add `+` and `-` text labels to rail columns
- Update coordinate mapping for new column layout

**Phase 5: Interaction updates**
- Update component placement to recognize rail columns
- Update drag-and-drop to snap to rail positions
- Update hover effects to highlight entire rail
- Update voltage overlay to work with rail nets

**Phase 6: Testing and examples**
- Write unit tests for rail connectivity logic
- Test circuit extraction with rail-connected components
- Update visual regression baselines with new grid
- Convert example circuits to use rail-based power distribution

### Success Criteria

- [ ] `BreadboardLayout` models 4 power rails (2 per side)
- [ ] Rails have internal vertical connectivity (all holes in a rail connected)
- [ ] Circuit extraction correctly identifies rail nets
- [ ] Visual breadboard shows 14 columns with distinct rail styling
- [ ] Rails display color coding (red for +, blue/black for -)
- [ ] Components can be placed on rail positions
- [ ] Voltage overlay works correctly on rail holes
- [ ] Power supply connected to rail distributes voltage to entire rail
- [ ] Example circuits demonstrate rail usage
- [ ] All existing tests pass (with updates for new column layout)
- [ ] Visual regression tests updated with new baselines

### Educational Impact

Power rails are **essential** for teaching realistic breadboard usage:

1. **Physical realism**: Matches how real breadboards work, reducing transfer gap to hardware
2. **Power distribution concepts**: Students learn proper power and ground distribution
3. **Circuit organization**: Encourages clean layouts with centralized power
4. **Practical skill**: Students can translate virtual circuits directly to physical breadboards
5. **Industry standard**: All commercial breadboards have power rails

Without rails, students learn artificial patterns that don't work in the real world.

### Alignment with Vision

This task implements a **required** foundational capability from the planning document:

- `goal.md` lines 202-225: `BreadboardTopology` data model explicitly includes `rails: Rail[]`
- `goal.md` lines 216-219: Rails defined with type, side, and hole positions
- `goal.md` lines 87-95: Breadboard geometry must "reflect real physical structure"

The Rails interface is not an optional enhancement — it's in the core type definitions of the target system.

### Priority Justification

This is the most important next task because:

1. **Foundational infrastructure**: Rails affect every layer (data model, connectivity, extraction, rendering, interaction)

2. **Blocks realistic usage**: Without rails, circuits don't resemble real breadboard layouts

3. **Required by spec**: The planning document defines rails as part of `BreadboardTopology`, not as a future enhancement

4. **Precedent for other features**: Many advanced features (realistic component library, better examples, educational content) depend on realistic breadboard structure

5. **Educational integrity**: Teaching students breadboard skills without power rails is like teaching piano without a sustain pedal — technically possible but fundamentally incomplete

6. **Migration path**: Adding rails now (before WebGL, SPICE, schematic view) avoids costly refactoring later

7. **Low risk, high impact**: Rails are a well-understood concept; implementation is straightforward; benefits are immediate

### Estimated Effort

3-4 days of focused development:
- **Day 1**: Data model updates, types, and `BreadboardLayout` connectivity logic with unit tests
- **Day 2**: Circuit extraction integration, component placement updates, testing
- **Day 3**: Visual rendering with 14-column grid, rail styling, color coding
- **Day 4**: Example updates, visual regression baseline refresh, documentation

### Dependencies

No blockers — all required infrastructure exists:
- ✅ BreadboardLayout architecture supports extension
- ✅ Circuit extraction uses union-find (naturally handles rails)
- ✅ Visual rendering supports adding columns
- ✅ Component placement logic is modular
- ✅ Test infrastructure in place

### Risks and Mitigations

**Risk**: Breaking existing tests due to column renumbering (0-9 → 2-6 and 7-11)
- *Mitigation*: Update tests systematically; maintain backward compatibility initially with coordinate mapping

**Risk**: Visual regression tests fail due to layout changes
- *Mitigation*: Expected — regenerate baselines after visual review; this is intentional improvement

**Risk**: Example circuits need to be rewritten
- *Mitigation*: Examples are JSON files; coordinate updates are straightforward; opportunity to improve realism

**Risk**: Performance impact from 40% more holes (300 → 420 holes)
- *Mitigation*: Union-find scales well; circuit extraction is O(n log n); 420 holes is still trivial

**Risk**: User confusion if rails are added mid-project
- *Mitigation*: Clear visual distinction; documentation update; educational examples showing rail usage

### Non-Goals

This task specifically does **NOT** include:
- Rail gap at midpoint (some breadboards split rails vertically; defer to future)
- Configurable rail lengths (assume full-length rails for simplicity)
- Multiple rail voltages (keep simple: one + rail, one - rail per side)
- Rail-specific components (just allow any component to connect to rails)
- Advanced rail routing or bridging (manual wiring between rails if needed)

These can be added incrementally after basic rails work.

## Implementation Plan

### Step 1: Extend Type Definitions

Update `src/core/types.ts`:

```typescript
export interface Rail {
  id: string;
  type: 'positive' | 'negative';
  side: 'left' | 'right';
  holes: Position[];
}

export interface BreadboardTopology {
  rows: number;
  columns: number;
  strips: Strip[];
  rails: Rail[];
}
```

### Step 2: Update BreadboardLayout

Extend `src/core/breadboard-layout.ts`:

```typescript
export class BreadboardLayout {
  readonly rows = 30;
  readonly columns = 14; // Was 10; now includes 4 rail columns
  
  // Rail column indices
  readonly railColumns = {
    leftNegative: 0,
    leftPositive: 1,
    rightPositive: 12,
    rightNegative: 13,
  };
  
  // Terminal strip column ranges (adjusted for rails)
  readonly stripColumns = {
    leftStart: 2,
    leftEnd: 6,
    rightStart: 7,
    rightEnd: 11,
  };
  
  getRailForPosition(pos: Position): Rail | null {
    // Return rail if position is in rail column
  }
  
  isPositionInRail(pos: Position): boolean {
    // Check if column is a rail column
  }
  
  getConnectedPositions(pos: Position): Position[] {
    // Include rail connectivity
    // If in rail, return all positions in that rail
    // If in strip, return strip positions (existing logic)
  }
}
```

### Step 3: Update Circuit Extractor

Modify `src/core/circuit-extractor.ts`:

```typescript
// In initialization phase
// Connect all positions in each rail
for (const rail of layout.rails) {
  for (let i = 1; i < rail.holes.length; i++) {
    uf.union(rail.holes[0], rail.holes[i]);
  }
}
```

### Step 4: Update Visual Rendering

Modify `src/ui/breadboard-app.ts`:

```typescript
private renderBreadboard() {
  // Adjust grid to 14 columns
  // Columns 0-1: Left rails (styled differently)
  // Columns 2-6: Left terminal strips
  // Columns 7-11: Right terminal strips  
  // Columns 12-13: Right rails
  
  // Add rail styling classes
  // Add +/- labels to rail columns
}
```

Update `src/style.css`:

```css
.rail-positive {
  background-color: rgba(255, 0, 0, 0.1); /* Light red */
}

.rail-negative {
  background-color: rgba(0, 0, 255, 0.1); /* Light blue */
}
```

### Step 5: Update Tests

Update all position-based tests to use new column ranges (2-6 and 7-11 instead of 0-4 and 5-9).

Add new tests for rail connectivity:

```typescript
describe('BreadboardLayout with rails', () => {
  test('all holes in a rail are connected', () => {
    // Test vertical connectivity in rail column
  });
  
  test('rail positions are distinct from terminal strips', () => {
    // Test that rail column 0 is not connected to strip column 2
  });
});
```

### Step 6: Update Examples

Modify example JSON files to:
- Use rail positions for power supply and ground
- Adjust component positions for new column indices
- Demonstrate power distribution via rails

Example structure:
```json
{
  "components": [
    {
      "type": "POWER_SUPPLY",
      "position1": { "row": 5, "column": 1 },  // Left positive rail
      "position2": { "row": 5, "column": 2 }   // Left terminal strip
    },
    {
      "type": "GROUND",
      "position1": { "row": 10, "column": 0 }, // Left negative rail
      "position2": { "row": 10, "column": 0 }  // Single-position component
    }
  ]
}
```

### Step 7: Visual Regression Baselines

```bash
npm run test:visual:update
```

Review new screenshots showing 14-column layout with colored rails.

### Step 8: Documentation

Update:
- `README.md`: Mention power rails in features
- `ARCHITECTURE.md`: Document rail connectivity model
- `planning/state/system_capabilities.md`: Update to reflect rail implementation

## Success Metrics

After implementation:
1. ✅ Breadboard displays 14 columns (4 rails + 10 terminal strip columns)
2. ✅ Rails visually distinguished with color coding (red +, blue -)
3. ✅ All holes within a rail are electrically connected
4. ✅ Circuit extraction correctly handles rail connections
5. ✅ Power supply connected to rail distributes power to entire rail
6. ✅ Example circuits use rails for power distribution
7. ✅ Voltage overlay shows rail voltage propagation
8. ✅ All tests pass (unit + visual regression)

## References

- `planning/vision/goal.md` - Lines 202-225: `BreadboardTopology` and `Rail` interface definitions
- `planning/vision/goal.md` - Lines 87-95: "Breadboard geometry reflects real physical structure"
- `planning/state/system_capabilities.md` - Line 45: "No power rails: The current implementation does not model power rails"
- Real breadboard references: Standard breadboards (e.g., BB400) have 2 rail strips per side running full length

## Why This Task Now

This is the most important next development task because:

1. **Specified in core model**: Rails are in the type definitions of the target system, not listed as a future enhancement

2. **Foundation for realism**: Every educational feature (tutorials, examples, explanations) benefits from realistic breadboard structure

3. **User expectation**: Anyone with breadboard experience will immediately notice the absence of power rails

4. **Blocks authentic examples**: Current examples must work around the missing rails with awkward layouts

5. **Early is easier**: Adding rails now (before schematic view, WebGL renderer, SPICE integration) avoids refactoring those systems later

6. **Clear scope**: Well-defined problem with established patterns (real breadboards) and straightforward implementation

7. **High visibility**: Power rails are visually prominent; their addition immediately improves perceived realism

Without power rails, Breadboard Lab is teaching an artificial breadboard that doesn't exist in the real world. This undermines the educational mission and limits the tool's practical value.

## Next Steps After This Task

Once power rails are implemented:
1. Enhanced component library with rail-aware power components
2. Real-world resistor color code rendering (depends on realistic breadboard)
3. More sophisticated example circuits using proper power distribution
4. Educational content about power rail usage and best practices
5. Schematic view generation (benefits from explicit rail modeling)
