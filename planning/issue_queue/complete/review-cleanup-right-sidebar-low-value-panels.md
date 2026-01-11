Remove low-value right sidebar panels: Circuit Info, Nodes, Connections, and Component List

## Source Review

`planning/reviews/review-2026-01-08.md` - Section 4: Right Sidebar: Circuit Info & Lists (lines 70-97)

## Review Items Addressed

This task addresses **Section 4** from the review, which identified several right sidebar panels that provide no clear user value and should be removed.

### Section 4.1: Circuit Info / Nodes / Connections (Lines 72-75)

**Original Critique:**

- These sections provide **no clear value** in their current form
- Their purpose is unclear to users
- Recommendation: **remove entirely**

**Task:** Remove the Circuit Info, Nodes, and Connections panels from the right sidebar.

### Section 4.2: Component List (Lines 77-82)

**Original Critique:**

- The component list provides little value because:
  - Components are already visible on the breadboard
  - Multiple wires are indistinguishable in a list
  - The same problem applies to resistors and other repeated components
- Selecting wires or resistors from a list is not meaningful if they cannot be visually differentiated

**Task:** Remove the Component List panel from the right sidebar.

### Section 4.3: Component Properties (Lines 84-87)

**Original Feedback:**

- Component Properties is **very useful**
- Clicking a component and immediately editing its properties is a strong UX feature
- This panel should be **retained and expanded**

**Task:** Keep Component Properties panel unchanged. This is already working well and should NOT be removed.

### Section 4.4: Selection Feedback Gap (Lines 89-95)

**Original Critique:**

- When a wire is selected:
  - Nothing appears in Component Properties
  - There is no clear indication that the wire is selected
- Even if wires have limited editable properties:
  - Selection state must still be visible
  - Component Properties could later support wire-specific editing

**Task:** Show wire selection in Component Properties panel (even if properties are minimal/read-only for now). At minimum, display that a wire is selected and show basic info (e.g., "Wire", endpoints, maybe length).

## Detailed Implementation Instructions

### Step 1: Locate and identify the panels to remove

1. Search for "Circuit Info" in `src/ui/breadboard-app.ts` to locate the panel rendering code
2. Search for "Nodes" panel in `src/ui/breadboard-app.ts`
3. Search for "Connections" panel in `src/ui/breadboard-app.ts`
4. Search for "Component List" panel in `src/ui/breadboard-app.ts`
5. Note down all locations where these panels are:
   - Defined in the HTML/DOM structure
   - Populated with data
   - Updated on state changes
   - Referenced in event handlers

### Step 2: Remove Circuit Info, Nodes, and Connections panels

1. **Remove HTML/DOM rendering code** for these three panels from the right sidebar
2. **Remove data population logic** that fills these panels with information
3. **Remove any event handlers** that update these panels
4. **Remove any CSS** specific to these panels (if any)
5. **DO NOT remove** any underlying data structures or core logic that might be used elsewhere
6. **ONLY remove** the UI presentation layer for these panels

**Safety check:**

- Verify that removing these panels does not break Component Properties panel
- Verify that the right sidebar still renders correctly without these panels
- Test that the application still functions normally after removal

### Step 3: Remove Component List panel

1. **Remove HTML/DOM rendering code** for the Component List panel from the right sidebar
2. **Remove data population logic** that lists components
3. **Remove any selection handlers** that select components from the list
4. **Remove any CSS** specific to this panel (if any)
5. **DO NOT remove** the underlying component tracking data structures
6. **ONLY remove** the UI panel that displays the list

**Safety check:**

- Verify that component selection on the breadboard still works
- Verify that Component Properties panel still shows selected component properties
- Test that removing the list doesn't break component interaction workflows

### Step 4: Enhance Component Properties to show wire selection

1. **Locate** the Component Properties panel rendering/update code
2. **Find** where component selection triggers Component Properties updates
3. **Add logic** to detect when a wire/connection is selected (instead of a component)
4. **Display wire selection state** in Component Properties panel:
   - Show a heading like "Wire" or "Connection"
   - Show basic wire information:
     - Wire ID or identifier
     - Start position (e.g., "Row 5, Column 3")
     - End position (e.g., "Row 10, Column 7")
     - Optionally: wire length (in grid units or visual distance)
     - Optionally: connection status (e.g., "Connected")
5. **For this initial implementation:**
   - Wire properties can be read-only (no editing required)
   - The goal is to provide **selection feedback**, not full wire editing
   - Future PRs can add wire editing capabilities if desired
6. **Use existing patterns** from component property display
7. **Ensure visual consistency** with existing Component Properties styling

**Example wire properties display:**

```
=== Component Properties ===
Wire
  Type: 22 AWG Solid Wire
  From: Row 5, Col 3 (Terminal Strip)
  To: Row 12, Col 8 (Terminal Strip)
  Length: 8 grid units
  Status: Connected
```

### Step 5: Testing and verification

1. **Visual verification:**
   - Load the application in a browser
   - Verify Circuit Info, Nodes, Connections panels are gone from right sidebar
   - Verify Component List panel is gone from right sidebar
   - Verify Component Properties panel is still present and functional
   - Verify right sidebar layout looks clean and uncluttered

2. **Functional verification:**
   - Click on a component on the breadboard
   - Verify Component Properties panel shows component properties (existing behavior)
   - Click on a wire on the breadboard
   - Verify Component Properties panel shows wire information (NEW behavior)
   - Verify wire selection is visually indicated (either in properties panel or on canvas)

3. **Edge case testing:**
   - Click empty breadboard space → Component Properties should show nothing or empty state
   - Select multiple components (if supported) → verify properties display
   - Switch between selecting components and wires → verify properties update correctly

### Step 6: Clean up any orphaned code

1. Search for any functions or methods that are now unused after removing panels
2. Remove unused functions if they are **only** used by the removed panels
3. **DO NOT remove** functions that might be used elsewhere or are part of core logic
4. Document any functions you choose NOT to remove (and why)

## Constraints Reminder

1. **Do not change the logic** of core application code unless it's clearly unused after panel removal
2. **Do not maintain legacy endpoints** for backwards compatibility
3. **Always delete** leftover, unused code that was exclusively for the removed panels
4. **Do not leave comments** on changes made within the code
5. **Do not rewrite functions** from scratch during this task
6. **Ensure all tests and linting pass** after changes

## Expected Outcome

After this PR:

1. **Right sidebar is cleaner and more focused:**
   - No Circuit Info panel
   - No Nodes panel
   - No Connections panel
   - No Component List panel
   - Component Properties panel remains (enhanced with wire selection support)

2. **Wire selection provides feedback:**
   - When a wire is selected, Component Properties shows wire information
   - Selection state is clear to the user

3. **User experience is improved:**
   - Right sidebar shows only useful information
   - Less visual clutter
   - Clearer purpose for remaining panels

4. **No functional regressions:**
   - Component selection still works
   - Wire selection still works
   - Component Properties panel still works for components
   - Component Properties panel now works for wires too

## Files Likely to Be Modified

Based on the codebase structure:

- `src/ui/breadboard-app.ts` (main UI orchestration - panel rendering and updates)
- `src/style.css` (possibly remove CSS for removed panels)

## Success Criteria

- [ ] Circuit Info panel removed from right sidebar
- [ ] Nodes panel removed from right sidebar
- [ ] Connections panel removed from right sidebar
- [ ] Component List panel removed from right sidebar
- [ ] Component Properties panel still works for components
- [ ] Component Properties panel shows wire information when wire is selected
- [ ] Right sidebar renders cleanly without removed panels
- [ ] Application functions normally after changes
- [ ] All tests pass (if any exist for UI)
- [ ] No console errors in browser
- [ ] Code is clean with no commented-out code or TODOs

## Priority

**Medium-High Priority** - This is UX cleanup that improves application usability by removing confusing/low-value panels. It's not a blocking issue but provides a noticeably cleaner interface.
