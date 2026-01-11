Improve X-Ray Mode to clearly reveal breadboard internal connections

## Review Source

`planning/reviews/review-2026-01-08.md` — Section 8 (Lines 148-168)

## Problem Statement

The current X-Ray mode does not fulfill its educational purpose. When enabled, it only changes the background to grey without clearly revealing the breadboard's hidden internal connections. Users cannot understand what the mode is intended to show, making it more cosmetic than educational.

## Review Items Addressed

### Section 8: X-Ray Mode (Lines 148-168)

**Issue 8.1: Current Behaviour (Lines 149-152)**

- X-ray mode changes the background to grey
- It does **not clearly reveal breadboard rails**
- The intent of the mode is therefore unclear

**Issue 8.2: Intended Purpose (Lines 154-161)**

X-ray mode should:

- Reveal **hidden internal breadboard connections**
- Show horizontal row connections (how holes in the same row are connected)
- Show vertical rail connections (how power/ground rails run the length of the board)
- Explain what cannot normally be seen physically

**Issue 8.3: Visual Recommendations (Lines 163-168)**

When X-ray is enabled:

- Components and wires should become **monochromatic** (desaturated/greyscale)
- Components should be **partially transparent** (allow seeing through them)
- Breadboard internal wiring should be **visually emphasised**
- The mode should feel **educational, not cosmetic**

### Section 12: Priority Summary (Lines 222-226)

This is listed under **"High Priority UX Improvements"** along with:

- Quick Select redesign (completed in PR #285)
- Sidebar rebalancing (completed in PR #315)
- Component and board rotation (completed in PR #303, #309)
- X-ray mode clarity ← **THIS TASK**

## Implementation Instructions

### Step 1: Understand Current X-Ray Mode Implementation

Before making changes, thoroughly understand the existing implementation:

1. **Locate X-Ray Mode code:**
   - Search for "xray" or "x-ray" in the codebase
   - Find the toggle button implementation
   - Find the rendering logic that applies X-ray mode
   - Locate any state properties that track X-ray mode status

2. **Document current behavior:**
   - What currently happens when X-ray mode is toggled on?
   - Which rendering functions are affected?
   - What visual changes are currently applied?
   - Is the grey background the only change?

3. **Identify breadboard rendering code:**
   - Find where breadboard holes are rendered
   - Find where breadboard rails are rendered
   - Find where row connections are defined (which holes connect to which)
   - Find where components and wires are rendered

4. **Understand breadboard topology:**
   - How are horizontal row connections represented in the data model?
   - How are vertical rail connections represented?
   - What is the distinction between:
     - Terminal strips (main breadboard rows, usually 5 holes connected)
     - Power rails (vertical red/blue rails, usually separate)

### Step 2: Design X-Ray Visual Language

Define the visual language for X-ray mode before implementing:

**Educational Goals:**

- Users should immediately understand which holes are electrically connected
- Internal connections that are normally hidden inside the breadboard plastic should be visible
- The mode should teach users about breadboard topology

**Visual Design Decisions:**

1. **Breadboard internal wiring (NEW):**
   - Draw visible connection lines/traces inside terminal strips
   - Show horizontal bars connecting holes in the same row (5-hole groups typically)
   - Show vertical bars/traces along power rails
   - Use distinct color for internal traces (e.g., yellow or light green for visibility)
   - Traces should appear "inside" or "behind" the breadboard surface

2. **Components and wires (MODIFY):**
   - Reduce opacity to ~0.4-0.6 (partially transparent)
   - Desaturate colors (convert to greyscale or reduce saturation by 70-80%)
   - This makes components less visually prominent without hiding them completely
   - Allows users to see through components to the connections beneath

3. **Breadboard holes (MODIFY):**
   - Keep holes visible but slightly reduced prominence
   - Or highlight holes more strongly to show connection points

4. **Background (CURRENT):**
   - Grey background is acceptable as it provides neutral context
   - May darken slightly to provide better contrast for yellow/green internal traces

**Visual Hierarchy in X-Ray Mode:**

- MOST PROMINENT: Internal connection traces (yellow/green)
- MODERATE: Breadboard holes (connection points)
- LEAST PROMINENT: Components and wires (transparent, desaturated)

### Step 3: Implement Internal Connection Visualization

Add rendering of internal breadboard connections:

**For Terminal Strips (Horizontal Row Connections):**

1. **Identify connected hole groups:**
   - Most breadboards have terminal strips where 5 consecutive holes in a row are connected
   - Example: Row 1, Columns 1-5 are connected; Columns 7-11 are connected (gap at column 6)
   - Each group should have one visual connection indicator

2. **Render connection traces:**
   - For each group of connected holes, draw a horizontal line/bar connecting them
   - Position: slightly behind/below the hole visuals (lower z-index)
   - Visual style:
     - Color: bright yellow (#FFD700) or light green (#90EE90) for high visibility
     - Width: ~4-6px (visible but not overpowering)
     - Opacity: ~0.8 (slightly transparent to show it's "internal")
     - Optional: subtle glow/shadow for depth effect
   - Example: Draw a line from hole (row=5, col=1) to hole (row=5, col=5) to show they're connected

3. **Handle breadboard geometry:**
   - Account for the gap between left and right terminal strips (center channel)
   - Do not connect holes across the center channel
   - Respect the actual breadboard topology in the data model

**For Power Rails (Vertical Rail Connections):**

1. **Identify rail connections:**
   - Power rails typically run vertically along the sides of the breadboard
   - Each rail connects many holes vertically (e.g., all red rail holes on the left side)
   - Rails may have breaks/segments in some breadboard designs

2. **Render rail traces:**
   - Draw vertical bars along the power rails showing continuous connection
   - Position: behind/inside the rail visual
   - Visual style:
     - Color: bright yellow (#FFD700) or keep rail's existing color but brighten/emphasize
     - Width: ~6-8px (fill most of rail width)
     - Opacity: ~0.7
     - Should look like "wiring inside the rail"

3. **Handle rail segments:**
   - If breadboard has segmented rails (with breaks), respect those breaks
   - Don't show connections where they don't exist

**Implementation Approach:**

Option A: **Add to PixiJS renderer** (likely best)

- Add methods to `pixi-renderer.ts` or `breadboard-renderer.ts`
- `renderInternalConnections(xrayEnabled: boolean)` method
- Create new PixiJS Graphics objects for connection traces
- Control visibility based on X-ray mode toggle

Option B: **Overlay layer**

- Create a separate overlay specifically for X-ray mode
- Similar to voltage heatmap overlay approach
- Toggle visibility when X-ray mode changes

Choose Option A if possible (cleaner integration with existing rendering).

### Step 4: Modify Component and Wire Appearance in X-Ray Mode

Make components and wires less prominent when X-ray mode is active:

**For Components:**

1. **Locate component rendering:**
   - Find where resistors, LEDs, wires, ICs, etc. are rendered
   - Identify the rendering method or functions

2. **Apply transparency:**
   - When X-ray mode is enabled: set component opacity to ~0.4-0.6
   - Use PixiJS `.alpha` property or CSS `opacity`
   - Should be subtle enough to see through, clear enough to still identify components

3. **Apply desaturation:**
   - Option A: Convert component colors to greyscale
   - Option B: Reduce color saturation by 70-80% (keep slight color hints)
   - This can be done via PixiJS filters, CSS filters, or by adjusting color values
   - Example with PixiJS: `new ColorMatrixFilter()` with desaturation matrix

4. **Maintain component identity:**
   - Even when transparent and desaturated, users should still recognize what each component is
   - Resistor color bands should still be faintly visible
   - LED shape should still be identifiable

**For Wires:**

1. **Apply same treatment as components:**
   - Reduce opacity to ~0.5
   - Desaturate wire colors (or make them greyscale)

2. **Keep endpoints visible:**
   - Wire endpoints (connections to holes) should remain clear
   - Users need to see where wires connect even in X-ray mode

**Implementation:**

```typescript
// Pseudo-code example
function applyXrayEffect(container: PIXI.Container, enabled: boolean) {
  if (enabled) {
    container.alpha = 0.5; // 50% transparency
    // Apply desaturation filter
    const filter = new PIXI.ColorMatrixFilter();
    filter.desaturate();
    container.filters = [filter];
  } else {
    container.alpha = 1.0;
    container.filters = null;
  }
}
```

**Apply this to:**

- Component containers
- Wire containers
- Any user-placed elements that should become less prominent

### Step 5: Update X-Ray Mode Toggle Logic

Ensure the toggle button properly triggers all visual changes:

1. **Locate toggle button handler:**
   - Find the click handler for the X-Ray Mode button
   - Identify the state property that tracks X-ray mode (e.g., `xrayModeEnabled`)

2. **Update toggle logic:**

   ```typescript
   toggleXrayMode() {
     this.xrayModeEnabled = !this.xrayModeEnabled;

     // Update all visual elements
     this.updateXrayModeVisuals();

     // Update button appearance (active state)
     this.updateXrayModeButton();
   }
   ```

3. **Implement visual update method:**

   ```typescript
   updateXrayModeVisuals() {
     // Show/hide internal connection traces
     this.renderer.setInternalConnectionsVisible(this.xrayModeEnabled);

     // Apply transparency and desaturation to components
     this.renderer.applyXrayEffectToComponents(this.xrayModeEnabled);

     // Apply transparency and desaturation to wires
     this.renderer.applyXrayEffectToWires(this.xrayModeEnabled);

     // Re-render to apply changes
     this.renderer.render();
   }
   ```

4. **Update button styling:**
   - Button should show "active" state when X-ray mode is enabled
   - Consider changing button color, adding border, or adding glow effect
   - Button text/icon should indicate current state

### Step 6: Test and Refine

Test X-ray mode thoroughly:

**Functional Testing:**

1. **Toggle behavior:**
   - Click X-ray mode button
   - Verify internal connections appear
   - Verify components become transparent and desaturated
   - Click again to toggle off
   - Verify everything returns to normal

2. **Visual clarity:**
   - Load a simple circuit (e.g., LED with resistor)
   - Enable X-ray mode
   - Verify you can clearly see:
     - Which holes are connected in each row
     - Power rail connections
     - How components connect to the internal breadboard wiring
   - Ask: "Does this teach me how the breadboard works?"

3. **Complex circuits:**
   - Load a more complex example circuit
   - Enable X-ray mode
   - Verify internal connections don't create visual chaos
   - Verify components are still identifiable

**Edge Cases:**

1. **Empty breadboard:**
   - Enable X-ray mode on empty breadboard
   - Should clearly show internal topology even without components

2. **Rotated breadboard:**
   - Rotate breadboard to 90°/180°/270°
   - Enable X-ray mode
   - Verify internal connections render correctly at all orientations

3. **Schematic view:**
   - Switch to schematic view
   - X-ray mode should either:
     - Be disabled/hidden (schematic doesn't have internal connections)
     - OR have no effect in schematic view

**Visual Refinement:**

1. **Adjust opacity values:**
   - If components too transparent: increase opacity
   - If internal connections not visible enough: increase opacity or brightness
   - Find balance where both internal traces and components are visible

2. **Adjust trace colors:**
   - If yellow too bright: try softer yellow or green
   - Ensure good contrast against grey background
   - Consider colorblind accessibility (avoid red/green alone)

3. **Adjust trace thickness:**
   - Traces should be visible but not dominate the view
   - Should look like "wiring inside the breadboard"

4. **Layer ordering:**
   - Internal traces should appear behind holes but above background
   - Components should appear above traces
   - Z-index/layer order should create correct depth perception

### Step 7: Add Documentation (Optional but Recommended)

Consider adding a help tooltip or info icon next to X-Ray Mode button:

**Tooltip text example:**
"X-Ray Mode reveals the hidden internal connections inside the breadboard. Terminal strip rows (5 connected holes) and power rails are highlighted, while components become transparent."

**Implementation:**

- Add `title` attribute to button
- Or add info icon (ℹ️) that shows explanation
- Or show brief message in UI when first enabling X-ray mode

### Step 8: Verify at All Orientations

Since PR #309 added breadboard rotation with coordinate transformation, ensure X-ray mode works at all angles:

1. **Test at 0°, 90°, 180°, 270°:**
   - Internal connections should render correctly at all orientations
   - Traces should align with holes and rails
   - Transparency effects should work at all angles

2. **If issues found:**
   - Check if internal connection rendering uses correct coordinate space
   - Ensure traces are positioned relative to breadboard, not canvas
   - May need to apply same transformations as other breadboard elements

## Expected Outcome

**When X-Ray Mode is Disabled (default):**

- Breadboard appears normal
- Components and wires fully opaque with normal colors
- No internal connection traces visible
- Grey background may remain (or use normal background)

**When X-Ray Mode is Enabled:**

- **Internal connections prominently visible:**
  - Bright yellow/green horizontal traces showing connected holes in each row
  - Bright yellow/green vertical traces along power rails
  - Traces appear "inside" the breadboard
- **Components and wires become subtle:**
  - ~50% transparent (can see through them)
  - Desaturated colors (greyscale or very low saturation)
  - Still identifiable but not visually dominant
- **Educational value:**
  - Users immediately understand which holes are electrically connected
  - The "hidden" internal wiring becomes visible and obvious
  - Clear teaching tool for breadboard topology

**User Experience:**

- "Now I understand how this breadboard actually works!"
- "I can see which holes are connected without having to memorize the layout"
- "This helps me understand why my circuit works (or doesn't work)"

## Files to Modify

**Primary files:**

- `src/ui/pixi-renderer.ts` or `src/ui/breadboard-renderer.ts` - Add internal connection rendering
- `src/ui/breadboard-app.ts` - Update X-ray mode toggle logic, apply effects to components/wires

**Possible additional files:**

- `src/style.css` - Update X-ray mode button active state styling
- `src/types.ts` - Add any new types for internal connection data (if needed)

**Do NOT modify:**

- Data model or netlist generation (X-ray mode is purely visual)
- Electrical simulation logic
- Save/load functionality

## Refactor Safety Rules

1. **Do not change existing rendering logic unless necessary:**
   - Existing breadboard, component, and wire rendering should remain unchanged when X-ray mode is OFF
   - Only add new rendering for internal connections
   - Only modify appearance when X-ray mode is ON

2. **Add, don't replace:**
   - Add new rendering methods for internal connections
   - Add conditional logic to existing rendering for transparency/desaturation
   - Don't rewrite existing rendering from scratch

3. **Preserve functionality:**
   - All interactions (clicking, dragging, selecting) must work in X-ray mode
   - Component properties editing must work
   - Wire routing must work
   - X-ray mode is purely a visual overlay/effect

4. **No logic changes:**
   - Electrical simulation unchanged
   - Net extraction unchanged
   - Component placement logic unchanged

5. **Delete unused code:**
   - If current X-ray mode only changes background color, that code can be removed/replaced
   - Don't leave old X-ray implementation commented out

6. **No comments on changes:**
   - Code should be self-explanatory
   - Method names like `renderInternalConnections()` are clear without comments

## Acceptance Criteria

Visual & Educational:

- [ ] X-ray mode clearly reveals horizontal row connections (terminal strips)
- [ ] X-ray mode clearly reveals vertical power rail connections
- [ ] Internal connection traces are visually prominent and easy to see
- [ ] Components become partially transparent (~50%) when X-ray mode is enabled
- [ ] Components become desaturated (greyscale or low saturation) when X-ray mode is enabled
- [ ] Wires become partially transparent and desaturated when X-ray mode is enabled
- [ ] The mode feels educational and purposeful (not just cosmetic)
- [ ] Users can understand breadboard internal topology from the visualization

Functional:

- [ ] X-ray mode toggle button works correctly
- [ ] Toggling X-ray mode on shows internal connections
- [ ] Toggling X-ray mode off returns to normal view
- [ ] Button shows active state when X-ray mode is enabled
- [ ] All interactions (clicking, dragging, selecting) work in X-ray mode
- [ ] Component property editing works in X-ray mode
- [ ] Wire routing works in X-ray mode
- [ ] X-ray mode works correctly at all breadboard orientations (0°, 90°, 180°, 270°)

Technical:

- [ ] Internal connection traces render at correct positions
- [ ] Transparency/desaturation effects apply correctly to all components
- [ ] Z-index/layer ordering is correct (traces behind components, above background)
- [ ] No visual artifacts or rendering glitches
- [ ] Performance is acceptable (no significant lag when toggling X-ray mode)
- [ ] Code follows existing patterns in the renderer
- [ ] No breaking changes to existing functionality

Polish:

- [ ] Visual design is clean and professional
- [ ] Color choices provide good contrast and visibility
- [ ] Tooltip or help text explains what X-ray mode does (optional but recommended)
- [ ] Mode works well with different example circuits (simple and complex)

## Priority

**HIGH** - This is listed in Section 12 as a "High Priority UX Improvement" along with other items that have already been completed (Quick Select, sidebar rebalancing, rotation). X-ray mode is a key educational feature that currently does not fulfill its purpose. Fixing this significantly improves the learning value of the tool.

## Complexity

**MEDIUM** - Requires:

- Understanding breadboard topology and internal connections
- Adding new rendering logic for internal traces
- Applying visual effects (transparency, desaturation) to existing elements
- Coordinating multiple visual changes on toggle
- Testing at multiple breadboard orientations

However:

- No data model changes required
- No electrical simulation changes required
- Pure visual/rendering changes
- Well-defined requirements from the review

## Related Work

- PR #303/#309 implemented breadboard rotation - X-ray mode must work at all orientations
- Voltage heatmap overlay provides example of educational visualization
- This task is independent of Section 9 (Breadboard Visual Realism) which can be done separately

## References

- Review source: `planning/reviews/review-2026-01-08.md` lines 148-168 (Section 8)
- Actions file: `planning/reviews/review-2026-01-08.actions.md` (no entries for Section 8 yet)
- Priority: Section 12, lines 222-226 ("High Priority UX Improvements")
