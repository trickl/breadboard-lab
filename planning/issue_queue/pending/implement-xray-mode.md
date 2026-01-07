Implement X-Ray Mode to reveal hidden breadboard connectivity

## Context and Motivation

The Breadboard Educational Tool currently provides excellent simulation and visualization capabilities including voltage overlays and animated current flow (Electrical View Mode). However, a critical educational feature outlined in goal.md Section 10 remains unimplemented: **X-Ray Mode**.

X-Ray Mode is one of two informational modes specified in the goal architecture (Section 4.2). While Electrical View Mode shows *what* is happening electrically, X-Ray Mode explains *why* - by revealing the hidden internal wiring of the breadboard that causes certain holes to be electrically connected.

This is essential for the educational mission of the tool. Real breadboard users frequently encounter confusion about which holes are internally connected. The breadboard has:
- Power rails (columns 0-1 and 12-13) where all 30 holes in each rail are vertically connected
- Terminal strips (rows, within columns 2-6 and 7-11) where 5 holes are horizontally connected
- A center gap (between columns 6 and 7) where left and right sides are NOT connected

Without X-Ray Mode, beginners must either memorize these connectivity rules or discover them through trial and error. This defeats the tool's purpose of providing superior learning compared to physical hardware.

## Goal.md Requirements (Section 10)

The goal specification states:

### 10.1 Purpose
> X-Ray Mode reveals the **hidden internal wiring of the breadboard**.
> This explains *why* certain holes are electrically connected.

### 10.2 Behaviour
> When enabled:
> - Internal breadboard buses and rails become visible
> - Electrically shared holes are visually grouped or linked
> - Overlaid wiring is clearly distinguishable from user-added wires
>
> X-Ray Mode is informational only:
> - It does not alter connectivity
> - It does not affect simulation state

## Current System State

From system_capabilities.md:
- Breadboard connectivity model is fully implemented in `BreadboardLayout` class
- The system correctly models power rails (vertical connectivity) and terminal strips (horizontal connectivity)
- Circuit extraction correctly uses this connectivity information
- Voltage overlays correctly show electrical connectivity results

**What's missing:** Visual representation of the *physical connectivity structure* that underlies the electrical behavior.

## Detailed Implementation Requirements

### 1. UI Toggle Control

**Location:** Add X-Ray Mode toggle to the left toolbar, positioned near existing view controls

**UI Element:**
- Button or toggle switch with appropriate icon (🔬 or 👁️ suggested)
- Label: "X-Ray Mode" or "Show Internal Connections"
- State: ON/OFF toggle
- Should work independently of Electrical View Mode (user can enable both, one, or neither)
- Keyboard shortcut: X key (matches pattern of existing shortcuts: R for rotate, M for audio)

**State Management:**
- Add `xrayModeEnabled: boolean` to BreadboardApp state or as instance property
- Default: false (X-Ray Mode off on initial load)
- State should persist across view switches (breadboard ↔ schematic)

### 2. Visual Rendering of Internal Connectivity

**Rendering Target:** PixiJS renderer (PixiRenderer class in `src/ui/pixi-renderer.ts`)

**Visual Design Options (choose one or hybrid):**

#### Option A: Translucent Overlay Bars
- Render semi-transparent colored bars showing internal connections
- **For rails:** Vertical bars spanning all 30 holes in each rail column
  - Left negative rail (col 0): Blue translucent bar
  - Left positive rail (col 1): Red translucent bar
  - Right positive rail (col 12): Red translucent bar
  - Right negative rail (col 13): Blue translucent bar
- **For terminal strips:** Horizontal bars spanning 5 holes in each row
  - Left strips (cols 2-6): One bar per row, neutral color (e.g., yellow or light gray)
  - Right strips (cols 7-11): One bar per row, neutral color
- Opacity: 0.15-0.3 (enough to see but not occlude components)
- Layer: Render behind components but above breadboard substrate

#### Option B: Connection Lines
- Draw thin lines connecting internally-connected holes
- Lines appear only between adjacent holes in a connectivity group
- Line style: Dashed or dotted to distinguish from user wires
- Color: Light gray or subtle color that doesn't interfere with voltage overlays
- Layer: Behind components

#### Option C: Hole Highlighting (Recommended Hybrid)
- Combine subtle overlay bars (Option A) with hole border highlighting
- When user hovers over a hole, highlight *all connected holes* in that connectivity group
- Use border glow or color change on all holes in the group
- This provides both static visualization (bars) and interactive exploration (hover)

**Rendering Implementation Details:**

In `PixiRenderer.renderBreadboard()`:
1. Check if X-Ray Mode is enabled (pass as parameter or renderer property)
2. If enabled, call new method: `renderInternalConnectivity()`
3. `renderInternalConnectivity()` should:
   - Create a new PIXI.Graphics object for X-Ray overlay
   - Iterate through rails and render vertical connectivity bars/lines
   - Iterate through terminal strips and render horizontal connectivity bars/lines
   - Use appropriate z-index/layer ordering (below components, above substrate)
   - Use alpha blending for translucency

**Data Source:** Use existing `BreadboardLayout` class methods:
- `isPositionInRail(pos)` - Check if position is in a rail
- `getRailForPosition(pos)` - Get rail information for a position
- `getConnectedPositions(pos)` - Get all positions connected to a given position
- Layout constants: `BREADBOARD_ROWS = 30`, `BREADBOARD_COLS = 14`

### 3. Distinguishing X-Ray Overlay from User Wires

**Critical requirement from goal.md:** "Overlaid wiring is clearly distinguishable from user-added wires"

**Strategies:**
- **Visual style:** X-Ray overlays use translucent bars/regions, not wire paths
- **Layer ordering:** X-Ray elements behind components; user wires in front
- **Color palette:** X-Ray uses muted/translucent colors; user wires use saturated colors
- **Toggle behavior:** X-Ray can be turned off; user wires are always visible
- **Interactivity:** User wires are selectable and draggable; X-Ray elements are not interactive

### 4. Integration with Existing Features

**Electrical View Mode Interaction:**
- X-Ray Mode and Electrical View Mode are independent
- User can enable both simultaneously
- When both enabled:
  - X-Ray shows *physical connectivity structure*
  - Voltage overlays show *electrical state* (actual voltages)
  - Current animation shows *charge flow*
- Example: A terminal strip might show X-Ray highlighting (5 holes connected) AND voltage color (if electrically live)

**Component Placement:**
- X-Ray Mode does not affect component placement or interaction
- Components remain draggable, rotatable, deletable with X-Ray on
- X-Ray overlay should not interfere with component drag ghost preview

**Explain Panel:**
- When X-Ray Mode is enabled and user clicks a hole:
  - Explain panel should mention "This hole is internally connected to N other holes"
  - List the connected hole positions (or at least count them)
  - Explain if it's a rail connection (vertical) or terminal strip connection (horizontal)

### 5. Performance Considerations

**Rendering Performance:**
- X-Ray overlay should be static geometry (not animated)
- Re-render only when:
  - X-Ray Mode is toggled on/off
  - Canvas is resized
  - View is switched
- Do NOT re-render X-Ray overlay on every simulation update (it's independent of electrical state)

**Memory:**
- X-Ray overlay can be cached in a PIXI.Container
- Create container once when X-Ray enabled, hide/show container on toggle
- Destroy container when not needed to free GPU memory

### 6. User Experience Flow

**Typical usage scenario:**
1. User places components on breadboard
2. Circuit doesn't work as expected
3. User enables X-Ray Mode to understand internal connectivity
4. X-Ray reveals which holes are connected (e.g., "Oh, these holes are on the same rail!")
5. User adjusts circuit based on understanding
6. User disables X-Ray Mode to return to clean view

**First-time user onboarding:**
- Consider showing X-Ray Mode briefly on first load (e.g., 2-second flash)
- Or add a tutorial hint: "Click 🔬 to see internal breadboard connections"
- This teaches users about the hidden structure before they encounter problems

### 7. Testing Requirements

**Unit Tests (Vitest):**
- X-Ray Mode toggle state management
- `renderInternalConnectivity()` method called when enabled
- Correct data extraction from BreadboardLayout
- Layer ordering (X-Ray behind components)

**Visual Regression Tests (Playwright):**
- Screenshot with X-Ray Mode OFF (baseline - already exists)
- Screenshot with X-Ray Mode ON (new baseline)
- Screenshot with X-Ray Mode ON + Electrical View Mode ON (both overlays)
- Verify X-Ray overlay visual distinguishability from components and wires

**Manual Testing Scenarios:**
- Enable/disable X-Ray Mode and verify visual changes
- Test with empty breadboard (no components)
- Test with complex circuit (many components and wires)
- Verify X-Ray doesn't interfere with component dragging
- Verify X-Ray + voltage overlay combination is readable
- Test hover highlighting (if implemented) for rail and terminal strip connectivity

### 8. Acceptance Criteria

The implementation will be considered complete when:

1. ✅ X-Ray Mode toggle control is present in UI (left toolbar)
2. ✅ Toggle state is managed correctly (on/off, persists during session)
3. ✅ X-Ray Mode renders visual representation of internal breadboard connectivity
4. ✅ Power rails show vertical connectivity (all 30 holes in each rail)
5. ✅ Terminal strips show horizontal connectivity (5 holes per row, per side)
6. ✅ X-Ray overlay is visually distinguishable from user-added components and wires
7. ✅ X-Ray overlay does not interfere with component placement, dragging, or rotation
8. ✅ X-Ray Mode works independently of Electrical View Mode
9. ✅ X-Ray Mode works correctly in both breadboard view and schematic view (or is breadboard-only - to be decided)
10. ✅ Explain panel provides context about internal connectivity when X-Ray enabled
11. ✅ Performance is acceptable (no frame drops when toggling or rendering)
12. ✅ Visual regression tests pass with new baselines
13. ✅ Unit tests cover new functionality
14. ✅ Documentation updated (README.md mentions X-Ray Mode, system_capabilities.md updated)

### 9. Implementation Guidance

**Recommended Implementation Sequence:**

**Phase 1: UI Infrastructure (1-2 hours)**
- Add X-Ray Mode toggle button to UI
- Add state management property
- Wire up click handler to toggle state
- Add keyboard shortcut (X key)
- Verify toggle works and triggers re-render

**Phase 2: Basic Rendering (2-3 hours)**
- Implement `renderInternalConnectivity()` in PixiRenderer
- Start with Option A (translucent overlay bars) for simplicity
- Render power rail vertical bars (4 bars total)
- Render terminal strip horizontal bars (60 bars total: 30 rows × 2 sides)
- Verify visual appearance and layer ordering

**Phase 3: Refinement (1-2 hours)**
- Adjust colors, opacity, and visual style for clarity
- Ensure X-Ray elements don't occlude important information
- Test with various circuits (empty, simple, complex)
- Verify distinguishability from user wires

**Phase 4: Integration (1-2 hours)**
- Update Explain panel to mention connectivity when X-Ray enabled
- Ensure X-Ray works with Electrical View Mode
- Test interaction with component placement and dragging

**Phase 5: Testing and Documentation (2-3 hours)**
- Write unit tests for X-Ray functionality
- Create visual regression test baselines
- Update README.md with X-Ray Mode usage instructions
- Update system_capabilities.md to reflect new feature
- Manual testing across different scenarios

**Total Estimated Effort:** 7-12 hours for a senior engineer

### 10. Design Decisions to Make

The implementer should decide:

1. **Visual Style:** Option A (bars), B (lines), or C (hybrid)? Recommend C for best educational value.
2. **Schematic View:** Should X-Ray Mode apply to schematic view? (Likely NO - schematic already shows connectivity explicitly)
3. **Hover Interaction:** Implement hover-to-highlight connected holes? (Recommend YES - high educational value)
4. **Animation:** Should X-Ray overlay fade in/out when toggled? (Recommend YES - smooth transition)
5. **Default State:** X-Ray off by default? (Recommend YES - matches goal.md)
6. **Color Scheme:** Use rail-specific colors (red/blue) or neutral? (Recommend rail-specific for clarity)

### 11. Reference Materials

**Relevant Source Files:**
- `src/ui/breadboard-app.ts` - Main UI logic, add toggle state and handler
- `src/ui/pixi-renderer.ts` - Rendering logic, implement `renderInternalConnectivity()`
- `src/core/breadboard-layout.ts` - Connectivity data source (already complete)
- `src/core/types.ts` - Add X-Ray state to types if needed
- `src/style.css` - Add CSS for X-Ray toggle button

**Existing Features to Reference:**
- Audio toggle implementation (PR #155) - similar UI toggle pattern
- Voltage overlay rendering - similar overlay rendering pattern
- View switcher tabs (PR #161) - similar UI control placement

**Goal.md Sections:**
- Section 4.2: Informational Modes overview
- Section 10: X-Ray Mode specification
- Section 5.2: Breadboard Model (connectivity rules to visualize)

## Why This Task Is the Highest Priority

Among the remaining gaps in goal.md implementation, X-Ray Mode is the most important because:

1. **Explicitly Required:** It's specified as one of two core informational modes in the system architecture (Section 4.2)
2. **Educational Impact:** It directly addresses a major pain point for breadboard learners (understanding hidden connectivity)
3. **Unique Value Proposition:** Physical breadboards don't have this feature; it's a key advantage of the digital tool
4. **Foundational Feature:** Other pending features (switches, continuous rotation, initial example load) are incremental improvements, but X-Ray Mode is a missing pillar of the architecture
5. **Referenced Throughout Goal:** X-Ray Mode is mentioned in multiple sections as an expected capability
6. **Lower Implementation Risk:** Compared to adding new component types (switches) or changing rotation behavior, X-Ray Mode is an overlay feature that doesn't alter existing circuit behavior
7. **High Visible Impact:** Users will immediately see and understand the value of this feature

The next iteration after X-Ray Mode would address Section 13 (initial state with working example) and Section 8 (switch components), but X-Ray Mode should come first as it's part of the core "Views and Modes" architecture that was planned to be complete before adding more component variety.
