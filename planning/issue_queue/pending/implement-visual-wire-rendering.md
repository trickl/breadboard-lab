Implement visual wire rendering on breadboard

## Context

Breadboard Lab currently places wire components that are tracked internally and participate in circuit simulation, but these wires are completely invisible to the user. The planning document specifies wire rendering as a core UI requirement (planning/vision/goal.md, lines 255-278), and it is a prerequisite for implementing current animation overlays.

## Gap Analysis

**Long-term goal**: Interactive breadboard with visible wires showing connections between holes, with visual feedback during wire creation and the ability to animate current flow along wire paths (planning/vision/goal.md, lines 792-815).

**Current state**: Wires are functional in the circuit model and simulation, but have no visual representation on the breadboard. Users can only identify wires by seeing "occupied" markers on the holes they connect (planning/state/system_capabilities.md, lines 88-97).

**Gap**: The absence of visible wires makes the breadboard confusing and unusable for educational purposes. Students cannot see which holes are connected, making it impossible to learn circuit topology visually.

## Proposed Development Task

**Implement visual wire path rendering on the breadboard canvas**

### Scope

Create a wire rendering system that:
1. Renders visible paths between wire start and end positions
2. Uses SVG or Canvas to draw wire lines over the breadboard
3. Implements basic straight-line rendering (MVP)
4. Provides visual distinction from other components
5. Updates automatically when wires are added or removed
6. Stores path information for future current animation

### Technical Approach

**Rendering Strategy:**
- Add a wire rendering layer above the breadboard grid but below component graphics
- Use SVG path elements for each wire (scalable, crisp at any zoom level)
- Calculate wire paths from Position data in Wire components
- Use distinct colors for wires (red/black for power/ground, colored for signals)

**Path Calculation:**
- MVP: Straight line from center of start hole to center of end hole
- Convert row/col positions to pixel coordinates
- Optional enhancement: Orthogonal (Manhattan) routing for cleaner look

**Wire Styling:**
- Line width: 2-3px for visibility
- Default color: #333333 (dark gray)
- Optional: Color coding (red for power rails, black for ground, colors for signals)
- Slight transparency (0.9 opacity) to see overlaps

**Data Flow:**
```
Wire Component in State
    ↓
Extract wire positions (row, col)
    ↓
Convert to pixel coordinates
    ↓
Create SVG path element
    ↓
Append to wire rendering layer
```

### Success Criteria

- [ ] All placed wires are visible as lines connecting their endpoints
- [ ] Wire paths render immediately after wire placement
- [ ] Wires render below components but above the breadboard grid
- [ ] Wire endpoints align precisely with hole centers
- [ ] Multiple wires can be distinguished when overlapping
- [ ] Wire rendering updates when board is cleared
- [ ] No performance degradation with 20+ wires on board

### Educational Impact

This feature transforms the breadboard from an abstract placement grid into a realistic circuit-building interface. Students can:
- See electrical connections visually
- Understand circuit topology at a glance
- Identify connection mistakes easily
- Build confidence through immediate visual feedback

### Alignment with Roadmap

This task is essential for MVP completion (planning/vision/goal.md, lines 1041-1069):
- 🎯 Wire rendering enables understanding of breadboard circuits
- Prerequisite for "Current animation overlay" (next major feature)
- Required for educational "Explain" panel (shows which components are connected)
- Foundation for wire interaction features (selection, editing, deletion)

### Implementation Details

**Phase 1: Basic Rendering (Day 1-2)**
1. Add SVG overlay layer to BreadboardApp
2. Implement position-to-pixel coordinate conversion
3. Render straight-line paths for all Wire components
4. Add basic styling (color, width, opacity)

**Phase 2: Visual Polish (Day 3)**
1. Implement color coding system (optional)
2. Add wire endpoints visual markers (small circles)
3. Test with various circuit configurations
4. Optimize rendering performance

**Phase 3: Foundation for Animation (Day 4)**
1. Store wire path data in a format suitable for animation
2. Add path length calculation (for particle speed)
3. Document path data structure for future current animation
4. Add unit tests for coordinate conversion

### Estimated Effort

3-4 days of focused development
- Day 1-2: Core wire rendering implementation
- Day 3: Visual polish and styling
- Day 4: Testing and animation groundwork

### Dependencies

None - all required data already exists in component state

### Risks & Mitigations

**Risk**: Wire rendering performance with 50+ wires
- **Mitigation**: Use SVG for scalability; profile and optimize if needed; consider canvas if SVG is too slow

**Risk**: Overlapping wires become indistinguishable
- **Mitigation**: Use transparency and small offset for stacked wires; add hover highlighting

**Risk**: Wire paths obscure hole clickability
- **Mitigation**: Render wires in separate layer with pointer-events: none (holes remain clickable)

### Testing Strategy

**Visual Tests:**
- Place multiple wires in different orientations
- Test wire rendering with circuit clear/rebuild
- Verify wire visibility with various component configurations

**Unit Tests:**
- Position-to-coordinate conversion accuracy
- Path calculation correctness
- Edge cases (same hole wired twice, diagonal wires)

**Integration Tests:**
- Wires render correctly after component placement
- Wires clear correctly when "Clear All" is clicked
- Wires do not interfere with hole click events

## Why This Task Now

This is the most important gap because:

1. **Critical usability issue**: Invisible wires make the breadboard nearly unusable for its intended educational purpose
2. **Prerequisite for key features**: Current animation and wire interaction require visible wires
3. **MVP requirement**: Listed as "Wiring (hole-to-hole connections)" in the MVP checklist
4. **Educational foundation**: Visual wire paths are essential for teaching circuit topology
5. **High impact, manageable scope**: Clear requirements, well-defined implementation, significant user value
6. **Blocks other improvements**: Wire selection, wire deletion, and current animation all require visible wires

## Next Steps After This Task

Once wire rendering works:
1. Implement current animation along wire paths (planning/vision/goal.md, lines 792-815)
2. Add wire selection and editing capabilities (planning/vision/goal.md, lines 267-278)
3. Implement error detection overlays (planning/vision/goal.md, lines 831-844)
4. Add visual component graphics (resistor symbols, LED graphics)
5. Create "Explain" panel showing circuit connections and values (planning/vision/goal.md, lines 846-881)
