Migrate from PixiJS Bespoke Wiring System to Rete.js Visual Programming Graph Architecture

## Context and Rationale

The current system uses a **PixiJS/WebGL-based bespoke wiring system** for component placement, connection management, and interaction state. While PixiJS provides excellent rendering performance, it requires custom implementation of all connection logic, snapping, routing, and interaction constraints.

The target architecture specified in `planning/vision/goal.md` (lines 24-38) explicitly requires:

> "Replace the current **PixiJS/WebGL bespoke wiring system** with a **Rete.js–based visual programming graph**."

This is not an optional enhancement—it is the **foundational architectural shift** upon which the entire current iteration is built. The rationale provided in goal.md is clear:

> "The existing PixiJS implementation makes **connector management, snapping, routing, and interaction state** increasingly complex and fragile."
>
> "Rete.js provides:
> - Native **node–connector–edge abstractions**
> - Built-in **connection constraints**
> - Support for **re-routing**, **animated edges**, and **custom socket logic**
> - A clean conceptual mapping to **electrical networks**"

Without this architectural foundation, the following goal.md requirements **cannot be properly implemented**:

1. **Component placement model** (lines 108-116): Components must appear adjacent to the board, with individual leg connections to breadboard holes
2. **One-connector-per-hole constraint** (lines 51-57): Native Rete.js socket constraints enforce this automatically
3. **Wire re-routing** (lines 161-165): Rete's re-root pattern enables dragging segments to recalculate paths
4. **Fixed connector positions** (lines 127-130): Rete nodes have fixed socket positions relative to node body
5. **Connection validation** (lines 134-141): Rete's built-in connection rules provide visual rejection and feedback

The current system implements these features through custom PixiJS code, which goal.md explicitly identifies as "increasingly complex and fragile" and in need of replacement.

## Architectural Impact

This migration affects the **core interaction and connectivity layer** of the application. It requires:

### 1. Dependency Changes
- Add `rete` and `rete-react-plugin` (or appropriate rendering plugin) as production dependencies
- Decide on Rete rendering approach: use Rete's built-in React/Vue renderers, or create custom PixiJS-based node rendering while leveraging Rete's connection management
- Consider hybrid approach: Rete for connection logic + PixiJS for visual rendering

### 2. Data Model Refactoring
Current model (from `src/core/types.ts`):
```typescript
interface Component {
  id: string;
  type: ComponentType;
  position1: BreadboardPosition;
  position2?: BreadboardPosition;
  rotation: 0 | 90 | 180 | 270;
  // ...
}
```

Needs to become Rete-compatible:
```typescript
interface BreadboardNode extends Node {
  // Component body with fixed leg positions
  // OR breadboard hole with single exclusive socket
}

interface ComponentLeg {
  // Rete socket/connector
  // Fixed position relative to component body
}

interface BreadboardHole {
  // Rete node with single exclusive socket
  // Or Rete socket directly
}
```

### 3. Interaction Layer Restructuring

**Current PixiJS interaction** (from `src/ui/breadboard-app.ts`):
- Custom pointer event handlers
- Manual drag state management
- Custom snapping logic
- Manual connection validation

**Target Rete.js interaction**:
- Rete's built-in connection manager
- Native drag-and-drop with snap-to-socket
- Automatic connection validation via socket rules
- Built-in re-routing patterns

### 4. Rendering Strategy Decision

Three possible approaches:

**Option A: Full Rete Renderer**
- Use Rete's React/Vue rendering plugins
- Customize node appearance via templates
- PixiJS removed or relegated to background rendering only
- **Pros**: Native Rete features work out-of-box
- **Cons**: May lose PixiJS performance benefits; large visual refactor

**Option B: Hybrid Architecture**
- Rete for connection graph logic (nodes, sockets, edges)
- PixiJS for visual rendering (read Rete state, render components)
- **Pros**: Keep PixiJS performance; leverage Rete's connection management
- **Cons**: More complex integration; potential state synchronization issues

**Option C: Custom Rete Renderer with PixiJS**
- Implement Rete rendering plugin for PixiJS
- Rete manages graph, custom plugin renders to PixiJS canvas
- **Pros**: Best of both worlds; clean separation of concerns
- **Cons**: Most implementation work; requires Rete plugin development

**Recommendation**: Start with **Option B (Hybrid)** as it minimizes risk:
- Rete manages connection graph internally
- PixiJS continues to render visuals
- BreadboardApp coordinates between Rete state and PixiJS rendering
- Can migrate to Option A or C later if needed

## Implementation Scope

This is a **major architectural migration** that should be broken into phases:

### Phase 1: Proof of Concept (Minimal Viable Rete Integration)
**Goal**: Establish Rete.js integration without breaking existing functionality

**Tasks**:
1. Add Rete.js dependencies to `package.json`
2. Create `src/core/rete-manager.ts` to manage Rete editor instance
3. Implement bidirectional sync between Rete graph and existing component array:
   - On component placement: create Rete node + connections
   - On Rete connection change: update component array
4. Maintain existing PixiJS rendering (read from component array as before)
5. Add unit tests for Rete integration layer
6. Verify all existing functionality still works (378 tests must pass)

**Success Criteria**:
- Rete editor instance runs alongside PixiJS renderer
- Component placement creates Rete nodes
- Component connections create Rete edges
- Existing UI interactions work unchanged
- All tests pass
- No visual regression

### Phase 2: Rete-First Interaction Model
**Goal**: Shift primary interaction logic to Rete

**Tasks**:
1. Implement component legs as Rete sockets:
   - Component body = Rete node
   - Legs = fixed sockets at realistic positions
2. Implement breadboard holes as Rete connection targets:
   - Either as nodes with single socket
   - Or as Rete "pin" sockets directly
3. Implement one-hole-per-connector constraint via Rete socket rules
4. Replace custom drag-and-drop with Rete's connection manager
5. Implement wire re-routing using Rete's edge manipulation
6. Update tests to verify Rete-driven interactions

**Success Criteria**:
- Component placement works via Rete node creation
- Legs snap to holes using Rete socket constraints
- Cannot place multiple components on same hole (Rete validates)
- Wire re-routing works by dragging edge control points
- All tests pass with new interaction model

### Phase 3: Advanced Rete Features
**Goal**: Leverage Rete capabilities for goal.md requirements

**Tasks**:
1. Implement component placement model:
   - Component appears adjacent to board on selection
   - User drags body, then connects individual legs
2. Implement continuous rotation (update socket positions on rotate)
3. Enhance wire routing with Rete's path calculation
4. Add visual feedback for invalid connections (Rete integration)
5. Consider Rete mini-map for circuit overview

**Success Criteria**:
- Component placement follows goal.md interaction model
- Rotation is continuous (not 90° increments)
- Wires route intelligently around components
- All goal.md interaction requirements met

### Phase 4: Cleanup and Documentation
**Goal**: Remove technical debt and document architecture

**Tasks**:
1. Remove redundant custom connection logic from `breadboard-app.ts`
2. Archive deprecated PixiJS-specific interaction code
3. Update architecture documentation
4. Add Rete.js usage guide for contributors
5. Document Rete ↔ PixiJS coordination patterns
6. Add examples of extending system with new component types

## Technical Considerations

### Rete.js Version and Compatibility
- Current stable: Rete.js v2.x
- Consider v1.x vs v2.x tradeoffs (v2 is React 18+ compatible)
- Evaluate TypeScript support quality

### Performance Implications
- Rete.js adds overhead for connection management
- Should not significantly impact rendering (PixiJS continues to render)
- Test with large circuits (50+ components) to verify performance

### State Management Complexity
- Current: Single `BreadboardState` with component array
- With Rete: Two sources of truth (Rete editor + component array)
- Must establish clear ownership and sync patterns
- Consider making Rete graph the primary source of truth

### Testing Strategy
- Unit tests for Rete integration layer (`rete-manager.test.ts`)
- Integration tests for Rete ↔ component array sync
- Interaction tests for Rete-driven placement/connection
- Visual regression tests to ensure no rendering changes
- Performance tests for large circuits

### Backward Compatibility
- Existing saved circuits use position-based model
- Need migration path from positions to Rete graph
- Consider versioned circuit format
- Ensure old circuits can be loaded and auto-migrated

### Risk Mitigation
- Implement behind feature flag initially
- Maintain parallel code paths during transition
- Extensive testing at each phase before proceeding
- Have rollback plan if Rete proves unsuitable

## Dependencies

This migration blocks or impacts:

1. **Component placement model** (goal.md lines 108-116): Requires Rete nodes
2. **Leg-to-hole connection model** (goal.md lines 51-57): Requires Rete sockets
3. **Wire re-routing** (goal.md lines 161-165): Requires Rete edge manipulation
4. **Connection constraints** (goal.md lines 134-141): Requires Rete validation
5. **Continuous rotation** (goal.md lines 193-202): Requires updating Rete socket positions

Many other goal.md features can be implemented in parallel, but the interaction model features depend on this architectural foundation.

## Definition of Done

- [ ] Rete.js dependency added and configured
- [ ] Rete editor instance integrated into BreadboardApp
- [ ] Components represented as Rete nodes with leg sockets
- [ ] Breadboard holes represented as Rete connection targets
- [ ] One-hole-per-connector constraint enforced via Rete
- [ ] Component placement creates Rete nodes
- [ ] Wire connections create Rete edges
- [ ] Wire re-routing implemented via Rete edge manipulation
- [ ] PixiJS rendering reads from Rete graph state
- [ ] All existing functionality preserved (378 tests pass)
- [ ] No visual regressions
- [ ] Architecture documentation updated
- [ ] Rete.js usage guide added for contributors

## Estimated Complexity

**Very High** - This is a foundational architectural change that touches:
- Core data model (`types.ts`)
- Interaction layer (`breadboard-app.ts` - 2400+ lines)
- Circuit extraction (must read from Rete graph)
- Rendering coordination (Rete → PixiJS)
- Testing strategy (new interaction patterns)

**Estimated Effort**: 3-5 weeks for experienced developer familiar with both PixiJS and Rete.js

**Risk Level**: High - architectural migrations always carry risk of:
- Unexpected Rete.js limitations
- Performance degradation
- State synchronization bugs
- Breaking existing functionality

**Recommendation**: Proceed with phased approach, extensive testing, and feature flag protection. Consider spike/proof-of-concept first (2-3 days) to validate Rete.js suitability before committing to full migration.

## References

- **goal.md lines 24-38**: Rationale for Rete.js migration
- **goal.md lines 43-57**: Core conceptual model (nodes, connectors, sockets)
- **goal.md lines 161-165**: Wire re-routing requirements
- **goal.md lines 193-202**: Continuous rotation requirements
- **Rete.js documentation**: https://rete.js.org/
- **Rete.js examples**: https://rete.js.org/examples
- **Current PixiJS renderer**: `src/ui/pixi-renderer.ts` (1136 lines)
- **Current interaction logic**: `src/ui/breadboard-app.ts` (2403 lines)
