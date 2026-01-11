Rebalance sidebar layout and remove low-value panels

## Review Source

`planning/reviews/review-2026-01-08.md` — Sections 1, 3, and 4

## Problem Statement

The current sidebar layout has significant UX issues:

- The left sidebar is overloaded with controls while the right sidebar is underutilized
- Several right sidebar panels provide no clear value to users
- The information architecture does not align with user workflows
- Related controls are scattered across different locations

## Review Items Addressed

### Section 1: Overall Layout & Information Architecture (Lines 7-29)

**Issue 1.1: Left vs Right Sidebar Balance**

- The left-hand sidebar is overloaded
- The right-hand sidebar is underutilized with significant unused space

**Issue 1.2: Proposed High-Level Layout Rebalancing**

The review provides explicit recommendations for reorganization:

**Left Sidebar should contain:**

- Component Library (top, unchanged)
- Quick Select (below Component Library)
- Examples
- Load Circuit
- Save Circuit
- Clear All (conceptually belongs with component manipulation)

**Right Sidebar should contain:**

- View controls
- Audio Output
- Clock Control
- Component Properties (retain)
- Remove all other panels that provide no clear user value

### Section 3: Examples, Load/Save, and Clear Controls (Lines 58-67)

**Issue 3.1: Examples**

- The example circuits are "quite nice"
- Acceptable that these will change later
- No changes needed to example content

**Issue 3.2: Control Placement**

- Consider moving Examples / Load Circuit / Save Circuit to the right sidebar
- Clear All feels semantically tied to component editing and should likely remain on the left with components

### Section 4: Right Sidebar: Circuit Info & Lists (Lines 70-97)

**Issue 4.1: Circuit Info / Nodes / Connections (Lines 72-75)**

- These sections provide **no clear value** in their current form
- Their purpose is unclear to users
- Recommendation: **remove entirely**

**Issue 4.2: Component List (Lines 77-82)**

- The component list provides little value because:
  - Components are already visible on the breadboard
  - Multiple wires are indistinguishable in a list
  - The same problem applies to resistors and other repeated components
- Selecting wires or resistors from a list is not meaningful if they cannot be visually differentiated
- Recommendation: **remove entirely**

**Issue 4.3: Component Properties (Lines 84-87)**

- Component Properties is **very useful**
- Clicking a component and immediately editing its properties is a strong UX feature
- This panel should be **retained and expanded**
- No changes needed

**Issue 4.4: Selection Feedback Gap (Lines 89-96)**

- When a wire is selected:
  - Nothing appears in Component Properties
  - There is no clear indication that the wire is selected
- Even if wires have limited editable properties:
  - Selection state must still be visible
  - Component Properties could later support wire-specific editing
- Requirement: **show wire selection in Component Properties panel**

## Implementation Instructions

### Step 1: Audit Current Sidebar Structure

Before making any changes, identify the exact current state:

1. Locate all sidebar rendering code in `src/ui/breadboard-app.ts`
2. Document which panels/controls are currently in left vs right sidebar
3. Document the DOM structure and CSS classes used for sidebars
4. Identify all panel types mentioned in the review:
   - Component Library
   - Quick Select
   - Examples
   - Load Circuit / Save Circuit
   - Clear All
   - View controls
   - Audio Output
   - Clock Control
   - Component Properties
   - Circuit Info
   - Nodes
   - Connections
   - Component List

### Step 2: Remove Low-Value Panels

Remove the following panels entirely from the right sidebar:

1. **Circuit Info panel** - provides no clear value
2. **Nodes panel** - purpose unclear to users
3. **Connections panel** - provides no clear value
4. **Component List panel** - components already visible on breadboard, list not meaningful

**How to remove:**

- Locate rendering functions for these panels
- Remove DOM generation code
- Remove any associated state properties
- Remove any event handlers
- Remove CSS styles specific to these panels
- Ensure removal does not break other functionality

### Step 3: Reorganize Left Sidebar

Reorganize the left sidebar to match the review's recommendation:

**Target structure (top to bottom):**

1. Component Library (already present, no move)
2. Quick Select (already present, verify position)
3. Examples
4. Load Circuit
5. Save Circuit
6. Clear All

**Implementation:**

- Move Examples, Load Circuit, Save Circuit buttons from their current location to left sidebar
- Move Clear All button to left sidebar if not already there
- Ensure vertical ordering matches the list above
- Maintain existing functionality of each control
- Update CSS classes/styles as needed for consistent appearance in left sidebar

### Step 4: Organize Right Sidebar

Reorganize the right sidebar to match the review's recommendation:

**Target structure (top to bottom):**

1. View controls (group heading)
   - X-Ray Mode button
   - Rotate Board button
   - [Future: Dark/Light theme toggle]
2. Audio Output (panel/control)
3. Clock Control (panel/control)
4. Component Properties (panel - retain as-is)

**Implementation:**

- Move View controls to top of right sidebar if not already there
- Group X-Ray Mode and Rotate Board under "View" section/heading
- Ensure Audio Output is below View controls
- Ensure Clock Control is below Audio Output
- Ensure Component Properties remains at bottom or logical position
- Update CSS to create clear visual hierarchy and grouping

### Step 5: Add Wire Selection Feedback

Enhance Component Properties panel to show wire selection state:

**Current issue:**

- When a wire is selected, nothing appears in Component Properties
- No clear indication that wire is selected

**Required changes:**

1. **Detect wire selection:**
   - Check if selected component type is "wire"
   - Identify selected wire ID and properties

2. **Show wire info in Component Properties:**
   - Panel title: "Wire Properties" or "Selected Wire"
   - Display wire ID or a user-friendly name
   - Show endpoints: "From: Row X, Col Y → To: Row X, Col Y"
   - Show net information if available
   - Show routing path information (visual or text)
   - **Even if no editable properties exist**, still show selection state

3. **Visual feedback:**
   - Use same panel structure as component properties
   - Clear indication that a wire is selected
   - Consistent styling with other Component Properties views

4. **Future extensibility:**
   - Structure panel to allow future wire editing features
   - Consider: wire color, wire thickness, wire type (jumper vs solid)
   - For now, read-only display is sufficient

### Step 6: Verify Layout and Spacing

After reorganization:

1. **Visual hierarchy:**
   - Left sidebar should feel organized and intentional
   - Right sidebar should feel clean and focused
   - Related controls should be visually grouped

2. **Spacing and readability:**
   - Ensure adequate spacing between panels/sections
   - Ensure buttons are appropriately sized
   - Ensure labels are readable

3. **Responsive behavior:**
   - Ensure sidebars work at different viewport heights
   - Ensure scrolling works if content exceeds viewport

4. **Consistency:**
   - Button styles should be consistent within each sidebar
   - Panel styles should be consistent
   - Use existing CSS patterns from Quick Select redesign (PR #285)

### Step 7: Testing

1. **Functional testing:**
   - Verify all moved controls still work correctly
   - Verify removed panels do not leave broken references
   - Verify Component Properties still shows component info
   - Verify new wire selection feedback works

2. **Visual testing:**
   - Compare before/after screenshots
   - Verify layout matches review recommendations
   - Verify no visual regressions

3. **Interaction testing:**
   - Click all buttons in new locations
   - Select components and verify properties display
   - Select wires and verify properties display
   - Test Examples loading
   - Test Load/Save/Clear functionality

## Refactor Safety Rules

1. **Move code verbatim first:**
   - Do not refactor while moving
   - Move panel rendering code to new sidebar locations exactly as-is
   - Update imports/references to make it run

2. **Fix imports and references:**
   - Update any hardcoded selectors or IDs
   - Ensure event handlers still connect correctly
   - Verify CSS classes still apply

3. **Only then improve:**
   - After code is moved and working, apply targeted improvements
   - Add wire selection feedback as new feature
   - Apply consistent styling

4. **Do not change logic:**
   - Examples loading logic: unchanged
   - Load/Save logic: unchanged
   - Clear All logic: unchanged
   - Component Properties logic: unchanged (except wire addition)

5. **Delete unused code:**
   - Remove all code for Circuit Info panel
   - Remove all code for Nodes panel
   - Remove all code for Connections panel
   - Remove all code for Component List panel
   - Do not leave commented-out code

6. **No comments on changes:**
   - Do not add comments explaining what was moved
   - Code should be self-explanatory

## Expected Outcome

**Left Sidebar:**

- Component Library at top (unchanged)
- Quick Select below it (unchanged)
- Examples, Load Circuit, Save Circuit, Clear All below
- Feels organized and intentional
- All component-related workflow in one place

**Right Sidebar:**

- View controls at top (X-Ray, Rotate Board)
- Audio Output below
- Clock Control below
- Component Properties at bottom
- Cleaner, more focused
- Removed panels that provided no value

**Component Properties:**

- Shows component info when component selected (unchanged)
- Shows wire info when wire selected (new)
- Clear selection feedback in all cases

**User Impact:**

- More intuitive layout
- Less visual clutter
- Easier to find controls
- Better workflow alignment
- Clear selection feedback for all object types

## Files to Modify

Primary file:

- `src/ui/breadboard-app.ts` - sidebar rendering and panel organization

Possible additional files:

- `src/style.css` - sidebar styling, panel grouping, spacing adjustments

## Acceptance Criteria

- [ ] Circuit Info panel removed from UI
- [ ] Nodes panel removed from UI
- [ ] Connections panel removed from UI
- [ ] Component List panel removed from UI
- [ ] All code for removed panels deleted
- [ ] Left sidebar contains: Component Library, Quick Select, Examples, Load Circuit, Save Circuit, Clear All (in that order)
- [ ] Right sidebar contains: View controls, Audio Output, Clock Control, Component Properties (in that order)
- [ ] Examples button works in new location
- [ ] Load Circuit button works in new location
- [ ] Save Circuit button works in new location
- [ ] Clear All button works in new location
- [ ] Component Properties panel still works for components
- [ ] Component Properties panel shows wire info when wire selected
- [ ] Wire selection state is visible in UI
- [ ] Layout is visually clean and organized
- [ ] Spacing and hierarchy are appropriate
- [ ] No visual regressions
- [ ] No functional regressions
- [ ] All existing tests pass

## Priority

**HIGH** - This addresses Section 1 (Overall Layout & Information Architecture) which is foundational to the application UX. The review explicitly identified the current layout as a significant issue. This is part of the "High Priority UX Improvements" in Section 12.

## Complexity

**MEDIUM** - Primarily involves moving existing code and removing panels. No complex logic changes required. Wire selection feedback is a straightforward addition. The main challenge is ensuring all references update correctly and nothing breaks during reorganization.

## Related Work

- PR #285 established visual design patterns for panels (Quick Select redesign)
- This task builds on that work by applying similar principles to overall sidebar organization
- Section 8 (X-Ray Mode improvements) and Section 9 (Breadboard Visual Realism) are separate, independent tasks that can be done later

## References

- Review source: `planning/reviews/review-2026-01-08.md` lines 7-29, 58-67, 70-97
- Actions file: `planning/reviews/review-2026-01-08.actions.md` (no entries for Sections 1, 3, or 4)
